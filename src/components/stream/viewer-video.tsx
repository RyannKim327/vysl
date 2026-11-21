"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { useStreamRoom } from "@/components/stream/stream-room";
import {
  HOST_ID,
  type ChannelMode,
  type StreamSignal,
} from "@/components/stream/use-stream-channel";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

type ViewerStatus = "waiting" | "connecting" | "live" | "offline";

function modeLabel(mode: ChannelMode) {
  switch (mode) {
    case "live":
      return "Connected";
    case "local":
      return "Local";
    case "offline":
      return "Offline";
    default:
      return "Connecting";
  }
}

export default function ViewerVideo() {
  use(browser("Viewer video is available in your browser."));

  const { send, subscribe, mode } = useStreamRoom();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const [viewerId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<ViewerStatus>("waiting");
  const [muted, setMuted] = useState(true);

  const closePeer = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcRef.current = null;
    }
    pendingIceRef.current = [];
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleSignal = useCallback(
    (signal: StreamSignal) => {
      switch (signal.type) {
        case "offer": {
          if (signal.to !== viewerId) break;
          void (async () => {
            closePeer();
            setStatus("connecting");
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            pcRef.current = pc;
            pc.ontrack = (event) => {
              if (!videoRef.current) return;
              videoRef.current.srcObject = event.streams[0] ?? null;
              setStatus("live");
              void videoRef.current.play().catch(() => {});
            };
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                send({
                  type: "ice",
                  to: HOST_ID,
                  from: viewerId,
                  candidate: event.candidate.toJSON(),
                });
              }
            };
            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "failed") setStatus("offline");
            };

            try {
              await pc.setRemoteDescription(signal.sdp);
              for (const candidate of pendingIceRef.current) {
                await pc.addIceCandidate(candidate).catch(() => {});
              }
              pendingIceRef.current = [];
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              send({
                type: "answer",
                to: HOST_ID,
                from: viewerId,
                sdp: answer,
              });
            } catch {
              closePeer();
              setStatus("offline");
            }
          })();
          break;
        }
        case "answer":
          break;
        case "ice": {
          if (signal.to !== viewerId) break;
          const pc = pcRef.current;
          if (!pc || !pc.remoteDescription) {
            pendingIceRef.current.push(signal.candidate);
          } else {
            void pc.addIceCandidate(signal.candidate).catch(() => {});
          }
          break;
        }
        case "host-online":
          send({ type: "join", viewerId });
          break;
        case "host-offline":
          closePeer();
          setStatus("offline");
          break;
        case "host-status":
          if (signal.to === viewerId && !signal.online) setStatus("offline");
          break;
        default:
          break;
      }
    },
    [closePeer, send, viewerId],
  );

  useEffect(() => subscribe(handleSignal), [handleSignal, subscribe]);

  useEffect(() => {
    if (mode === "connecting") return;
    send({ type: "join", viewerId });
    return () => send({ type: "leave", viewerId });
  }, [mode, send, viewerId]);

  useEffect(() => {
    return () => {
      closePeer();
    };
  }, [closePeer]);

  const overlayText =
    status === "connecting"
      ? "Connecting to stream…"
      : status === "offline"
        ? "The host is not streaming right now"
        : "Waiting for the host to start streaming";

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-border bg-surface lg:min-h-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Live stream</p>
          <p className="text-xs text-muted">Shared from the studio</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "live"
              ? "bg-accent-soft text-accent"
              : "bg-surface-alt text-muted"
          }`}
        >
          {status === "live" ? "Live" : modeLabel(mode)}
        </span>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#0b0a09]">
        <video
          ref={videoRef}
          autoPlay
          muted={muted}
          playsInline
          className={`h-full w-full object-contain ${status === "live" ? "block" : "hidden"}`}
        />
        {status !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-white/70"
                strokeWidth="1.6"
              >
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/90">{overlayText}</p>
            <p className="max-w-xs text-xs leading-6 text-white/50">
              Video appears here as soon as the host starts their camera.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-5 pb-5 text-xs leading-6 text-muted">
        <p className="min-w-0 flex-1">
          You are watching in this browser. Use the chat panel to join the
          conversation with everyone watching this stream.
        </p>
        <button
          type="button"
          disabled={status !== "live"}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            const video = videoRef.current;
            if (video) {
              video.muted = next;
              void video.play().catch(() => {});
            }
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-alt px-3 py-1.5 font-medium text-foreground transition hover:bg-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 fill-none stroke-current"
            strokeWidth="1.8"
          >
            <path d="M4 9v6h4l5 4V5L8 9H4Z" />
            {muted ? <path d="M17 9l4 6m0-6-4 6" /> : <path d="M17 9a4 4 0 0 1 0 6" />}
          </svg>
          {muted ? "Enable sound" : "Mute sound"}
        </button>
      </div>
    </div>
  );
}
