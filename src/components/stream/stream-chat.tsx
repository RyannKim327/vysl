"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import { browser } from "react-dom";
import { useStreamChatFeed, useStreamRoom } from "@/components/stream/stream-room";
import { getChatAuthor } from "@/lib/chat-storage";

function formatTime(sentAt: number) {
  return new Date(sentAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StreamChat() {
  use(browser("Chat messages are loaded in your browser."));

  const { roomId, send, mode } = useStreamRoom();
  const { messages, appendMessage } = useStreamChatFeed();
  const [draft, setDraft] = useState("");
  const [author] = useState(() => getChatAuthor(roomId));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    const message = {
      id: crypto.randomUUID(),
      author,
      body,
      sentAt: Date.now(),
    };

    appendMessage(message);
    setDraft("");
    send({ type: "chat", ...message });
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-border bg-surface lg:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-sm font-medium">Live chat</p>
          <p className="text-xs text-muted">Messages from everyone watching</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            mode === "live"
              ? "bg-accent-soft text-accent"
              : "bg-surface-alt text-muted"
          }`}
        >
          {mode === "live"
            ? "Live"
            : mode === "local"
              ? "Local"
              : mode === "offline"
                ? "Offline"
                : "Connecting"}
        </span>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-muted"
                strokeWidth="1.6"
              >
                <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-3 2v-5.4A7.5 7.5 0 0 1 11.5 4h1A7.5 7.5 0 0 1 20 11.5Z" />
              </svg>
            </div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="max-w-[15rem] text-xs leading-6 text-muted">
              Say hello to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="rounded-2xl border border-border/70 bg-background/70 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-accent">
                  {message.author}
                </span>
                <time className="text-[0.6875rem] text-muted">
                  {formatTime(message.sentAt)}
                </time>
              </div>
              <p className="mt-1.5 break-words text-sm leading-6">{message.body}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={500}
            placeholder="Send a message"
            aria-label="Chat message"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current"
              strokeWidth="1.8"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[0.6875rem] text-muted">
          Session only · cleared when you close the browser
        </p>
      </form>
    </div>
  );
}
