import mongoose from "mongoose";
import { config } from "../config";
import { logger } from "./logger";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;
  await mongoose.connect(config.mongodb.uri);
  isConnected = true;
  logger.info("MongoDB connected (media-server)");
}
