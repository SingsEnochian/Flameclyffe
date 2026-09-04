import test from 'node:test';
import assert from 'node:assert/strict';
import { APPLET_CATALOGUE, appletLaunchTarget } from '../src/applets.js';

const REQUIRED = [
  'glyph-lab', 'brush-foundry', 'living-glyph', 'font-foundry', 'continuity-gate',
  'sound-room', 'runa', 'tone-lab', 'sound-banks', 'haptics',
];

test('recovered creative and sound organs are first-class selectable applets', () => {
  const ids = new Set(APPLET_CATALOGUE.map((item) => item.id));
  for (const id of REQUIRED) assert.equal(ids.has(id), true, `${id} must be in APPLET_CATALOGUE`);
});

test('every recovered organ applet has a canonical launch target', () => {
  for (const id of REQUIRED) {
    const href = appletLaunchTarget(id);
    assert.ok(href.startsWith('/Flameclyffe/'), `${id} should launch within Flameclyffe Pages`);
  }
});

test('recovered organs default visible in new and normalised world applet layouts', () => {
  for (const id of REQUIRED) {
    const applet = APPLET_CATALOGUE.find((item) => item.id === id);
    assert.equal(applet?.defaultVisible, true, `${id} should be visible by default`);
  }
});
