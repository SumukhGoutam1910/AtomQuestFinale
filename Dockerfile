# SupportVision — media server (mediasoup SFU + Socket.IO)
# Root Dockerfile so Fly.io uses it by default. Build context = repo root.
FROM node:20-slim

# System deps required to compile the mediasoup native worker
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3
WORKDIR /app

# Copy the whole monorepo (workspaces + shared packages).
# node_modules / .next etc. are excluded via .dockerignore.
COPY . .

# Install all workspace deps — this compiles the mediasoup worker for Linux.
RUN npm install --workspaces --include-workspace-root

# Run the media server from its workspace (TypeScript runs via tsx, no build step).
WORKDIR /app/apps/media-server

EXPOSE 3001
EXPOSE 10000/udp
EXPOSE 10000/tcp

CMD ["npm", "run", "start"]
