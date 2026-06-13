import mongoose, { Schema, type Document } from "mongoose";

export interface IMessage extends Document {
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
    type: {
      type: String,
      enum: ["TEXT", "FILE", "IMAGE", "SYSTEM"],
      default: "TEXT",
    },
    content: { type: String, required: true },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const MessageModel =
  (mongoose.models.Message as mongoose.Model<IMessage>) ??
  mongoose.model<IMessage>("Message", messageSchema);
