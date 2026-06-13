/**
 * Run: npx ts-node scripts/seed.ts
 * Creates a demo agent account for judging.
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI env var required");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "AGENT" },
}, { timestamps: true });

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const demoAgents = [
    { name: "Admin Agent", email: "admin@supportvision.com", password: "password123" },
    { name: "Support Agent", email: "agent@supportvision.com", password: "password123" },
  ];

  for (const agent of demoAgents) {
    const exists = await User.findOne({ email: agent.email });
    if (exists) {
      console.log(`  ⚡ Already exists: ${agent.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(agent.password, 12);
    await User.create({ ...agent, password: hashed, role: "AGENT" });
    console.log(`  ✓ Created: ${agent.email}`);
  }

  console.log("\nSeed complete. Login credentials:");
  console.log("  Email: admin@supportvision.com");
  console.log("  Password: password123");

  await mongoose.disconnect();
}

seed().catch(console.error);
