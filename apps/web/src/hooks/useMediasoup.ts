"use client";

import { useRef, useCallback } from "react";
import * as mediasoupClient from "mediasoup-client";
import { types as mediasoupTypes } from "mediasoup-client";
import type { Socket } from "socket.io-client";

type Device = mediasoupTypes.Device;
type Transport = mediasoupTypes.Transport;
type Producer = mediasoupTypes.Producer;
type Consumer = mediasoupTypes.Consumer;
import type { ServerToClientEvents, ClientToServerEvents } from "@supportvision/socket-events";
import { useCallStore } from "@/store/callStore";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface MediasoupState {
  device: Device | null;
  sendTransport: Transport | null;
  recvTransport: Transport | null;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

export function useMediasoup(socket: AppSocket, sessionId: string) {
  const stateRef = useRef<MediasoupState>({
    device: null,
    sendTransport: null,
    recvTransport: null,
    producers: new Map(),
    consumers: new Map(),
  });

  const { setLocalStream, addRemoteStream, updateRemoteStream, removeRemoteStream } = useCallStore();

  const loadDevice = useCallback(async (): Promise<void> => {
    const { device } = stateRef.current;
    if (device?.loaded) return;

    const newDevice = new mediasoupClient.Device();
    stateRef.current.device = newDevice;

    const { success, rtpCapabilities, error } = await new Promise<any>((res) => {
      socket.emit("ms:getRouterRtpCapabilities", { sessionId }, res);
    });

    if (!success || !rtpCapabilities) throw new Error(error ?? "Failed to get RTP capabilities");

    await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
  }, [socket, sessionId]);

  const createTransport = useCallback(async (direction: "send" | "recv"): Promise<Transport> => {
    const { device } = stateRef.current;
    if (!device?.loaded) throw new Error("Device not loaded");

    const { success, transportOptions, error } = await new Promise<any>((res) => {
      socket.emit("ms:createTransport", { sessionId, direction }, res);
    });

    if (!success || !transportOptions) throw new Error(error ?? "Failed to create transport");

    const transport =
      direction === "send"
        ? device.createSendTransport(transportOptions)
        : device.createRecvTransport(transportOptions);

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        const r = await new Promise<any>((res) => {
          socket.emit("ms:connectTransport", { sessionId, transportId: transport.id, dtlsParameters }, res);
        });
        if (r.success) callback();
        else errback(new Error(r.error));
      } catch (err) {
        errback(err as Error);
      }
    });

    if (direction === "send") {
      transport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const r = await new Promise<any>((res) => {
            socket.emit("ms:produce", { sessionId, transportId: transport.id, kind, rtpParameters }, res);
          });
          if (r.success && r.producerId) callback({ id: r.producerId });
          else errback(new Error(r.error));
        } catch (err) {
          errback(err as Error);
        }
      });

      stateRef.current.sendTransport = transport;
    } else {
      stateRef.current.recvTransport = transport;
    }

    return transport;
  }, [socket, sessionId]);

  const publishMedia = useCallback(async (): Promise<void> => {
    await loadDevice();

    // Reuse the stream the pre-join lobby already acquired (no re-prompt / flicker).
    let stream = useCallStore.getState().localStream;
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
      });
      setLocalStream(stream);
    }

    const sendTransport = await createTransport("send");

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const videoProducer = await sendTransport.produce({ track: videoTrack });
      stateRef.current.producers.set("video", videoProducer);
    }

    if (audioTrack) {
      const audioProducer = await sendTransport.produce({ track: audioTrack });
      stateRef.current.producers.set("audio", audioProducer);
    }
  }, [loadDevice, createTransport, setLocalStream]);

  // Flip between front ("user") and rear ("environment") cameras on mobile.
  // Re-acquires the camera and hot-swaps the track into the live producer —
  // no renegotiation, the remote peer sees the new feed seamlessly.
  const facingRef = useRef<"user" | "environment">("user");

  const switchCamera = useCallback(async (): Promise<void> => {
    const videoProducer = stateRef.current.producers.get("video");
    if (!videoProducer) throw new Error("No video to switch");

    const next = facingRef.current === "user" ? "environment" : "user";

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: next },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) throw new Error("No camera track");

    // Swap the track on the producer (keeps the same transport/consumer).
    await videoProducer.replaceTrack({ track: newTrack });
    facingRef.current = next;

    // Update the local preview stream: drop old video track, add the new one.
    const current = useCallStore.getState().localStream;
    if (current) {
      current.getVideoTracks().forEach((t) => {
        t.stop();
        current.removeTrack(t);
      });
      current.addTrack(newTrack);
      // Trigger store subscribers (new MediaStream identity) so the <video> re-binds.
      const refreshed = new MediaStream(current.getTracks());
      setLocalStream(refreshed);
    } else {
      setLocalStream(newStream);
    }

    return;
  }, [setLocalStream]);

  const consumeRemoteProducer = useCallback(async (
    producerId: string,
    participantId: string,
    userName: string,
    kind: "audio" | "video"
  ): Promise<void> => {
    const { device, recvTransport: existingRecvTransport } = stateRef.current;

    if (!device?.loaded) {
      await loadDevice();
    }

    let recvTransport = existingRecvTransport;
    if (!recvTransport || recvTransport.closed) {
      recvTransport = await createTransport("recv");
    }

    const rtpCapabilities = stateRef.current.device!.rtpCapabilities;

    const { success, consumerOptions, error } = await new Promise<any>((res) => {
      socket.emit(
        "ms:consume",
        { sessionId, transportId: recvTransport!.id, producerId, rtpCapabilities },
        res
      );
    });

    if (!success || !consumerOptions) {
      console.error("Failed to consume:", error);
      return;
    }

    const consumer = await recvTransport.consume({
      id: consumerOptions.id,
      producerId: consumerOptions.producerId,
      kind: consumerOptions.kind,
      rtpParameters: consumerOptions.rtpParameters,
    });

    stateRef.current.consumers.set(consumer.id, consumer);

    // Resume consumer
    await new Promise<void>((res) => {
      socket.emit("ms:resumeConsumer", { sessionId, consumerId: consumer.id }, () => res());
    });

    const newStream = new MediaStream([consumer.track]);

    if (kind === "video") {
      addRemoteStream(participantId, { participantId, userName, videoStream: newStream });
    } else {
      addRemoteStream(participantId, { participantId, userName, audioStream: newStream });
    }

    consumer.on("transportclose", () => {
      stateRef.current.consumers.delete(consumer.id);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (consumer as any).on("producerclose", () => {
      stateRef.current.consumers.delete(consumer.id);
      removeRemoteStream(participantId);
    });
  }, [socket, sessionId, loadDevice, createTransport, addRemoteStream, removeRemoteStream]);

  const closeProducer = useCallback((kind: "audio" | "video") => {
    const producer = stateRef.current.producers.get(kind);
    if (!producer) return;
    socket.emit("ms:closeProducer", { sessionId, producerId: producer.id }, () => {});
    producer.close();
    stateRef.current.producers.delete(kind);
  }, [socket, sessionId]);

  const cleanup = useCallback(() => {
    const state = stateRef.current;
    state.producers.forEach((p) => p.close());
    state.consumers.forEach((c) => c.close());
    state.sendTransport?.close();
    state.recvTransport?.close();
    state.producers.clear();
    state.consumers.clear();
    state.sendTransport = null;
    state.recvTransport = null;
  }, []);

  return {
    publishMedia,
    consumeRemoteProducer,
    closeProducer,
    switchCamera,
    cleanup,
    getDevice: () => stateRef.current.device,
  };
}
