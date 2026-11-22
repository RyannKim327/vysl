"use client";

import { useRef } from "react";
import FullscreenButton from "@/components/stream/fullscreen-button";

export default function ViewerVideo() {
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={stageRef}
      className="flex h-full min-h-[20rem] flex-col overflow-hidden rounded-3xl border border-border bg-surface"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Live stage</p>
          <p className="text-xs text-muted">The viewer fills the available space</p>
        </div>
        <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-muted">
          Idle
        </span>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#0b0a09]">
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
            Video will appear here when streaming support is added back.
          </p>
        </div>
        <div className="absolute right-4 top-4">
          <FullscreenButton targetRef={stageRef} />
        </div>
      </div>

      <div className="shrink-0 px-5 py-4 text-xs leading-6 text-muted">
        You are watching in this browser. Use the chat panel to join the conversation.
      </div>
    </div>
  );
}
