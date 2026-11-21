export const STREAM_LAYOUT_KEY = "vysl.stream-layout";
export const STREAM_LAYOUT_CHANGE_EVENT = "vysl:layout-change";

export const LAYOUT_PRESETS = [
  { id: "classic", label: "Classic", description: "Video 2/3 · chat 1/3" },
  { id: "theater", label: "Theater", description: "Larger video, compact chat" },
  { id: "chat-left", label: "Chat left", description: "Chat beside the video" },
  { id: "stacked", label: "Stacked", description: "Video above chat" },
  { id: "custom", label: "Custom", description: "Tune the split yourself" },
] as const;

export type LayoutPreset = (typeof LAYOUT_PRESETS)[number]["id"];

export type StreamLayout = {
  preset: LayoutPreset;
  videoWidth: number;
  chatSide: "left" | "right";
  chatBelow: boolean;
};

export const DEFAULT_STREAM_LAYOUT: StreamLayout = {
  preset: "classic",
  videoWidth: 66.666,
  chatSide: "right",
  chatBelow: false,
};

const PRESET_IDS: readonly string[] = LAYOUT_PRESETS.map((preset) => preset.id);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeStreamLayout(value: unknown): StreamLayout {
  if (typeof value !== "object" || value === null) return DEFAULT_STREAM_LAYOUT;
  const values = value as Record<string, unknown>;
  const preset = PRESET_IDS.includes(values.preset as string)
    ? (values.preset as LayoutPreset)
    : "classic";
  const width = Number(values.videoWidth);
  return {
    preset,
    videoWidth: Number.isFinite(width) ? clamp(width, 40, 90) : DEFAULT_STREAM_LAYOUT.videoWidth,
    chatSide: values.chatSide === "left" ? "left" : "right",
    chatBelow: values.chatBelow === true,
  };
}

export function layoutForPreset(preset: LayoutPreset, current: StreamLayout): StreamLayout {
  switch (preset) {
    case "classic":
      return { ...DEFAULT_STREAM_LAYOUT };
    case "theater":
      return { preset, videoWidth: 78, chatSide: "right", chatBelow: false };
    case "chat-left":
      return { preset, videoWidth: 66.666, chatSide: "left", chatBelow: false };
    case "stacked":
      return { preset, videoWidth: 100, chatSide: "right", chatBelow: true };
    case "custom":
      return { ...current, preset: "custom" };
  }
}

export function readStreamLayout(): StreamLayout {
  try {
    const raw = localStorage.getItem(STREAM_LAYOUT_KEY);
    if (!raw) return DEFAULT_STREAM_LAYOUT;
    return normalizeStreamLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_STREAM_LAYOUT;
  }
}

export function writeStreamLayout(layout: StreamLayout): boolean {
  try {
    localStorage.setItem(STREAM_LAYOUT_KEY, JSON.stringify(normalizeStreamLayout(layout)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(STREAM_LAYOUT_CHANGE_EVENT));
    }
    return true;
  } catch {
    return false;
  }
}

export function clearStreamLayout(): void {
  try {
    localStorage.removeItem(STREAM_LAYOUT_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(STREAM_LAYOUT_CHANGE_EVENT));
    }
  } catch {}
}
