"use client";

import { useEffect, useState, type RefObject } from "react";

export default function FullscreenButton({
  targetRef,
}: {
  targetRef: RefObject<HTMLElement | null>;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === targetRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [targetRef]);

  async function toggle() {
    const target = targetRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 fill-none stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
    </button>
  );
}
