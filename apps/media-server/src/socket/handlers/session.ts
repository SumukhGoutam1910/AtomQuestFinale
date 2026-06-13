import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";
import { roomManager } from "../../mediasoup/RoomManager";
import { SessionModel, ParticipantModel, MessageModel } from "../../models";
import { SESSION_GRACE_WINDOW_MS } from "@supportvision/shared";
import { logger } from "../../lib/logger";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSessionHandlers(socket: TypedSocket): void {
  socket.on("session:join", async (payload, cb) => {
    try {
      const { sessionId, userName, role, inviteToken } = payload;

      const session = await SessionModel.findById(sessionId).lean();
      if (!session) return cb({ success: false, error: "Session not found" });
      if (session.status === "ENDED") return cb({ success: false, error: "Session has ended" });

      // Enforce invite token for customers
      if (role === "CUSTOMER") {
        if (!inviteToken || inviteToken !== session.inviteToken) {
          return cb({ success: false, error: "Invalid invite token" });
        }
      }

      // Get or create room
      const room = await roomManager.getOrCreate(sessionId);

      // Check for reconnect (grace period)
      const disconnectedPeer = room.getAllPeers().find(
        (p) => p.userName === userName && p.role === role && p.disconnectedAt !== null
      );

      if (disconnectedPeer) {
        const elapsed = Date.now() - (disconnectedPeer.disconnectedAt ?? 0);
        if (elapsed <= SESSION_GRACE_WINDOW_MS) {
          // Reconnect
          room.markReconnected(disconnectedPeer.participantId, socket.id);
          socket.data.participantId = disconnectedPeer.participantId;
          socket.data.sessionId = sessionId;
          socket.data.userName = userName;
          socket.data.role = role;

          await socket.join(sessionId);

          socket.to(sessionId).emit("user:reconnected", {
            participantId: disconnectedPeer.participantId,
            userName,
          });

          // Send chat history
          const messages = await MessageModel.find({ sessionId }).sort({ createdAt: 1 }).lean();
          socket.emit("chat:history", { messages: messages as any });

          logger.info(`Peer ${userName} reconnected to session ${sessionId}`);
          return cb({ success: true, participantId: disconnectedPeer.participantId });
        }
      }

      // Single-customer capacity: the invite is meant for one customer.
      // A genuine reconnect is handled above; here we block a *second* distinct
      // customer from joining while one is already active. (Agents are unrestricted.)
      if (role === "CUSTOMER") {
        const activeCustomers = room
          .getActivePeers()
          .filter((p) => p.role === "CUSTOMER");

        const sameNameActive = activeCustomers.find((p) => p.userName === userName);
        if (sameNameActive) {
          // Same person on a new tab / quick refresh — take over the old seat.
          room.removePeer(sameNameActive.participantId);
          await ParticipantModel.findByIdAndUpdate(sameNameActive.participantId, {
            isActive: false,
            leftAt: new Date(),
          });
        } else if (activeCustomers.length > 0) {
          return cb({
            success: false,
            error: "This session is already in use by another participant.",
          });
        }
      }

      // New join
      const participant = await ParticipantModel.create({
        sessionId,
        userName,
        role,
        socketId: socket.id,
        isActive: true,
      });

      // Update session to ACTIVE if it was CREATED
      if (session.status === "CREATED") {
        await SessionModel.findByIdAndUpdate(sessionId, {
          status: "ACTIVE",
          startedAt: new Date(),
        });
      }

      const peer = room.addPeer({
        participantId: participant._id.toString(),
        userName,
        role,
        socketId: socket.id,
      });

      socket.data.participantId = participant._id.toString();
      socket.data.sessionId = sessionId;
      socket.data.userName = userName;
      socket.data.role = role;

      await socket.join(sessionId);

      // Notify others
      socket.to(sessionId).emit("user:joined", {
        participant: {
          _id: participant._id.toString(),
          sessionId,
          userName,
          role,
          socketId: socket.id,
          joinedAt: participant.joinedAt.toISOString(),
          leftAt: null,
          isActive: true,
        },
      });

      // Send existing producers list so new peer can consume
      const existingProducers = room.getAllProducers();
      for (const prod of existingProducers) {
        socket.emit("ms:newProducer", {
          producerId: prod.producerId,
          participantId: prod.participantId,
          userName: prod.userName,
          kind: prod.kind,
        });
      }

      // Send chat history
      const messages = await MessageModel.find({ sessionId }).sort({ createdAt: 1 }).lean();
      socket.emit("chat:history", { messages: messages as any });

      logger.info(`${userName} (${role}) joined session ${sessionId}`);
      cb({ success: true, participantId: participant._id.toString() });
    } catch (err) {
      logger.error("session:join error", err);
      cb({ success: false, error: "Internal server error" });
    }
  });

  socket.on("session:end", async (payload, cb) => {
    try {
      const { sessionId } = payload;

      // Only agents can end sessions
      if (socket.data.role !== "AGENT") {
        return cb({ success: false, error: "Only agents can end sessions" });
      }

      const session = await SessionModel.findById(sessionId);
      if (!session) return cb({ success: false, error: "Session not found" });

      const startedAt = session.startedAt ?? new Date();
      const duration = Math.floor((Date.now() - startedAt.getTime()) / 1000);

      await SessionModel.findByIdAndUpdate(sessionId, {
        status: "ENDED",
        endedAt: new Date(),
        duration,
      });

      // Mark all participants as left
      await ParticipantModel.updateMany(
        { sessionId, isActive: true },
        { isActive: false, leftAt: new Date() }
      );

      // Close the room
      roomManager.close(sessionId);

      // Notify all in session
      socket.to(sessionId).emit("session:ended", {
        sessionId,
        endedBy: socket.data.userName,
      });

      await socket.leave(sessionId);

      logger.info(`Session ${sessionId} ended by ${socket.data.userName}`);
      cb({ success: true });
    } catch (err) {
      logger.error("session:end error", err);
      cb({ success: false, error: "Internal server error" });
    }
  });

  socket.on("session:leave", async (payload, cb) => {
    await handleLeave(socket, payload.sessionId, false);
    cb({ success: true });
  });
}

export async function handleDisconnect(socket: TypedSocket): Promise<void> {
  const { participantId, sessionId, userName } = socket.data;
  if (!participantId || !sessionId) return;

  const room = roomManager.get(sessionId);
  if (!room) return;

  room.markDisconnected(participantId);

  // Start grace period timer
  const peer = room.getPeer(participantId);
  if (peer) {
    peer.gracePeriodTimer = setTimeout(async () => {
      await handleLeave(socket, sessionId, true);
    }, SESSION_GRACE_WINDOW_MS);
  }

  logger.info(`${userName} disconnected from ${sessionId}, grace period started`);
}

async function handleLeave(socket: TypedSocket, sessionId: string, timedOut: boolean): Promise<void> {
  const { participantId, userName } = socket.data;
  if (!participantId) return;

  const room = roomManager.get(sessionId);
  if (room) {
    room.removePeer(participantId);
  }

  await ParticipantModel.findByIdAndUpdate(participantId, {
    isActive: false,
    leftAt: new Date(),
  });

  socket.to(sessionId).emit("user:left", { participantId, userName: userName ?? "Unknown" });

  if (!timedOut) {
    await socket.leave(sessionId);
  }

  logger.info(`${userName} left session ${sessionId} (timedOut=${timedOut})`);
}
