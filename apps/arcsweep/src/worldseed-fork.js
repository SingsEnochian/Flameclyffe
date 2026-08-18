import { normaliseWorld } from './worlds.js';
import { WORLDSEED_SCHEMA } from './worldseed.js';

export const WORLD_FORK_MODES = Object.freeze(['sibling', 'descendant', 'experimental']);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value.trim()))];
}

function inheritedWorldseed(seed) {
  return {
    sourceFingerprint: cleanText(seed.fingerprint),
    mustSurvive: uniqueStrings(seed.inheritance?.mustSurvive),
    mayChange: uniqueStrings(seed.inheritance?.mayChange),
    mayBeLost: uniqueStrings(seed.inheritance?.mayBeLost),
    descendantsInherit: uniqueStrings(seed.inheritance?.descendantsInherit),
    transferableSeeds: uniqueStrings(seed.inheritance?.transferableSeeds),
  };
}

function defaultLineageLabel(parentWorld, childName, mode) {
  const relation = mode === 'sibling' ? 'sibling branch' : mode === 'experimental' ? 'experimental branch' : 'descendant branch';
  return `${parentWorld.name || parentWorld.id} → ${childName} · ${relation}`;
}

export function forkWorldFromSeed({
  parentWorld,
  seed,
  childId,
  childName,
  mode = 'descendant',
  branchPoint = '',
  reason = '',
  lineageLabel = '',
  now = new Date().toISOString(),
} = {}) {
  if (!parentWorld?.id) throw new Error('Worldseed fork requires a parent world.');
  if (!seed || seed.schema !== WORLDSEED_SCHEMA) throw new Error(`Worldseed fork requires ${WORLDSEED_SCHEMA}.`);
  if (seed.world?.id !== parentWorld.id) throw new Error('Worldseed fork seed does not belong to the selected parent world.');
  if (!cleanText(seed.fingerprint)) throw new Error('Worldseed fork requires a compiled seed fingerprint.');
  if (!cleanText(childId)) throw new Error('Worldseed fork requires a child world id.');
  if (childId === parentWorld.id) throw new Error('Worldseed fork child id must differ from the parent world id.');
  if (!WORLD_FORK_MODES.includes(mode)) throw new Error(`Unsupported Worldseed fork mode: ${mode}`);

  const parent = normaliseWorld(structuredClone(parentWorld), parentWorld.id, now);
  const name = cleanText(childName) || `${parent.name} · Branch`;
  const childSource = structuredClone(parent);

  Object.assign(childSource, {
    id: childId,
    name,
    parentWorldId: parent.id,
    parentSeedFingerprint: seed.fingerprint,
    branchPoint: cleanText(branchPoint),
    lineageLabel: cleanText(lineageLabel) || defaultLineageLabel(parent, name, mode),
    worldseedFingerprint: '',
    descendantWorldIds: [],
    forkReason: cleanText(reason),
    worldseedInheritance: inheritedWorldseed(seed),
    createdAt: now,
    updatedAt: now,
  });

  const child = normaliseWorld(childSource, childId, now);
  parent.descendantWorldIds = uniqueStrings([...(parent.descendantWorldIds || []), child.id]);
  parent.updatedAt = now;

  const receipt = {
    schema: 'arcsweep.worldseed-fork-receipt/v1',
    version: 1,
    parentWorldId: parent.id,
    childWorldId: child.id,
    parentSeedFingerprint: seed.fingerprint,
    mode,
    branchPoint: child.branchPoint,
    reason: child.forkReason,
    lineageLabel: child.lineageLabel,
    inherited: structuredClone(child.worldseedInheritance),
    createdAt: now,
  };

  return { parent, child, receipt };
}
