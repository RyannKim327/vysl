import { Suspense } from "react";
import Header from "@/components/layout/header";
import StreamStudio from "@/components/stream/stream-studio";

export default function StreamPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">
            Stream studio
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Your live workspace
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Start your camera, share your stream ID, and chat with viewers in one
            place.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-[36rem] animate-pulse rounded-3xl border border-border bg-surface-alt/60" />
          }
        >
          <StreamStudio />
        </Suspense>
      </main>
    </div>
  );
}
