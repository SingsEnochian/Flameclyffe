import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const registry = JSON.parse(readFileSync(
  new URL('../public/modules/signal-well.adapters.example.json', import.meta.url),
  'utf8',
));

test('Signal Well adapter registry is versioned and includes the bundled Radio JOVE adapter', () => {
  assert.equal(registry.apiVersion, '0.1.0');
  assert.equal(registry.moduleId, 'signal-well');
  assert.deepEqual(registry.adapters, [{
    adapterId: 'radio-jove-live',
    delivery: 'bundled',
    enabled: true,
  }]);
});
