import { Suspense } from "react";
import Header from "@/components/layout/header";
import WatchRoom from "@/components/stream/watch-room";

function RoomFallback() {
  return (
    <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
      <div className="h-[42dvh] min-h-[16rem] w-full shrink-0 animate-pulse rounded-3xl border border-border bg-surface-alt/60 lg:h-auto lg:min-h-0 lg:flex-1" />
      <div className="h-[26rem] w-full shrink-0 animate-pulse rounded-3xl border border-border bg-surface-alt/60 lg:h-auto lg:min-h-0 lg:w-[24rem]" />
    </div>
  );
}

async function WatchContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-xs font-medium tracking-[0.18em] text-accent uppercase">
          Viewer
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Watching stream
        </h1>
        <p className="text-xs text-muted">
          ID:{" "}
          <span className="font-mono font-semibold tracking-[0.16em] text-accent">
            {id}
          </span>
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
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 lg:overflow-hidden lg:px-6 lg:py-6">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <Suspense
            fallback={
              <>
                <div className="h-6 w-64 shrink-0 animate-pulse rounded-full bg-surface-alt" />
                <RoomFallback />
              </>
            }
          >
            <WatchContent params={params} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
