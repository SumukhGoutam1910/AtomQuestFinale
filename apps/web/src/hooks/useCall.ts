"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useSocket, useSocketEvent } from "./useSocket";
import { useMediasoup } from "./useMediasoup";
import { useCallStore } from "@/store/callStore";
import { useChatStore } from "@/store/chatStore";
import { startCompositeRecording, type CompositeRecorder } from "@/lib/recorder";
import type { UserRole, Participant, Message, Ratings } from "@supportvision/types";

export type EndState = "idle" | "awaiting-feedback" | "ready";

interface UseCallOptions {
  sessionId: string;
  userName: string;
  role: UserRole;
  inviteToken?: string;
}

export function useCall({ sessionId, userName, role, inviteToken }: UseCallOptions) {
  const socket = useSocket();
  const {
    publishMedia,
    consumeRemoteProducer,
    switchCamera,
    cleanup: cleanupMediasoup,
  } = useMediasoup(socket, sessionId);

  const {
    callState,
    setCallState,
    setParticipantId,
    addParticipant,
    removeParticipant,
    setRecording,
    setRecordingStatus,
    recordingId,
    reset: resetCall,
  } = useCallStore();

  const { setMessages, addMessage, reset: resetChat } = useChatStore();

  const router = useRouter();
  const recorderRef = useRef<CompositeRecorder | null>(null);

  // End-of-call feedback gating
  const [endState, setEndState] = useState<EndState>("idle");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackAgentName, setFeedbackAgentName] = useState("the agent");

  // Join session
  useEffect(() => {
    if (callState !== "idle") return;
    setCallState("joining");

    let settled = false;

    // Fail fast if the media server never responds (e.g. not running)
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      toast.error(
        socket.connected
          ? "Server did not respond. Is the media server running?"
          : "Can't reach the media server on port 3001. Is it running?"
      );
      setCallState("idle");
    }, 12_000);

    socket.emit(
      "session:join",
      { sessionId, userName, role, inviteToken },
      async (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        if (!res.success || !res.participantId) {
          toast.error(res.error ?? "Failed to join session");
          setCallState("idle");
          router.push("/");
          return;
        }

        setParticipantId(res.participantId);
        setCallState("connected");

        // Start publishing local media
        try {
          await publishMedia();
        } catch (err) {
          toast.error("Failed to access camera/microphone");
          console.error(err);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      cleanupMediasoup();
      resetCall();
      resetChat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── Socket event handlers ────────────────────────────────────────────────

  useSocketEvent(socket, "user:joined", (payload) => {
    addParticipant(payload.participant);
    toast(`${payload.participant.userName} joined the call`);
  });

  useSocketEvent(socket, "user:left", (payload) => {
    removeParticipant(payload.participantId);
    toast(`${payload.userName} left the call`);
  });

  useSocketEvent(socket, "user:reconnected", (payload) => {
    toast(`${payload.userName} reconnected`);
  });

  useSocketEvent(socket, "session:ended", () => {
    toast("Session ended");
    cleanupMediasoup();
    resetCall();
    resetChat();
    router.push("/");
  });

  useSocketEvent(socket, "ms:newProducer", async (payload) => {
    try {
      await consumeRemoteProducer(
        payload.producerId,
        payload.participantId,
        payload.userName,
        payload.kind
      );
    } catch (err) {
      console.error("Failed to consume new producer", err);
    }
  });

  useSocketEvent(socket, "ms:producerClosed", (payload) => {
    console.log("Producer closed:", payload.producerId);
  });

  useSocketEvent(socket, "chat:history", (payload) => {
    setMessages(payload.messages);
  });

  useSocketEvent(socket, "chat:receive", (payload) => {
    addMessage(payload.message);
  });

  useSocketEvent(socket, "recording:statusUpdate", (payload) => {
    if (payload.status === "READY") {
      setRecordingStatus("ready", payload.recordingUrl);
      toast.success("Recording is ready for download!");
    } else if (payload.status === "FAILED") {
      setRecordingStatus("idle");
      toast.error("Recording failed");
    } else if (payload.status === "PROCESSING") {
      setRecordingStatus("processing");
    }
  });

  // Customer: agent asked for end-of-call feedback → show the form.
  useSocketEvent(socket, "feedback:requested", (payload) => {
    setFeedbackAgentName(payload.agentName);
    setFeedbackOpen(true);
  });

  // Agent: customer submitted feedback → "Confirm end" can enable.
  useSocketEvent(socket, "feedback:received", () => {
    setEndState("ready");
    toast.success("Customer feedback received");
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (
      content: string,
      file?: { type: "FILE" | "IMAGE"; fileUrl: string; fileName: string; fileSize: number }
    ) => {
      return new Promise<Message | null>((resolve) => {
        socket.emit(
          "chat:send",
          {
            sessionId,
            content,
            type: file?.type ?? "TEXT",
            fileUrl: file?.fileUrl,
            fileName: file?.fileName,
            fileSize: file?.fileSize,
          },
          (res) => {
            if (res.success && res.message) {
              addMessage(res.message);
              resolve(res.message);
            } else {
              toast.error(res.error ?? "Failed to send message");
              resolve(null);
            }
          }
        );
      });
    },
    [socket, sessionId, addMessage]
  );

  // Actually end the session (agent, after feedback is collected).
  const confirmEnd = useCallback(() => {
    socket.emit("session:end", { sessionId }, (res) => {
      if (!res.success) {
        toast.error(res.error ?? "Failed to end session");
        return;
      }
      // The server broadcasts `session:ended` to everyone EXCEPT the sender,
      // so the agent who ended it must tear down + navigate away locally.
      toast.success("Session ended");
      cleanupMediasoup();
      resetCall();
      resetChat();
      router.push("/dashboard");
    });
  }, [socket, sessionId, cleanupMediasoup, resetCall, resetChat, router]);

  // Agent clicks "End call": ask the customer for feedback first. If no customer
  // is present, end immediately.
  const requestEnd = useCallback(() => {
    socket.emit("feedback:request", { sessionId }, (res) => {
      if (!res.success) {
        toast.error(res.error ?? "Failed to start wrap-up");
        return;
      }
      if (res.customerPresent) {
        setEndState("awaiting-feedback");
        toast("Asking the customer for feedback…");
      } else {
        confirmEnd();
      }
    });
  }, [socket, sessionId, confirmEnd]);

  const cancelEnd = useCallback(() => setEndState("idle"), []);

  // Customer submits the feedback form.
  const submitFeedback = useCallback(
    (ratings: Ratings, comment: string) => {
      return new Promise<boolean>((resolve) => {
        socket.emit("feedback:submit", { sessionId, ratings, comment }, (res) => {
          if (res.success) {
            setFeedbackOpen(false);
            toast.success("Thanks for your feedback!");
            resolve(true);
          } else {
            toast.error(res.error ?? "Failed to submit feedback");
            resolve(false);
          }
        });
      });
    },
    [socket, sessionId]
  );

  const startRecording = useCallback(() => {
    socket.emit("recording:start", { sessionId }, async (res) => {
      if (!res.success || !res.recordingId) {
        toast.error(res.error ?? "Failed to start recording");
        return;
      }
      try {
        const { localStream, remoteStreams } = useCallStore.getState();
        const remotes = [...remoteStreams.values()].map((r) => {
          const s = new MediaStream();
          r.videoStream?.getVideoTracks().forEach((t) => s.addTrack(t));
          r.audioStream?.getAudioTracks().forEach((t) => s.addTrack(t));
          return s;
        });
        recorderRef.current = await startCompositeRecording(localStream, remotes);
        setRecording(true, res.recordingId);
        setRecordingStatus("recording");
        toast.success("Recording started");
      } catch (err) {
        console.error("Failed to start recorder", err);
        toast.error("Couldn't start recording");
      }
    });
  }, [socket, sessionId, setRecording, setRecordingStatus]);

  const stopRecording = useCallback(async () => {
    const rec = recorderRef.current;
    const id = useCallStore.getState().recordingId;
    if (!rec || !id) return;

    setRecording(false);
    setRecordingStatus("processing");
    toast("Processing recording…");

    try {
      const blob = await rec.stop();
      recorderRef.current = null;

      const form = new FormData();
      form.append("file", blob, `${id}.webm`);
      form.append("sessionId", sessionId);
      form.append("recordingId", id);

      const resp = await fetch("/api/recording/upload", { method: "POST", body: form });
      const data = await resp.json();

      if (data.success) {
        setRecordingStatus("ready", data.data.url);
        // Let the room know the final file is available.
        socket.emit("recording:stop", { sessionId, recordingId: id }, () => {});
        toast.success("Recording ready to download");
      } else {
        throw new Error(data.error ?? "upload failed");
      }
    } catch (err) {
      console.error("Recording upload failed", err);
      setRecordingStatus("idle");
      toast.error("Recording upload failed");
    }
  }, [socket, sessionId, setRecording, setRecordingStatus]);

  const flipCamera = useCallback(async () => {
    try {
      await switchCamera();
    } catch (err) {
      console.error("Camera switch failed", err);
      toast.error("Couldn't switch camera");
    }
  }, [switchCamera]);

  return {
    callState,
    sendMessage,
    startRecording,
    stopRecording,
    flipCamera,
    // end-of-call feedback gating
    endState,
    requestEnd,
    cancelEnd,
    confirmEnd,
    // customer feedback form
    feedbackOpen,
    feedbackAgentName,
    submitFeedback,
  };
}
