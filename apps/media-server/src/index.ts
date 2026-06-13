import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(__dirname, "../../../.env") });
import http from "http";
import express from "express";
import cors from "cors";
import { connectDB } from "./lib/db";
import { createWorkers, closeAllWorkers } from "./mediasoup/WorkerPool";
import { createSocketServer } from "./socket/SocketServer";
import { registry, activeSessions, connectedParticipants } from "./middleware/metrics";
import { roomManager } from "./mediasoup/RoomManager";
import { SessionModel, ParticipantModel, MessageModel, RecordingModel } from "./models";
import { config } from "./config";
import { logger } from "./lib/logger";

async function bootstrap(): Promise<void> {
  await connectDB();
  await createWorkers();

  const app = express();
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      activeSessions: roomManager.activeRoomCount,
      connectedParticipants: roomManager.totalPeerCount,
      uptime: process.uptime(),
    });
  });

  // Prometheus metrics
  app.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  // Admin: list active sessions with participants
  app.get("/admin/sessions", async (_req, res) => {
    try {
      const sessions = await SessionModel.find({ status: { $in: ["CREATED", "ACTIVE"] } })
        .sort({ createdAt: -1 })
        .lean();
      res.json({ success: true, data: sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Admin: session history
  app.get("/admin/sessions/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string ?? "50", 10);
      const sessions = await SessionModel.find({ status: "ENDED" })
        .sort({ endedAt: -1 })
        .limit(limit)
        .lean();
      res.json({ success: true, data: sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Admin: session detail with participants, messages, recording
  app.get("/admin/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [session, participants, messages, recording] = await Promise.all([
        SessionModel.findById(id).lean(),
        ParticipantModel.find({ sessionId: id }).lean(),
        MessageModel.find({ sessionId: id }).sort({ createdAt: 1 }).lean(),
        RecordingModel.findOne({ sessionId: id }).lean(),
      ]);
      if (!session) return res.status(404).json({ success: false, error: "Not found" });
      res.json({ success: true, data: { session, participants, messages, recording } });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Admin: end a session
  app.post("/admin/sessions/:id/end", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await SessionModel.findById(id);
      if (!session) return res.status(404).json({ success: false, error: "Not found" });

      const duration = session.startedAt
        ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
        : 0;

      await SessionModel.findByIdAndUpdate(id, {
        status: "ENDED",
        endedAt: new Date(),
        duration,
      });

      await ParticipantModel.updateMany(
        { sessionId: id, isActive: true },
        { isActive: false, leftAt: new Date() }
      );

      roomManager.close(id);
      io.to(id).emit("session:ended", { sessionId: id, endedBy: "admin" });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Recording download info
  app.get("/recording/:sessionId", async (req, res) => {
    try {
      const recording = await RecordingModel.findOne({ sessionId: req.params.sessionId }).lean();
      res.json({ success: true, data: recording });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer);

  httpServer.listen(config.port, () => {
    logger.info(`Media server running on port ${config.port}`);
    logger.info(`Mediasoup workers: ${config.mediasoup.numWorkers}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down media server...");
    roomManager.closeAll();
    await closeAllWorkers();
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err) => {
  console.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
