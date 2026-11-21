import { Suspense } from "react";
import Header from "@/components/layout/header";
import WatchRoom from "@/components/stream/watch-room";

function RoomFallback() {
  return (
    <div className="h-[36rem] animate-pulse rounded-3xl border border-border bg-surface-alt/60" />
  );
}

async function WatchContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <div className="mb-8">
        <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">
          Viewer
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Watching stream
        </h1>
        <p className="mt-3 leading-7 text-muted">
          Stream ID:{" "}
          <span className="font-mono font-semibold tracking-[0.16em] text-accent">
            {id}
          </span>
          . You can watch the video and chat with everyone else here.
        </p>
      </div>

      <Suspense fallback={<RoomFallback />}>
        <WatchRoom roomId={id} />
      </Suspense>
    </>
  );
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <Suspense
          fallback={
            <>
              <div className="mb-8 h-32 animate-pulse rounded-3xl border border-border bg-surface-alt/60" />
              <RoomFallback />
            </>
          }
        >
          <WatchContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
