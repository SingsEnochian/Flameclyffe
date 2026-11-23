import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuantumQuad, QUAD_SCHEMA } from '../src/quantum-quad.js';

test('Quantum Quad coordinates four organs and excludes revoked provenance', async () => {
  const called = [];
  const quad = createQuantumQuad({
    observer: async ({ provenanceRefs }) => { called.push('observer'); return { provenanceRefs }; },
    bifrost: async () => { called.push('bifrost'); return { status: 'evolved' }; },
    cognition: async () => { called.push('cognition'); return { status: 'answered', text: 'next task' }; },
    continuity: async ({ receipts }) => {
      called.push('continuity');
      assert.equal(receipts.length, 3);
      return { status: 'ephemeral' };
    },
  });
  const result = await quad.cycle({
    input: 'Find next verified task', worldId: 'writing-room',
    participantId: 'wayglass', provenanceRefs: ['trusted', 'revoked'],
    revokedRefs: ['revoked'],
  });
  assert.equal(result.schema, QUAD_SCHEMA);
  assert.deepEqual(called, ['observer', 'bifrost', 'cognition', 'continuity']);
  assert.deepEqual(result.receipts[0].result.provenanceRefs, ['trusted']);
  assert.equal(result.receipts[1].status, 'evolved');
  assert.equal(result.persistence, 'ephemeral');
});
test('Quantum Quad rejects incomplete authority context', async () => {
  const quad = createQuantumQuad();
  await assert.rejects(quad.cycle({ input: 'hello', worldId: 'room' }), /participantId/);
});
test('Quantum Quad never claims quantum execution without a backend', async () => {
  const quad = createQuantumQuad({
    cognition: async () => ({ status: 'answered' })
  });
  const result = await quad.cycle({ input: 'hello', worldId: 'room', participantId: 'agent' });
  assert.equal(result.receipts[1].status, 'not-executed');
  assert.equal(result.persistence, 'ephemeral');
});
