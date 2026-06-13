import { create } from "zustand";
import type { Participant } from "@supportvision/types";

export type CallState = "idle" | "joining" | "connected" | "reconnecting" | "ended";

export interface RemoteStream {
  participantId: string;
  userName: string;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface CallStore {
  // State
  callState: CallState;
  sessionId: string | null;
  participantId: string | null;
  participants: Participant[];
  remoteStreams: Map<string, RemoteStream>;

  // Local media
  localStream: MediaStream | null;
  isLocalMuted: boolean;
  isLocalVideoOff: boolean;

  // Recording
  isRecording: boolean;
  recordingId: string | null;
  recordingStatus: "idle" | "recording" | "processing" | "ready";
  recordingUrl: string | null;

  // Actions
  setCallState: (state: CallState) => void;
  setSessionId: (id: string) => void;
  setParticipantId: (id: string) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  addRemoteStream: (participantId: string, data: Partial<RemoteStream> & { participantId: string; userName: string }) => void;
  updateRemoteStream: (participantId: string, data: Partial<RemoteStream>) => void;
  removeRemoteStream: (participantId: string) => void;
  setRecording: (isRecording: boolean, recordingId?: string) => void;
  setRecordingStatus: (status: CallStore["recordingStatus"], url?: string) => void;
  reset: () => void;
}

const initialState = {
  callState: "idle" as CallState,
  sessionId: null,
  participantId: null,
  participants: [],
  remoteStreams: new Map<string, RemoteStream>(),
  localStream: null,
  isLocalMuted: false,
  isLocalVideoOff: false,
  isRecording: false,
  recordingId: null,
  recordingStatus: "idle" as const,
  recordingUrl: null,
};

export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  setCallState: (callState) => set({ callState }),
  setSessionId: (sessionId) => set({ sessionId }),
  setParticipantId: (participantId) => set({ participantId }),

  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((s) => ({
      participants: s.participants.some((p) => p._id === participant._id)
        ? s.participants
        : [...s.participants, participant],
    })),
  removeParticipant: (participantId) =>
    set((s) => ({ participants: s.participants.filter((p) => p._id !== participantId) })),

  setLocalStream: (localStream) => set({ localStream }),
  toggleMute: () => {
    const { localStream, isLocalMuted } = get();
    localStream?.getAudioTracks().forEach((t) => { t.enabled = isLocalMuted; });
    set({ isLocalMuted: !isLocalMuted });
  },
  toggleVideo: () => {
    const { localStream, isLocalVideoOff } = get();
    localStream?.getVideoTracks().forEach((t) => { t.enabled = isLocalVideoOff; });
    set({ isLocalVideoOff: !isLocalVideoOff });
  },

  addRemoteStream: (participantId, data) =>
    set((s) => {
      const next = new Map(s.remoteStreams);
      const existing = next.get(participantId) ?? {
        participantId,
        userName: data.userName,
        videoStream: null,
        audioStream: null,
        isMuted: false,
        isVideoOff: false,
      };
      next.set(participantId, { ...existing, ...data });
      return { remoteStreams: next };
    }),

  updateRemoteStream: (participantId, data) =>
    set((s) => {
      const next = new Map(s.remoteStreams);
      const existing = next.get(participantId);
      if (existing) next.set(participantId, { ...existing, ...data });
      return { remoteStreams: next };
    }),

  removeRemoteStream: (participantId) =>
    set((s) => {
      const next = new Map(s.remoteStreams);
      next.delete(participantId);
      return { remoteStreams: next };
    }),

  setRecording: (isRecording, recordingId) =>
    set({ isRecording, recordingId: recordingId ?? null }),
  setRecordingStatus: (recordingStatus, recordingUrl) =>
    set({ recordingStatus, recordingUrl: recordingUrl ?? null }),

  reset: () => {
    const { localStream } = get();
    localStream?.getTracks().forEach((t) => t.stop());
    set(initialState);
  },
}));
