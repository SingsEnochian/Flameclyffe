import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONSTELLATION_LENS_EVENTS,
  normaliseControlValue,
} from '../src/constellation-lens.js';

test('constellation lens exposes stable request and response events', () => {
  assert.equal(CONSTELLATION_LENS_EVENTS.request, 'arcsweep:constellation-context-request');
  assert.equal(CONSTELLATION_LENS_EVENTS.response, 'arcsweep:constellation-response');
});

test('checkbox and radio controls expose boolean state', () => {
  assert.equal(normaliseControlValue({ type: 'checkbox', checked: true }), true);
  assert.equal(normaliseControlValue({ type: 'radio', checked: false }), false);
});

test('ordinary controls expose their current value', () => {
  assert.equal(normaliseControlValue({ type: 'text', value: 'Tar Valon' }), 'Tar Valon');
  assert.equal(normaliseControlValue({ type: 'number', value: '500000' }), '500000');
});

test('file controls expose metadata without reading file bytes', () => {
  const value = normaliseControlValue({
    type: 'file',
    files: [{ name: 'portrait.webp', size: 2048, type: 'image/webp', lastModified: 1234 }],
  });
  assert.deepEqual(value, [{ name: 'portrait.webp', size: 2048, type: 'image/webp', lastModified: 1234 }]);
});
