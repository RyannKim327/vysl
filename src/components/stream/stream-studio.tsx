"use client";

import { use, useState } from "react";
import { browser } from "react-dom";
import Link from "next/link";
import LayoutQuickPicker from "@/components/stream/layout-quick-picker";
import StreamChat from "@/components/stream/stream-chat";
import StreamLayoutFrame from "@/components/stream/stream-layout-frame";
import StreamPreview from "@/components/stream/stream-preview";
import { StreamRoomProvider } from "@/components/stream/stream-room";
import { getOrCreateStreamId } from "@/lib/stream-id";

export default function StreamStudio() {
  use(browser("Stream settings are stored in this browser."));

  const [roomId] = useState(getOrCreateStreamId);
  const [copied, setCopied] = useState(false);
  const watchUrl = `${location.origin}/watch/${roomId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
            Stream ID
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-[0.2em] text-accent">
            {roomId}
          </p>
          <p className="mt-1 text-xs text-muted">
            Share this ID so others can watch and chat with you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LayoutQuickPicker />
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copied ? "Link copied" : "Copy watch link"}
          </button>
          <Link
            href={`/watch/${roomId}`}
            target="_blank"
            className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Open viewer
          </Link>
        </div>
      </div>

      <StreamRoomProvider roomId={roomId}>
        <StreamLayoutFrame
          video={<StreamPreview key={roomId} />}
          chat={<StreamChat key={roomId} />}
        />
      </StreamRoomProvider>
    </>
  );
}
