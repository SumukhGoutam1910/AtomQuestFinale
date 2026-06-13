import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";
import { RecordingModel } from "../../models";
import { logger } from "../../lib/logger";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * Recording is captured client-side (the agent's browser composites both
 * participants and uploads the file to Cloudinary via /api/recording/upload).
 *
 * The media server only:
 *   - creates the Recording record on start (status PROCESSING)
 *   - broadcasts the READY status to the room on stop (once the file is up)
 *
 * Role enforcement: only AGENT can control recording.
 */
export function registerRecordingHandlers(socket: TypedSocket): void {
  socket.on("recording:start", async ({ sessionId }, cb) => {
    try {
      if (socket.data.role !== "AGENT") {
        return cb({ success: false, error: "Only agents can start recording" });
      }

      const recording = await RecordingModel.create({
        sessionId,
        status: "PROCESSING",
        startedAt: new Date(),
      });

      logger.info(`Recording ${recording._id} started for session ${sessionId}`);
      cb({ success: true, recordingId: recording._id.toString() });
    } catch (err) {
      logger.error("recording:start error", err);
      cb({ success: false, error: String(err) });
    }
  });

  socket.on("recording:stop", async ({ sessionId, recordingId }, cb) => {
    try {
      if (socket.data.role !== "AGENT") {
        return cb({ success: false, error: "Only agents can stop recording" });
      }

      cb({ success: true });

      // The upload endpoint has already set the doc to READY (or FAILED).
      const rec = await RecordingModel.findById(recordingId).lean();
      const status = ((rec as any)?.status as "PROCESSING" | "READY" | "FAILED") ?? "PROCESSING";

      const io = socket.nsp.server;
      io.to(sessionId).emit("recording:statusUpdate", {
        recordingId,
        sessionId,
        status,
        recordingUrl: (rec as any)?.recordingUrl ?? undefined,
      });

      logger.info(`Recording ${recordingId} stopped (status=${status})`);
    } catch (err) {
      logger.error("recording:stop error", err);
    }
  });
}
