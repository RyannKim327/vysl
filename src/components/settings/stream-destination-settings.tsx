"use client";

import { use, useState, type FormEvent } from "react";
import { browser } from "react-dom";
import {
  clearStreamSettings,
  defaultStreamSettings,
  readStreamSettings,
  writeStreamSettings,
  type StreamSettings,
} from "@/lib/stream-settings";

type Status = "idle" | "saved" | "error" | "cleared";

export default function StreamDestinationSettings() {
  use(browser("Stream settings are stored in this browser."));

  const [settings, setSettings] = useState<StreamSettings>(readStreamSettings);
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  function update(field: keyof StreamSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setStatus("idle");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = writeStreamSettings({
      whipUrl: settings.whipUrl.trim(),
      token: settings.token.trim(),
    });
    setStatus(saved ? "saved" : "error");
  }

  function handleClear() {
    clearStreamSettings();
    setSettings(defaultStreamSettings());
    setShowToken(false);
    setStatus("cleared");
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] md:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Stream destination</h2>
          <p className="mt-1 text-sm text-muted">
            Your WHIP endpoint and token stay on this device.
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          Local only
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="space-y-2">
          <label htmlFor="whip-url" className="text-sm font-medium">
            WHIP publish URL
          </label>
          <input
            id="whip-url"
            name="whipUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={settings.whipUrl}
            onChange={(event) => update("whipUrl", event.target.value)}
            placeholder="https://customer-....cloudflarestream.com/.../webRTC/publish"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-muted">
            Create a live input in Cloudflare Stream and paste its{" "}
            <code className="font-mono">webRTC.url</code> (the WHIP publish URL). Any
            RFC 9725 WHIP endpoint works too.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="whip-token" className="text-sm font-medium">
            Bearer token <span className="font-normal text-muted">(optional)</span>
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <input
              id="whip-token"
              name="token"
              type={showToken ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={settings.token}
              onChange={(event) => update("token", event.target.value)}
              placeholder="Only if your WHIP service requires one"
              className="min-w-0 flex-1 bg-transparent py-1 font-mono text-sm outline-none placeholder:text-muted/70"
            />
            <button
              type="button"
              onClick={() => setShowToken((current) => !current)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Cloudflare Stream puts the secret in the publish URL, so leave this
            empty. Publishing starts automatically when your stream starts.
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
            disabled={!settings.whipUrl && !settings.token}
            className="inline-flex items-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear saved settings
          </button>
        </div>
      </form>
    </div>
  );
}
