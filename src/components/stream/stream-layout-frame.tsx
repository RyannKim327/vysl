"use client";

import type { CSSProperties, ReactNode } from "react";
import { useStreamLayout } from "@/components/stream/use-stream-layout";

export default function StreamLayoutFrame({
  video,
  chat,
}: {
  video: ReactNode;
  chat: ReactNode;
}) {
  const layout = useStreamLayout();
  const sideBySide = !layout.chatBelow;
  const widths = sideBySide
    ? ({
        "--video-width": `calc(${layout.videoWidth}% - 0.5rem)`,
        "--chat-width": `calc(${100 - layout.videoWidth}% - 0.5rem)`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`flex w-full flex-col items-stretch gap-4 ${
        sideBySide
          ? `lg:flex-row ${layout.chatSide === "left" ? "lg:flex-row-reverse" : ""}`
          : ""
      }`}
      style={widths}
    >
      <div className={`w-full ${sideBySide ? "lg:w-[var(--video-width)]" : ""}`}>
        {video}
      </div>
      <div className={`flex w-full ${sideBySide ? "lg:w-[var(--chat-width)]" : ""}`}>
        {chat}
      </div>
    </div>
  );
}
