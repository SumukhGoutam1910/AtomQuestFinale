import type { NextConfig } from "next";
import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  // WebRTC setup (getUserMedia, transports, producers) must run exactly once per
  // mount. React StrictMode double-invokes effects in dev, which races the
  // mediasoup transport lifecycle — disable it so dev matches production.
  reactStrictMode: false,
  transpilePackages: ["@supportvision/types", "@supportvision/socket-events", "@supportvision/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  serverExternalPackages: ["mongoose"],
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  webpack: (config, { dev }) => {
    // The project lives under OneDrive, which syncs/locks files and corrupts
    // Next's on-disk webpack cache (ENOENT *.pack.gz, stale modules). Use an
    // in-memory cache in dev so nothing is written to the synced folder.
    if (dev) {
      config.cache = { type: "memory" };
      // OneDrive swallows native file-change events, so HMR misses edits.
      // Poll the filesystem instead so changes are reliably picked up.
      config.watchOptions = { poll: 1000, aggregateTimeout: 300 };
    }
    return config;
  },
};

export default nextConfig;
