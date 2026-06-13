import type {
  Message,
  Participant,
  TransportOptions,
  ConsumerOptions,
  RtpCapabilities,
  DtlsParameters,
  RtpParameters,
  RecordingStatus,
  UserRole,
  Ratings,
} from "@supportvision/types";

// ─── Client → Server events ───────────────────────────────────────────────────

export interface ClientToServerEvents {
  // Session lifecycle
  "session:join": (
    payload: { sessionId: string; userName: string; role: UserRole; inviteToken?: string },
    cb: (res: { success: boolean; error?: string; participantId?: string }) => void
  ) => void;

  "session:leave": (
    payload: { sessionId: string },
    cb: (res: { success: boolean }) => void
  ) => void;

  "session:end": (
    payload: { sessionId: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Chat
  "chat:send": (
    payload: {
      sessionId: string;
      content: string;
      type: "TEXT" | "FILE" | "IMAGE";
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
    },
    cb: (res: { success: boolean; message?: Message; error?: string }) => void
  ) => void;

  // Mediasoup signaling
  "ms:getRouterRtpCapabilities": (
    payload: { sessionId: string },
    cb: (res: { success: boolean; rtpCapabilities?: RtpCapabilities; error?: string }) => void
  ) => void;

  "ms:createTransport": (
    payload: { sessionId: string; direction: "send" | "recv" },
    cb: (res: { success: boolean; transportOptions?: TransportOptions; error?: string }) => void
  ) => void;

  "ms:connectTransport": (
    payload: { sessionId: string; transportId: string; dtlsParameters: DtlsParameters },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;

  "ms:produce": (
    payload: {
      sessionId: string;
      transportId: string;
      kind: "audio" | "video";
      rtpParameters: RtpParameters;
    },
    cb: (res: { success: boolean; producerId?: string; error?: string }) => void
  ) => void;

  "ms:consume": (
    payload: {
      sessionId: string;
      transportId: string;
      producerId: string;
      rtpCapabilities: RtpCapabilities;
    },
    cb: (res: { success: boolean; consumerOptions?: ConsumerOptions; error?: string }) => void
  ) => void;

  "ms:resumeConsumer": (
    payload: { sessionId: string; consumerId: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;

  "ms:closeProducer": (
    payload: { sessionId: string; producerId: string },
    cb: (res: { success: boolean }) => void
  ) => void;

  // Recording (agent only)
  "recording:start": (
    payload: { sessionId: string },
    cb: (res: { success: boolean; recordingId?: string; error?: string }) => void
  ) => void;

  "recording:stop": (
    payload: { sessionId: string; recordingId: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Feedback (end-of-call): agent requests, customer submits
  "feedback:request": (
    payload: { sessionId: string },
    cb: (res: { success: boolean; customerPresent: boolean; error?: string }) => void
  ) => void;

  "feedback:submit": (
    payload: { sessionId: string; ratings: Ratings; comment: string },
    cb: (res: { success: boolean; error?: string }) => void
  ) => void;

  // Reconnect
  "session:reconnect": (
    payload: { sessionId: string; participantId: string; inviteToken?: string },
    cb: (res: {
      success: boolean;
      error?: string;
      transportOptions?: { send: TransportOptions; recv: TransportOptions };
    }) => void
  ) => void;
}

// ─── Server → Client events ───────────────────────────────────────────────────

export interface ServerToClientEvents {
  // Presence
  "user:joined": (payload: { participant: Participant }) => void;
  "user:left": (payload: { participantId: string; userName: string }) => void;
  "user:reconnected": (payload: { participantId: string; userName: string }) => void;

  // Session
  "session:ended": (payload: { sessionId: string; endedBy: string }) => void;
  "session:participantsList": (payload: { participants: Participant[] }) => void;

  // Chat
  "chat:receive": (payload: { message: Message }) => void;
  "chat:history": (payload: { messages: Message[] }) => void;

  // Mediasoup — new producer from another peer
  "ms:newProducer": (payload: {
    producerId: string;
    participantId: string;
    userName: string;
    kind: "audio" | "video";
  }) => void;

  "ms:producerClosed": (payload: { producerId: string; participantId: string }) => void;

  // Recording status
  "recording:statusUpdate": (payload: {
    recordingId: string;
    sessionId: string;
    status: RecordingStatus;
    recordingUrl?: string;
  }) => void;

  // Feedback
  "feedback:requested": (payload: { sessionId: string; agentName: string }) => void;
  "feedback:received": (payload: { sessionId: string }) => void;

  // Error
  "server:error": (payload: { code: string; message: string }) => void;
}

// ─── Inter-server events (Socket.IO cluster / adapter) ───────────────────────

export interface InterServerEvents {
  ping: () => void;
}

// ─── Socket data ─────────────────────────────────────────────────────────────

export interface SocketData {
  participantId: string;
  sessionId: string;
  userName: string;
  role: UserRole;
  reconnectGrace?: ReturnType<typeof setTimeout>;
}

// ─── Event name constants ─────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  SESSION_JOIN: "session:join",
  SESSION_LEAVE: "session:leave",
  SESSION_END: "session:end",
  SESSION_ENDED: "session:ended",
  SESSION_RECONNECT: "session:reconnect",
  SESSION_PARTICIPANTS_LIST: "session:participantsList",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  USER_RECONNECTED: "user:reconnected",
  CHAT_SEND: "chat:send",
  CHAT_RECEIVE: "chat:receive",
  CHAT_HISTORY: "chat:history",
  MS_GET_ROUTER_RTP_CAPABILITIES: "ms:getRouterRtpCapabilities",
  MS_CREATE_TRANSPORT: "ms:createTransport",
  MS_CONNECT_TRANSPORT: "ms:connectTransport",
  MS_PRODUCE: "ms:produce",
  MS_CONSUME: "ms:consume",
  MS_RESUME_CONSUMER: "ms:resumeConsumer",
  MS_CLOSE_PRODUCER: "ms:closeProducer",
  MS_NEW_PRODUCER: "ms:newProducer",
  MS_PRODUCER_CLOSED: "ms:producerClosed",
  RECORDING_START: "recording:start",
  RECORDING_STOP: "recording:stop",
  RECORDING_STATUS_UPDATE: "recording:statusUpdate",
  SERVER_ERROR: "server:error",
} as const;
