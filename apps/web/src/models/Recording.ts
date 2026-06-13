import mongoose, { Schema, type Document } from "mongoose";

export interface IRecording extends Document {
  sessionId: string;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  status: "PROCESSING" | "READY" | "FAILED";
  duration: number | null;
  fileSizeBytes: number | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
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

export const RecordingModel =
  (mongoose.models.Recording as mongoose.Model<IRecording>) ??
  mongoose.model<IRecording>("Recording", recordingSchema);
