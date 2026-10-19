import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normaliseRouteOptions, nextEnabledIndex } from '../src/route-picker.js';

test('Wayglass route listbox preserves transport labels, route IDs and disabled credentials', () => {
  const options = normaliseRouteOptions([
    { route_id: 'flame:bluebird:spicychat', label: 'Bluebird · SpicyChat · default', model: 'Bluebird', configured: true },
    { route_id: 'local:ollama', label: 'Local · test', model: 'ornith', configured: false },
  ]);
  assert.deepEqual(options, [
    { value: 'flame:bluebird:spicychat', label: 'Bluebird · SpicyChat · default', detail: 'Bluebird', disabled: false, hint: 'Available route' },
    { value: 'local:ollama', label: 'Local · test', detail: 'ornith', disabled: true, hint: 'Credentials missing' },
  ]);
  assert.equal(JSON.stringify(options).includes('session_token'), false);
});

test('Wayglass listbox keyboard navigation skips disabled routes, in both directions', () => {
  const options = normaliseRouteOptions([
    {route_id:'a',configured:true},
    {route_id:'b',configured:false},
    {route_id:'c',configured:true},
  ]);
  assert.equal(nextEnabledIndex(options, 0, 1), 2);
  assert.equal(nextEnabledIndex(options, 2, 1), 0);
  assert.equal(nextEnabledIndex(options, 0, -1), 2);
  assert.equal(nextEnabledIndex(options, -1, 1), 0);
  assert.equal(nextEnabledIndex([{disabled:true}], 0), -1);
  assert.equal(nextEnabledIndex([], 0), -1);
});

test('Writing Room has one thread/composer, explicit tabbed continuity, and no native model popup', () => {
  const writing = readFileSync(new URL('../src/surfaces/arcsweep-writing.js', import.meta.url), 'utf8');
  const picker = readFileSync(new URL('../src/route-picker.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(writing, /mountWayglassRoutePicker/);
  assert.doesNotMatch(writing, /<select id="wg-route"/);
  assert.match(writing, /wg-writing-workspace/);
  assert.match(writing, /data-wg-side-tab/);
  assert.match(writing, /wg-cp-recover/);
  assert.match(writing, /authorizationSession/);
  assert.match(picker, /aria-expanded="false"/);
  assert.match(picker, /aria-selected/);
  assert.match(picker, /aria-disabled/);
  assert.match(picker, /Escape/);
  assert.match(picker, /pointerdown/);
  assert.match(css, /\.wg-route-menu\s*\{/);
  assert.match(css, /background:\s*#081825/);
  assert.match(css, /prefers-reduced-motion/);
});
