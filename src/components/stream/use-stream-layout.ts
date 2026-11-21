"use client";

import { useEffect, useState } from "react";
import {
  readStreamLayout,
  STREAM_LAYOUT_CHANGE_EVENT,
  type StreamLayout,
} from "@/lib/stream-layout";

export function useStreamLayout(): StreamLayout {
  const [layout, setLayout] = useState<StreamLayout>(readStreamLayout);

  useEffect(() => {
    const update = () => setLayout(readStreamLayout());
    window.addEventListener("storage", update);
    window.addEventListener(STREAM_LAYOUT_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(STREAM_LAYOUT_CHANGE_EVENT, update);
    };
  }, []);

  return layout;
}
