import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";
import { roomManager } from "../../mediasoup/RoomManager";
import { SessionModel, FeedbackModel } from "../../models";
import { logger } from "../../lib/logger";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const METRICS = ["handling", "courteousness", "promptness"] as const;

function clampRating(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(5, Math.max(1, v));
}

export function registerFeedbackHandlers(socket: TypedSocket): void {
  // Agent requests end-of-call feedback from the customer.
  socket.on("feedback:request", async ({ sessionId }, cb) => {
    try {
      if (socket.data.role !== "AGENT") {
        return cb({ success: false, customerPresent: false, error: "Only agents can request feedback" });
      }

      const room = roomManager.get(sessionId);
      const hasCustomer = !!room?.getActivePeers().some((p) => p.role === "CUSTOMER");

      if (hasCustomer) {
        socket.to(sessionId).emit("feedback:requested", {
          sessionId,
          agentName: socket.data.userName ?? "the agent",
        });
      }

      cb({ success: true, customerPresent: hasCustomer });
    } catch (err) {
      logger.error("feedback:request error", err);
      cb({ success: false, customerPresent: false, error: String(err) });
    }
  });

  // Customer submits the feedback form.
  socket.on("feedback:submit", async ({ sessionId, ratings, comment }, cb) => {
    try {
      const session = await SessionModel.findById(sessionId).lean();
      if (!session) return cb({ success: false, error: "Session not found" });

      const normalized = {
        handling: clampRating(ratings?.handling),
        courteousness: clampRating(ratings?.courteousness),
        promptness: clampRating(ratings?.promptness),
      };

      for (const m of METRICS) {
        if (normalized[m] < 1) return cb({ success: false, error: "Please rate every metric" });
      }

      const overall =
        Math.round(((normalized.handling + normalized.courteousness + normalized.promptness) / 3) * 10) / 10;

      await FeedbackModel.create({
        sessionId,
        agentId: (session as any).agentId,
        agentName: (session as any).agentName,
        customerName: socket.data.userName ?? "Customer",
        ratings: normalized,
        overall,
        comment: (comment ?? "").toString().slice(0, 1000),
      });

      // Tell the agent the feedback is in — their "Confirm end" can now enable.
      socket.to(sessionId).emit("feedback:received", { sessionId });

      logger.info(`Feedback stored for session ${sessionId} (overall=${overall})`);
      cb({ success: true });
    } catch (err) {
      logger.error("feedback:submit error", err);
      cb({ success: false, error: String(err) });
    }
  });
}
