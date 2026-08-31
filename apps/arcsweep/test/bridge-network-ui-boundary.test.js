import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '../src/bridge-network-live-ui.js'), 'utf8');

test('WILD generation, effect observation, and interpretation remain separate manual stages', () => {
  assert.match(source, /data-wild-form/);
  assert.match(source, /data-effect-form/);
  assert.match(source, /data-interpretation-form/);
  assert.match(source, /Let the world happen/);
  assert.match(source, /Seal Effect Receipt/);
  assert.match(source, /Append interpretation revision/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /runWild[\s\S]{0,300}createInterpretationRevision/);
});

test('WILD form exposes lived-state fields and no evaluator or scoring inputs', () => {
  assert.match(source, /name="world_state"/);
  assert.match(source, /name="participant_knowledge"/);
  assert.match(source, /name="agency_boundaries"/);
  assert.match(source, /name="constraints"/);
  assert.match(source, /name="reachable_possibilities"/);
  assert.doesNotMatch(source, /name="evaluation"/);
  assert.doesNotMatch(source, /name="evaluator"/);
  assert.doesNotMatch(source, /name="score"/);
  assert.doesNotMatch(source, /name="surprise_target"/);
});
