"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import Link from "next/link";
import { useStreamChatFeed, useStreamRoom } from "@/components/stream/stream-room";
import { useStreamLayout } from "@/components/stream/use-stream-layout";
import { useStreamSource } from "@/components/stream/use-stream-source";
import { HOST_ID, type StreamSignal } from "@/components/stream/use-stream-channel";
import { getIngestEndpoint, RtmpPublisher } from "@/lib/rtmp-publisher";
import { readStreamSettings, STREAM_SETTINGS_KEY } from "@/lib/stream-settings";
import {
  SOURCE_MODES,
  writeStreamSource,
  type AudioSource,
  type SourceMode,
} from "@/lib/stream-source";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

async function addQueuedIce(
  pc: RTCPeerConnection,
  viewerId: string,
  queue: Map<string, RTCIceCandidateInit[]>,
) {
  const candidates = queue.get(viewerId) ?? [];
  queue.delete(viewerId);
  for (const candidate of candidates) {
    try {
      await pc.addIceCandidate(candidate);
    } catch {}
  }
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
  const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  ctx.drawImage(
    video,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      if (lines >= maxLines) return lines;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines;
}

function drawChatPanel(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  messages: { author: string; body: string }[],
) {
  const padding = Math.max(12, Math.round(rect.width * 0.035));
  const titleSize = Math.max(15, Math.round(rect.width * 0.045));
  const bodySize = Math.max(12, Math.round(rect.width * 0.032));
  const lineHeight = Math.round(bodySize * 1.45);
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  ctx.fillStyle = "rgba(12, 12, 14, 0.95)";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  const innerX = rect.x + padding;
  let cursorY = rect.y + padding + titleSize;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${titleSize}px system-ui, sans-serif`;
  ctx.fillText("Live chat", innerX, cursorY);
  cursorY += Math.round(titleSize * 0.7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = `${bodySize}px system-ui, sans-serif`;
  ctx.fillText("Messages from everyone watching", innerX, cursorY);
  cursorY += Math.round(bodySize * 2.1);

  const visible = messages.slice(-6);
  for (const message of visible) {
    if (cursorY > rect.y + rect.height - padding - lineHeight) break;
    ctx.fillStyle = accent || "#8b5cf6";
    ctx.font = `600 ${bodySize}px system-ui, sans-serif`;
    ctx.fillText(message.author, innerX, cursorY);
    cursorY += lineHeight;
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.font = `${bodySize}px system-ui, sans-serif`;
    const used = drawWrappedText(
      ctx,
      message.body,
      innerX,
      cursorY,
      rect.width - padding * 2,
      lineHeight,
      2,
    );
    cursorY += lineHeight * Math.max(used, 1) + Math.round(bodySize * 0.6);
  }

  if (visible.length === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = `${bodySize}px system-ui, sans-serif`;
    ctx.fillText("Say hello to start the conversation", innerX, cursorY);
  }
  ctx.restore();
}

export default function StreamPreview() {
  use(browser("Video preview is available in your browser."));

  const { send, subscribe, mode } = useStreamRoom();
  const { messages: chatMessages } = useStreamChatFeed();
  const layout = useStreamLayout();
  const source = useStreamSource();
  const sourceRef = useRef(source);
  const chatRef = useRef(chatMessages);
  const layoutRef = useRef(layout);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const screenEndedRef = useRef<(() => void) | null>(null);
  const publisherRef = useRef<RtmpPublisher | null>(null);
  const publishAttemptRef = useRef(0);
  const publishedVersionRef = useRef<number | null>(null);
  const wasPreviewingRef = useRef(false);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const [previewing, setPreviewing] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [broadcastVersion, setBroadcastVersion] = useState(0);
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "connecting" | "live" | "error"
  >("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [deviceAudioAvailable, setDeviceAudioAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(readStreamSettings);

  const closePeer = useCallback((viewerId: string) => {
    const pc = peersRef.current.get(viewerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peersRef.current.delete(viewerId);
    }
    pendingIceRef.current.delete(viewerId);
    setViewers(peersRef.current.size);
  }, []);

  const connectViewer = useCallback(
    async (viewerId: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(viewerId, pc);
      setViewers(peersRef.current.size);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: "ice",
            to: viewerId,
            from: HOST_ID,
            candidate: event.candidate.toJSON(),
          });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeer(viewerId);
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "offer", to: viewerId, from: HOST_ID, sdp: offer });
      } catch {
        closePeer(viewerId);
      }
    },
    [closePeer, send],
  );

  const handleSignal = useCallback(
    (signal: StreamSignal) => {
      switch (signal.type) {
        case "join": {
          const stream = localStreamRef.current;
          if (!stream) {
            send({ type: "host-status", to: signal.viewerId, online: false });
          } else if (!peersRef.current.has(signal.viewerId)) {
            void connectViewer(signal.viewerId, stream);
          } else {
            send({ type: "host-status", to: signal.viewerId, online: true });
          }
          break;
        }
        case "answer": {
          const pc = peersRef.current.get(signal.from);
          if (!pc) break;
          void (async () => {
            try {
              await pc.setRemoteDescription(signal.sdp);
              await addQueuedIce(pc, signal.from, pendingIceRef.current);
            } catch {}
          })();
          break;
        }
        case "ice": {
          if (signal.to !== HOST_ID) break;
          const pc = peersRef.current.get(signal.from);
          if (!pc) break;
          if (!pc.remoteDescription) {
            const queue = pendingIceRef.current.get(signal.from) ?? [];
            queue.push(signal.candidate);
            pendingIceRef.current.set(signal.from, queue);
          } else {
            void pc.addIceCandidate(signal.candidate).catch(() => {});
          }
          break;
        }
        case "leave":
          closePeer(signal.viewerId);
          break;
        default:
          break;
      }
    },
    [closePeer, connectViewer, send],
  );

  useEffect(() => subscribe(handleSignal), [handleSignal, subscribe]);

  useEffect(() => {
    if (previewing && mode !== "connecting") send({ type: "host-online" });
  }, [mode, previewing, send]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STREAM_SETTINGS_KEY) setSettings(readStreamSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    void audioContextRef.current.resume();
    return audioContextRef.current;
  }, []);

  const stopComposition = useCallback(() => {
    if (frameTimerRef.current !== null) window.clearInterval(frameTimerRef.current);
    frameTimerRef.current = null;
    for (const node of audioNodesRef.current) {
      try {
        node.disconnect();
      } catch {}
    }
    audioNodesRef.current = [];
    audioDestinationRef.current?.stream.getTracks().forEach((track) => track.stop());
    audioDestinationRef.current = null;
    canvasStreamRef.current?.getTracks().forEach((track) => track.stop());
    canvasStreamRef.current = null;
    canvasRef.current = null;
  }, []);

  const buildAudioTracks = useCallback((): MediaStreamTrack[] => {
    const audioSource = sourceRef.current.audioSource;
    const mic =
      audioSource === "device"
        ? undefined
        : cameraStreamRef.current?.getAudioTracks()[0];
    const screenAudio =
      audioSource === "mic" ? undefined : screenStreamRef.current?.getAudioTracks()[0];
    if (!mic) return screenAudio ? [screenAudio] : [];
    if (!screenAudio) return [mic];

    const context = getAudioContext();
    const destination = context.createMediaStreamDestination();
    const micNode = context.createMediaStreamSource(new MediaStream([mic]));
    const screenNode = context.createMediaStreamSource(new MediaStream([screenAudio]));
    micNode.connect(destination);
    screenNode.connect(destination);
    audioNodesRef.current = [micNode, screenNode];
    audioDestinationRef.current = destination;
    return destination.stream.getAudioTracks();
  }, [getAudioContext]);

  const startComposition = useCallback((): MediaStream | null => {
    stopComposition();
    const camera = cameraStreamRef.current;
    const screen = screenStreamRef.current;
    if ((!camera && !screen) || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
      return null;
    }

    const screenSettings = screen?.getVideoTracks()[0]?.getSettings();
    const width = Math.max(640, Math.round(screenSettings?.width ?? 1280));
    const height = Math.max(360, Math.round(screenSettings?.height ?? 720));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const draw = () => {
      const current = sourceRef.current;
      const viewLayout = layoutRef.current;
      const screenIsFull = current.mode === "screen" || current.mode === "screen-pip";
      const fullVideo =
        (screenIsFull ? screenVideoRef.current : cameraVideoRef.current) ??
        cameraVideoRef.current ??
        screenVideoRef.current;
      const pipVideo =
        current.mode === "screen-pip"
          ? cameraVideoRef.current
          : current.mode === "camera-pip"
            ? screenVideoRef.current
            : null;

      let videoRect = { x: 0, y: 0, width, height };
      let chatRect: { x: number; y: number; width: number; height: number } | null = null;
      if (current.showChat) {
        if (viewLayout.chatBelow) {
          const chatHeight = Math.max(180, Math.round(height * 0.34));
          videoRect = { x: 0, y: 0, width, height: height - chatHeight };
          chatRect = { x: 0, y: height - chatHeight, width, height: chatHeight };
        } else {
          const desired = Math.round((width * (100 - viewLayout.videoWidth)) / 100);
          const chatWidth = Math.max(
            220,
            Math.min(desired, Math.round(width * 0.45)),
          );
          if (viewLayout.chatSide === "left") {
            chatRect = { x: 0, y: 0, width: chatWidth, height };
            videoRect = { x: chatWidth, y: 0, width: width - chatWidth, height };
          } else {
            videoRect = { x: 0, y: 0, width: width - chatWidth, height };
            chatRect = { x: width - chatWidth, y: 0, width: chatWidth, height };
          }
        }
      }

      ctx.fillStyle = "#0b0a09";
      ctx.fillRect(0, 0, width, height);
      if (fullVideo) {
        drawContain(ctx, fullVideo, videoRect.x, videoRect.y, videoRect.width, videoRect.height);
      }

      if (pipVideo) {
        const scale =
          current.pipSize === "small" ? 0.18 : current.pipSize === "large" ? 0.34 : 0.25;
        const pipWidth = Math.round(videoRect.width * scale);
        const ratio =
          pipVideo.videoWidth && pipVideo.videoHeight
            ? pipVideo.videoHeight / pipVideo.videoWidth
            : 0.5625;
        const pipHeight = Math.min(
          Math.round(pipWidth * ratio),
          Math.round(videoRect.height * 0.5),
        );
        const margin = Math.round(videoRect.width * 0.02);
        const left =
          videoRect.x +
          (current.pipCorner.endsWith("left")
            ? margin
            : videoRect.width - pipWidth - margin);
        const top =
          videoRect.y +
          (current.pipCorner.startsWith("top")
            ? margin
            : videoRect.height - pipHeight - margin);

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(left - 4, top - 4, pipWidth + 8, pipHeight + 8);
        drawContain(ctx, pipVideo, left, top, pipWidth, pipHeight);
      }

      if (chatRect) drawChatPanel(ctx, chatRect, chatRef.current);
    };

    const stream = canvas.captureStream(30);
    draw();
    frameTimerRef.current = window.setInterval(draw, 33);
    for (const track of buildAudioTracks()) stream.addTrack(track);
    canvasStreamRef.current = stream;
    return stream;
  }, [buildAudioTracks, stopComposition]);

  const applyBroadcast = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
    for (const pc of peersRef.current.values()) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "video" && videoTrack) {
          void sender.replaceTrack(videoTrack);
        }
        if (sender.track?.kind === "audio" && audioTrack) {
          void sender.replaceTrack(audioTrack);
        }
      }
    }
    setBroadcastVersion((version) => version + 1);
  }, []);

  const rebuildBroadcast = useCallback(() => {
    const camera = cameraStreamRef.current;
    const screen = screenStreamRef.current;
    if (!camera && !screen) return;

    const current = sourceRef.current;
    if (!screen && !current.showChat) {
      stopComposition();
      const fallback = camera ?? screen;
      if (fallback) applyBroadcast(fallback);
      return;
    }

    const composed = startComposition();
    if (composed) applyBroadcast(composed);
  }, [applyBroadcast, startComposition, stopComposition]);

  useEffect(() => {
    chatRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    sourceRef.current = source;
    const wasPreviewing = wasPreviewingRef.current;
    wasPreviewingRef.current = previewing;
    if (previewing && wasPreviewing) rebuildBroadcast();
  }, [previewing, rebuildBroadcast, source]);

  const stopRtmp = useCallback(() => {
    publishAttemptRef.current += 1;
    publisherRef.current?.stop();
    setPublishStatus("idle");
    setPublishError(null);
  }, []);

  const startRtmp = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const attempt = ++publishAttemptRef.current;

    if (!settings.rtmpUrl || !settings.streamKey) {
      setPublishStatus("error");
      setPublishError("Save an RTMP URL and stream key in Settings to go live.");
      return;
    }
    const endpoint = getIngestEndpoint();
    if (!endpoint) {
      setPublishStatus("error");
      setPublishError(
        "RTMP publishing needs a separate ingest server because Vercel cannot run ffmpeg. Set NEXT_PUBLIC_INGEST_WS_URL to your ingest server's wss:// URL and redeploy.",
      );
      return;
    }

    try {
      setPublishError(null);
      setPublishStatus("connecting");
      if (!publisherRef.current) publisherRef.current = new RtmpPublisher();
      await publisherRef.current.start(stream, {
        endpoint,
        rtmpUrl: settings.rtmpUrl,
        streamKey: settings.streamKey,
        onError: (message) => {
          if (attempt !== publishAttemptRef.current) return;
          setPublishStatus("error");
          setPublishError(message);
        },
      });
      if (attempt !== publishAttemptRef.current) return;
      setPublishStatus("live");
    } catch (caught) {
      if (attempt !== publishAttemptRef.current) return;
      setPublishStatus("error");
      setPublishError(
        caught instanceof Error ? caught.message : "Could not start RTMP publishing.",
      );
    }
  }, [settings.rtmpUrl, settings.streamKey]);

  useEffect(() => {
    if (!previewing) {
      stopRtmp();
      publishedVersionRef.current = null;
      return;
    }
    if (!settings.rtmpUrl || !settings.streamKey) return;
    if (publishedVersionRef.current === broadcastVersion) return;
    publishedVersionRef.current = broadcastVersion;
    stopRtmp();
    void startRtmp();
  }, [broadcastVersion, previewing, settings.rtmpUrl, settings.streamKey, startRtmp, stopRtmp]);

  const stopScreenShare = useCallback(() => {
    screenEndedRef.current?.();
    screenEndedRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setScreenSharing(false);
    setDeviceAudioAvailable(false);
    const hasCameraVideo = Boolean(cameraStreamRef.current?.getVideoTracks().length);
    if (!hasCameraVideo) {
      stopPreview();
      return;
    }
    writeStreamSource({ ...sourceRef.current, mode: "camera" });
    rebuildBroadcast();
  }, [rebuildBroadcast]);

  async function attachVideo(video: HTMLVideoElement | null, stream: MediaStream) {
    if (!video) return;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {}
  }

  async function startPreview(): Promise<boolean> {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera preview is not supported in this browser.");
      return false;
    }

    const needsMic = sourceRef.current.audioSource !== "device";
    let stream: MediaStream;
    let withMic = needsMic;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: needsMic,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        withMic = false;
      } catch {
        setError("Camera access was denied or is unavailable.");
        return false;
      }
    }

    cameraStreamRef.current = stream;
    await attachVideo(cameraVideoRef.current, stream);
    setMicAvailable(withMic);
    setMicOn(withMic);
    setPreviewing(true);
    rebuildBroadcast();
    return true;
  }

  async function captureScreen(): Promise<boolean> {
    setError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen sharing is not supported in this browser.");
      return false;
    }

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: sourceRef.current.audioSource !== "mic",
      });
      screenStreamRef.current = screen;
      setDeviceAudioAvailable(screen.getAudioTracks().length > 0);
      await attachVideo(screenVideoRef.current, screen);
      const screenTrack = screen.getVideoTracks()[0];
      const onEnded = () => stopScreenShare();
      screenTrack.addEventListener("ended", onEnded, { once: true });
      screenEndedRef.current = () => screenTrack.removeEventListener("ended", onEnded);
      setScreenSharing(true);
      return true;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "NotAllowedError") return false;
      setError("Screen sharing could not be started.");
      return false;
    }
  }

  async function shareScreen() {
    if (!cameraStreamRef.current) {
      const started = await startPreview();
      if (!started) return;
    }
    if (!(await captureScreen())) return;

    if (sourceRef.current.mode === "camera") {
      writeStreamSource({ ...sourceRef.current, mode: "screen-pip" });
    } else {
      rebuildBroadcast();
    }
  }

  async function startScreenOnly() {
    if (!(await captureScreen())) return;
    if (!cameraStreamRef.current && sourceRef.current.audioSource !== "device") {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        cameraStreamRef.current = mic;
        setMicAvailable(true);
        setMicOn(true);
      } catch {
        setMicAvailable(false);
        setMicOn(false);
      }
    }
    setPreviewing(true);
    rebuildBroadcast();
  }

  async function startCameraAndScreen() {
    if (!(await startPreview())) return;
    if (await captureScreen()) rebuildBroadcast();
  }

  function startStream() {
    switch (sourceRef.current.mode) {
      case "screen":
        void startScreenOnly();
        break;
      case "screen-pip":
      case "camera-pip":
        void startCameraAndScreen();
        break;
      default:
        void startPreview();
    }
  }

  function stopPreview() {
    stopRtmp();
    screenEndedRef.current?.();
    screenEndedRef.current = null;
    stopComposition();
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    localStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    for (const viewerId of Array.from(peersRef.current.keys())) closePeer(viewerId);
    setPreviewing(false);
    setScreenSharing(false);
    setDeviceAudioAvailable(false);
    writeStreamSource({ ...sourceRef.current, mode: "camera" });
    if (mode !== "connecting") send({ type: "host-offline" });
  }

  function toggleMic() {
    const next = !micOn;
    cameraStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }

  useEffect(() => {
    return () => {
      publisherRef.current?.stop();
      screenEndedRef.current?.();
      stopComposition();
      void audioContextRef.current?.close();
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      for (const viewerId of Array.from(peersRef.current.keys())) closePeer(viewerId);
    };
  }, [closePeer, stopComposition]);

  const sourceLabel =
    SOURCE_MODES.find((item) => item.id === source.mode)?.label ?? "Camera only";
  const startLabel =
    source.mode === "screen"
      ? "Start screen stream"
      : source.mode === "camera"
        ? "Start camera preview"
        : "Start camera + screen";

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)]">
      <div className="hidden" aria-hidden="true">
        <video ref={cameraVideoRef} autoPlay muted playsInline />
        <video ref={screenVideoRef} autoPlay muted playsInline />
      </div>

      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <p className="text-sm font-medium">Video stream</p>
          <p className="text-xs text-muted">
            {previewing
              ? `${viewers} viewer${viewers === 1 ? "" : "s"} connected · ${sourceLabel}`
              : "Preview your camera or share your screen"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {publishStatus !== "idle" && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                publishStatus === "live"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : publishStatus === "connecting"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-red-500/15 text-red-400"
              }`}
            >
              {publishStatus === "live"
                ? "Facebook Live"
                : publishStatus === "connecting"
                  ? "Going live…"
                  : "RTMP error"}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              previewing ? "bg-accent-soft text-accent" : "bg-surface-alt text-muted"
            }`}
          >
            {previewing ? "Previewing" : "Offline"}
          </span>
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#0b0a09]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-contain ${previewing ? "block" : "hidden"}`}
        />
        {!previewing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-white/70"
                strokeWidth="1.6"
              >
                <rect x="3" y="6" width="13" height="12" rx="2" />
                <path d="m16 11 5-3v8l-5-3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/90">No video source connected</p>
            <p className="max-w-xs text-xs leading-6 text-white/50">
              Start your camera or share your screen to preview the feed you want
              to stream.
            </p>
          </div>
        )}
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          <span
            className={`h-2 w-2 rounded-full ${
              previewing ? "bg-emerald-400" : "bg-white/40"
            }`}
          />
          {previewing ? (screenSharing ? sourceLabel : "Camera on") : "No signal"}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-xs">
          {settings.streamKey ? (
            <>
              <p className="font-medium text-foreground">Destination ready</p>
              <p className="truncate font-mono text-muted">
                {settings.rtmpUrl || "Custom RTMP endpoint"}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">No stream key saved</p>
              <p className="text-muted">
                Add one in{" "}
                <Link href="/settings" className="text-accent hover:underline">
                  Settings
                </Link>{" "}
                before going live.
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Stream source template"
            value={source.mode}
            onChange={(event) =>
              writeStreamSource({ ...source, mode: event.target.value as SourceMode })
            }
            className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            {SOURCE_MODES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Audio source"
            value={source.audioSource}
            onChange={(event) =>
              writeStreamSource({
                ...source,
                audioSource: event.target.value as AudioSource,
              })
            }
            className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="mic">Mic only</option>
            <option value="device">Device only</option>
            <option value="both">Mic + device</option>
          </select>
          {previewing && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={!micAvailable}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 ${
                micOn && micAvailable
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-surface-alt text-muted hover:bg-border/50"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="1.8"
              >
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
                {!micOn && <path d="M4 4l16 16" />}
              </svg>
            </button>
          )}
          {previewing && (
            <button
              type="button"
              onClick={screenSharing ? stopScreenShare : shareScreen}
              className="inline-flex items-center rounded-full border border-border bg-surface-alt px-4 py-2 text-sm font-medium transition hover:bg-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {screenSharing ? "Stop sharing" : "Share screen"}
            </button>
          )}
          {previewing && (
            <button
              type="button"
              onClick={
                publishStatus === "live" || publishStatus === "connecting"
                  ? stopRtmp
                  : () => void startRtmp()
              }
              className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 ${
                publishStatus === "live"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-surface-alt hover:bg-border/50"
              }`}
              disabled={!previewing}
            >
              {publishStatus === "live"
                ? "Stop live"
                : publishStatus === "connecting"
                  ? "Connecting…"
                  : "Go live"}
            </button>
          )}
          <button
            type="button"
            onClick={previewing ? stopPreview : startStream}
            className="inline-flex items-center rounded-full border border-border bg-surface-alt px-4 py-2 text-sm font-medium transition hover:bg-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {previewing ? "Stop preview" : startLabel}
          </button>
        </div>
      </div>

      {source.mode !== "camera" && !screenSharing && (
        <p className="mt-3 text-xs text-muted">
          Start screen sharing to use the {sourceLabel.toLowerCase()} template.
        </p>
      )}
      {previewing && !micAvailable && source.audioSource !== "device" && (
        <p className="mt-3 text-xs text-muted">
          Microphone unavailable — {source.audioSource === "mic" ? "no audio will be sent" : "streaming device audio only"}.
        </p>
      )}
      {source.audioSource === "device" && !screenSharing && (
        <p className="mt-3 text-xs text-muted">
          Device audio is captured with screen sharing.
        </p>
      )}
      {source.audioSource === "device" && screenSharing && !deviceAudioAvailable && (
        <p className="mt-3 text-xs text-amber-500">
          Device audio wasn’t shared — enable “Share system/tab audio” in the browser picker.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {publishError && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {publishError}
        </p>
      )}
    </div>
  );
}
