"use client";

import { format } from "date-fns";
import { FileText, Download } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import type { Message } from "@supportvision/types";

interface Props {
  message: Message;
  isOwn: boolean;
}

export function MessageItem({ message, isOwn }: Props) {
  if (message.type === "SYSTEM") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-muted px-3 py-1 text-[0.7rem] font-medium text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const isAgent = message.senderRole === "AGENT";

  return (
    <div className={cn("flex animate-fade-up flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-xs font-semibold text-foreground">{message.sender}</span>
        <span
          className={cn(
            "rounded-sm px-1 py-px text-[0.6rem] font-bold uppercase tracking-wide",
            isAgent ? "bg-primary-soft text-primary-hover" : "bg-accent-soft text-accent"
          )}
        >
          {message.senderRole}
        </span>
      </div>

      <div
        className={cn(
          "max-w-[240px] px-3.5 py-2 text-sm leading-relaxed",
          isOwn
            ? "rounded-lg rounded-br-sm bg-primary text-primary-foreground elevation-1"
            : "rounded-lg rounded-bl-sm border border-border bg-surface text-foreground elevation-1"
        )}
      >
        {message.type === "TEXT" && <p className="break-words">{message.content}</p>}

        {(message.type === "IMAGE" || message.type === "FILE") && message.fileUrl && (
          <FilePreview
            fileUrl={message.fileUrl}
            fileName={message.fileName ?? "File"}
            fileSize={message.fileSize ?? 0}
            isImage={message.type === "IMAGE"}
            isOwn={isOwn}
          />
        )}
      </div>

      <span className="px-1 text-[0.65rem] text-subtle">
        {format(new Date(message.createdAt), "h:mm a")}
      </span>
    </div>
  );
}

function FilePreview({
  fileUrl, fileName, fileSize, isImage, isOwn,
}: {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  isImage: boolean;
  isOwn: boolean;
}) {
  if (isImage) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={fileName}
          className="max-h-44 w-full rounded-md object-cover"
        />
        <p className={cn("mt-1.5 truncate text-xs", isOwn ? "text-white/80" : "text-muted-foreground")}>
          {fileName}
        </p>
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-2.5 rounded-md p-1 transition-colors",
        isOwn ? "hover:bg-white/10" : "hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded",
          isOwn ? "bg-white/15" : "bg-primary-soft text-primary"
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">{fileName}</span>
        <span className={cn("text-[0.65rem]", isOwn ? "text-white/70" : "text-subtle")}>
          {formatBytes(fileSize)}
        </span>
      </span>
      <Download className={cn("h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100", isOwn ? "text-white/70" : "text-muted-foreground")} />
    </a>
  );
}
