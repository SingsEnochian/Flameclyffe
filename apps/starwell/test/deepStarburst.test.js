import test from 'node:test';
import assert from 'node:assert/strict';

import { DEEP_SENSOR_CHIPS } from '../src/lib/deepSensors.js';
import {
  buildSensorStarburstVars,
  normaliseStarburstDeep,
} from '../src/lib/deepStarburst.js';
import {
  DEEP_STARBURST_BINDING,
  DEEP_STARBURST_SELECTORS,
  getStarburstPanelSelector,
} from '../src/lib/deepStarburstContract.js';

function sensor(key) {
  return DEEP_SENSOR_CHIPS.find((entry) => entry.key === key);
}

function render(key, overrides = {}) {
  return buildSensorStarburstVars(
    {
      P: 0.5,
      C: 0.5,
      R: 0.5,
      E: 0.25,
      M: 0.5,
      A: 0.5,
      moonIllum: 50,
      kp: 2,
      bz: 0,
      charge: 0.5,
      dphi: 0,
      ...overrides,
    },
    sensor(key),
  );
}

test('starburst normalisation preserves the full canonical DEEP state', () => {
  const deep = normaliseStarburstDeep({ A: 0.11, R: 0.22, M: 0.33 });

  assert.equal(deep.A, 0.11);
  assert.equal(deep.R, 0.22);
  assert.equal(deep.M, 0.33);
});

test('presence rendering responds to live activation', () => {
  assert.notDeepEqual(render('presence', { A: 0.1 }), render('presence', { A: 0.9 }));
});

test('tide and clarity rendering respond to live resonance', () => {
  assert.notDeepEqual(render('tide', { R: 0.1 }), render('tide', { R: 0.9 }));
  assert.notDeepEqual(render('clarity', { R: 0.1 }), render('clarity', { R: 0.9 }));
});

test('moon rendering responds to live cyclic phase', () => {
  assert.notDeepEqual(render('moon', { M: 0.1 }), render('moon', { M: 0.9 }));
});

test('starburst binding contract centralises rollback selectors and ownership markers', () => {
  assert.equal(getStarburstPanelSelector(), DEEP_STARBURST_SELECTORS.panel);
  assert.equal(DEEP_STARBURST_SELECTORS.panel, '.live-glyph-panel.deep-observer-panel');
  assert.equal(DEEP_STARBURST_SELECTORS.glyphWrap, '.glyph-orb-wrap');
  assert.equal(DEEP_STARBURST_SELECTORS.sensorChips, '.glyph-meter-grid > div');
  assert.equal(DEEP_STARBURST_SELECTORS.sensorLabel, ':scope > .deep-sensor-label');
  assert.equal(DEEP_STARBURST_BINDING.data.native, 'starburstNative');
  assert.equal(DEEP_STARBURST_BINDING.data.signature, 'starburstSignature');
  assert.equal(DEEP_STARBURST_BINDING.native.aura, 'aura');
  assert.equal(DEEP_STARBURST_BINDING.native.sensor, 'sensor');
});
