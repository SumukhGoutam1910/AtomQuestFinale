import mongoose, { Schema, type Document } from "mongoose";

export interface IParticipant extends Document {
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

export const ParticipantModel =
  (mongoose.models.Participant as mongoose.Model<IParticipant>) ??
  mongoose.model<IParticipant>("Participant", participantSchema);
