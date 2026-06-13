import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RecordingModel } from "@/models/Recording";
import type { ApiResponse, Recording } from "@supportvision/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<ApiResponse<Recording | null>>> {
  try {
    const { sessionId } = await params;
    await connectDB();

    const recording = await RecordingModel.findOne({ sessionId }).lean();

    if (!recording) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: recording._id.toString(),
        sessionId: recording.sessionId,
        recordingUrl: recording.recordingUrl,
        thumbnailUrl: recording.thumbnailUrl,
        status: recording.status,
        duration: recording.duration,
        fileSizeBytes: recording.fileSizeBytes,
        startedAt: recording.startedAt?.toISOString(),
        endedAt: recording.endedAt?.toISOString() ?? null,
        createdAt: (recording as any).createdAt?.toISOString(),
      },
    });
  } catch (err) {
    console.error("[GET /api/recording/[sessionId]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
