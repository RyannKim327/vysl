"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import { useStreamLayout } from "@/components/stream/use-stream-layout";
import {
  clearStreamLayout,
  LAYOUT_PRESETS,
  layoutForPreset,
  writeStreamLayout,
  type LayoutPreset,
} from "@/lib/stream-layout";

type Status = "idle" | "saved" | "error" | "reset";

function LayoutPreview({ preset }: { preset: LayoutPreset }) {
  const stacked = preset === "stacked";
  const chatLeft = preset === "chat-left";

  return (
    <div className="flex h-12 w-full items-stretch gap-1 overflow-hidden rounded-lg border border-border/70 bg-background p-1">
      {!stacked ? (
        <>
          {chatLeft && (
            <div className="w-1/4 rounded bg-surface-alt" />
          )}
          <div className="h-full flex-1 rounded bg-accent/70" />
          {!chatLeft && (
            <div className="w-1/4 rounded bg-surface-alt" />
          )}
        </>
      ) : (
        <div className="flex w-full flex-col gap-1">
          <div className="h-2/3 rounded bg-accent/70" />
          <div className="h-1/3 rounded bg-surface-alt" />
        </div>
      )}
    </div>
  );
}

export default function StreamLayoutSettings() {
  use(browser("Layout settings are stored in this browser."));

  const layout = useStreamLayout();
  const [status, setStatus] = useState<Status>("idle");

  function choosePreset(preset: LayoutPreset) {
    setStatus(writeStreamLayout(layoutForPreset(preset, layout)) ? "saved" : "error");
  }

  function updateCustom(patch: Partial<typeof layout>) {
    setStatus(
      writeStreamLayout({ ...layout, ...patch, preset: "custom" }) ? "saved" : "error",
    );
  }

  function resetLayout() {
    clearStreamLayout();
    setStatus("reset");
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] md:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Workspace layout</h2>
          <p className="mt-1 text-sm text-muted">
            Arrange the video and chat panels in the studio and viewer.
          </p>
        </div>
        <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-muted">
          {LAYOUT_PRESETS.find((preset) => preset.id === layout.preset)?.label}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LAYOUT_PRESETS.map((preset) => {
          const active = layout.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset.id)}
              aria-pressed={active}
              className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active
                  ? "border-accent bg-accent-soft/60"
                  : "border-border bg-background/60 hover:bg-surface-alt"
              }`}
            >
              <LayoutPreview preset={preset.id} />
              <p className="mt-3 text-sm font-medium">{preset.label}</p>
              <p className="mt-1 text-xs text-muted">{preset.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-background/50 p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="video-width" className="text-sm font-medium">
              Video width
            </label>
            <span className="font-mono text-xs text-muted">
              {layout.videoWidth.toFixed(1)}%
            </span>
          </div>
          <input
            id="video-width"
            type="range"
            min={40}
            max={90}
            step={0.5}
            value={layout.videoWidth}
            onChange={(event) =>
              updateCustom({ videoWidth: Number(event.target.value), chatBelow: false })
            }
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <p className="mt-2 text-xs text-muted">
            Applies when video and chat sit side by side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium">Chat position</span>
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => updateCustom({ chatSide: side, chatBelow: false })}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                layout.chatSide === side && !layout.chatBelow
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-surface text-muted hover:bg-surface-alt"
              }`}
            >
              {side}
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateCustom({ chatBelow: true })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              layout.chatBelow
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-muted hover:bg-surface-alt"
            }`}
          >
            Below video
          </button>
        </div>

        <div aria-live="polite" className="min-h-5 text-sm">
          {status === "saved" && <p className="text-accent">Layout saved.</p>}
          {status === "error" && (
            <p className="text-red-500">Could not save layout. Check browser storage.</p>
          )}
          {status === "reset" && <p className="text-muted">Layout reset to Classic.</p>}
        </div>

        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Reset to Classic
        </button>
      </div>
    </div>
  );
}
