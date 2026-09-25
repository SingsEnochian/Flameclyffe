import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { CODEX_COLORS, CODEX_TOKENS } from '../src/codex/codex-design-tokens.js';
import { CODEX_MATERIALS } from '../src/codex/codex-material-system.js';
import { CODEX_MANIFESTATIONS } from '../src/codex/codex-manifestation-registry.js';
import { validateCodexMotionProfiles, CODEX_MOTION_PROFILES } from '../src/codex/codex-motion-law.js';
import { codexKindForEnvelope, projectUniversalCodex } from '../src/codex/codex-semantic-projector.js';
import { selectCodexAttention } from '../src/codex/codex-attention-engine.js';
import { codexQuietState } from '../src/codex/codex-quiet-state.js';
import { codexRelationshipResidue } from '../src/codex/codex-relationship-residue.js';
import { renderCodexNarrative } from '../src/codex/codex-narrative-renderer.js';
import { computeCodexSemanticWear } from '../src/codex/codex-semantic-wear.js';

function envelope({
  id = 'm1',
  traceId = 'trace-a',
  aspectId = 'mapper',
  recipients = [],
  kind = 'observation',
  body = 'A useful seam appeared.',
  createdAt = '2026-09-25T00:30:00.000-04:00',
} = {}) {
  return {
    id,
    traceId,
    sender: { aspectId, invocationId: `test:${aspectId}` },
    recipients,
    kind,
    body,
    evidenceRefs: [],
    stateRefs: [],
    createdAt,
  };
}

test('Codex palette encodes ocean, living teal, durable gold, and glass as shared tokens', () => {
  assert.equal(CODEX_COLORS.abyss1000, '#071A24');
  assert.equal(CODEX_COLORS.teal500, '#2BA59A');
  assert.equal(CODEX_COLORS.oldGold, '#C7A963');
  assert.equal(CODEX_COLORS.tealGlass, '#0D3B43');
  assert.match(CODEX_TOKENS.law.join(' '), /Light signifies activity/);
});

test('material grammar keeps present activity, durable memory, possibility, and speculation distinct', () => {
  assert.equal(CODEX_MATERIALS.living.surface, 'teal');
  assert.equal(CODEX_MATERIALS.enduring.surface, 'gold');
  assert.equal(CODEX_MATERIALS.possible.family, 'glass');
  assert.equal(CODEX_MATERIALS.liminal.surface, 'indigo-glass');
  assert.equal(CODEX_MANIFESTATIONS.experimentRunning.material.id, 'living');
  assert.equal(CODEX_MANIFESTATIONS.experimentReflection.material.id, 'enduring');
  assert.equal(CODEX_MANIFESTATIONS.narrativeBranch.material.id, 'liminal');
});

test('every Codex motion profile terminates and quiet motion is genuinely still', () => {
  const result = validateCodexMotionProfiles();
  assert.equal(result.valid, true);
  assert.equal(result.violations.length, 0);
  for (const profile of Object.values(CODEX_MOTION_PROFILES)) assert.equal(profile.iterations, 1);
  assert.equal(CODEX_MOTION_PROFILES.quiet.durationMs, 0);
});

test('semantic projector maps real Hearthweave events into book-native manifestations', () => {
  assert.equal(codexKindForEnvelope(envelope({ kind: 'question' })), 'question');
  assert.equal(codexKindForEnvelope(envelope({ kind: 'growth', body: { relation: 'supersedes', statement: 'This fits better now.' } })), 'growthRevision');
  assert.equal(codexKindForEnvelope(envelope({ kind: 'growth', body: { relation: 'contradicts', statement: 'I disagree with that older description.' } })), 'growthContradiction');
  assert.equal(codexKindForEnvelope(envelope({ kind: 'proposal', body: { mode: 'exploration', domain: 'narrative', text: 'Try another leaf.' } })), 'narrativeBranch');
  assert.equal(codexKindForEnvelope(envelope({ kind: 'proposal', body: { schema: 'hearthweave.aspect-experiment/v0.2', mode: 'experiment', experimentId: 'e1', phase: 'proposed', title: 'Try it' } })), 'experimentProposed');
});

test('projection includes unfinished paths and repeated collaboration without claiming preference', () => {
  const growthSnapshot = {
    profiles: {
      mapper: {
        aspectId: 'mapper',
        openThreads: [{ traceId: 'trace-open', aspects: ['mapper', 'critic'], openedBy: 'mapper', text: 'Could these systems share one seam?', lastAt: '2026-09-25T00:31:00.000-04:00' }],
        collaborators: [{ aspectId: 'critic', recurring: true, turns: 9, traceCount: 4, lastAt: '2026-09-25T00:32:00.000-04:00' }],
      },
      critic: {
        aspectId: 'critic',
        openThreads: [],
        collaborators: [{ aspectId: 'mapper', recurring: true, turns: 9, traceCount: 4, lastAt: '2026-09-25T00:32:00.000-04:00' }],
      },
    },
  };
  const projection = projectUniversalCodex({ growthSnapshot });
  assert.ok(projection.manifestations.some((row) => row.kind === 'unfinished-thread'));
  assert.ok(projection.manifestations.some((row) => row.kind === 'recurring-collaboration'));
  assert.doesNotMatch(JSON.stringify(projection), /prefer|affection|friendship/i);
});

test('attention surfaces related history and permits unrelated quiet', () => {
  const projection = projectUniversalCodex({ messages: [
    envelope({ id: 'a', traceId: 'trace-related', kind: 'growth', body: { statement: 'I keep finding bridge points.' } }),
    envelope({ id: 'b', traceId: 'trace-other', aspectId: 'critic', kind: 'growth', body: { statement: 'Another old note.' } }),
  ] });
  const related = selectCodexAttention(projection.manifestations, { traceId: 'trace-related', text: 'bridge points' }, { minimumScore: 2, includeLive: false });
  assert.equal(related.length >= 1, true);
  assert.equal(related[0].manifestation.traceId, 'trace-related');
  const unrelated = selectCodexAttention(projection.manifestations, { text: 'completely different subject' }, { minimumScore: 2, includeLive: false });
  assert.equal(unrelated.length, 0);
  assert.equal(codexQuietState({ attention: unrelated }).quiet, true);
});

test('relationship residue records recurrence but not emotional interpretation', () => {
  const residue = codexRelationshipResidue({ profiles: {
    mapper: { aspectId: 'mapper', collaborators: [{ aspectId: 'critic', recurring: true, turns: 12, traceCount: 5, lastAt: '2026-09-25T00:35:00.000-04:00' }] },
    critic: { aspectId: 'critic', collaborators: [{ aspectId: 'mapper', recurring: true, turns: 12, traceCount: 5, lastAt: '2026-09-25T00:35:00.000-04:00' }] },
  } });
  assert.equal(residue.length, 1);
  assert.deepEqual(residue[0].aspectIds, ['critic', 'mapper']);
  assert.equal(residue[0].meaning, 'repeated-collaboration');
  assert.doesNotMatch(JSON.stringify(residue), /prefer|love|friend/i);
});

test('semantic wear is reconstructable from history rather than random grime', () => {
  const projection = projectUniversalCodex({ messages: [
    envelope({ id: 'w1', traceId: 'trace-wear', kind: 'growth', body: { statement: 'A remembered change.' } }),
    envelope({ id: 'w2', traceId: 'trace-wear', kind: 'question', body: 'Still open?', createdAt: '2026-09-25T00:36:00.000-04:00' }),
  ] });
  const a = computeCodexSemanticWear(projection.manifestations, { traceId: 'trace-wear' });
  const b = computeCodexSemanticWear(projection.manifestations, { traceId: 'trace-wear' });
  assert.deepEqual(a, b);
  assert.ok(['fresh', 'touched', 'familiar', 'deep'].includes(a.band));
});

test('narrative renderer paraphrases supplied state rather than fabricating new events', () => {
  const manifestation = projectUniversalCodex({ messages: [envelope({ kind: 'growth', body: { relation: 'supersedes', statement: 'I think I was looking for places systems pretend not to touch.' } })] }).manifestations[0];
  const rendered = renderCodexNarrative(manifestation, { aspectNames: { mapper: 'Mapper' } });
  assert.match(rendered, /Mapper/);
  assert.match(rendered, /places systems pretend not to touch/);
  assert.match(rendered, /older ring/i);
});

test('runtime boot mounts one shared Codex Alive sidecar and UI copy has no perpetual-motion contract', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/codex-alive-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /codex-alive-sidecar\.js/);
  assert.match(sidecar, /projectUniversalCodex/);
  assert.match(sidecar, /codexQuietState/);
  assert.match(sidecar, /prefers-reduced-motion/);
  assert.doesNotMatch(sidecar, /infinite|animation-iteration-count\s*:\s*infinite/i);
});
