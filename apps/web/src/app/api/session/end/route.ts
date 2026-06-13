import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { ParticipantModel } from "@/models/Participant";
import type { ApiResponse } from "@supportvision/types";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const serverSession = await getServerSession(authOptions);
    if (!serverSession?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId required" }, { status: 400 });
    }

    await connectDB();

    const session = await SessionModel.findById(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    if (session.agentId !== serverSession.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const startedAt = session.startedAt ?? new Date();
    const duration = Math.floor((Date.now() - startedAt.getTime()) / 1000);

    await Promise.all([
      SessionModel.findByIdAndUpdate(sessionId, {
        status: "ENDED",
        endedAt: new Date(),
        duration,
      }),
      ParticipantModel.updateMany(
        { sessionId, isActive: true },
        { isActive: false, leftAt: new Date() }
      ),
    ]);

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error("[POST /api/session/end]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
