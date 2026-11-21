export const STREAM_SOURCE_KEY = "vysl.stream-source";
export const STREAM_SOURCE_CHANGE_EVENT = "vysl:source-change";

export const SOURCE_MODES = [
  { id: "camera", label: "Camera only", description: "Just your webcam feed" },
  { id: "screen", label: "Screen only", description: "Share the whole display" },
  { id: "screen-pip", label: "Screen + camera", description: "Screen with a camera inset" },
  { id: "camera-pip", label: "Camera + screen", description: "Camera with a screen inset" },
] as const;

export type SourceMode = (typeof SOURCE_MODES)[number]["id"];
export type PipCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type PipSize = "small" | "medium" | "large";
export type AudioSource = "mic" | "device" | "both";

export type StreamSource = {
  mode: SourceMode;
  pipCorner: PipCorner;
  pipSize: PipSize;
  audioSource: AudioSource;
  showChat: boolean;
};

export const DEFAULT_STREAM_SOURCE: StreamSource = {
  mode: "camera",
  pipCorner: "bottom-right",
  pipSize: "medium",
  audioSource: "both",
  showChat: true,
};

const MODE_IDS: readonly string[] = SOURCE_MODES.map((mode) => mode.id);
const CORNERS: readonly string[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const SIZES: readonly string[] = ["small", "medium", "large"];
const AUDIO_SOURCES: readonly string[] = ["mic", "device", "both"];

export function normalizeStreamSource(value: unknown): StreamSource {
  if (typeof value !== "object" || value === null) return DEFAULT_STREAM_SOURCE;
  const values = value as Record<string, unknown>;
  return {
    mode: MODE_IDS.includes(values.mode as string)
      ? (values.mode as SourceMode)
      : DEFAULT_STREAM_SOURCE.mode,
    pipCorner: CORNERS.includes(values.pipCorner as string)
      ? (values.pipCorner as PipCorner)
      : DEFAULT_STREAM_SOURCE.pipCorner,
    pipSize: SIZES.includes(values.pipSize as string)
      ? (values.pipSize as PipSize)
      : DEFAULT_STREAM_SOURCE.pipSize,
    audioSource: AUDIO_SOURCES.includes(values.audioSource as string)
      ? (values.audioSource as AudioSource)
      : DEFAULT_STREAM_SOURCE.audioSource,
    showChat: values.showChat !== false,
  };
}

export function readStreamSource(): StreamSource {
  try {
    const raw = localStorage.getItem(STREAM_SOURCE_KEY);
    if (!raw) return DEFAULT_STREAM_SOURCE;
    return normalizeStreamSource(JSON.parse(raw));
  } catch {
    return DEFAULT_STREAM_SOURCE;
  }
}

export function writeStreamSource(source: StreamSource): boolean {
  try {
    localStorage.setItem(STREAM_SOURCE_KEY, JSON.stringify(normalizeStreamSource(source)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(STREAM_SOURCE_CHANGE_EVENT));
    }
    return true;
  } catch {
    return false;
  }
}
