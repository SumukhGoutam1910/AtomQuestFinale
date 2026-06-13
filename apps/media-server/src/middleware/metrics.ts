import { Registry, collectDefaultMetrics, Gauge, Counter } from "prom-client";
import { roomManager } from "../mediasoup/RoomManager";

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const activeSessions = new Gauge({
  name: "supportvision_active_sessions",
  help: "Number of active sessions",
  registers: [registry],
  collect() {
    this.set(roomManager.activeRoomCount);
  },
});

export const connectedParticipants = new Gauge({
  name: "supportvision_connected_participants",
  help: "Total connected participants",
  registers: [registry],
  collect() {
    this.set(roomManager.totalPeerCount);
  },
});

export const totalMessages = new Counter({
  name: "supportvision_messages_total",
  help: "Total chat messages sent",
  registers: [registry],
});

export const totalSessions = new Counter({
  name: "supportvision_sessions_total",
  help: "Total sessions created",
  registers: [registry],
});
