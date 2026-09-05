import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ui = fs.readFileSync(path.join(root, 'apps/arcsweep/src/feedback-chamber-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'apps/arcsweep/src/feedback-chamber-v2.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'apps/arcsweep/index.html'), 'utf8');
const sidecars = fs.readFileSync(path.join(root, 'apps/arcsweep/src/sidecar-bootstrap.js'), 'utf8');

test('new Feedback Chamber UI is the mounted deferred Arcsweep presentation layer', () => {
  assert.match(html, /feedback-chamber-v2\.css/);
  assert.doesNotMatch(html, /feedback-chamber-v2\.js/);
  assert.match(sidecars, /['"]\.\/feedback-chamber-v2\.js['"]/);
  assert.match(ui, /Relational Feedback Chamber/);
  for (const className of [
    'feedback-chamber-v2__premaqc',
    'feedback-chamber-v2__practice',
    'feedback-chamber-v2__voices',
    'feedback-chamber-v2__canon',
    'feedback-chamber-v2__turn',
    'feedback-chamber-v2__sound',
    'feedback-chamber-v2__receipts',
    'feedback-chamber-v2__action-rail',
    'feedback-chamber-v2__bottom',
  ]) assert.match(ui, new RegExp(className));
});

test('Feedback Chamber repairs malformed smart-quote attributes before layout mapping', () => {
  assert.match(ui, /repairSmartQuoteAttributes\(root\)/);
  assert.match(ui, /className\?\.includes\('”'\)/);
  assert.match(ui, /stripSmartQuotes/);
});

test('Feedback Chamber uses a bounded boot observer and a narrow Arcsweep-root watcher', () => {
  assert.match(ui, /bootObserver\?\.disconnect\(\)/);
  assert.match(ui, /bootObserver = null/);
  assert.match(ui, /appObserver\.observe\(app, \{ childList: true \}\)/);
  assert.doesNotMatch(ui, /appObserver\.observe\([^\n]+subtree:\s*true/);
});

test('accepted reference UI keeps the deliberate twelve-column chamber geometry', () => {
  assert.match(css, /grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(css, /feedback-chamber-v2__premaqc \{ grid-column: 1 \/ 5/);
  assert.match(css, /feedback-chamber-v2__practice \{ grid-column: 5 \/ 8/);
  assert.match(css, /feedback-chamber-v2__receipts \{ grid-column: 8 \/ 13/);
  assert.match(css, /feedback-chamber-v2__voices \{ grid-column: 1 \/ 7/);
  assert.match(css, /feedback-chamber-v2__canon \{ grid-column: 7 \/ 13/);
  assert.match(css, /feedback-chamber-v2__turn \{ grid-column: 7 \/ 13/);
  assert.match(css, /feedback-chamber-v2__sound \{ grid-column: 1 \/ 13/);
  assert.match(css, /feedback-chamber-v2__action-rail \{ grid-column: 1 \/ 13/);
});

test('accepted reference UI makes Sound and Runa sibling instruments with a full-width cycle rail', () => {
  assert.match(css, /story-soundscape[\s\S]*grid-template-columns:\s*minmax\(0, 1\.02fr\) minmax\(0, 1\.18fr\)/);
  assert.match(css, /synaptic-heartfield[\s\S]*grid-column:\s*2/);
  assert.match(css, /feedback-chamber-v2__action-rail[\s\S]*grid-template-columns:\s*repeat\(4/);
  assert.match(css, /button\[type='submit'\][\s\S]*linear-gradient\(180deg, #f0d28c, #c99a40\)/);
});

test('accepted reference UI aligns Observation and Stewardship and collapses deliberately', () => {
  assert.match(css, /feedback-chamber-v2__bottom/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, \.92fr\) minmax\(0, 1\.18fr\)/);
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /feedback-chamber-v2__form,[\s\S]*feedback-chamber-v2__bottom[\s\S]*grid-template-columns:\s*1fr/);
});
