"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Users } from "lucide-react";
import { useCall } from "@/hooks/useCall";
import { useCallStore } from "@/store/callStore";
import { useChatStore } from "@/store/chatStore";
import { VideoGrid } from "./VideoGrid";
import { CallControls } from "./CallControls";
import { PreJoin } from "./PreJoin";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@supportvision/types";

interface Props {
  sessionId: string;
  inviteToken: string;
  agentData: { name: string; id: string } | null;
}

interface Identity {
  userName: string;
  role: UserRole;
  inviteToken?: string;
}

export function CallScreen({ sessionId, inviteToken, agentData }: Props) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (agentData) {
      setIdentity({ userName: agentData.name, role: "AGENT" });
      return;
    }
    const stored = sessionStorage.getItem(`call-identity-${sessionId}`);
    if (stored) {
      try {
        setIdentity(JSON.parse(stored));
      } catch {
        window.location.href = `/join/${inviteToken}`;
      }
    } else {
      window.location.href = `/join/${inviteToken}`;
    }
  }, [sessionId, inviteToken, agentData]);

  if (!identity) return <LoadingScreen />;

  // Google Meet-style lobby: preview camera/mic before connecting.
  if (!joined) {
    return (
      <PreJoin
        userName={identity.userName}
        role={identity.role}
        onJoin={() => setJoined(true)}
      />
    );
  }

  return <ActiveCall sessionId={sessionId} identity={identity} />;
}

function ActiveCall({
  sessionId,
  identity,
}: {
  sessionId: string;
  identity: Identity;
}) {
  const { callState, sendMessage, endSession, startRecording, stopRecording, flipCamera } = useCall({
    sessionId,
    userName: identity.userName,
    role: identity.role,
    inviteToken: identity.inviteToken,
  });

  // Camera flip is only meaningful on phones/tablets (front ↔ rear).
  const [canFlip, setCanFlip] = useState(false);
  useEffect(() => {
    setCanFlip(
      typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches === true
    );
  }, []);

  const { isOpen: isChatOpen, toggleChat, unreadCount } = useChatStore();
  const {
    localStream, remoteStreams, isLocalMuted, isLocalVideoOff,
    isRecording, recordingStatus, recordingUrl,
  } = useCallStore();

  if (callState === "joining") return <LoadingScreen message="Joining session…" />;
  if (callState === "reconnecting") return <LoadingScreen message="Reconnecting…" />;

  const participantCount = remoteStreams.size + 1;

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(222_33%_9%)]">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" showWordmark={false} />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-white">
                Support session
              </p>
              <p className="font-mono text-[0.7rem] text-white/40">{sessionId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Recording status */}
            {isRecording && (
              <span className="flex items-center gap-1.5 rounded border border-danger/40 bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger">
                <span className="h-2 w-2 rounded-full bg-danger recording-dot" />
                REC
              </span>
            )}
            {recordingStatus === "processing" && (
              <span className="flex items-center gap-1.5 rounded border border-warning/40 bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing
              </span>
            )}
            {recordingStatus === "ready" && recordingUrl && (
              <a
                href={recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded border border-success/40 bg-success/15 px-2.5 py-1 text-xs font-medium text-[hsl(152_60%_55%)] transition-colors hover:bg-success/25"
              >
                <Download className="h-3.5 w-3.5" />
                Recording
              </a>
            )}

            {/* Participant count */}
            <span className="flex items-center gap-1.5 rounded bg-white/8 px-2.5 py-1 text-xs font-medium text-white/80">
              <Users className="h-3.5 w-3.5" />
              {participantCount}
            </span>

            {/* Identity chip */}
            <span className="flex items-center gap-2 rounded bg-white/8 px-2.5 py-1">
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-white sm:inline">
                {identity.userName}
              </span>
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
                  identity.role === "AGENT"
                    ? "bg-primary/20 text-primary"
                    : "bg-accent/20 text-[hsl(245_80%_75%)]"
                )}
              >
                {identity.role}
              </span>
            </span>
          </div>
        </header>

        {/* Video stage */}
        <div className="flex-1 overflow-hidden">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            localUserName={identity.userName}
            isLocalMuted={isLocalMuted}
            isLocalVideoOff={isLocalVideoOff}
          />
        </div>

        {/* Controls */}
        <CallControls
          role={identity.role}
          isLocalMuted={isLocalMuted}
          isLocalVideoOff={isLocalVideoOff}
          isRecording={isRecording}
          unreadCount={unreadCount}
          canFlipCamera={canFlip}
          onToggleMute={() => useCallStore.getState().toggleMute()}
          onToggleVideo={() => useCallStore.getState().toggleVideo()}
          onToggleChat={toggleChat}
          onFlipCamera={flipCamera}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onEndSession={endSession}
        />
      </div>

      {/* Chat panel */}
      {isChatOpen && (
        <ChatPanel
          sessionId={sessionId}
          userName={identity.userName}
          role={identity.role}
          onSendMessage={sendMessage}
          onClose={toggleChat}
        />
      )}
    </div>
  );
}

function LoadingScreen({ message = "Connecting…" }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(222_33%_9%)]">
      <div className="animate-fade-up text-center">
        <div className="relative mx-auto mb-6 h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
          <div className="absolute inset-2 rounded-md bg-gradient-to-br from-primary to-[hsl(265_83%_62%)]" />
        </div>
        <p className="font-medium text-white">{message}</p>
        <p className="mt-1 text-sm text-white/40">Setting up your secure connection</p>
      </div>
    </div>
  );
}
