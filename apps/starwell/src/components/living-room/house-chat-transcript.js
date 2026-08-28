export const HOUSE_CHAT_STORAGE_KEY = 'flameclyffe:house-chat:v1';
export const HOUSE_CHAT_TRANSCRIPT_LIMIT = 200;

export function normaliseHouseChatTranscript(value) {
  return Array.isArray(value) ? value.slice(-HOUSE_CHAT_TRANSCRIPT_LIMIT) : [];
}

export function loadHouseChatTranscript(storage) {
  try {
    const raw = storage?.getItem?.(HOUSE_CHAT_STORAGE_KEY) || '[]';
    return normaliseHouseChatTranscript(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveHouseChatTranscript(storage, messages) {
  const transcript = normaliseHouseChatTranscript(messages);
  storage?.setItem?.(HOUSE_CHAT_STORAGE_KEY, JSON.stringify(transcript));
  return transcript;
}
