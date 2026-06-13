import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { generateInviteToken, buildInviteUrl } from "@supportvision/shared";
import type { ApiResponse, Session } from "@supportvision/types";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ session: Session; inviteUrl: string }>>> {
  try {
    const serverSession = await getServerSession(authOptions);
    if (!serverSession?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";
    const name = rawName.slice(0, 80) || "Untitled session";
    const customerName =
      typeof body?.customerName === "string" ? body.customerName.trim().slice(0, 80) : "";
    const customerPhone =
      typeof body?.customerPhone === "string" ? body.customerPhone.trim().slice(0, 30) : "";

    const inviteToken = generateInviteToken();
    const session = await SessionModel.create({
      name,
      customerName,
      customerPhone,
      agentId: serverSession.user.id,
      agentName: serverSession.user.name,
      inviteToken,
      status: "CREATED",
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = buildInviteUrl(baseUrl, inviteToken);

    return NextResponse.json({
      success: true,
      data: {
        session: {
          _id: session._id.toString(),
          name: session.name,
          customerName: session.customerName,
          customerPhone: session.customerPhone,
          agentId: session.agentId,
          agentName: session.agentName,
          inviteToken: session.inviteToken,
          status: session.status,
          startedAt: null,
          endedAt: null,
          duration: null,
          createdAt: session.createdAt.toISOString(),
        },
        inviteUrl,
      },
    });
  } catch (err) {
    console.error("[POST /api/session/create]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
