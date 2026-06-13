import * as mediasoup from "mediasoup";
import type { Worker, WebRtcServer } from "mediasoup/node/lib/types";
import { config } from "../config";
import { logger } from "../lib/logger";

export interface WorkerEntry {
  worker: Worker;
  webRtcServer: WebRtcServer;
}

let entries: WorkerEntry[] = [];
let nextIndex = 0;

async function buildWebRtcServer(worker: Worker, index: number): Promise<WebRtcServer> {
  const { rtcPort, listenIp, announcedIp } = config.mediasoup;
  // Each worker multiplexes ALL its transports onto one UDP + one TCP port.
  const port = rtcPort + index;
  return worker.createWebRtcServer({
    listenInfos: [
      { protocol: "udp", ip: listenIp, announcedAddress: announcedIp, port },
      { protocol: "tcp", ip: listenIp, announcedAddress: announcedIp, port },
    ],
  });
}

export async function createWorkers(): Promise<void> {
  const { numWorkers, workerSettings } = config.mediasoup;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: workerSettings.logLevel,
      rtcMinPort: workerSettings.rtcMinPort,
      rtcMaxPort: workerSettings.rtcMaxPort,
    });

    const webRtcServer = await buildWebRtcServer(worker, i);

    worker.on("died", (error) => {
      logger.error(`Mediasoup worker ${worker.pid} died`, { error });
      setTimeout(async () => {
        const idx = entries.findIndex((e) => e.worker === worker);
        if (idx !== -1) {
          const newWorker = await mediasoup.createWorker({
            logLevel: workerSettings.logLevel,
            rtcMinPort: workerSettings.rtcMinPort,
            rtcMaxPort: workerSettings.rtcMaxPort,
          });
          const newServer = await buildWebRtcServer(newWorker, idx);
          entries[idx] = { worker: newWorker, webRtcServer: newServer };
          logger.info(`Mediasoup worker ${newWorker.pid} restarted at index ${idx}`);
        }
      }, 2000);
    });

    entries.push({ worker, webRtcServer });
    logger.info(
      `Mediasoup worker #${i} created (pid=${worker.pid}) · WebRtcServer on port ${config.mediasoup.rtcPort + i} (udp+tcp)`
    );
  }
}

export function getNextWorkerEntry(): WorkerEntry {
  const entry = entries[nextIndex];
  nextIndex = (nextIndex + 1) % entries.length;
  return entry;
}

export function getWorkers(): Worker[] {
  return entries.map((e) => e.worker);
}

export async function closeAllWorkers(): Promise<void> {
  for (const { worker } of entries) {
    worker.close();
  }
  entries = [];
}
