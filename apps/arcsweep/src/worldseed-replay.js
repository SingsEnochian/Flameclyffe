import { compileWorldseed, WORLDSEED_SCHEMA } from './worldseed.js';

export const WORLDSEED_REPLAY_SCHEMA = 'arcsweep.worldseed-replay-receipt/v1';

export function replayWorldseed({
  world,
  seedhouseRecords = [],
  expectedFingerprint,
  replayedAt = new Date().toISOString(),
} = {}) {
  if (!world?.id) throw new Error('Worldseed replay requires a world.');
  if (typeof expectedFingerprint !== 'string' || !expectedFingerprint.trim()) {
    throw new Error('Worldseed replay requires an expected fingerprint.');
  }

  const rebuilt = compileWorldseed(world, seedhouseRecords, replayedAt);
  const matched = rebuilt.fingerprint === expectedFingerprint;

  return {
    schema: WORLDSEED_REPLAY_SCHEMA,
    version: 1,
    worldId: world.id,
    worldName: world.name || world.id,
    worldseedSchema: WORLDSEED_SCHEMA,
    expectedFingerprint,
    actualFingerprint: rebuilt.fingerprint,
    matched,
    replayedAt,
    reconstruction: {
      seedhouseRecordCount: rebuilt.readiness.recordCount,
      rooted: rebuilt.readiness.rooted,
      continuityGenomeDefined: rebuilt.readiness.continuityGenomeDefined,
      exportReady: rebuilt.readiness.exportReady,
      sourceRecordIds: [...rebuilt.provenance.seedhouseRecordIds],
      sourceRefs: [...rebuilt.provenance.sourceRefs],
      lineageRefs: [...rebuilt.provenance.lineageRefs],
    },
    result: matched ? 'exact-match' : 'fingerprint-mismatch',
  };
}
