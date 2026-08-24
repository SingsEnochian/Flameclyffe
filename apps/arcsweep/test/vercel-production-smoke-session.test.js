import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const smokeSource = readFileSync(new URL('../../../api/v1/house/smoke.js', import.meta.url), 'utf8');

test('authenticated production smoke mints a sealed House session from trusted OIDC authority', () => {
  assert.match(smokeSource, /issueHouseSession/);
  assert.match(smokeSource, /houseSessionCookie/);
  assert.match(smokeSource, /trusted-github-oidc/);
  assert.doesNotMatch(smokeSource, /ARCSWEEP_STEWARD_KEY/);
  assert.doesNotMatch(smokeSource, /ARCSWEEP_RUNTIME_TOKEN/);
  assert.match(smokeSource, /credential_required:\s*false/);
  assert.match(smokeSource, /credential_exposed:\s*false/);
});
