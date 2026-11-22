"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import { useStreamSource } from "@/components/stream/use-stream-source";
import {
  SOURCE_MODES,
  writeStreamSource,
  type AudioSource,
  type PipCorner,
  type PipSize,
  type SourceMode,
} from "@/lib/stream-source";

const CORNERS: { id: PipCorner; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

const SIZES: { id: PipSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

const AUDIO_SOURCES: { id: AudioSource; label: string; description: string }[] = [
  { id: "mic", label: "Mic only", description: "Just your voice" },
  { id: "device", label: "Device only", description: "Playlist or tab audio" },
  { id: "both", label: "Mic + device", description: "Voice and playlist together" },
];

function SourcePreview({ mode }: { mode: SourceMode }) {
  const screenFull = mode === "screen" || mode === "screen-pip";
  const pip = mode === "screen-pip" || mode === "camera-pip";

  return (
    <div className="relative flex h-14 w-full overflow-hidden rounded-lg border border-border/70 bg-[#0b0a09] p-1.5">
      <div
        className={`h-full w-full rounded ${screenFull ? "bg-surface-alt" : "bg-accent/70"}`}
      />
      {pip && (
        <div
          className={`absolute bottom-2 right-2 h-4 w-6 rounded border border-white/40 ${
            mode === "screen-pip" ? "bg-accent" : "bg-surface-alt"
          }`}
        />
      )}
    </div>
  );
}

export default function StreamSourceSettings() {
  use(browser("Stream source settings are stored in this browser."));

  const source = useStreamSource();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function update(patch: Partial<typeof source>) {
    setStatus(writeStreamSource({ ...source, ...patch }) ? "saved" : "error");
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] md:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Stream source</h2>
          <p className="mt-1 text-sm text-muted">
            Compose your camera and screen into the local preview.
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          {SOURCE_MODES.find((mode) => mode.id === source.mode)?.label}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SOURCE_MODES.map((mode) => {
          const active = source.mode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => update({ mode: mode.id })}
              aria-pressed={active}
              className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active
                  ? "border-accent bg-accent-soft/60"
                  : "border-border bg-background/60 hover:bg-surface-alt"
              }`}
            >
              <SourcePreview mode={mode.id} />
              <p className="mt-3 text-sm font-medium">{mode.label}</p>
              <p className="mt-1 text-xs text-muted">{mode.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-background/50 p-5">
        <div>
          <p className="text-sm font-medium">Mini camera position</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CORNERS.map((corner) => (
              <button
                key={corner.id}
                type="button"
                onClick={() => update({ pipCorner: corner.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  source.pipCorner === corner.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface text-muted hover:bg-surface-alt"
                }`}
              >
                {corner.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Mini camera size</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => update({ pipSize: size.id })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  source.pipSize === size.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface text-muted hover:bg-surface-alt"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Applies to the Screen + camera and Camera + screen templates.
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-sm font-medium">Audio source</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {AUDIO_SOURCES.map((audio) => (
              <button
                key={audio.id}
                type="button"
                onClick={() => update({ audioSource: audio.id })}
                aria-pressed={source.audioSource === audio.id}
                className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  source.audioSource === audio.id
                    ? "border-accent bg-accent-soft/60"
                    : "border-border bg-surface hover:bg-surface-alt"
                }`}
              >
                <p className="text-sm font-medium">{audio.label}</p>
                <p className="mt-1 text-xs text-muted">{audio.description}</p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            For device audio, enable “Share system/tab audio” in the browser screen
            picker.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <div>
            <p className="text-sm font-medium">Include chat in the preview</p>
            <p className="mt-1 text-xs text-muted">
              Draws the live chat panel next to the video, matching your workspace
              layout, in the local preview.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={source.showChat}
            onClick={() => update({ showChat: !source.showChat })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              source.showChat ? "bg-accent" : "bg-surface-alt"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                source.showChat ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div aria-live="polite" className="min-h-5 text-sm">
          {status === "saved" && <p className="text-accent">Source template saved.</p>}
          {status === "error" && (
            <p className="text-red-500">Could not save source settings.</p>
          )}
        </div>
      </div>
    </div>
  );
}
