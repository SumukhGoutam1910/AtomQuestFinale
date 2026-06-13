FROM node:20-slim AS base

# Build tools required to compile the mediasoup native worker.
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY package.json ./
COPY apps/media-server/package.json ./apps/media-server/
COPY packages/types/package.json ./packages/types/
COPY packages/socket-events/package.json ./packages/socket-events/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (compiles the mediasoup worker).
RUN npm install --workspaces --include-workspace-root

# Copy source (TypeScript runs directly via tsx — no compile step).
COPY packages/types ./packages/types
COPY packages/socket-events ./packages/socket-events
COPY packages/shared ./packages/shared
COPY apps/media-server ./apps/media-server

WORKDIR /app/apps/media-server

EXPOSE 3001
# UDP range for mediasoup WebRTC transports
EXPOSE 10000-10100/udp

CMD ["npm", "run", "start"]
