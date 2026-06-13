import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";
import { MessageModel } from "../../models";
import { logger } from "../../lib/logger";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerChatHandlers(socket: TypedSocket): void {
  socket.on("chat:send", async (payload, cb) => {
    try {
      const { sessionId, content, type, fileUrl, fileName, fileSize } = payload;
      const { userName, role } = socket.data;

      if (!userName || !role) {
        return cb({ success: false, error: "Not authenticated in session" });
      }

      const message = await MessageModel.create({
        sessionId,
        sender: userName,
        senderRole: role,
        type,
        content,
        fileUrl,
        fileName,
        fileSize,
      });

      const msg = {
        _id: message._id.toString(),
        sessionId,
        sender: userName,
        senderRole: role,
        type,
        content,
        fileUrl,
        fileName,
        fileSize,
        createdAt: message.createdAt.toISOString(),
      };

      // Broadcast to all in session (including sender via the cb)
      socket.to(sessionId).emit("chat:receive", { message: msg });

      logger.debug(`Chat message in session ${sessionId} from ${userName}`);
      cb({ success: true, message: msg });
    } catch (err) {
      logger.error("chat:send error", err);
      cb({ success: false, error: "Failed to send message" });
    }
  });
}
