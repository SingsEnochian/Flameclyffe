import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLocalModel } from '../../../scripts/wayglass-local.mjs';

test('local launch prioritises installed Ornith and honours existing Codebooga', () => {
  assert.equal(selectLocalModel(['codebooga:latest', 'ornith-1.5:9b']), 'ornith-1.5:9b');
  assert.equal(selectLocalModel(['codebooga:latest']), 'codebooga:latest');
  assert.equal(selectLocalModel([]), null);
});
test('explicit local model binding is not overridden by detection', () => {
  assert.equal(selectLocalModel(['ornith-1.5:9b'], 'owned:preferred'), 'owned:preferred');
});
