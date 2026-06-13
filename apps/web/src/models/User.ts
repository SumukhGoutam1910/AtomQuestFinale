import mongoose, { Schema, type Document } from "mongoose";

export type AppRole = "ADMIN" | "AGENT";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  createdBy: string | null; // admin id who created this agent (null for admins)
  isActive: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ["ADMIN", "AGENT"], default: "AGENT" },
    createdBy: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Dev-safe re-registration so schema edits take effect on hot-reload.
if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  mongoose.deleteModel("User");
}

export const UserModel = mongoose.model<IUser>("User", userSchema);
