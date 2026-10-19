import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ARCSWEEP_WAYGLASS_PASSAGE_SCHEMA,
  WAYGLASS_SOURCE_NOTES,
  buildWayglassPassageUrl,
  buildArcSweepReturnUrl,
  readArcSweepArrival,
  validPassageWorldId,
} from '../../../lib/arcsweep-wayglass-passage.js';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const source = name => readFileSync(new URL('../../../' + name, import.meta.url), 'utf8');

test('ArcSweep ⇄ Wayglass development ports are correctly paired', () => {
  const toWayglass = new URL(buildWayglassPassageUrl('http://127.0.0.1:5184/?open=1', 'terra-prime'));
  assert.equal(toWayglass.origin, 'http://127.0.0.1:5186');
  assert.equal(toWayglass.pathname, '/');
  assert.equal(toWayglass.searchParams.get('room'), 'writing');
  assert.equal(toWayglass.searchParams.get('from'), 'arcsweep');
  assert.equal(toWayglass.searchParams.get('world'), 'terra-prime');
  assert.equal(buildArcSweepReturnUrl(toWayglass.href), 'http://127.0.0.1:5184/');
  assert.equal(buildArcSweepReturnUrl('http://localhost:4186/?room=writing'), 'http://localhost:4184/');
});

test('packaged sibling routes preserve their host and repository subpath', () => {
  assert.equal(
    buildWayglassPassageUrl('https://example.org/Flameclyffe/arcsweep/', 'world:one'),
    'https://example.org/Flameclyffe/wayglass/?room=writing&from=arcsweep&world=world%3Aone',
  );
  assert.equal(
    buildArcSweepReturnUrl('https://example.org/Flameclyffe/wayglass/?return=https://evil.example/'),
    'https://example.org/Flameclyffe/arcsweep/',
  );
});

test('entry hint accepts only bounded world IDs and carries no private fields', () => {
  assert.equal(validPassageWorldId('wayglass:writing-room'), true);
  for (const value of ['a b', '<img>', '../world', '', 'x'.repeat(129)]) assert.equal(validPassageWorldId(value), false);
  const to = buildWayglassPassageUrl('http://localhost:5184/', '<bad>');
  assert.equal(new URL(to).searchParams.has('world'), false);
  const arrival = readArcSweepArrival('?from=arcsweep&world=evil-gene%3Afilm-2015&token=secret');
  assert.deepEqual(arrival, {
    schema: ARCSWEEP_WAYGLASS_PASSAGE_SCHEMA,
    source: 'arcsweep',
    source_world_id: 'evil-gene:film-2015',
    authority: 'navigation-hint-only',
    imported_records: 0,
  });
  assert.equal(readArcSweepArrival('?from=other&world=terra-prime'), null);
  assert.equal(readArcSweepArrival('?from=arcsweep&world=%3Cscript%3E').source_world_id, null);
  assert.equal(buildArcSweepReturnUrl('http://localhost:5186/?from=arcsweep&redirect=https://evil.example/'), 'http://localhost:5184/');
});

test('Wayglass notes distinguish maintained source and unmerged research', () => {
  assert.ok(WAYGLASS_SOURCE_NOTES.some(note => note.url.includes('/wayglass/current/WAYGLASS_CURRENT.md')));
  assert.ok(WAYGLASS_SOURCE_NOTES.every(note => note.url.startsWith('https://github.com/SingsEnochian/Flameclyffe/')));
  assert.ok(WAYGLASS_SOURCE_NOTES.some(note => /not verified|unverified|pending|proposed/.test(note.status)));
});

test('the passage is visible in ArcSweep and Wayglass but cannot implicitly import state', () => {
  const arcsweep = source('apps/arcsweep/src/main.js');
  const mobile = source('apps/arcsweep/src/mobile-navigation-sidecar.js');
  const writing = source('apps/wayglass/src/surfaces/arcsweep-writing.js');
  const panel = source('apps/wayglass/src/arcsweep-passage-ui.js');
  assert.match(arcsweep, /buildWayglassPassageUrl/);
  assert.match(arcsweep, /Enter Wayglass/);
  assert.match(mobile, /Wayglass · Writing Room/);
  assert.match(writing, /renderArcSweepPassagePanel/);
  assert.match(writing, /installArcSweepPassageWorldAction/);
  assert.match(panel, /No memories, credentials, relationships or canon were imported/);
  assert.match(panel, /not a live feed/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|fetch\s*\(|postMessage/);
});
