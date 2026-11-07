import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLocalModel, isWayglassHostHealthy, FIRST_CONTACT_URL, HOST_HEALTH_URL } from '../../../scripts/wayglass-local.mjs';

test('local launch prioritises installed Ornith and honours existing Codebooga', () => {
  assert.equal(selectLocalModel(['codebooga:latest', 'ornith-1.5:9b']), 'ornith-1.5:9b');
  assert.equal(selectLocalModel(['codebooga:latest']), 'codebooga:latest');
  assert.equal(selectLocalModel([]), null);
});
test('explicit local model binding is not overridden by detection', () => {
  assert.equal(selectLocalModel(['ornith-1.5:9b'], 'owned:preferred'), 'owned:preferred');
});


test('First Contact launcher opens Watercolor entry without stale Observer room query', () => {
  assert.equal(FIRST_CONTACT_URL, 'http://127.0.0.1:5186/');
  assert.doesNotMatch(FIRST_CONTACT_URL, /room=observer/);
});

test('Wayglass host readiness does not depend on private model route catalogue', () => {
  assert.equal(HOST_HEALTH_URL, 'http://127.0.0.1:3000/api/v1/wayglass/healthz');
  assert.equal(isWayglassHostHealthy({schema:'wayglass.host-health/v0.1',status:'ready'}), true);
  assert.equal(isWayglassHostHealthy({schema:'wayglass.route-catalogue/v0.1',routes:[]}), false);
  assert.equal(isWayglassHostHealthy({status:'ready'}), false);
  assert.equal(isWayglassHostHealthy({schema:'wayglass.host-health/v0.1',status:'offline'}), false);
});
