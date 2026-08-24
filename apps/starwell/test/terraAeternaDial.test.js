import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  TERRA_AETERNA_DIAL_SCHEMA,
  TERRA_AETERNA_TARGET,
} from '../src/terra-aeterna-dial.js';
import {
  GATE_BASE_CYCLES,
  GATE_EXTENSION_CYCLES,
  GATE_LOCKED_TONE_AXES,
  targetWorldCalibration,
} from '../src/two-shore-premaq-gate.js';

test('Earth Prime to Terra Aeterna preset binds the complete dynamic gate address', async () => {
  const bridge = await readFile(
    new URL('../src/premaq-shokz-feather-stop-bridge.js', import.meta.url),
    'utf8',
  );
  const target = targetWorldCalibration(TERRA_AETERNA_TARGET);

  assert.equal(TERRA_AETERNA_DIAL_SCHEMA, 'hearthgate.terra-aeterna-dial/v0.1');
  assert.equal(TERRA_AETERNA_TARGET, 'terra-aeterna');
  assert.match(bridge, /terra-aeterna-dial\.js/);
  assert.match(bridge, /two-shore-gate-ui\.js/);
  assert.ok(
    bridge.indexOf('terra-aeterna-dial.js') < bridge.indexOf('two-shore-gate-ui.js'),
    'the address preset must activate before the world selector is rendered',
  );

  assert.equal(target.world_slug, 'terra-aeterna');
  assert.equal(target.root_hz, 220);
  assert.deepEqual(GATE_LOCKED_TONE_AXES, ['P', 'R', 'E', 'M', 'A']);
  assert.equal(target.values.Q, 0);
  assert.equal(target.qualia.inferred, false);
  assert.equal(target.qualia.authority, 'firsthand-only');
  assert.equal(GATE_BASE_CYCLES, 369);
  assert.deepEqual(GATE_EXTENSION_CYCLES, [3, 6, 9]);
  assert.equal(
    GATE_BASE_CYCLES + GATE_EXTENSION_CYCLES.reduce((sum, value) => sum + value, 0),
    387,
  );
});
