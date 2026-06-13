import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export async function uploadFile(
  fileBuffer: Buffer,
  sessionId: string,
  originalName: string,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  const resourceType = mimeType.startsWith("image/") ? "image" : mimeType === "application/pdf" ? "raw" : "raw";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: `supportvision/sessions/${sessionId}/files`,
        public_id: `${Date.now()}-${originalName.replace(/\s+/g, "_")}`,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
}
