"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@supportvision/socket-events";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: AppSocket | null = null;

export function useSocket(): AppSocket {
  const socketRef = useRef<AppSocket | null>(null);

  if (!socketRef.current) {
    if (!globalSocket || !globalSocket.connected) {
      const url = process.env.NEXT_PUBLIC_MEDIA_SERVER_URL ?? "http://localhost:3001";
      globalSocket = io(url, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      }) as AppSocket;
    }
    socketRef.current = globalSocket;
  }

  return socketRef.current;
}

export function useSocketEvent<K extends keyof ServerToClientEvents>(
  socket: AppSocket,
  event: K,
  handler: ServerToClientEvents[K]
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const fn = (...args: any[]) => (handlerRef.current as any)(...args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).on(event, fn);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { (socket as any).off(event, fn); };
  }, [socket, event]);
}
