import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";
import { registerSessionHandlers, handleDisconnect } from "./handlers/session";
import { registerMediasoupHandlers } from "./handlers/mediasoup";
import { registerChatHandlers } from "./handlers/chat";
import { registerRecordingHandlers } from "./handlers/recording";
import { registerFeedbackHandlers } from "./handlers/feedback";
import { config } from "../config";
import { logger } from "../lib/logger";

export function createSocketServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    registerSessionHandlers(socket);
    registerMediasoupHandlers(socket);
    registerChatHandlers(socket);
    registerRecordingHandlers(socket);
    registerFeedbackHandlers(socket);

    socket.on("disconnect", async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason})`);
      await handleDisconnect(socket);
    });

    socket.on("error", (err) => {
      logger.error(`Socket error on ${socket.id}`, err);
    });
  });

  return io;
}
