import test from 'node:test';
import assert from 'node:assert/strict';
import { runWayglassBifrost } from '../src/bifrost-quad-adapter.js';
import { createQuantumQuad } from '../src/quantum-quad.js';

test('Bifröst adapter refuses to invent PREMAQ measurements', async () => {
  const result = await runWayglassBifrost();
  assert.equal(result.status, 'not-executed');
  assert.match(result.reason, /PREMAQ/);
});
test('Bifröst adapter validates supplied packets against canonical engine', async () => {
  await assert.rejects(runWayglassBifrost({ premaqPacket: { schema_version: 'not-valid' } }),
    /PREMAQ|schema_version/);
});
test('Quad passes explicit PREMAQ data to the Bifröst adapter', async () => {
  const packet = { test: 'passed-through' };
  let received;
  const quad = createQuantumQuad({
    bifrost: async ({ premaqPacket }) => {
      received = premaqPacket;
      return { status: 'not-executed' };
    },
    cognition: async () => ({ status: 'answered' })
  });
  await quad.cycle({ input: 'inspect', worldId: 'room', participantId: 'agent', premaqPacket: packet });
  assert.deepEqual(received, packet);
});
