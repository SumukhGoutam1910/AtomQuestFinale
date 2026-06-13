import * as mediasoup from "mediasoup";
import type { Worker } from "mediasoup/node/lib/types";
import { config } from "../config";
import { logger } from "../lib/logger";

let workers: Worker[] = [];
let nextWorkerIndex = 0;

export async function createWorkers(): Promise<void> {
  const { numWorkers, workerSettings } = config.mediasoup;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: workerSettings.logLevel,
      rtcMinPort: workerSettings.rtcMinPort,
      rtcMaxPort: workerSettings.rtcMaxPort,
    });

    worker.on("died", (error) => {
      logger.error(`Mediasoup worker ${worker.pid} died`, { error });
      // In production: restart the worker
      setTimeout(async () => {
        const idx = workers.indexOf(worker);
        if (idx !== -1) {
          const newWorker = await mediasoup.createWorker({
            logLevel: workerSettings.logLevel,
            rtcMinPort: workerSettings.rtcMinPort,
            rtcMaxPort: workerSettings.rtcMaxPort,
          });
          workers[idx] = newWorker;
          logger.info(`Mediasoup worker ${newWorker.pid} restarted at index ${idx}`);
        }
      }, 2000);
    });

    workers.push(worker);
    logger.info(`Mediasoup worker #${i} created (pid=${worker.pid})`);
  }
}

export function getNextWorker(): Worker {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

export function getWorkers(): Worker[] {
  return workers;
}

export async function closeAllWorkers(): Promise<void> {
  for (const w of workers) {
    w.close();
  }
  workers = [];
}
