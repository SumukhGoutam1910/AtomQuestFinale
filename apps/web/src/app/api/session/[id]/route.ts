import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { ParticipantModel } from "@/models/Participant";
import { RecordingModel } from "@/models/Recording";
import type { ApiResponse } from "@supportvision/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { id } = await params;
    const serverSession = await getServerSession(authOptions);
    if (!serverSession?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const session = await SessionModel.findById(id).lean();
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // Agents can only see their own sessions
    if (session.agentId !== serverSession.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const [participants, recording] = await Promise.all([
      ParticipantModel.find({ sessionId: id }).sort({ joinedAt: 1 }).lean(),
      RecordingModel.findOne({ sessionId: id }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        session: {
          _id: session._id.toString(),
          agentId: session.agentId,
          agentName: session.agentName,
          inviteToken: session.inviteToken,
          status: session.status,
          startedAt: session.startedAt?.toISOString() ?? null,
          endedAt: session.endedAt?.toISOString() ?? null,
          duration: session.duration,
          createdAt: (session as any).createdAt?.toISOString(),
        },
        participants: participants.map((p) => ({
          _id: p._id.toString(),
          sessionId: p.sessionId,
          userName: p.userName,
          role: p.role,
          socketId: p.socketId,
          joinedAt: p.joinedAt?.toISOString(),
          leftAt: p.leftAt?.toISOString() ?? null,
          isActive: p.isActive,
        })),
        recording: recording
          ? {
              _id: recording._id.toString(),
              sessionId: recording.sessionId,
              recordingUrl: recording.recordingUrl,
              status: recording.status,
              duration: recording.duration,
              fileSizeBytes: recording.fileSizeBytes,
              createdAt: (recording as any).createdAt?.toISOString(),
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[GET /api/session/[id]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
