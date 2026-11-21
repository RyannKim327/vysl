export const STREAM_SETTINGS_KEY = "vysl.stream-settings";
export const FACEBOOK_RTMP_URL = "rtmps://live-api-s.facebook.com:443/rtmp/";

export type StreamSettings = {
  rtmpUrl: string;
  streamKey: string;
};

export function defaultStreamSettings(): StreamSettings {
  return { rtmpUrl: FACEBOOK_RTMP_URL, streamKey: "" };
}

export function readStreamSettings(): StreamSettings {
  try {
    const raw = localStorage.getItem(STREAM_SETTINGS_KEY);
    if (!raw) return defaultStreamSettings();

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaultStreamSettings();

    const values = parsed as Record<string, unknown>;
    return {
      rtmpUrl: typeof values.rtmpUrl === "string" ? values.rtmpUrl : FACEBOOK_RTMP_URL,
      streamKey: typeof values.streamKey === "string" ? values.streamKey : "",
    };
  } catch {
    return defaultStreamSettings();
  }
}

export function writeStreamSettings(settings: StreamSettings): boolean {
  try {
    localStorage.setItem(STREAM_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function clearStreamSettings(): void {
  try {
    localStorage.removeItem(STREAM_SETTINGS_KEY);
  } catch {}
}
