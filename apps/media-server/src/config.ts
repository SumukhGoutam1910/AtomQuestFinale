import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(__dirname, "../../../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  mongodb: {
    uri: required("MONGODB_URI"),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
  },

  mediasoup: {
    numWorkers: parseInt(process.env.MEDIASOUP_WORKERS ?? "2", 10),
    workerSettings: {
      logLevel: (process.env.MEDIASOUP_LOG_LEVEL ?? "warn") as "debug" | "warn" | "error" | "none",
      rtcMinPort: parseInt(process.env.RTC_MIN_PORT ?? "10000", 10),
      rtcMaxPort: parseInt(process.env.RTC_MAX_PORT ?? "10100", 10),
    },
    routerMediaCodecs: [
      {
        kind: "audio" as const,
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video" as const,
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: { "x-google-start-bitrate": 1000 },
      },
      {
        kind: "video" as const,
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "4d0032",
          "level-asymmetry-allowed": 1,
          "x-google-start-bitrate": 1000,
        },
      },
    ],
    webRtcTransportOptions: {
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP ?? "0.0.0.0",
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP ?? "127.0.0.1",
        },
      ],
      initialAvailableOutgoingBitrate: 1_000_000,
      maxIncomingBitrate: 1_500_000,
    },
  },
};
