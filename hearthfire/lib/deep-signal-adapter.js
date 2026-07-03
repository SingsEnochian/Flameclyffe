const clamp = (value, min = 0, max = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const confidenceForSource = source => {
  if (source === 'bridge') return 'observed';
  if (source === 'local') return 'cached';
  if (source === 'user') return 'observed';
  if (source === 'fallback') return 'simulated';
  return 'unknown';
};

export const DEFAULT_DEEP_VALUES = Object.freeze({
  P: 0.55,
  C: 0.50,
  R: 0.45,
  E: 0.38,
  A: 0.65,
  M: 0.30,
  H: 0.50,
  charge: 0.20,
  kp: 1,
  bz: 0,
  moonIllum: 50
});

export function normaliseDeepPacket(raw = {}, { source = 'unknown', rawPath = null, timestamp = new Date().toISOString() } = {}) {
  const values = { ...DEFAULT_DEEP_VALUES };

  for (const key of ['P', 'C', 'R', 'E', 'A', 'M', 'H', 'charge']) {
    if (raw[key] !== undefined) values[key] = clamp(raw[key]);
  }

  if (raw.kp !== undefined) values.kp = clamp(raw.kp, 0, 9);
  if (raw.bz !== undefined) values.bz = clamp(raw.bz, -20, 20);
  if (raw.moonIllum !== undefined) {
    const illum = Number(raw.moonIllum);
    values.moonIllum = illum <= 1 ? clamp(illum) * 100 : clamp(illum, 0, 100);
  }

  const sourceStatus = source === 'fallback' ? 'fallback' : source === 'local' ? 'cached' : source === 'bridge' ? 'live' : 'unknown';

  return {
    type: source === 'fallback' ? 'signal:fallback' : 'signal:received',
    adapter: 'DeepSignalAdapter',
    source,
    source_status: sourceStatus,
    confidence: confidenceForSource(source),
    timestamp,
    raw_path: rawPath,
    values,
    raw
  };
}

export function createFallbackDeepEvent(reason = 'no_live_signal') {
  return {
    ...normaliseDeepPacket(DEFAULT_DEEP_VALUES, { source: 'fallback', rawPath: reason }),
    reason
  };
}

export function readLocalDeepPacket(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return null;
  const names = ['ta_deep_state', 'ta_deep_entries', 'deepEntries', 'terra_aeterna_deep', 'observer_deep', 'deepObserverPacket', 'hearthfire.deep.packet'];

  for (const name of names) {
    try {
      const rawText = storage.getItem(name);
      if (!rawText) continue;
      const parsed = JSON.parse(rawText);
      const packet = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
      const src = packet.deep || packet.DEEP || packet.field || packet.state || packet.observer || packet;
      return normaliseDeepPacket(src, { source: 'local', rawPath: `localStorage.${name}` });
    } catch (error) {
      continue;
    }
  }

  return null;
}

export async function fetchBridgePulse(url, { timeoutMs = 2200 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`Bridge returned ${response.status}`);
    const packet = await response.json();
    const src = packet.deep || packet.DEEP || packet.state || packet.observer || packet;
    return normaliseDeepPacket(src, { source: 'bridge', rawPath: url });
  } finally {
    clearTimeout(timeout);
  }
}
