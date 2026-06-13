import mongoose, { Schema, type Document } from "mongoose";

export interface ISession extends Document {
  name: string;
  customerName: string;
  customerPhone: string;
  // The assigned agent ("captain") who runs the call.
  agentId: string;
  agentName: string;
  // The admin who created and assigned the session.
  createdById: string;
  createdByName: string;
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
    name: { type: String, required: true, default: "Untitled session", trim: true },
    customerName: { type: String, default: "", trim: true },
    customerPhone: { type: String, default: "", trim: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    createdById: { type: String, default: "", index: true },
    createdByName: { type: String, default: "" },
    inviteToken: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["CREATED", "ACTIVE", "ENDED"],
      default: "CREATED",
      index: true,
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: null },
  },
  { timestamps: true }
);

// In dev, drop the cached model so schema edits take effect on hot-reload.
// (Mongoose caches models on a global singleton; without this, added fields
// are silently stripped until a full process restart.)
if (process.env.NODE_ENV !== "production" && mongoose.models.Session) {
  mongoose.deleteModel("Session");
}

export const SessionModel = mongoose.model<ISession>("Session", sessionSchema);
