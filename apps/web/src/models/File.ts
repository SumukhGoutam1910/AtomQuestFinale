import mongoose, { Schema, type Document } from "mongoose";

export interface IFile extends Document {
  sessionId: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  uploadedBy: string;
  uploadedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    sessionId: { type: String, required: true, index: true },
    messageId: { type: String, default: "" },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Dev-safe re-registration so schema edits take effect on hot-reload.
if (process.env.NODE_ENV !== "production" && mongoose.models.File) {
  mongoose.deleteModel("File");
}

export const FileModel = mongoose.model<IFile>("File", fileSchema);
