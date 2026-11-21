import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/layout/header";
import StreamDestinationSettings from "@/components/settings/stream-destination-settings";
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
            Save a WHIP publish URL and choose a studio layout. Create a live input
            in Cloudflare Stream to get one; everything stays in your browser&apos;s
            localStorage so it is ready the next time you open the studio.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-3xl border border-border bg-surface-alt/60" />
          }
        >
          <StreamDestinationSettings />
        </Suspense>

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
            Your WHIP endpoint and token are only sent to the streaming service
            when you go live. Clearing browser data removes them, and you can
            delete them at any time with the clear button above.
            Need to stream now?{" "}
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
