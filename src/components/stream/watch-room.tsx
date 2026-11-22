"use client";

import { use } from "react";
import { browser } from "react-dom";
import StreamChat from "@/components/stream/stream-chat";
import { StreamRoomProvider } from "@/components/stream/stream-room";
import ViewerVideo from "@/components/stream/viewer-video";

export default function WatchRoom({ roomId }: { roomId: string }) {
  use(browser("The viewer is available in your browser."));

  return (
    <StreamRoomProvider roomId={roomId}>
      <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="h-[42dvh] min-h-[16rem] w-full shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
          <ViewerVideo key={roomId} />
        </div>
        <div className="flex h-[26rem] w-full shrink-0 lg:h-auto lg:min-h-0 lg:w-[24rem] xl:w-[26rem]">
          <StreamChat key={roomId} theater />
        </div>
      </div>
    </StreamRoomProvider>
  );
}
