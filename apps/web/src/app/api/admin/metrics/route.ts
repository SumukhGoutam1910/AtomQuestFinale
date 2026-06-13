import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { MessageModel } from "@/models/Message";
import { RecordingModel } from "@/models/Recording";
import type { ApiResponse, SystemMetrics } from "@supportvision/types";

export async function GET(): Promise<NextResponse<ApiResponse<SystemMetrics>>> {
  try {
    const serverSession = await getServerSession(authOptions);
    if (!serverSession?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeSessions, todaySessions, todayMessages, totalRecordings, processingRecordings] =
      await Promise.all([
        SessionModel.countDocuments({ status: { $in: ["CREATED", "ACTIVE"] } }),
        SessionModel.countDocuments({ createdAt: { $gte: today } }),
        MessageModel.countDocuments({ createdAt: { $gte: today } }),
        RecordingModel.countDocuments({}),
        RecordingModel.countDocuments({ status: "PROCESSING" }),
      ]);

    // Get connected participants from media server
    let connectedParticipants = 0;
    try {
      const mediaServerUrl = process.env.MEDIA_SERVER_INTERNAL_URL ?? "http://localhost:3001";
      const res = await fetch(`${mediaServerUrl}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        connectedParticipants = data.connectedParticipants ?? 0;
      }
    } catch {
      // media server unreachable — not fatal
    }

    return NextResponse.json({
      success: true,
      data: {
        activeSessions,
        connectedParticipants,
        totalSessionsToday: todaySessions,
        totalMessagesToday: todayMessages,
        totalRecordings,
        recordingsProcessing: processingRecordings,
        uptime: process.uptime(),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/metrics]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
