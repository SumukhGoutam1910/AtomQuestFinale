import mongoose, { Schema, type Model } from "mongoose";

// ─── Session ──────────────────────────────────────────────────────────────────

export interface ISession {
  _id: mongoose.Types.ObjectId;
  name: string;
  customerName: string;
  customerPhone: string;
  agentId: string;
  agentName: string;
  inviteToken: string;
  status: "CREATED" | "ACTIVE" | "ENDED";
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    name: { type: String, default: "Untitled session" },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    inviteToken: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["CREATED", "ACTIVE", "ENDED"],
      default: "CREATED",
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: null },
  },
  { timestamps: true }
);

export const SessionModel: Model<ISession> =
  (mongoose.models.Session as Model<ISession>) ??
  mongoose.model<ISession>("Session", sessionSchema);

// ─── Participant ──────────────────────────────────────────────────────────────

export interface IParticipant {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  userName: string;
  role: "AGENT" | "CUSTOMER";
  socketId: string;
  joinedAt: Date;
  leftAt: Date | null;
  isActive: boolean;
}

const participantSchema = new Schema<IParticipant>(
  {
    sessionId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    role: { type: String, enum: ["AGENT", "CUSTOMER"], required: true },
    socketId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: false }
);

export const ParticipantModel: Model<IParticipant> =
  (mongoose.models.Participant as Model<IParticipant>) ??
  mongoose.model<IParticipant>("Participant", participantSchema);

// ─── Message ──────────────────────────────────────────────────────────────────

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  sender: string;
  senderRole: "AGENT" | "CUSTOMER";
  type: "TEXT" | "FILE" | "IMAGE" | "SYSTEM";
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sessionId: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    senderRole: { type: String, enum: ["AGENT", "CUSTOMER"], required: true },
    type: { type: String, enum: ["TEXT", "FILE", "IMAGE", "SYSTEM"], default: "TEXT" },
    content: { type: String, required: true },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const MessageModel: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ??
  mongoose.model<IMessage>("Message", messageSchema);

// ─── Recording ────────────────────────────────────────────────────────────────

export interface IRecording {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  status: "PROCESSING" | "READY" | "FAILED";
  duration: number | null;
  fileSizeBytes: number | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const recordingSchema = new Schema<IRecording>(
  {
    sessionId: { type: String, required: true, index: true },
    recordingUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["PROCESSING", "READY", "FAILED"],
      default: "PROCESSING",
    },
    duration: { type: Number, default: null },
    fileSizeBytes: { type: Number, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const RecordingModel: Model<IRecording> =
  (mongoose.models.Recording as Model<IRecording>) ??
  mongoose.model<IRecording>("Recording", recordingSchema);

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface IFeedback {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  agentId: string;
  agentName: string;
  customerName: string;
  ratings: { handling: number; courteousness: number; promptness: number };
  overall: number;
  comment: string;
  createdAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    sessionId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    customerName: { type: String, default: "" },
    ratings: {
      handling: { type: Number, min: 1, max: 5, required: true },
      courteousness: { type: Number, min: 1, max: 5, required: true },
      promptness: { type: Number, min: 1, max: 5, required: true },
    },
    overall: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const FeedbackModel: Model<IFeedback> =
  (mongoose.models.Feedback as Model<IFeedback>) ??
  mongoose.model<IFeedback>("Feedback", feedbackSchema);
