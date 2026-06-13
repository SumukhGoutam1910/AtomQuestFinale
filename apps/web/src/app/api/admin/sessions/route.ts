import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { ParticipantModel } from "@/models/Participant";
import type { ApiResponse } from "@supportvision/types";

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const serverSession = await getServerSession(authOptions);
    if (!serverSession?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    const query = status ? { status } : {};
    const sessions = await SessionModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const sessionIds = sessions.map((s) => s._id.toString());
    const participants = await ParticipantModel.find({ sessionId: { $in: sessionIds } }).lean();

    const participantsBySession = participants.reduce((acc, p) => {
      const sid = p.sessionId;
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(p);
      return acc;
    }, {} as Record<string, any[]>);

    const enriched = sessions.map((s) => ({
      _id: s._id.toString(),
      agentId: s.agentId,
      agentName: s.agentName,
      inviteToken: s.inviteToken,
      status: s.status,
      startedAt: s.startedAt?.toISOString() ?? null,
      endedAt: s.endedAt?.toISOString() ?? null,
      duration: s.duration,
      createdAt: (s as any).createdAt?.toISOString(),
      participants: (participantsBySession[s._id.toString()] ?? []).map((p: any) => ({
        _id: p._id.toString(),
        userName: p.userName,
        role: p.role,
        isActive: p.isActive,
        joinedAt: p.joinedAt?.toISOString(),
        leftAt: p.leftAt?.toISOString() ?? null,
      })),
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error("[GET /api/admin/sessions]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
