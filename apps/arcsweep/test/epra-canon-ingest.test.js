import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  EPRA_CANON_PACKET_SCHEMA,
  createEpraCanonIngestPacket,
} from '../src/codex/epra-canon-ingest-manifest.js';
import {
  EPRA_PUBLIC_INGEST_RECEIPT_SCHEMA,
  createEpraCanonEvidenceBatch,
  createEpraPublicIngestReceipt,
  validateEpraPublicIngestReceipt,
} from '../src/codex/epra-canon-intelligence-bridge.js';

import { runEpraSyntheticRuntimeCheck } from '../src/codex/epra-synthetic-runtime-check.js';

async function readJson(relativeUrl) {
  return JSON.parse(await readFile(new URL(relativeUrl, import.meta.url), 'utf8'));
}

function currentPacket() {
  return createEpraCanonIngestPacket({
    sourceKey: 'epra-current-ekhara',
    content: 'PRIVATE SYNTHETIC SOURCE BODY - NEVER PUBLISH',
    sourceRevision: 'revision-test-1',
    retrievedAt: '2026-09-28T12:00:00.000Z',
    provenance: { privateLocator: 'PRIVATE-LOCATOR-SENTINEL' },
  });
}

test('Epra world descriptor uses existing universal canon grammar', async () => {
  const world = await readJson('../worlds/epra-a-new-hope.world.json');
  assert.equal(world.schemaVersion, 'arcsweep.world/v0.1');
  assert.equal(world.id, 'epra-a-new-hope');
  assert.equal(world.canon.authority, 'Rowan-first');
  assert.equal(world.canon.ingestPrimer, '../presets/epra-canon-ingest.v0.1.json');
  assert.equal(world.canon.sourceManifest, '../src/codex/epra-canon-ingest-manifest.js');
  assert.match(world.canon.sourcePolicy, /Current Epra World Bible canon is primary/i);
  assert.match(world.canon.sourcePolicy, /may never silently overwrite current canon/i);
});

test('Epra ingest primer is scoped overlay, proposal-only, redacted, and approval-gated', async () => {
  const primer = await readJson('../presets/epra-canon-ingest.v0.1.json');
  assert.equal(primer.schemaVersion, 'arcsweep.ingest-primer/v0.1');
  assert.deepEqual(primer.scope.worldIds, ['epra-a-new-hope']);
  assert.equal(primer.scope.appliesToAllCanons, false);
  assert.equal(primer.scope.overlayOf, 'universal-canon-ingest-primer');
  assert.equal(primer.sourcePolicy.copyIntoPrivateStore, true);
  assert.equal(primer.sourcePolicy.automaticExternalReads, false);
  assert.equal(primer.canonPolicy.neverOverwriteWithoutApproval, true);
  assert.equal(primer.extraction.proposalOnly, true);
  assert.equal(primer.conflictPolicy.quarantine, true);
  assert.equal(primer.conflictPolicy.automaticWinnerSelection, false);
  assert.equal(primer.approvalPolicy.approvalRequiredBeforeCanonWrite, true);
  assert.equal(primer.exportPolicy.redactionBeforeExport, true);
  assert.deepEqual(primer.exportPolicy.sourceInclusionModes, ['none', 'selected']);

  for (const required of [
    'world', 'timeline', 'location', 'culture-or-society', 'magic-psi-or-power-system',
    'science-or-technology', 'law-politics-or-economy', 'creature-ecology-or-botany',
    'material-object-or-artefact', 'cosmology-or-religion',
  ]) {
    assert.ok(primer.classification.canonKinds.includes(required), `missing canon kind ${required}`);
  }

  for (const required of ['world', 'timeline', 'group', 'relationship-edge', 'place', 'event', 'object', 'creature', 'ability', 'rule', 'term']) {
    assert.ok(primer.classification.entityKinds.includes(required), `missing entity kind ${required}`);
  }
});

test('private Epra packet becomes Canon Intelligence evidence without source text or locator', () => {
  const packet = currentPacket();
  assert.equal(packet.schema, EPRA_CANON_PACKET_SCHEMA);

  const evidence = createEpraCanonEvidenceBatch({
    packet,
    facts: [
      {
        factId: 'synthetic-entity-fact',
        entityHint: 'Synthetic Entity',
        fieldHint: 'synthetic_field',
        value: { deliberately: 'structured-private-value' },
        heading: 'Synthetic Heading',
        extractor: 'test-extractor',
      },
    ],
  });

  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].world_id, 'epra-a-new-hope');
  assert.equal(evidence[0].authority, 'primary-canon');
  assert.equal(evidence[0].source_url, null);
  assert.equal(evidence[0].locator, null);
  assert.equal(evidence[0].excerpt, null);
  assert.deepEqual(evidence[0].value, { deliberately: 'structured-private-value' });
  assert.equal(evidence[0].provenance[0].privateLocatorPersisted, false);
  assert.equal(evidence[0].provenance[0].rawContentPersisted, false);

  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /PRIVATE SYNTHETIC SOURCE BODY/);
  assert.doesNotMatch(serialized, /PRIVATE-LOCATOR-SENTINEL/);
});

test('public Epra receipt omits extracted values, source body, excerpts, URLs, and locators', () => {
  const packet = currentPacket();
  const evidence = createEpraCanonEvidenceBatch({
    packet,
    facts: [
      {
        factId: 'synthetic-public-boundary',
        entityHint: 'Synthetic Entity',
        fieldHint: 'synthetic_field',
        value: 'SECRET-EXTRACTED-VALUE',
      },
    ],
  });
  const receipt = createEpraPublicIngestReceipt({ packet, evidence });

  assert.equal(receipt.schema, EPRA_PUBLIC_INGEST_RECEIPT_SCHEMA);
  assert.equal(receipt.factCount, 1);
  assert.equal(receipt.authority.mayPromoteToCanon, false);
  assert.equal(receipt.authority.stewardReviewRequired, true);
  assert.equal(receipt.privacy.extractedValuesPublished, false);
  assert.deepEqual(validateEpraPublicIngestReceipt(receipt), { valid: true, violations: [] });

  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /SECRET-EXTRACTED-VALUE/);
  assert.doesNotMatch(serialized, /PRIVATE SYNTHETIC SOURCE BODY/);
  assert.doesNotMatch(serialized, /PRIVATE-LOCATOR-SENTINEL/);
  assert.doesNotMatch(serialized, /drive\.google\.com|docs\.google\.com/i);
});

test('Epra branch source contains no private Drive IDs or source-body sentinels', async () => {
  const files = await Promise.all([
    readFile(new URL('../src/codex/epra-canon-intelligence-bridge.js', import.meta.url), 'utf8'),
    readFile(new URL('../worlds/epra-a-new-hope.world.json', import.meta.url), 'utf8'),
    readFile(new URL('../presets/epra-canon-ingest.v0.1.json', import.meta.url), 'utf8'),
  ]);
  const source = files.join('\n');
  assert.doesNotMatch(source, /drive\.google\.com|docs\.google\.com/i);
  assert.doesNotMatch(source, /11m3ZjUI|1Je771zW|PRIVATE SYNTHETIC SOURCE BODY|PRIVATE-LOCATOR-SENTINEL/);
});

test('explicit synthetic runtime check traverses private packet to redacted public receipt', () => {
  const result = runEpraSyntheticRuntimeCheck();
  assert.equal(result.status, 'passed');
  assert.equal(result.mode, 'synthetic-in-memory');
  assert.equal(result.receipt.universeId, 'epra-a-new-hope');
  assert.equal(result.receipt.factCount, 1);
  assert.equal(result.receipt.authority.mayPromoteToCanon, false);
  assert.equal(result.receipt.authority.stewardReviewRequired, true);
  assert.deepEqual(validateEpraPublicIngestReceipt(result.receipt), { valid: true, violations: [] });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /SYNTHETIC_PRIVATE_BODY_DO_NOT_PUBLISH|SYNTHETIC_PRIVATE_LOCATOR_DO_NOT_PUBLISH|SYNTHETIC_EXTRACTED_VALUE_DO_NOT_PUBLISH/);
});
