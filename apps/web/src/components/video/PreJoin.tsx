"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic, MicOff, Video, VideoOff, Settings2, ArrowRight,
  ShieldCheck, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { useCallStore } from "@/store/callStore";
import { cn } from "@/lib/utils";
import type { UserRole } from "@supportvision/types";

interface Props {
  userName: string;
  role: UserRole;
  onJoin: () => void;
}

type DeviceInfo = { deviceId: string; label: string };

export function PreJoin({ userName, role, onJoin }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [camId, setCamId] = useState<string>("");
  const [micId, setMicId] = useState<string>("");
  const [level, setLevel] = useState(0);

  const { setLocalStream, toggleMute, toggleVideo } = useCallStore();

  // Acquire media + enumerate devices
  const acquire = useCallback(async (preferredCam?: string, preferredMic?: string) => {
    try {
      setStatus("loading");
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: preferredCam
          ? { deviceId: { exact: preferredCam }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: preferredMic
          ? { deviceId: { exact: preferredMic }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      });

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // apply current toggle prefs
      stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
      stream.getAudioTracks().forEach((t) => (t.enabled = micOn));

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput").map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
      }));
      const microphones = devices.filter((d) => d.kind === "audioinput").map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
      setCameras(cams);
      setMics(microphones);
      setCamId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? cams[0]?.deviceId ?? "");
      setMicId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? microphones[0]?.deviceId ?? "");

      setStatus("ready");
    } catch (err) {
      console.error("getUserMedia failed", err);
      setStatus("denied");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    acquire();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [acquire]);

  // Mic level meter (Web Audio API)
  useEffect(() => {
    if (status !== "ready" || !streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(streamRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(micOn ? Math.min(100, (avg / 140) * 100) : 0);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [status, micOn]);

  function handleToggleCam() {
    const next = !camOn;
    setCamOn(next);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
  }
  function handleToggleMic() {
    const next = !micOn;
    setMicOn(next);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
  }

  function handleJoin() {
    const stream = streamRef.current;
    if (stream) {
      // Hand the live stream off to the call — preserves device + on/off state.
      setLocalStream(stream);
      // Sync store toggle state to the lobby choices.
      if (!camOn) toggleVideo();
      if (!micOn) toggleMute();
      streamRef.current = null; // prevent cleanup from stopping it
    }
    onJoin();
  }

  return (
    <div className="bg-canvas relative flex min-h-screen flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo size="md" />
        <span className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          Encrypted connection
        </span>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-start overflow-y-auto px-4 py-4 sm:items-center sm:px-6 sm:py-6">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
          {/* ── Preview ──────────────────────────────────────────── */}
          <div className="animate-fade-up">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[hsl(222_30%_14%)] elevation-3 ring-frame">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "h-full w-full -scale-x-100 object-cover transition-opacity duration-300",
                  camOn && status === "ready" ? "opacity-100" : "opacity-0"
                )}
              />

              {/* Camera off / states overlay */}
              {(!camOn || status !== "ready") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  {status === "loading" && (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-white/60" />
                      <p className="text-sm text-white/60">Starting your camera…</p>
                    </>
                  )}
                  {status === "denied" && (
                    <div className="px-8 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-warning/20 text-warning">
                        <AlertTriangle className="h-6 w-6" />
                      </span>
                      <p className="mt-3 text-sm font-medium text-white">Camera & mic blocked</p>
                      <p className="mt-1 text-xs text-white/50">
                        Allow access in your browser, then retry.
                      </p>
                      <Button size="sm" variant="outline" className="mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => acquire(camId, micId)}>
                        Retry
                      </Button>
                    </div>
                  )}
                  {status === "ready" && !camOn && (
                    <>
                      <Avatar name={userName} size="lg" />
                      <p className="text-sm text-white/70">Camera is off</p>
                    </>
                  )}
                </div>
              )}

              {/* Name tag */}
              {status === "ready" && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="rounded bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {userName}
                  </span>
                  {!micOn && (
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-danger/90 text-white">
                      <MicOff className="h-3 w-3" />
                    </span>
                  )}
                </div>
              )}

              {/* Mic level meter */}
              {status === "ready" && micOn && (
                <div className="absolute right-3 top-3 flex items-end gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-success transition-all duration-75"
                      style={{
                        height: `${Math.max(4, Math.min(20, (level - i * 12) * 0.6 + 6))}px`,
                        opacity: level > i * 12 ? 1 : 0.25,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Floating controls */}
              {status === "ready" && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
                  <LobbyToggle on={micOn} onClick={handleToggleMic} OnIcon={Mic} OffIcon={MicOff} label="Mic" />
                  <LobbyToggle on={camOn} onClick={handleToggleCam} OnIcon={Video} OffIcon={VideoOff} label="Camera" />
                </div>
              )}
            </div>

            {/* Device selectors */}
            {status === "ready" && (cameras.length > 0 || mics.length > 0) && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DeviceSelect
                  icon={<Video className="h-4 w-4" />}
                  value={camId}
                  options={cameras}
                  onChange={(id) => { setCamId(id); acquire(id, micId); }}
                />
                <DeviceSelect
                  icon={<Mic className="h-4 w-4" />}
                  value={micId}
                  options={mics}
                  onChange={(id) => { setMicId(id); acquire(camId, id); }}
                />
              </div>
            )}
          </div>

          {/* ── Join panel ───────────────────────────────────────── */}
          <div className="animate-fade-up text-center lg:text-left [animation-delay:0.1s]">
            <h1 className="text-3xl font-semibold tracking-tighter text-foreground">
              Ready to join?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {role === "AGENT"
                ? "Check your camera and microphone, then start the session."
                : "Check your camera and microphone, then join the support call."}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-border bg-surface p-3.5 elevation-1 lg:justify-start">
              <Avatar name={userName} size="md" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-[0.7rem] uppercase tracking-wide text-subtle">
                  Joining as {role.toLowerCase()}
                </p>
              </div>
            </div>

            <Button
              size="lg"
              className="group mt-5 w-full"
              disabled={status !== "ready"}
              onClick={handleJoin}
            >
              {role === "AGENT" ? "Start session" : "Join now"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-subtle lg:justify-start">
              <Settings2 className="h-3 w-3" />
              {micOn ? "Mic on" : "Mic off"} · {camOn ? "Camera on" : "Camera off"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function LobbyToggle({
  on, onClick, OnIcon, OffIcon, label,
}: {
  on: boolean;
  onClick: () => void;
  OnIcon: React.ComponentType<{ className?: string }>;
  OffIcon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${on ? "Turn off" : "Turn on"} ${label.toLowerCase()}`}
      title={`${on ? "Turn off" : "Turn on"} ${label.toLowerCase()}`}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg backdrop-blur-sm transition-all active:scale-90",
        on
          ? "bg-white/15 text-white hover:bg-white/25"
          : "bg-danger text-white hover:bg-danger-hover"
      )}
    >
      {on ? <OnIcon className="h-5 w-5" /> : <OffIcon className="h-5 w-5" />}
    </button>
  );
}

function DeviceSelect({
  icon, value, options, onChange,
}: {
  icon: React.ReactNode;
  value: string;
  options: DeviceInfo[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded border border-input bg-surface px-3 py-2 text-sm transition-colors focus-within:border-primary">
      <span className="text-muted-foreground">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer truncate bg-transparent text-foreground focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.deviceId} value={o.deviceId}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
