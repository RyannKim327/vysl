"use client";

import { use, useState, type FormEvent } from "react";
import { browser } from "react-dom";
import {
  clearStreamSettings,
  defaultStreamSettings,
  FACEBOOK_RTMP_URL,
  readStreamSettings,
  writeStreamSettings,
  type StreamSettings,
} from "@/lib/stream-settings";

type Status = "idle" | "saved" | "error" | "cleared";

export default function StreamKeySettings() {
  use(browser("Stream settings are stored in this browser."));

  const [settings, setSettings] = useState<StreamSettings>(readStreamSettings);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  function update(field: keyof StreamSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setStatus("idle");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = writeStreamSettings({
      rtmpUrl: settings.rtmpUrl.trim(),
      streamKey: settings.streamKey.trim(),
    });
    setStatus(saved ? "saved" : "error");
  }

  function handleClear() {
    clearStreamSettings();
    setSettings(defaultStreamSettings());
    setShowKey(false);
    setStatus("cleared");
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] md:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Stream destination</h2>
          <p className="mt-1 text-sm text-muted">
            Your RTMP URL and key stay on this device.
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          Local only
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="space-y-2">
          <label htmlFor="rtmp-url" className="text-sm font-medium">
            RTMP server URL
          </label>
          <input
            id="rtmp-url"
            name="rtmpUrl"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={settings.rtmpUrl}
            onChange={(event) => update("rtmpUrl", event.target.value)}
            placeholder={FACEBOOK_RTMP_URL}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted">Quick fill:</span>
            <button
              type="button"
              onClick={() => update("rtmpUrl", FACEBOOK_RTMP_URL)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Facebook Live
            </button>
            <button
              type="button"
              onClick={() => update("rtmpUrl", "")}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Custom / blank
            </button>
          </div>
          <p className="text-xs text-muted">
            Create a live video in Facebook first, then paste the stream key it
            gives you. Facebook Live ingest is already filled in by default.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="stream-key" className="text-sm font-medium">
            Stream key
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <input
              id="stream-key"
              name="streamKey"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={settings.streamKey}
              onChange={(event) => update("streamKey", event.target.value)}
              placeholder="Paste your stream key"
              className="min-w-0 flex-1 bg-transparent py-1 font-mono text-sm outline-none placeholder:text-muted/70"
            />
            <button
              type="button"
              onClick={() => setShowKey((current) => !current)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Stored in localStorage and sent only to your ingest server when you go
            live. Publishing starts automatically when your stream starts.
          </p>
        </div>

        <div aria-live="polite" className="min-h-5 text-sm">
          {status === "saved" && (
            <p className="text-accent">Settings saved in this browser.</p>
          )}
          {status === "error" && (
            <p className="text-red-500">
              Could not save settings. Check that browser storage is available.
            </p>
          )}
          {status === "cleared" && (
            <p className="text-muted">Saved settings removed from this browser.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Save settings
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!settings.streamKey && !settings.rtmpUrl}
            className="inline-flex items-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear saved settings
          </button>
        </div>
      </form>
    </div>
  );
}
