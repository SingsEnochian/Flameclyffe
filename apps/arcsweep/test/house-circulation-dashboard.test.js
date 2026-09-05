import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/house-circulation-dashboard.js', import.meta.url), 'utf8');

test('House circulation dashboard names the five evidence vessels', () => {
  assert.match(source,/house_runtime_events/);
  assert.match(source,/observer_measurements/);
  assert.match(source,/arcsweep_deep_time_records/);
  assert.match(source,/math_spine_packets/);
  assert.match(source,/arcsweep_feedback_cycles/);
});

test('dark ledgers cannot be promoted into synthetic circulation', async () => {
  const { circulationState } = await import('../src/house-circulation-dashboard.js');
  const dark = circulationState({ runtime:0, observer:0, deepTime:0, math:0, feedback:0 });
  assert.equal(dark.breathing_ledgers,0);
  assert.equal(dark.circulation_proven,false);
  const full = circulationState({ runtime:1, observer:1, deepTime:1, math:1, feedback:1 });
  assert.equal(full.breathing_ledgers,5);
  assert.equal(full.circulation_proven,true);
  assert.match(full.rule,/No synthetic heartbeat/);
});
