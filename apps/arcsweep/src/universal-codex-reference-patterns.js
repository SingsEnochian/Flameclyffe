export const UNIVERSAL_CODEX_REFERENCE_PATTERN_SCHEMA = 'arcsweep.universal-codex-reference-patterns/v0.1';

export const CODEX_MOTION_TIERS = Object.freeze({
  idle: 0.05,
  attention: 0.15,
  interaction: 0.35,
  event: 0.60,
  revelation: 1.00,
});

export const CODEX_REALMS = Object.freeze({
  local: 'local',
  constellation: 'constellation',
  world: 'world',
  bridge: 'bridge',
});

const clamp01 = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
};

const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function resolveCodexMotionTier(event = {}) {
  const kind = String(event.kind || event.type || '').toLowerCase();
  if (event.revelation === true || /(revelation|unlock|attunement|first-contact)/.test(kind)) {
    return Object.freeze({ tier: 'revelation', intensity: CODEX_MOTION_TIERS.revelation });
  }
  if (/(event|arrival|threshold|activation|receipt|commit-reveal)/.test(kind)) {
    return Object.freeze({ tier: 'event', intensity: CODEX_MOTION_TIERS.event });
  }
  if (/(interaction|stroke|draw|drag|drop|rotate|resize|compose|press|tap)/.test(kind)) {
    return Object.freeze({ tier: 'interaction', intensity: CODEX_MOTION_TIERS.interaction });
  }
  if (/(attention|focus|hover|approach|candidate)/.test(kind)) {
    return Object.freeze({ tier: 'attention', intensity: CODEX_MOTION_TIERS.attention });
  }
  return Object.freeze({ tier: 'idle', intensity: CODEX_MOTION_TIERS.idle });
}

export function latentRevealStrength(input = {}) {
  const proximity = clamp01(input.proximity);
  const signal = clamp01(input.signal);
  const confidence = clamp01(input.confidence);
  const intent = clamp01(input.intent);
  const strength = proximity * 0.35 + signal * 0.35 + confidence * 0.15 + intent * 0.15;
  return Math.round(clamp01(strength) * 1000) / 1000;
}

export function createObservationRecord(input = {}) {
  const timestamp = String(input.timestamp || new Date().toISOString());
  const event = String(input.event || input.kind || 'observation');
  const instrument = input.instrument == null ? null : String(input.instrument);
  const witness = input.witness == null ? null : String(input.witness);
  const observation = input.observation == null ? null : String(input.observation);
  const interpretation = input.interpretation == null ? null : String(input.interpretation);

  return Object.freeze({
    schema: 'arcsweep.observation-provenance/v0.1',
    event,
    timestamp,
    instrument,
    calibration: input.calibration ?? null,
    raw_signal: input.raw_signal ?? input.rawSignal ?? null,
    transformation: input.transformation ?? null,
    observation,
    interpretation,
    witness,
    source: input.source ?? null,
    provenance: Object.freeze({
      software_version: input.software_version ?? input.softwareVersion ?? null,
      device_id: input.device_id ?? input.deviceId ?? null,
      session_id: input.session_id ?? input.sessionId ?? null,
      parent_receipt: input.parent_receipt ?? input.parentReceipt ?? null,
    }),
  });
}

export function createCaptureRecord(input = {}) {
  const kind = String(input.kind || 'Note');
  const realm = Object.values(CODEX_REALMS).includes(input.realm) ? input.realm : CODEX_REALMS.local;
  const modalities = Array.isArray(input.modalities)
    ? [...new Set(input.modalities.map((value) => String(value).toLowerCase()).filter(Boolean))]
    : [];

  return Object.freeze({
    schema: 'arcsweep.universal-capture/v0.1',
    id: String(input.id || `capture:${Date.now()}`),
    kind,
    realm,
    created_at: String(input.created_at || input.createdAt || new Date().toISOString()),
    title: input.title == null ? null : String(input.title),
    content: input.content ?? null,
    modalities: Object.freeze(modalities),
    tags: Object.freeze(Array.isArray(input.tags) ? [...new Set(input.tags.map(String))] : []),
    context: Object.freeze({
      timezone: input.timezone ?? null,
      location_granularity: input.location_granularity ?? input.locationGranularity ?? null,
      astronomy: input.astronomy ?? null,
      sensors: input.sensors ?? null,
      software_version: input.software_version ?? input.softwareVersion ?? null,
    }),
    relationships: Object.freeze(Array.isArray(input.relationships) ? input.relationships.map((edge) => Object.freeze({ ...edge })) : []),
  });
}

export function normaliseWorkingPage(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  const normalisedItems = items.map((item, index) => Object.freeze({
    id: String(item.id || `item:${index + 1}`),
    type: String(item.type || 'artefact'),
    ref: item.ref == null ? null : String(item.ref),
    x: clamp01(item.x, 0.5),
    y: clamp01(item.y, 0.5),
    scale: Math.max(0.05, Math.min(8, finite(item.scale, 1))),
    rotation_deg: finite(item.rotation_deg ?? item.rotation, 0),
    z_index: Math.trunc(finite(item.z_index ?? item.zIndex, index)),
    locked: item.locked === true,
    metadata: Object.freeze({ ...(item.metadata || {}) }),
  }));

  return Object.freeze({
    schema: 'arcsweep.codex-working-page/v0.1',
    id: String(input.id || 'working-page'),
    title: input.title == null ? null : String(input.title),
    realm: Object.values(CODEX_REALMS).includes(input.realm) ? input.realm : CODEX_REALMS.local,
    background: input.background ?? null,
    items: Object.freeze(normalisedItems),
    links: Object.freeze(Array.isArray(input.links) ? input.links.map((edge) => Object.freeze({ ...edge })) : []),
    provenance: Object.freeze({
      created_at: input.created_at ?? input.createdAt ?? null,
      updated_at: input.updated_at ?? input.updatedAt ?? null,
      creator: input.creator ?? null,
      parent_page: input.parent_page ?? input.parentPage ?? null,
      source_intent: input.source_intent ?? input.sourceIntent ?? null,
      method: input.method ?? null,
      parameters: input.parameters ?? null,
      revision: input.revision ?? null,
    }),
  });
}

export function createCommitRevealPair(input = {}) {
  const left = input.left ?? null;
  const right = input.right ?? null;
  const revealed = input.revealed === true;
  return Object.freeze({
    schema: 'arcsweep.paired-observer-commit-reveal/v0.1',
    session_id: String(input.session_id || input.sessionId || 'paired-session'),
    opened_at: String(input.opened_at || input.openedAt || new Date().toISOString()),
    left_commitment: input.left_commitment ?? input.leftCommitment ?? null,
    right_commitment: input.right_commitment ?? input.rightCommitment ?? null,
    revealed,
    left: revealed ? left : null,
    right: revealed ? right : null,
    comparison: revealed ? (input.comparison ?? null) : null,
    causal_conclusion: null,
  });
}
