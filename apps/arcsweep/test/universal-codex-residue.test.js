import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { codexAspectSignature } from '../src/codex/codex-aspect-signatures.js';
import { codexRelationshipResidue } from '../src/codex/codex-relationship-residue.js';

test('aspect signatures are compositional accents and can include observed use without redefining identity', () => {
  const signature = codexAspectSignature('mapper', {
    messageCount: 22,
    collaborators: [{ aspectId: 'critic', recurring: true }],
    demonstratedPatterns: [{ label: 'route-making', count: 8 }],
  });
  assert.equal(signature.aspectId, 'mapper');
  assert.equal(signature.traceDensity, 'seasoned');
  assert.equal(signature.collaborationTexture, 'threaded');
  assert.equal(signature.demonstratedCadence, 'route-making');
  assert.doesNotMatch(JSON.stringify(signature), /identity|personality|preference/i);
});

test('relationship braid thickness comes only from repeated collaboration evidence', () => {
  const residue = codexRelationshipResidue({ profiles: {
    mapper: { aspectId: 'mapper', collaborators: [{ aspectId: 'critic', recurring: true, turns: 20, traceCount: 9, lastAt: '2026-09-25T01:00:00.000-04:00' }] },
    critic: { aspectId: 'critic', collaborators: [{ aspectId: 'mapper', recurring: true, turns: 20, traceCount: 9, lastAt: '2026-09-25T01:00:00.000-04:00' }] },
  } });
  assert.equal(residue.length, 1);
  assert.equal(residue[0].braidWeight, 'deep');
  assert.equal(residue[0].traceCount, 9);
  assert.doesNotMatch(JSON.stringify(residue), /likes|prefers|friend|bonded/i);
});

test('residue UI renders braids, ribbons, and attention marks without creating another continuity store', async () => {
  const source = await readFile(new URL('../src/codex-residue-sidecar.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /codex-residue-braid/);
  assert.match(source, /codex-residue-ribbon/);
  assert.match(source, /codex-attention-mark/);
  assert.match(source, /CODEX_ALIVE_EVENT/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|appendHouseCommons/i);
  assert.match(bootstrap, /codex-residue-sidecar\.js/);
});
