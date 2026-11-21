"use client";

import type { ReactNode } from "react";
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
  const videoStyle = sideBySide
    ? { width: `calc(${layout.videoWidth}% - 0.5rem)` }
    : undefined;
  const chatStyle = sideBySide
    ? { width: `calc(${100 - layout.videoWidth}% - 0.5rem)` }
    : undefined;

  return (
    <div
      className={`flex flex-col items-stretch gap-4 ${
        sideBySide
          ? `lg:flex-row ${layout.chatSide === "left" ? "lg:flex-row-reverse" : ""}`
          : ""
      }`}
    >
      <div className="w-full" style={videoStyle}>
        {video}
      </div>
      <div className="flex w-full" style={chatStyle}>
        {chat}
      </div>
    </div>
  );
}
