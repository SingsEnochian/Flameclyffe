const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const serverSource = readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('pulse route never counterfeits PREMAQC when its model route is unavailable', () => {
  assert.doesNotMatch(serverSource, /hashVectors|hash-fallback/);
  assert.match(serverSource, /vectors:\s*null/);
  assert.match(serverSource, /outcome:\s*'PREMAQC_UNCHANGED'/);
  assert.match(serverSource, /signal,\s*\n\s*anchor:/);
});

test('pulse translation uses the canonical PREMAQC axis names', () => {
  for (const name of ['Presence', 'Coherence', 'Resonance', 'Entanglement', 'Memory', 'Agency', 'Qualia']) {
    assert.match(serverSource, new RegExp(`\\(${name}\\)`));
  }
});
