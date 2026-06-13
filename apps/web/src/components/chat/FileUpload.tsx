"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@supportvision/shared";
import { formatBytes, cn } from "@/lib/utils";
import type { UserRole } from "@supportvision/types";

export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  isImage: boolean;
}

interface Props {
  sessionId: string;
  senderName: string;
  senderRole: UserRole;
  onUploaded: (file: UploadedFile) => void;
  onCancel: () => void;
}

export function FileUpload({ sessionId, senderName, senderRole, onUploaded, onCancel }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error("File type not supported");
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error("File exceeds 25 MB limit");
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId);
        formData.append("senderName", senderName);
        formData.append("senderRole", senderRole);

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              const res = JSON.parse(xhr.responseText);
              if (res.success) {
                onUploaded({
                  fileUrl: res.data.fileUrl,
                  fileName: res.data.fileName ?? file.name,
                  fileSize: res.data.fileSize ?? file.size,
                  isImage: res.data.isImage ?? file.type.startsWith("image/"),
                });
                resolve();
              } else reject(new Error(res.error));
            } else reject(new Error("Upload failed"));
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });
      } catch (err: any) {
        toast.error(err.message ?? "Upload failed");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [sessionId, senderName, senderRole, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_FILE_SIZE_BYTES,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
  });

  return (
    <div className="p-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-5 text-center transition-all",
          isDragActive
            ? "border-primary bg-primary-soft"
            : "border-border-strong hover:border-primary hover:bg-primary-soft/40"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="w-full">
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{progress}% uploaded…</p>
          </div>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-soft text-primary">
              <UploadCloud className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">
              {isDragActive ? "Drop to upload" : "Drag & drop or click"}
            </p>
            <p className="mt-1 text-[0.7rem] text-subtle">
              Images, PDF, DOCX, TXT · max {formatBytes(MAX_FILE_SIZE_BYTES)}
            </p>
          </>
        )}
      </div>
      <button
        onClick={onCancel}
        className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3 w-3" /> Cancel
      </button>
    </div>
  );
}
