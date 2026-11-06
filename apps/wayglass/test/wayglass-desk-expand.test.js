import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const surface=readFileSync(new URL('../src/surfaces/living-watercolor.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const entry=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('new interaction desk belongs to current watercolor-first multi-room Wayglass',()=>{
  assert.match(entry,/mountLivingWatercolorSurface/);
  assert.match(entry,/resolveWayglassEntry/);
  assert.match(entry,/mountWayglassSystemsSurface/);
  assert.match(entry,/mountWayglassLivingObserver/);
  assert.match(entry,/installVoyageInbox/);
});
test('conversation grows without displacing model, voice and continuity controls',()=>{
  assert.match(surface,/id="wc-expand"/);
  assert.match(surface,/aria-controls="wc-deck"/);
  assert.match(surface,/aria-expanded="false"/);
  assert.match(surface,/id="wc-deck"/);
  assert.match(surface,/id="wc-prompt" rows="5"/);
  assert.match(surface,/id="wc-first-contact"/);
  assert.match(surface,/id="wc-save-return"/);
  assert.match(surface,/id="wc-recover-return"/);
  assert.match(surface,/id="wc-voice-notes"/);
  assert.match(surface,/setDeskExpanded/);
  assert.match(surface,/event.key==='Escape'/);
  assert.match(surface,/stage.classList.toggle\('wc-stage-expanded'/);
});
test('responsive full-height overlay remains bounded, accessible and transparent',()=>{
  assert.match(css,/\.wc-deck\.is-expanded/);
  assert.match(css,/\.wc-stage\.wc-stage-expanded/);
  assert.match(css,/max\(16px, env\(safe-area-inset-top\)\)/);
  assert.match(css,/@media \(max-width: 760px\)/);
  assert.match(css,/\.wc-deck #wc-prompt/);
});
