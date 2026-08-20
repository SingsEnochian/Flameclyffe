export const HOUSEGLASS_SCHEMA = 'hearthgate.houseglass/v1';
export const HOUSEGLASS_RECEIPT_SCHEMA = 'hearthgate.houseglass-receipt/v1';
export const LEGACY_HOUSEGLASS_SCHEMAS = Object.freeze(['arcsweep.houseglass/v1']);

export const HOUSEGLASS_PRESENCE_MODES = Object.freeze(['off', 'quiet', 'observe', 'assist', 'act']);
export const HOUSEGLASS_LAYOUTS = Object.freeze(['float', 'dock-section', 'dock-right']);
export const HOUSEGLASS_STAGES = Object.freeze(['seed', 'tend', 'harvest']);
export const HOUSEGLASS_ORGANS = Object.freeze([
  { id: 'hearthgate.starwell', label: 'STARWELL' },
  { id: 'arkfire.arcsweep', label: 'Arcsweep' },
  { id: 'hearthgate.bifrost', label: 'Bifröst' },
  { id: 'hearthgate.runa', label: 'Runa' },
  { id: 'hearthgate.records', label: 'Records' },
  { id: 'hearthgate.commons', label: 'Commons' },
  { id: 'hearthgate.feedback', label: 'Feedback' },
]);

const PRESENCE = new Set(HOUSEGLASS_PRESENCE_MODES);
const LAYOUTS = new Set(HOUSEGLASS_LAYOUTS);
const STAGES = new Set(HOUSEGLASS_STAGES);
const INTERRUPTIONS = new Set(['never', 'tray-only', 'urgent-only']);
const ROUTING = new Set(['smallest-quorum', 'selected']);
const PACING = new Set(['open', 'contained', 'isa']);

const DEFAULT_PERMISSIONS = Object.freeze({
  readContext: true,
  draftProposals: true,
  populateFields: true,
  reviewContinuity: true,
  prepareTests: true,
  prepareLocalChanges: false,
});

export const DEFAULT_HOUSEGLASS_SETTINGS = Object.freeze({
  enabled: true,
  presence: 'quiet',
  interruptions: 'tray-only',
  routing: 'smallest-quorum',
  pacing: 'contained',
  defaultLayout: 'float',
  solidSurface: false,
  defaultVoiceIds: Object.freeze(['lioreal', 'runeweaver', 'boxfire']),
  permissions: DEFAULT_PERMISSIONS,
});

const DEFAULT_GEOMETRY = Object.freeze({ x: 320, y: 96, width: 470, height: 650 });

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function enumValue(value, accepted, fallback) {
  return accepted.has(value) ? value : fallback;
}

function finiteBetween(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function uniqueStrings(value, fallback = []) {
  if (!Array.isArray(value)) return [...fallback];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

export function createDefaultHouseglassSettings() {
  return {
    ...DEFAULT_HOUSEGLASS_SETTINGS,
    defaultVoiceIds: [...DEFAULT_HOUSEGLASS_SETTINGS.defaultVoiceIds],
    permissions: { ...DEFAULT_PERMISSIONS },
  };
}

export function normaliseHouseglassSettings(value) {
  const input = objectOrEmpty(value);
  const permissions = objectOrEmpty(input.permissions);
  return {
    enabled: input.enabled !== false,
    presence: enumValue(input.presence, PRESENCE, DEFAULT_HOUSEGLASS_SETTINGS.presence),
    interruptions: enumValue(input.interruptions, INTERRUPTIONS, DEFAULT_HOUSEGLASS_SETTINGS.interruptions),
    routing: enumValue(input.routing, ROUTING, DEFAULT_HOUSEGLASS_SETTINGS.routing),
    pacing: enumValue(input.pacing, PACING, DEFAULT_HOUSEGLASS_SETTINGS.pacing),
    defaultLayout: enumValue(input.defaultLayout, LAYOUTS, DEFAULT_HOUSEGLASS_SETTINGS.defaultLayout),
    solidSurface: Boolean(input.solidSurface),
    defaultVoiceIds: uniqueStrings(input.defaultVoiceIds, DEFAULT_HOUSEGLASS_SETTINGS.defaultVoiceIds),
    permissions: Object.fromEntries(Object.entries(DEFAULT_PERMISSIONS).map(([key, fallback]) => [
      key,
      typeof permissions[key] === 'boolean' ? permissions[key] : fallback,
    ])),
  };
}

export function createDefaultHouseglassState(settings = DEFAULT_HOUSEGLASS_SETTINGS) {
  const normalisedSettings = normaliseHouseglassSettings(settings);
  return {
    schema: HOUSEGLASS_SCHEMA,
    version: 1,
    layout: normalisedSettings.defaultLayout,
    pinned: false,
    scope: null,
    geometry: { ...DEFAULT_GEOMETRY },
    activeReceiptId: null,
    receipts: [],
  };
}

export function normaliseHouseglassState(value, settings = DEFAULT_HOUSEGLASS_SETTINGS) {
  const defaults = createDefaultHouseglassState(settings);
  const input = objectOrEmpty(value);
  const geometry = objectOrEmpty(input.geometry);
  const receipts = Array.isArray(input.receipts)
    ? input.receipts.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).slice(0, 60).map((item) => structuredClone(item))
    : [];
  const activeReceiptId = receipts.some((item) => item.id === input.activeReceiptId) ? input.activeReceiptId : receipts[0]?.id || null;
  return {
    ...defaults,
    schema: HOUSEGLASS_SCHEMA,
    layout: enumValue(input.layout, LAYOUTS, defaults.layout),
    pinned: Boolean(input.pinned),
    scope: input.scope && typeof input.scope === 'object' && !Array.isArray(input.scope) ? structuredClone(input.scope) : null,
    geometry: {
      x: finiteBetween(geometry.x, defaults.geometry.x, 0, 5000),
      y: finiteBetween(geometry.y, defaults.geometry.y, 0, 5000),
      width: finiteBetween(geometry.width, defaults.geometry.width, 320, 960),
      height: finiteBetween(geometry.height, defaults.geometry.height, 360, 1200),
    },
    activeReceiptId,
    receipts,
  };
}

export function makeHouseglassScope(world, roomId, roomLabel = roomId, organ = {}) {
  return Object.freeze({
    organId: String(organ.id || 'arkfire.arcsweep'),
    organLabel: String(organ.label || 'Arcsweep'),
    worldId: String(world?.id || 'unassigned'),
    worldName: String(world?.name || 'Unassigned world'),
    roomId: String(roomId || 'portal'),
    sectionId: String(roomId || 'portal'),
    sectionLabel: String(roomLabel || roomId || 'Portal'),
  });
}

const AUTOMATIC_PLANS = Object.freeze({
  seed: Object.freeze(['lioreal', 'runeweaver', 'boxfire']),
  tend: Object.freeze(['runeweaver', 'yggdrasil', 'boxfire']),
  harvest: Object.freeze(['runeweaver', 'vethrlauf', 'boxfire']),
});

export function planHouseglassSwarm({ stage = 'seed', routing = 'smallest-quorum', selectedVoiceIds = [], voices = [] } = {}) {
  const safeStage = enumValue(stage, STAGES, 'seed');
  const knownIds = new Set(voices.map((voice) => voice.id));
  const requested = routing === 'selected' ? selectedVoiceIds : AUTOMATIC_PLANS[safeStage];
  let voiceIds = uniqueStrings(requested).filter((id) => knownIds.has(id));
  if (!voiceIds.length) voiceIds = voices.slice(0, 3).map((voice) => voice.id);
  voiceIds = voiceIds.slice(0, 3);
  if (!voiceIds.length) throw new Error('No House Runtime voices are available for the Houseglass.');

  if (voiceIds.length === 1) {
    return Object.freeze({ stage: safeStage, contributorIds: voiceIds, synthesizerId: null, voiceIds });
  }
  const synthesizerId = voiceIds.includes('boxfire') ? 'boxfire' : voiceIds.at(-1);
  const contributorIds = voiceIds.filter((id) => id !== synthesizerId).slice(0, 2);
  return Object.freeze({ stage: safeStage, contributorIds, synthesizerId, voiceIds: [...contributorIds, synthesizerId] });
}

const STAGE_INSTRUCTIONS = Object.freeze({
  seed: 'Expand the smallest viable seed. Preserve Rowan’s language and identify useful next structure without pretending the work is complete.',
  tend: 'Develop and cross-check the existing work. Find missing fields, continuity edges, dependencies, and contradictions without seizing authorship.',
  harvest: 'Prepare a reviewable packet. Reconcile completed work, unresolved questions, verification needs, and the smallest safe approval gates.',
});

function enabledPermissions(settings) {
  return Object.entries(settings.permissions || {}).filter(([, enabled]) => enabled).map(([name]) => name);
}

export function buildHouseglassTaskPacket({ task, stage, scope, settings }) {
  const safeSettings = normaliseHouseglassSettings(settings);
  const safeStage = enumValue(stage, STAGES, 'seed');
  return [
    `HOUSEGLASS SWARM PASS · ${safeStage.toUpperCase()}`,
    `Scope: ${scope.organLabel || 'House organ'} → ${scope.worldName} → ${scope.sectionLabel} (${scope.roomId})`,
    `Pacing: ${safeSettings.pacing}. Presence: ${safeSettings.presence}.`,
    `Enabled permissions: ${enabledPermissions(safeSettings).join(', ') || 'read-only reflection'}.`,
    STAGE_INSTRUCTIONS[safeStage],
    'Authority: prepare a contribution only. Do not claim that files, canon, settings, commits, deployments, or external systems changed.',
    'Output: return concrete material Rowan can use, with uncertainties and provenance needs visible. No productivity coaching, nagging, or unsolicited health inference.',
    `Rowan’s task:\n${String(task || '').trim()}`,
  ].join('\n\n');
}

export function buildHouseglassSynthesisPacket({ task, stage, scope, contributions }) {
  const evidence = contributions.map((item) => [
    `--- ${item.name} · ${item.status} · ${item.model || item.route || 'route'} ---`,
    item.text || item.error || 'No contribution returned.',
  ].join('\n')).join('\n\n');
  return [
    `HOUSEGLASS SYNTHESIS PASS · ${String(stage || 'seed').toUpperCase()}`,
    `Scope: ${scope.organLabel || 'House organ'} → ${scope.worldName} → ${scope.sectionLabel} (${scope.roomId})`,
    `Original task:\n${String(task || '').trim()}`,
    'Reconcile the routed contributions into one coherent, inspectable work packet for Rowan.',
    'Lead with the usable result. Preserve material disagreements, errors, refusals, uncertainties, and provenance needs. Do not manufacture consensus.',
    'Use these headings when relevant: Outcome; Prepared material; Decisions for Rowan; Verification and receipts.',
    'Nothing has been applied, committed, published, or made canon. Never imply otherwise.',
    `Routed contributions:\n${evidence}`,
  ].join('\n\n');
}

export function createHouseglassReceipt({ id, task, stage, scope, plan, createdAt = new Date().toISOString() }) {
  return {
    schema: HOUSEGLASS_RECEIPT_SCHEMA,
    id,
    status: 'running',
    reviewStatus: 'unread',
    createdAt,
    updatedAt: createdAt,
    task: String(task || '').trim(),
    stage: plan?.stage || stage || 'seed',
    scope: structuredClone(scope),
    plan: structuredClone(plan),
    contributions: [],
    synthesis: null,
    error: null,
  };
}

export function finishHouseglassReceipt(receipt, { contributions = [], synthesis = null, error = null } = {}, updatedAt = new Date().toISOString()) {
  const replied = contributions.some((item) => item.status === 'replied');
  const synthesised = synthesis?.status === 'replied' && String(synthesis.text || '').trim();
  const status = error && !replied && !synthesised ? 'error' : error || contributions.some((item) => item.status === 'error') || !synthesised ? 'partial' : 'ready';
  return {
    ...receipt,
    status,
    updatedAt,
    contributions: structuredClone(contributions),
    synthesis: synthesis ? structuredClone(synthesis) : null,
    error: error ? String(error) : null,
  };
}
