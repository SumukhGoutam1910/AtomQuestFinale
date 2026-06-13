// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = "AGENT" | "CUSTOMER";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// Platform account (Admin or Agent/Captain) for team management.
export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  isActive: boolean;
  createdAt: string;
  sessionCount?: number;
  kpi?: AgentKpi;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type SessionStatus = "CREATED" | "ACTIVE" | "ENDED";

export interface Session {
  _id: string;
  name: string;
  customerName: string;
  customerPhone: string;
  agentId: string;
  agentName: string;
  createdById?: string;
  createdByName?: string;
  inviteToken: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
}

export interface SessionWithParticipants extends Session {
  participants: Participant[];
  messageCount: number;
  recording?: Recording;
}

// ─── Participant ──────────────────────────────────────────────────────────────

export interface Participant {
  _id: string;
  sessionId: string;
  userName: string;
  role: UserRole;
  socketId: string;
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export type MessageType = "TEXT" | "FILE" | "IMAGE" | "SYSTEM";

export interface Message {
  _id: string;
  sessionId: string;
  sender: string;
  senderRole: UserRole;
  type: MessageType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

// ─── Recording ────────────────────────────────────────────────────────────────

export type RecordingStatus = "PROCESSING" | "READY" | "FAILED";

export interface Recording {
  _id: string;
  sessionId: string;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  status: RecordingStatus;
  duration: number | null;
  fileSizeBytes: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

// ─── File ─────────────────────────────────────────────────────────────────────

export interface SharedFile {
  _id: string;
  sessionId: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ─── WebRTC / Mediasoup ───────────────────────────────────────────────────────

export interface RtpCapabilities {
  codecs?: RtpCodecCapability[];
  headerExtensions?: RtpHeaderExtension[];
}

export interface RtpCodecCapability {
  kind: "audio" | "video";
  mimeType: string;
  preferredPayloadType?: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: RtcpFeedback[];
}

export interface RtpHeaderExtension {
  kind?: "audio" | "video";
  uri: string;
  preferredId: number;
  preferredEncrypt?: boolean;
  direction?: "sendrecv" | "sendonly" | "recvonly" | "inactive";
}

export interface RtcpFeedback {
  type: string;
  parameter?: string;
}

export interface DtlsParameters {
  role?: "auto" | "client" | "server";
  fingerprints: DtlsFingerprint[];
}

export interface DtlsFingerprint {
  algorithm: string;
  value: string;
}

export interface IceParameters {
  usernameFragment: string;
  password: string;
  iceLite?: boolean;
}

export interface IceCandidate {
  foundation: string;
  priority: number;
  ip: string;
  address?: string;
  protocol: "udp" | "tcp";
  port: number;
  type: "host" | "srflx" | "prflx" | "relay";
  tcpType?: "active" | "passive" | "so";
}

export interface TransportOptions {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface ProducerOptions {
  id: string;
}

export interface ConsumerOptions {
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
}

export interface RtpParameters {
  mid?: string;
  codecs: RtpCodecParameters[];
  headerExtensions?: RtpHeaderExtensionParameters[];
  encodings?: RtpEncodingParameters[];
  rtcp?: RtcpParameters;
}

export interface RtpCodecParameters {
  mimeType: string;
  payloadType: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: RtcpFeedback[];
}

export interface RtpHeaderExtensionParameters {
  uri: string;
  id: number;
  encrypt?: boolean;
  parameters?: Record<string, unknown>;
}

export interface RtpEncodingParameters {
  ssrc?: number;
  rid?: string;
  codecPayloadType?: number;
  rtx?: { ssrc: number };
  dtx?: boolean;
  scalabilityMode?: string;
  maxBitrate?: number;
}

export interface RtcpParameters {
  cname?: string;
  reducedSize?: boolean;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Feedback & KPI ────────────────────────────────────────────────────────

export const KPI_METRICS = ["handling", "courteousness", "promptness"] as const;
export type KpiMetric = (typeof KPI_METRICS)[number];

export const KPI_METRIC_LABELS: Record<KpiMetric, string> = {
  handling: "Issue handling",
  courteousness: "Courteousness",
  promptness: "Promptness",
};

export type Ratings = Record<KpiMetric, number>; // each 1–5

export interface Feedback {
  _id: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  customerName: string;
  ratings: Ratings;
  overall: number; // average of the metric ratings
  comment: string;
  createdAt: string;
}

// Aggregated KPI for one agent.
export interface AgentKpi {
  agentId: string;
  agentName: string;
  feedbackCount: number;
  overall: number; // avg overall rating
  averages: Ratings; // per-metric averages
}

// ─── Admin / Metrics ─────────────────────────────────────────────────────────

export interface SystemMetrics {
  activeSessions: number;
  connectedParticipants: number;
  totalSessionsToday: number;
  totalMessagesToday: number;
  totalRecordings: number;
  recordingsProcessing: number;
  uptime: number;
}
