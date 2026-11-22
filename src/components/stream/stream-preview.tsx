"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import FullscreenButton from "@/components/stream/fullscreen-button";
import { useStreamChatFeed } from "@/components/stream/stream-room";
import { useStreamLayout } from "@/components/stream/use-stream-layout";
import { useStreamSource } from "@/components/stream/use-stream-source";
import {
  SOURCE_MODES,
  writeStreamSource,
  type AudioSource,
  type SourceMode,
} from "@/lib/stream-source";

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

  const { messages: chatMessages } = useStreamChatFeed();
  const layout = useStreamLayout();
  const source = useStreamSource();
  const sourceRef = useRef(source);
  const chatRef = useRef(chatMessages);
  const layoutRef = useRef(layout);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const screenEndedRef = useRef<(() => void) | null>(null);
  const wasPreviewingRef = useRef(false);
  const [previewing, setPreviewing] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [deviceAudioAvailable, setDeviceAudioAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
  }, []);

  const rebuildBroadcast = useCallback(() => {
    const camera = cameraStreamRef.current;
    const screen = screenStreamRef.current;
    if (!camera && !screen) return;

    const current = sourceRef.current;
    if (!screen && !current.showChat) {
      stopComposition();
      if (camera) applyBroadcast(camera);
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
    screenEndedRef.current?.();
    screenEndedRef.current = null;
    stopComposition();
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setPreviewing(false);
    setScreenSharing(false);
    setDeviceAudioAvailable(false);
    writeStreamSource({ ...sourceRef.current, mode: "camera" });
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
      screenEndedRef.current?.();
      stopComposition();
      void audioContextRef.current?.close();
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [stopComposition]);

  const sourceLabel =
    SOURCE_MODES.find((item) => item.id === source.mode)?.label ?? "Camera only";
  const startLabel =
    source.mode === "screen"
      ? "Start screen preview"
      : source.mode === "camera"
        ? "Start camera preview"
        : "Start camera + screen";

  return (
    <div
      ref={stageRef}
      className="flex h-full flex-col rounded-3xl border border-border bg-surface p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)]"
    >
      <div className="hidden" aria-hidden="true">
        <video ref={cameraVideoRef} autoPlay muted playsInline />
        <video ref={screenVideoRef} autoPlay muted playsInline />
      </div>

      <div className="flex items-center justify-between gap-3 pb-4">
        <div>
          <p className="text-sm font-medium">Video preview</p>
          <p className="text-xs text-muted">
            {previewing
              ? `${sourceLabel} · local preview`
              : "Preview your camera or share your screen"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            previewing ? "bg-accent-soft text-accent" : "bg-surface-alt text-muted"
          }`}
        >
          {previewing ? "Previewing" : "Offline"}
        </span>
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
              Start your camera or share your screen to preview the feed.
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
        <div className="absolute right-4 top-4">
          <FullscreenButton targetRef={stageRef} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-xs">
          <p className="font-medium text-foreground">Local preview only</p>
          <p className="text-muted">Nothing is published from this browser.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Source template"
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
          Microphone unavailable — {source.audioSource === "mic" ? "no microphone audio" : "device audio only"}.
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
    </div>
  );
}
