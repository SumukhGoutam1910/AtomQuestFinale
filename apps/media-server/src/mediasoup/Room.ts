import type {
  Router,
  WebRtcTransport,
  WebRtcServer,
  Producer,
  Consumer,
  PlainTransport,
} from "mediasoup/node/lib/types";
import { getNextWorkerEntry } from "./WorkerPool";
import { config } from "../config";
import { logger } from "../lib/logger";
import type { RtpCapabilities, DtlsParameters, RtpParameters } from "@supportvision/types";

export interface PeerState {
  participantId: string;
  userName: string;
  role: "AGENT" | "CUSTOMER";
  socketId: string;
  sendTransport: WebRtcTransport | null;
  recvTransport: WebRtcTransport | null;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  disconnectedAt: number | null;
  gracePeriodTimer: ReturnType<typeof setTimeout> | null;
}

export class Room {
  readonly sessionId: string;
  private router: Router | null = null;
  private webRtcServer: WebRtcServer | null = null;
  private peers = new Map<string, PeerState>();
  private plainTransport: PlainTransport | null = null; // for recording
  private recordingProducers = new Map<string, Producer>(); // cloned producers for recording

  private constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  static async create(sessionId: string): Promise<Room> {
    const room = new Room(sessionId);
    await room.init();
    return room;
  }

  private async init(): Promise<void> {
    // Pin this room's router AND its WebRtcServer to the same worker.
    const { worker, webRtcServer } = getNextWorkerEntry();
    this.webRtcServer = webRtcServer;
    this.router = await worker.createRouter({
      mediaCodecs: config.mediasoup.routerMediaCodecs,
    });
    logger.info(`Room created for session ${this.sessionId}`);
  }

  getRouter(): Router {
    if (!this.router) throw new Error("Router not initialized");
    return this.router;
  }

  getRtpCapabilities(): RtpCapabilities {
    return this.getRouter().rtpCapabilities as RtpCapabilities;
  }

  addPeer(peer: Omit<PeerState, "sendTransport" | "recvTransport" | "producers" | "consumers" | "disconnectedAt" | "gracePeriodTimer">): PeerState {
    const state: PeerState = {
      ...peer,
      sendTransport: null,
      recvTransport: null,
      producers: new Map(),
      consumers: new Map(),
      disconnectedAt: null,
      gracePeriodTimer: null,
    };
    this.peers.set(peer.participantId, state);
    return state;
  }

  getPeer(participantId: string): PeerState | undefined {
    return this.peers.get(participantId);
  }

  getPeerBySocket(socketId: string): PeerState | undefined {
    for (const peer of this.peers.values()) {
      if (peer.socketId === socketId) return peer;
    }
    return undefined;
  }

  getActivePeers(): PeerState[] {
    return [...this.peers.values()].filter((p) => p.disconnectedAt === null);
  }

  getAllPeers(): PeerState[] {
    return [...this.peers.values()];
  }

  async createWebRtcTransport(participantId: string, direction: "send" | "recv"): Promise<WebRtcTransport> {
    const router = this.getRouter();
    if (!this.webRtcServer) throw new Error("WebRtcServer not initialized");
    // Use the shared WebRtcServer → all transports multiplex over one fixed port.
    const transport = await router.createWebRtcTransport({
      webRtcServer: this.webRtcServer,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransportOptions.initialAvailableOutgoingBitrate,
    });

    transport.on("dtlsstatechange", (state) => {
      if (state === "failed" || state === "closed") {
        logger.warn(`Transport ${transport.id} dtls state: ${state}`);
        transport.close();
      }
    });

    const peer = this.peers.get(participantId);
    if (peer) {
      if (direction === "send") {
        peer.sendTransport?.close();
        peer.sendTransport = transport;
      } else {
        peer.recvTransport?.close();
        peer.recvTransport = transport;
      }
    }

    return transport;
  }

  async connectTransport(
    participantId: string,
    transportId: string,
    dtlsParameters: DtlsParameters
  ): Promise<void> {
    const peer = this.peers.get(participantId);
    if (!peer) throw new Error("Peer not found");

    const transport =
      peer.sendTransport?.id === transportId
        ? peer.sendTransport
        : peer.recvTransport?.id === transportId
        ? peer.recvTransport
        : null;

    if (!transport) throw new Error("Transport not found");
    // Our shared DtlsParameters use plain strings; mediasoup uses stricter unions.
    await transport.connect({ dtlsParameters: dtlsParameters as any });
  }

  async produce(
    participantId: string,
    transportId: string,
    kind: "audio" | "video",
    rtpParameters: RtpParameters
  ): Promise<Producer> {
    const peer = this.peers.get(participantId);
    if (!peer) throw new Error("Peer not found");
    if (!peer.sendTransport || peer.sendTransport.id !== transportId) {
      throw new Error("Send transport not found");
    }

    const producer = await peer.sendTransport.produce({ kind, rtpParameters: rtpParameters as any });

    producer.on("transportclose", () => {
      producer.close();
      peer.producers.delete(producer.id);
    });

    peer.producers.set(producer.id, producer);
    logger.info(`Producer ${producer.id} (${kind}) created for peer ${participantId}`);
    return producer;
  }

  async consume(
    consumingParticipantId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer> {
    const router = this.getRouter();
    const peer = this.peers.get(consumingParticipantId);
    if (!peer) throw new Error("Consuming peer not found");
    if (!peer.recvTransport || peer.recvTransport.id !== transportId) {
      throw new Error("Recv transport not found");
    }

    if (!router.canConsume({ producerId, rtpCapabilities: rtpCapabilities as any })) {
      throw new Error(`Cannot consume producer ${producerId}`);
    }

    const consumer = await peer.recvTransport.consume({
      producerId,
      rtpCapabilities: rtpCapabilities as any,
      paused: true,
    });

    consumer.on("transportclose", () => consumer.close());
    consumer.on("producerclose", () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    peer.consumers.set(consumer.id, consumer);
    return consumer;
  }

  async resumeConsumer(participantId: string, consumerId: string): Promise<void> {
    const peer = this.peers.get(participantId);
    const consumer = peer?.consumers.get(consumerId);
    if (!consumer) throw new Error("Consumer not found");
    await consumer.resume();
  }

  closeProducer(participantId: string, producerId: string): void {
    const peer = this.peers.get(participantId);
    const producer = peer?.producers.get(producerId);
    producer?.close();
    peer?.producers.delete(producerId);
  }

  getAllProducers(): Array<{ producerId: string; participantId: string; userName: string; kind: "audio" | "video" }> {
    const result: Array<{ producerId: string; participantId: string; userName: string; kind: "audio" | "video" }> = [];
    for (const peer of this.peers.values()) {
      if (peer.disconnectedAt !== null) continue;
      for (const [producerId, producer] of peer.producers) {
        if (!producer.closed) {
          result.push({
            producerId,
            participantId: peer.participantId,
            userName: peer.userName,
            kind: producer.kind,
          });
        }
      }
    }
    return result;
  }

  markDisconnected(participantId: string): void {
    const peer = this.peers.get(participantId);
    if (peer) peer.disconnectedAt = Date.now();
  }

  markReconnected(participantId: string, newSocketId: string): void {
    const peer = this.peers.get(participantId);
    if (peer) {
      if (peer.gracePeriodTimer) {
        clearTimeout(peer.gracePeriodTimer);
        peer.gracePeriodTimer = null;
      }
      peer.disconnectedAt = null;
      peer.socketId = newSocketId;
    }
  }

  removePeer(participantId: string): void {
    const peer = this.peers.get(participantId);
    if (!peer) return;
    peer.sendTransport?.close();
    peer.recvTransport?.close();
    peer.producers.forEach((p) => p.close());
    peer.consumers.forEach((c) => c.close());
    if (peer.gracePeriodTimer) clearTimeout(peer.gracePeriodTimer);
    this.peers.delete(participantId);
  }

  async createPlainTransportForRecording(): Promise<PlainTransport> {
    const router = this.getRouter();
    this.plainTransport = await router.createPlainTransport({
      listenIp: { ip: "127.0.0.1" },
      rtcpMux: false,
      comedia: false,
    });
    return this.plainTransport;
  }

  getPlainTransport(): PlainTransport | null {
    return this.plainTransport;
  }

  close(): void {
    for (const [id] of this.peers) {
      this.removePeer(id);
    }
    this.plainTransport?.close();
    this.router?.close();
    logger.info(`Room ${this.sessionId} closed`);
  }

  get peerCount(): number {
    return this.getActivePeers().length;
  }
}
