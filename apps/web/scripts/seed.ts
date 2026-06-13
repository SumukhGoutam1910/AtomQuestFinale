/**
 * Run: npx tsx scripts/seed.ts
 * Seeds a demo admin + a couple of Atomberg support-team agent accounts.
 */

import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI env var required");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "AGENT" },
    createdBy: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const admin = {
    name: "Atomberg Admin",
    email: "admin@atomberg.com",
    password: "password123",
    role: "ADMIN" as const,
  };

  const adminDoc = await upsert(admin, null);

  const agents = [
    { name: "Priya Sharma", email: "priya@atomberg.com", password: "password123" },
    { name: "Rahul Verma", email: "rahul@atomberg.com", password: "password123" },
  ];

  for (const a of agents) {
    await upsert({ ...a, role: "AGENT" as const }, adminDoc?._id?.toString() ?? null);
  }

  console.log("\nSeed complete. Login credentials (all password: password123):");
  console.log("  ADMIN  → admin@atomberg.com");
  console.log("  AGENT  → priya@atomberg.com");
  console.log("  AGENT  → rahul@atomberg.com");

  await mongoose.disconnect();
}

async function upsert(
  u: { name: string; email: string; password: string; role: "ADMIN" | "AGENT" },
  createdBy: string | null
) {
  const existing = await User.findOne({ email: u.email });
  if (existing) {
    // keep role/createdBy in sync for re-runs
    existing.role = u.role;
    existing.createdBy = createdBy;
    existing.isActive = true;
    await existing.save();
    console.log(`  ⚡ Updated: ${u.email} (${u.role})`);
    return existing;
  }
  const hashed = await bcrypt.hash(u.password, 12);
  const doc = await User.create({ ...u, password: hashed, createdBy, isActive: true });
  console.log(`  ✓ Created: ${u.email} (${u.role})`);
  return doc;
}

seed().catch(console.error);
