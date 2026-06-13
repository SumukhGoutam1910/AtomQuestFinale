import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { RecordingModel } from "@/models/Recording";
import type { ApiResponse } from "@supportvision/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ url: string }>>> {
  let recordingId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;
    recordingId = formData.get("recordingId") as string | null;

    if (!file || !sessionId || !recordingId) {
      return NextResponse.json(
        { success: false, error: "file, sessionId, recordingId required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "supportvision/recordings",
          public_id: recordingId!,
          overwrite: true,
        },
        (error, res) => (error || !res ? reject(error ?? new Error("Upload failed")) : resolve(res))
      );
      stream.end(buffer);
    });

    await connectDB();
    await RecordingModel.findByIdAndUpdate(recordingId, {
      status: "READY",
      recordingUrl: result.secure_url,
      fileSizeBytes: file.size,
      duration: result.duration ? Math.round(result.duration) : null,
      endedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: { url: result.secure_url } });
  } catch (err) {
    console.error("[POST /api/recording/upload]", err);

    // Best-effort: mark the recording failed so the UI can reflect it.
    if (recordingId) {
      try {
        await connectDB();
        await RecordingModel.findByIdAndUpdate(recordingId, { status: "FAILED" });
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ success: false, error: "Recording upload failed" }, { status: 500 });
  }
}
