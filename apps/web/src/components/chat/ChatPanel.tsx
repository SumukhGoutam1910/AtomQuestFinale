"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, X, SendHorizontal, MessagesSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "@/store/chatStore";
import { MessageItem } from "./MessageItem";
import { FileUpload } from "./FileUpload";
import { cn } from "@/lib/utils";
import type { UserRole, Message } from "@supportvision/types";

interface Props {
  sessionId: string;
  userName: string;
  role: UserRole;
  onSendMessage: (
    content: string,
    file?: { type: "FILE" | "IMAGE"; fileUrl: string; fileName: string; fileSize: number }
  ) => Promise<Message | null>;
  onClose: () => void;
}

export function ChatPanel({ sessionId, userName, role, onSendMessage, onClose }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { messages } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
    await onSendMessage(content);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <aside className="fixed inset-0 z-50 flex h-full w-full animate-slide-in-right flex-col border-border bg-surface sm:relative sm:inset-auto sm:z-auto sm:w-96 sm:max-w-sm sm:border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary-soft text-primary">
            <MessagesSquare className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Chat</p>
            <p className="text-[0.7rem] text-subtle">{messages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowUpload((v) => !v)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded transition-colors",
              showUpload
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-label="Share file"
            title="Share file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Upload */}
      {showUpload && (
        <div className="animate-scale-in border-b border-border bg-surface-2">
          <FileUpload
            sessionId={sessionId}
            senderName={userName}
            senderRole={role}
            onUploaded={async (f) => {
              setShowUpload(false);
              const sent = await onSendMessage(f.fileName, {
                type: f.isImage ? "IMAGE" : "FILE",
                fileUrl: f.fileUrl,
                fileName: f.fileName,
                fileSize: f.fileSize,
              });
              if (sent) toast.success(`${f.fileName} shared`);
            }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-surface-2/40 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <MessagesSquare className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">No messages yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Send a message or share a file to start.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg._id} message={msg} isOwn={msg.sender === userName} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-lg border border-input bg-surface p-1.5 transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/12">
          <textarea
            ref={taRef}
            value={text}
            onChange={autoGrow}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground transition-all hover:bg-primary-hover disabled:opacity-40 active:scale-90"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[0.7rem] text-subtle">
          Enter to send · Shift + Enter for new line
        </p>
      </form>
    </aside>
  );
}
