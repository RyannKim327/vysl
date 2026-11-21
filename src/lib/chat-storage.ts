export type ChatMessage = {
  id: string;
  author: string;
  body: string;
  sentAt: number;
};

const LEGACY_CHAT_KEY = "vysl.chat-messages";

export function streamSessionKey(roomId: string, name: string) {
  return `vysl:stream:${roomId}:${name}`;
}

export function readChatMessages(roomId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(streamSessionKey(roomId, "chat"));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatMessage =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.author === "string" &&
        typeof item.body === "string" &&
        typeof item.sentAt === "number",
    );
  } catch {
    return [];
  }
}

export function writeChatMessages(roomId: string, messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(
      streamSessionKey(roomId, "chat"),
      JSON.stringify(messages),
    );
  } catch {}
}

export function getChatAuthor(roomId: string): string {
  const key = streamSessionKey(roomId, "author");
  const fallback = `Viewer ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    sessionStorage.setItem(key, fallback);
  } catch {}
  return fallback;
}

export function clearLegacyChatStorage(): void {
  try {
    localStorage.removeItem(LEGACY_CHAT_KEY);
  } catch {}
}
