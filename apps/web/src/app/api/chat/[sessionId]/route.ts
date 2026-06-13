import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MessageModel } from "@/models/Message";
import { SessionModel } from "@/models/Session";
import type { ApiResponse, Message } from "@supportvision/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<ApiResponse<Message[]>>> {
  try {
    const { sessionId } = await params;
    await connectDB();

    const session = await SessionModel.findById(sessionId).lean();
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const messages = await MessageModel.find({ sessionId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: messages.map((m) => ({
        _id: m._id.toString(),
        sessionId: m.sessionId,
        sender: m.sender,
        senderRole: m.senderRole,
        type: m.type,
        content: m.content,
        fileUrl: m.fileUrl ?? undefined,
        fileName: m.fileName ?? undefined,
        fileSize: m.fileSize ?? undefined,
        createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/chat/[sessionId]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
