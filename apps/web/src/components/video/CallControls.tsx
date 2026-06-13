"use client";

import {
  Mic, MicOff, Video, VideoOff, MessageSquare,
  Circle, Square, PhoneOff, SwitchCamera, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@supportvision/types";
import type { EndState } from "@/hooks/useCall";

interface Props {
  role: UserRole;
  isLocalMuted: boolean;
  isLocalVideoOff: boolean;
  isRecording: boolean;
  unreadCount: number;
  canFlipCamera?: boolean;
  endState: EndState;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleChat: () => void;
  onFlipCamera?: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRequestEnd: () => void;
  onConfirmEnd: () => void;
  onCancelEnd: () => void;
}

export function CallControls({
  role, isLocalMuted, isLocalVideoOff, isRecording, unreadCount, canFlipCamera, endState,
  onToggleMute, onToggleVideo, onToggleChat, onFlipCamera,
  onStartRecording, onStopRecording, onRequestEnd, onConfirmEnd, onCancelEnd,
}: Props) {

  return (
    <div className="flex items-center justify-center px-2 pb-4 pt-2 sm:px-4 sm:pb-5">
      <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[hsl(222_30%_12%)]/90 p-1.5 elevation-3 backdrop-blur-xl sm:gap-2 sm:p-2">
        {/* Mic */}
        <CtrlButton
          onClick={onToggleMute}
          active={!isLocalMuted}
          label={isLocalMuted ? "Unmute" : "Mute"}
          danger={isLocalMuted}
        >
          {isLocalMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CtrlButton>

        {/* Video */}
        <CtrlButton
          onClick={onToggleVideo}
          active={!isLocalVideoOff}
          label={isLocalVideoOff ? "Start video" : "Stop video"}
          danger={isLocalVideoOff}
        >
          {isLocalVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </CtrlButton>

        {/* Flip camera (mobile front/rear) */}
        {canFlipCamera && onFlipCamera && (
          <CtrlButton onClick={onFlipCamera} active label="Flip camera">
            <SwitchCamera className="h-5 w-5" />
          </CtrlButton>
        )}

        <div className="mx-0.5 h-8 w-px bg-white/10 sm:mx-1" />

        {/* Chat */}
        <CtrlButton onClick={onToggleChat} active label="Chat" badge={unreadCount}>
          <MessageSquare className="h-5 w-5" />
        </CtrlButton>

        {/* Recording (agent only) */}
        {role === "AGENT" && (
          <CtrlButton
            onClick={isRecording ? onStopRecording : onStartRecording}
            active
            label={isRecording ? "Stop recording" : "Record"}
            recording={isRecording}
          >
            {isRecording ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </CtrlButton>
        )}

        <div className="mx-0.5 h-8 w-px bg-white/10 sm:mx-1" />

        {/* End / Leave — agents gate the end on customer feedback */}
        {role !== "AGENT" ? (
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 rounded-lg bg-danger/90 px-3.5 py-2.5 text-sm font-medium text-white transition-all hover:bg-danger active:scale-95 sm:px-4"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        ) : endState === "idle" ? (
          <button
            onClick={onRequestEnd}
            className="flex items-center gap-2 rounded-lg bg-danger/90 px-3.5 py-2.5 text-sm font-medium text-white transition-all hover:bg-danger active:scale-95 sm:px-4"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline">End call</span>
          </button>
        ) : endState === "awaiting-feedback" ? (
          <div className="flex items-center gap-1.5">
            <span className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white/60 sm:px-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Awaiting feedback…</span>
            </span>
            <button
              onClick={onCancelEnd}
              title="Cancel ending"
              aria-label="Cancel ending"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/8 text-white/80 transition-colors hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onConfirmEnd}
            className="flex items-center gap-2 rounded-lg bg-danger px-3.5 py-2.5 text-sm font-medium text-white ring-2 ring-danger/40 ring-offset-2 ring-offset-[hsl(222_30%_12%)] transition-all hover:bg-danger-hover active:scale-95 sm:px-4"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline">Confirm end</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface CtrlButtonProps {
  onClick: () => void;
  active: boolean;
  label: string;
  danger?: boolean;
  recording?: boolean;
  badge?: number;
  children: React.ReactNode;
}

function CtrlButton({ onClick, active, label, danger, recording, badge, children }: CtrlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-lg transition-all active:scale-90",
        danger
          ? "bg-danger/90 text-white hover:bg-danger"
          : recording
          ? "bg-danger/15 text-danger ring-1 ring-danger/40 hover:bg-danger/25"
          : "bg-white/8 text-white/90 hover:bg-white/15"
      )}
    >
      {children}
      {recording && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger recording-dot ring-2 ring-[hsl(222_30%_12%)]" />
      )}
      {badge != null && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-bold text-white ring-2 ring-[hsl(222_30%_12%)]">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      {/* tooltip */}
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-black/80 px-2 py-1 text-[0.7rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
