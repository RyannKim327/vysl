"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StreamSignal = {
  type: "chat";
  id: string;
  author: string;
  body: string;
  sentAt: number;
};

export type RoomSignal = StreamSignal & { roomId: string };

export type ChannelMode = "connecting" | "live" | "local" | "offline";

type Listener = (signal: RoomSignal) => void;

function isRoomSignal(value: unknown, roomId: string): value is RoomSignal {
  if (typeof value !== "object" || value === null) return false;
  const signal = value as { roomId?: unknown; type?: unknown };
  return signal.roomId === roomId && signal.type === "chat";
}

function closeSocket(ws: WebSocket) {
  if (ws.readyState === WebSocket.CONNECTING) {
    ws.addEventListener("open", () => ws.close(), { once: true });
    return;
  }
  if (ws.readyState === WebSocket.OPEN) ws.close();
}

export function useStreamChannel(roomId: string) {
  const [mode, setMode] = useState<ChannelMode>("connecting");
  const sendRef = useRef<(signal: StreamSignal) => void>(() => {});
  const listenersRef = useRef(new Set<Listener>());

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const dispatch = useCallback((signal: RoomSignal) => {
    for (const listener of listenersRef.current) listener(signal);
  }, []);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let channel: BroadcastChannel | null = null;
    let timer: number | undefined;
    let attempt = 0;
    const isLocalHost =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "[::1]";
    const endpoints = isLocalHost ? ["/ws/local"] : ["/ws/chat", "/ws/local"];

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const startLocal = () => {
      if (disposed || channel) return;
      clearTimer();
      if (socket) closeSocket(socket);
      socket = null;
      if (typeof BroadcastChannel === "undefined") {
        setMode("offline");
        return;
      }
      channel = new BroadcastChannel(`vysl:stream:${roomId}`);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (isRoomSignal(event.data, roomId)) dispatch(event.data);
      };
      sendRef.current = (signal) => channel?.postMessage({ roomId, ...signal });
      setMode("local");
    };

    const connect = () => {
      if (disposed) return;
      if (attempt >= endpoints.length) {
        startLocal();
        return;
      }

      const path = endpoints[attempt++];
      try {
        const scheme = location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${scheme}//${location.host}${path}`);
        socket = ws;
        ws.onopen = () => {
          if (disposed) return;
          clearTimer();
          ws.send(JSON.stringify({ roomId, type: "join" }));
          sendRef.current = (signal) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ roomId, ...signal }));
            }
          };
          setMode("live");
        };
        ws.onmessage = (event) => {
          try {
            const parsed: unknown = JSON.parse(event.data as string);
            if (isRoomSignal(parsed, roomId)) dispatch(parsed);
          } catch {}
        };
        ws.onerror = () => ws.close();
        ws.onclose = () => {
          if (disposed || socket !== ws) return;
          socket = null;
          connect();
        };

        clearTimer();
        timer = window.setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) ws.close();
        }, 1500);
      } catch {
        connect();
      }
    };

    const startTimer = window.setTimeout(connect, 0);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      clearTimer();
      if (socket) closeSocket(socket);
      channel?.close();
      sendRef.current = () => {};
    };
  }, [roomId, dispatch]);

  const send = useCallback((signal: StreamSignal) => sendRef.current(signal), []);

  return { mode, send, subscribe };
}
