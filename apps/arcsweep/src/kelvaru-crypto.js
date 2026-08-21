export const KELVARU_CIPHER_SCHEMA = 'kelvaru.aes-gcm-pbkdf2/v1';
export const KELVARU_KEY_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normaliseSecret(secret) {
  const value = String(secret || '').trim();
  if (value.length < 32) throw new Error('Kelvaru circle key must be at least 32 characters.');
  return value;
}

function normaliseAad(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries);
}

async function deriveAesKey(secret, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normaliseSecret(secret)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealKelvaruMessage(plaintext, secret, aad = {}) {
  const text = String(plaintext || '');
  if (!text.trim()) throw new Error('Write a Kelvaru message before sealing it.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const normalisedAad = normaliseAad({
    ...aad,
    cipher_schema: KELVARU_CIPHER_SCHEMA,
    key_version: KELVARU_KEY_VERSION,
  });
  const key = await deriveAesKey(secret, salt);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(JSON.stringify(normalisedAad)),
      tagLength: 128,
    },
    key,
    encoder.encode(text),
  );
  return Object.freeze({
    cipher_schema: KELVARU_CIPHER_SCHEMA,
    key_version: KELVARU_KEY_VERSION,
    salt_b64: bytesToB64(salt),
    iv_b64: bytesToB64(iv),
    ciphertext_b64: bytesToB64(new Uint8Array(ciphertext)),
    aad: normalisedAad,
  });
}

export async function openKelvaruMessage(envelope, secret) {
  if (envelope?.cipher_schema !== KELVARU_CIPHER_SCHEMA) throw new Error('Unsupported Kelvaru cipher schema.');
  if (Number(envelope?.key_version) !== KELVARU_KEY_VERSION) throw new Error('Unsupported Kelvaru key version.');
  const salt = b64ToBytes(envelope.salt_b64);
  const iv = b64ToBytes(envelope.iv_b64);
  const ciphertext = b64ToBytes(envelope.ciphertext_b64);
  const aad = normaliseAad(envelope.aad || {});
  const key = await deriveAesKey(secret, salt);
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: encoder.encode(JSON.stringify(aad)),
        tagLength: 128,
      },
      key,
      ciphertext,
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error('Kelvaru did not open. The circle key or envelope is wrong.');
  }
}
