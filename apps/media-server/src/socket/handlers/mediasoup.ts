import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";
import { roomManager } from "../../mediasoup/RoomManager";
import { logger } from "../../lib/logger";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerMediasoupHandlers(socket: TypedSocket): void {
  socket.on("ms:getRouterRtpCapabilities", async ({ sessionId }, cb) => {
    try {
      const room = await roomManager.getOrCreate(sessionId);
      cb({ success: true, rtpCapabilities: room.getRtpCapabilities() });
    } catch (err) {
      logger.error("ms:getRouterRtpCapabilities error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("ms:createTransport", async ({ sessionId, direction }, cb) => {
    try {
      const room = roomManager.get(sessionId);
      if (!room) return cb({ success: false, error: "Room not found" });

      const { participantId } = socket.data;
      if (!participantId) return cb({ success: false, error: "Not in session" });

      const transport = await room.createWebRtcTransport(participantId, direction);

      cb({
        success: true,
        transportOptions: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates as any,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    } catch (err) {
      logger.error("ms:createTransport error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("ms:connectTransport", async ({ sessionId, transportId, dtlsParameters }, cb) => {
    try {
      const room = roomManager.get(sessionId);
      if (!room) return cb({ success: false, error: "Room not found" });

      const { participantId } = socket.data;
      if (!participantId) return cb({ success: false, error: "Not in session" });

      await room.connectTransport(participantId, transportId, dtlsParameters);
      cb({ success: true });
    } catch (err) {
      logger.error("ms:connectTransport error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("ms:produce", async ({ sessionId, transportId, kind, rtpParameters }, cb) => {
    try {
      const room = roomManager.get(sessionId);
      if (!room) return cb({ success: false, error: "Room not found" });

      const { participantId, userName } = socket.data;
      if (!participantId) return cb({ success: false, error: "Not in session" });

      const producer = await room.produce(participantId, transportId, kind, rtpParameters);

      // Notify all other peers in the room about the new producer
      socket.to(sessionId).emit("ms:newProducer", {
        producerId: producer.id,
        participantId,
        userName: userName ?? "Unknown",
        kind,
      });

      cb({ success: true, producerId: producer.id });
    } catch (err) {
      logger.error("ms:produce error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("ms:consume", async ({ sessionId, transportId, producerId, rtpCapabilities }, cb) => {
    try {
      const room = roomManager.get(sessionId);
      if (!room) return cb({ success: false, error: "Room not found" });

      const { participantId } = socket.data;
      if (!participantId) return cb({ success: false, error: "Not in session" });

      const consumer = await room.consume(participantId, transportId, producerId, rtpCapabilities);

      cb({
        success: true,
        consumerOptions: {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters as any,
        },
      });
    } catch (err) {
      logger.error("ms:consume error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("ms:resumeConsumer", async ({ sessionId, consumerId }, cb) => {
    try {
      const room = roomManager.get(sessionId);
      if (!room) return cb({ success: false, error: "Room not found" });

      const { participantId } = socket.data;
      if (!participantId) return cb({ success: false, error: "Not in session" });

      await room.resumeConsumer(participantId, consumerId);
      cb({ success: true });
    } catch (err) {
      logger.error("ms:resumeConsumer error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("ms:closeProducer", async ({ sessionId, producerId }, cb) => {
    try {
      const room = roomManager.get(sessionId);
      if (!room) return cb({ success: true });

      const { participantId } = socket.data;
      if (!participantId) return cb({ success: true });

      room.closeProducer(participantId, producerId);

      socket.to(sessionId).emit("ms:producerClosed", { producerId, participantId });

      cb({ success: true });
    } catch (err) {
      logger.error("ms:closeProducer error", err);
      cb({ success: true }); // non-fatal
    }
  });
}
