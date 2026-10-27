import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLocalModel, isCurrentWayglassUI, WAYGLASS_EXPECTED_UI_REVISION } from '../../../scripts/wayglass-local.mjs';

test('local launch prioritises installed Ornith and honours existing Codebooga', () => {
  assert.equal(selectLocalModel(['codebooga:latest', 'ornith-1.5:9b']), 'ornith-1.5:9b');
  assert.equal(selectLocalModel(['codebooga:latest']), 'codebooga:latest');
  assert.equal(selectLocalModel([]), null);
});
test('explicit local model binding is not overridden by detection', () => {
  assert.equal(selectLocalModel(['ornith-1.5:9b'], 'owned:preferred'), 'owned:preferred');
});

test('launcher distinguishes the new Observer build from an old port-5186 server',()=>{
  assert.equal(WAYGLASS_EXPECTED_UI_REVISION,'living-observer-n010');
  assert.equal(isCurrentWayglassUI('<html><head><meta name="wayglass-ui-revision" content="living-observer-n010" /></head></html>'),true);
  assert.equal(isCurrentWayglassUI('<html><head><title>Wayglass OS</title></head></html>'),false);
  assert.equal(isCurrentWayglassUI('<html><meta name="wayglass-ui-revision" content="legacy-bluebird" /></html>'),false);
  assert.equal(isCurrentWayglassUI(null),false);
});
// Revision marker is also checked in the integration regression suite.
