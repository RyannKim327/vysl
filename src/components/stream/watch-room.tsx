"use client";

import { use } from "react";
import { browser } from "react-dom";
import StreamChat from "@/components/stream/stream-chat";
import StreamLayoutFrame from "@/components/stream/stream-layout-frame";
import { StreamRoomProvider } from "@/components/stream/stream-room";
import ViewerVideo from "@/components/stream/viewer-video";

export default function WatchRoom({ roomId }: { roomId: string }) {
  use(browser("The viewer is available in your browser."));

  return (
    <StreamRoomProvider roomId={roomId}>
      <StreamLayoutFrame
        video={<ViewerVideo key={roomId} />}
        chat={<StreamChat key={roomId} />}
      />
    </StreamRoomProvider>
  );
}
