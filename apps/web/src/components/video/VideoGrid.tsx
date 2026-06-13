"use client";

import { useEffect, useRef } from "react";
import { MicOff, VideoOff, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteStream } from "@/store/callStore";

interface Props {
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  localUserName: string;
  isLocalMuted: boolean;
  isLocalVideoOff: boolean;
}

export function VideoGrid({
  localStream,
  remoteStreams,
  localUserName,
  isLocalMuted,
  isLocalVideoOff,
}: Props) {
  const remoteList = [...remoteStreams.values()];
  const hasRemote = remoteList.length > 0;

  // Solo: a single centered, framed self-view (Google Meet style — not full-bleed).
  if (!hasRemote) {
    return (
      <div className="flex h-full items-center justify-center p-3 sm:p-6">
        <div className="aspect-video w-full max-w-3xl">
          <VideoTile
            stream={localStream}
            userName={localUserName}
            isMuted={isLocalMuted}
            isVideoOff={isLocalVideoOff}
            isLocal
            muted
            waiting
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center p-3 sm:p-6">
      {/* Stage: remote(s), centered and framed */}
      <div
        className={cn(
          "grid w-full gap-3",
          remoteList.length === 1
            ? "max-w-5xl grid-cols-1"
            : "max-w-6xl grid-cols-1 sm:grid-cols-2"
        )}
      >
        {remoteList.map((remote) => {
          const combined = new MediaStream();
          remote.videoStream?.getVideoTracks().forEach((t) => combined.addTrack(t));
          remote.audioStream?.getAudioTracks().forEach((t) => combined.addTrack(t));
          return (
            <div key={remote.participantId} className="aspect-video w-full">
              <VideoTile
                stream={combined.getTracks().length ? combined : null}
                userName={remote.userName}
                isMuted={remote.isMuted}
                isVideoOff={remote.isVideoOff}
                isLocal={false}
                muted={false}
              />
            </div>
          );
        })}
      </div>

      {/* Picture-in-picture: local self-view */}
      <div className="absolute bottom-4 right-4 z-10 w-28 sm:bottom-6 sm:right-6 sm:w-52">
        <div className="aspect-video animate-scale-in">
          <VideoTile
            stream={localStream}
            userName={localUserName}
            isMuted={isLocalMuted}
            isVideoOff={isLocalVideoOff}
            isLocal
            muted
            pip
          />
        </div>
      </div>
    </div>
  );
}

interface TileProps {
  stream: MediaStream | null;
  userName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal: boolean;
  muted: boolean;
  stage?: boolean;
  pip?: boolean;
  waiting?: boolean;
}

function VideoTile({
  stream, userName, isMuted, isVideoOff, isLocal, muted, pip, waiting,
}: TileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bind the stream to the always-mounted <video>. Re-runs when the stream
  // identity changes (initial publish, camera switch). Toggling the camera
  // only flips track.enabled, so the element stays mounted and resumes frames.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && stream.getVideoTracks().length > 0) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  const hasVideo = !!stream && stream.getVideoTracks().length > 0 && !isVideoOff;

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-[hsl(222_30%_14%)] ring-frame",
        pip ? "rounded-md border-2 border-white/15 elevation-3" : "rounded-lg"
      )}
    >
      {/* Always mounted so srcObject persists across camera on/off toggles. */}
      <video
        ref={videoRef}
        className={cn(
          "h-full w-full object-cover transition-opacity",
          isLocal && "-scale-x-100",
          hasVideo ? "opacity-100" : "opacity-0"
        )}
        autoPlay
        playsInline
        muted={muted}
      />

      {/* Placeholder overlay when the camera is off / no video track. */}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[hsl(222_30%_14%)]">
          <div
            className={cn(
              "flex items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 font-semibold text-white",
              pip ? "h-9 w-9 text-sm" : "h-20 w-20 text-3xl"
            )}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          {!pip && (
            <div className="text-center">
              <p className="text-sm font-medium text-white/90">{userName}</p>
              {waiting ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                  </span>
                  Waiting for others to join
                </p>
              ) : (
                isVideoOff && <p className="mt-0.5 text-xs text-white/40">Camera off</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Name + status overlay */}
      {!pip && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {userName}
            {isLocal && <span className="text-white/50">(You)</span>}
          </span>
          {isMuted && (
            <span className="flex h-6 w-6 items-center justify-center rounded bg-danger/90 text-white">
              <MicOff className="h-3 w-3" />
            </span>
          )}
        </div>
      )}

      {pip && (
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-sm bg-black/55 px-1.5 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur-sm">
            <Pin className="h-2.5 w-2.5" /> You
          </span>
          {isMuted && (
            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-danger/90 text-white">
              <MicOff className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
