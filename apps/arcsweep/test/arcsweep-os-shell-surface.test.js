import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('human OS shell uses public OS APIs and Guide events without privileged authority material', () => {
  const source = fs.readFileSync(new URL('../src/os/shell-surface.js', import.meta.url), 'utf8');
  assert.match(source, /os\.snapshot\(\)/);
  assert.match(source, /os\.inspect\(\)/);
  assert.match(source, /os\.setFeatherPaused\(true\)/);
  assert.match(source, /arcsweep:guide-query/);
  assert.match(source, /arcsweep:guide-response/);
  assert.doesNotMatch(source, /authority_lease/);
  assert.doesNotMatch(source, /steward_approved/);
  assert.doesNotMatch(source, /capabilities\.invoke/);
});
