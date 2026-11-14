import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectWayglassLantern, LANTERN_SCHEMA } from '../src/lantern-diagnostic.js';

test('Lantern reports inspectable Quad interface without inventing model evidence', () => {
  const result = inspectWayglassLantern({
    quad: { cycle() {} },
    surfaces: [{ surface_id: 'arcsweep:writing-room' }],
    now: () => '2026-11-05T00:00:00.000Z'
  });
  assert.equal(result.schema, LANTERN_SCHEMA);
  assert.equal(result.signal, 'quad-interface-present');
  assert.equal(result.claims_live_response, false);
  assert.equal(result.organs.bifrost, 'backend-unverified');
  assert.deepEqual(result.surfaces, ['arcsweep:writing-room']);
});
test('Lantern detects missing Quad interface', () => {
  assert.equal(inspectWayglassLantern().signal, 'quad-interface-missing');
});
