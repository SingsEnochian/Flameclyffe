import { WORLDSEED_SCHEMA } from './worldseed.js';

export const WORLDSEED_ARK_SCHEMA = 'arcsweep.worldseed-archive/v1';

const DEFAULT_PATHS = Object.freeze({
  manifest: 'manifest.json',
  worldseed: 'worldseed.json',
  canon: 'canon/',
  timeline: 'timeline/',
  records: 'records/',
  runa: 'runa/',
  worldmind: 'worldmind/',
  provenance: 'provenance/',
  attachments: 'attachments/',
  replay: 'replay/',
});

function stringArray(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === 'string' && item.trim()))];
}

export function buildWorldseedArkManifest(seed, index = {}, generatedAt = new Date().toISOString()) {
  if (!seed || seed.schema !== WORLDSEED_SCHEMA) {
    throw new Error(`Ark manifest requires ${WORLDSEED_SCHEMA}.`);
  }
  if (!seed.fingerprint) throw new Error('Ark manifest requires a compiled Worldseed fingerprint.');

  const included = {
    canonRefs: stringArray(index.canonRefs),
    timelineRefs: stringArray(index.timelineRefs),
    recordRefs: stringArray(index.recordRefs),
    runaRefs: stringArray(index.runaRefs),
    worldmindRefs: stringArray(index.worldmindRefs),
    provenanceRefs: stringArray(index.provenanceRefs),
    attachmentRefs: stringArray(index.attachmentRefs),
    replayRefs: stringArray(index.replayRefs),
  };

  return {
    schema: WORLDSEED_ARK_SCHEMA,
    version: 1,
    extension: '.worldseed',
    world: { ...seed.world },
    worldseedFingerprint: seed.fingerprint,
    generatedAt,
    status: seed.readiness?.exportReady ? 'export-ready' : 'draft',
    paths: { ...DEFAULT_PATHS },
    included,
    counts: Object.fromEntries(Object.entries(included).map(([key, values]) => [key, values.length])),
    reconstruction: {
      required: [DEFAULT_PATHS.manifest, DEFAULT_PATHS.worldseed, DEFAULT_PATHS.provenance, DEFAULT_PATHS.replay],
      expectedWorldseedFingerprint: seed.fingerprint,
      lineageRefs: stringArray(seed.provenance?.lineageRefs),
      sourceSeedhouseRecordIds: stringArray(seed.provenance?.seedhouseRecordIds),
    },
  };
}
