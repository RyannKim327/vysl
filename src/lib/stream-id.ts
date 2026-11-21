export const STREAM_ID_KEY = "vysl.stream-id";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateStreamId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function getOrCreateStreamId(): string {
  try {
    const existing = localStorage.getItem(STREAM_ID_KEY);
    if (existing && /^[A-HJ-NP-Z2-9]{6}$/.test(existing)) return existing;
    const created = generateStreamId();
    localStorage.setItem(STREAM_ID_KEY, created);
    return created;
  } catch {
    return generateStreamId();
  }
}
