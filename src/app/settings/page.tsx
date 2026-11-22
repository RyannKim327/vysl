import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/layout/header";
import StreamLayoutSettings from "@/components/settings/stream-layout-settings";
import StreamSourceSettings from "@/components/settings/stream-source-settings";

export default function SettingsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">
            Settings
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Stream configuration
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Choose your camera and screen sources and arrange the studio layout.
            Everything stays in your browser&apos;s localStorage so it is ready the
            next time you open the studio.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-3xl border border-border bg-surface-alt/60" />
          }
        >
          <StreamSourceSettings />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-3xl border border-border bg-surface-alt/60" />
          }
        >
          <StreamLayoutSettings />
        </Suspense>

        <div className="rounded-3xl border border-dashed border-border bg-surface-alt/50 p-6">
          <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
            Privacy by default
          </p>
          <p className="mt-2 max-w-2xl leading-7 text-muted">
            Your source choices and layout preferences stay on this device.
            Clearing browser data removes them, and you can reset the layout at
            any time from the button above.
            Need the studio?{" "}
            <Link href="/stream" className="font-medium text-accent hover:underline">
              Open the stream studio
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
