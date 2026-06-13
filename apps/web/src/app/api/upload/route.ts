import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { FileModel } from "@/models/File";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@supportvision/shared";
import type { ApiResponse } from "@supportvision/types";

export const runtime = "nodejs";

/**
 * Uploads a chat file to Cloudinary and records it in the File collection
 * (for the session's file record). It deliberately does NOT create the chat
 * Message — the client sends that through the Socket.IO `chat:send` event so
 * the message is broadcast live to the other participant and persisted once.
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{
  fileUrl: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  isImage: boolean;
}>>> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;
    const senderName = formData.get("senderName") as string | null;

    if (!file || !sessionId || !senderName) {
      return NextResponse.json(
        { success: false, error: "file, sessionId, senderName are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: "File exceeds 25 MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, publicId } = await uploadFile(buffer, sessionId, file.name, file.type);

    await connectDB();
    await FileModel.create({
      sessionId,
      messageId: "",
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
      uploadedBy: senderName,
    });

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: url,
        publicId,
        fileName: file.name,
        fileSize: file.size,
        isImage: file.type.startsWith("image/"),
      },
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
