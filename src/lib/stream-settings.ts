export const STREAM_SETTINGS_KEY = "vysl.stream-settings";

export type StreamSettings = {
  whipUrl: string;
  token: string;
};

export function defaultStreamSettings(): StreamSettings {
  return { whipUrl: "", token: "" };
}

export function readStreamSettings(): StreamSettings {
  try {
    const raw = localStorage.getItem(STREAM_SETTINGS_KEY);
    if (!raw) return defaultStreamSettings();

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaultStreamSettings();

    const values = parsed as Record<string, unknown>;
    return {
      whipUrl: typeof values.whipUrl === "string" ? values.whipUrl : "",
      token: typeof values.token === "string" ? values.token : "",
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
