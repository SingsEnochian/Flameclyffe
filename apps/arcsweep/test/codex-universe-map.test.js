import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CODEX_UNIVERSE_MAP_SCHEMA,
  CODEX_UNIVERSES,
  codexUniverse,
  codexUniverseMapSnapshot,
  universeForWorldId,
  validateCodexUniverseMap,
} from '../src/codex/universe-map-registry.js';
import {
  EPRA_CANON_MANIFEST_SCHEMA,
  createEpraCanonIngestPacket,
  epraCanonManifestSnapshot,
  epraCanonSource,
  orderEpraCanonPackets,
  validateEpraCanonManifest,
} from '../src/codex/epra-canon-ingest-manifest.js';

test('Terra Prime is the empirical reference universe rather than authored canon', () => {
  const map = codexUniverseMapSnapshot();
  const terra = codexUniverse('terra-prime');

  assert.equal(map.schema, CODEX_UNIVERSE_MAP_SCHEMA);
  assert.equal(map.referenceUniverseId, 'terra-prime');
  assert.equal(terra?.name, 'Terra Prime · Our Universe');
  assert.equal(terra?.mappingState, 'anchored');
  assert.equal(terra?.canonAuthority, 'empirical-observation');
  assert.match(terra?.lineage || '', /authored canon is never promoted into empirical history/i);
});

test('universe registry maps known worlds without collapsing their identities', () => {
  assert.deepEqual(validateCodexUniverseMap(), { valid: true, violations: [] });
  assert.equal(new Set(CODEX_UNIVERSES.map((universe) => universe.id)).size, CODEX_UNIVERSES.length);

  assert.equal(universeForWorldId('terra-aeterna')?.id, 'terra-aeterna');
  assert.equal(universeForWorldId('starsong')?.id, 'starsong');
  assert.equal(universeForWorldId('taaveren-vaen')?.id, 'taveren-vaen');
  assert.equal(universeForWorldId('sundancer')?.id, 'sundancer');

  const epra = codexUniverse('epra-a-new-hope');
  assert.equal(epra?.mappingState, 'ingest-queued');
  assert.equal(epra?.canonAuthority, 'private-author-canon');
  assert.match(epra?.lineage || '', /Destiny Weaves and Hope’s Crest are source lineages/i);
});

test('Epra manifest separates current, ancestor, legacy, reference, and excluded sources', () => {
  const manifest = epraCanonManifestSnapshot();
  assert.equal(manifest.schema, EPRA_CANON_MANIFEST_SCHEMA);
  assert.deepEqual(manifest.counts, {
    current: 2,
    ancestor: 5,
    legacy: 9,
    reference: 1,
    exclude: 4,
  });

  assert.equal(epraCanonSource('epra-current-world-bible')?.canonClass, 'current');
  assert.equal(epraCanonSource('epra-current-world-bible')?.required, true);
  assert.equal(epraCanonSource('destiny-weaves-guidebook')?.canonClass, 'ancestor');
  assert.equal(epraCanonSource('hopes-crest-setting')?.canonClass, 'legacy');
  assert.equal(epraCanonSource('hopes-crest-plots')?.canonClass, 'reference');
  assert.equal(epraCanonSource('hopes-crest-discord-rules')?.canonClass, 'exclude');
  assert.deepEqual(validateEpraCanonManifest(), { valid: true, violations: [] });
});

test('Epra canon packets preserve precedence and never persist private locators', () => {
  const legacy = createEpraCanonIngestPacket({
    sourceKey: 'hopes-crest-setting',
    content: 'Legacy candidate fact.',
    sourceRevision: 'legacy-r1',
    retrievedAt: '2026-09-27T15:00:00.000Z',
    provenance: { sourceType: 'private-author-canon' },
  });
  const current = createEpraCanonIngestPacket({
    sourceKey: 'epra-current-world-bible',
    content: 'Current canon fact.',
    sourceRevision: 'current-r1',
    retrievedAt: '2026-09-27T15:01:00.000Z',
    provenance: { sourceType: 'private-author-canon' },
  });

  assert.equal(current.precedence > legacy.precedence, true);
  assert.match(current.mergePolicy, /may-supersede-lower-precedence/i);
  assert.match(legacy.mergePolicy, /never-silently-overwrite/i);
  assert.equal(current.provenance.privateLocatorPersisted, false);
  assert.deepEqual(orderEpraCanonPackets([legacy, current]).map((packet) => packet.sourceKey), [
    'epra-current-world-bible',
    'hopes-crest-setting',
  ]);
});

test('administrative Epra material cannot enter canon ingest', () => {
  assert.throws(() => createEpraCanonIngestPacket({
    sourceKey: 'hopes-crest-candidate-form',
    content: 'Administrative form',
    sourceRevision: 'admin-r1',
  }), /excluded from canon ingest/i);
});

test('public Epra manifest contains no private Drive locator', async () => {
  const source = await readFile(new URL('../src/codex/epra-canon-ingest-manifest.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /drive\.google\.com/i);
  assert.doesNotMatch(source, /docs\.google\.com/i);
  assert.doesNotMatch(source, /1tDOYjlj|1JjeD2FQ|1RKEnl5k|1ICHPDD/i);
});

test('Universe Map mounts through the existing physical Codex and has no autonomous motion', async () => {
  const entry = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/codex-universe-map-sidecar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/codex-universe-map.css', import.meta.url), 'utf8');

  assert.match(entry, /codex-universe-map-sidecar\.js/);
  assert.match(sidecar, /data-codex-universe-map-open/);
  assert.match(sidecar, /Terra Prime · Our Universe/);
  assert.match(sidecar, /epraCanonManifestSnapshot/);
  assert.doesNotMatch(sidecar, /setInterval\s*\(/);
  assert.doesNotMatch(sidecar, /requestAnimationFrame\s*\(/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
