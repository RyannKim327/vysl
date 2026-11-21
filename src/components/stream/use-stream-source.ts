"use client";

import { useEffect, useState } from "react";
import {
  readStreamSource,
  STREAM_SOURCE_CHANGE_EVENT,
  type StreamSource,
} from "@/lib/stream-source";

export function useStreamSource(): StreamSource {
  const [source, setSource] = useState<StreamSource>(readStreamSource);

  useEffect(() => {
    const update = () => setSource(readStreamSource());
    window.addEventListener("storage", update);
    window.addEventListener(STREAM_SOURCE_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(STREAM_SOURCE_CHANGE_EVENT, update);
    };
  }, []);

  return source;
}
