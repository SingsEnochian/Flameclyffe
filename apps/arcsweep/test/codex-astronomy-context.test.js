import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  astronomyContextFromEvent,
  CODEX_ASTRONOMY_CONTEXT_SCHEMA,
  createAstronomyContextOffer,
} from '../src/codex/codex-astronomy-context.js';

test('astronomy context creates a bounded prefill-only offer', () => {
  const offer = createAstronomyContextOffer({
    source: 'astrolabe',
    selectedAt: '2026-09-27T15:00:00.000Z',
    observer: { latitudeDegrees: 29.9, longitudeDegrees: -81.3 },
  });

  assert.equal(offer.schema, CODEX_ASTRONOMY_CONTEXT_SCHEMA);
  assert.equal(offer.source, 'astrolabe');
  assert.equal(offer.selectedAt, '2026-09-27T15:00:00.000Z');
  assert.deepEqual(offer.observer, { latitudeDegrees: 29.9, longitudeDegrees: -81.3 });
  assert.match(offer.authority, /prefill-only/);
});

test('astronomy context refuses unknown sources and invalid time', () => {
  assert.throws(
    () => createAstronomyContextOffer({ source: 'clock-goblin', selectedAt: Date.now() }),
    /unsupported source/,
  );
  assert.throws(
    () => createAstronomyContextOffer({ source: 'orrery', selectedAt: 'not-a-date' }),
    /valid selected instant/,
  );
});

test('instrument events become one shared context shape without changing their source records', () => {
  const astrolabe = astronomyContextFromEvent('codex:astrolabe-reading', {
    reading: {
      observedAt: '2026-09-27T14:00:00.000Z',
      observer: { latitudeDegrees: 30, longitudeDegrees: -81 },
    },
  });
  const orrery = astronomyContextFromEvent('codex:orrery-time-change', {
    state: { selectedAt: '2026-09-28T14:00:00.000Z' },
  });
  const celestial = astronomyContextFromEvent('codex:celestial-time-change', {
    state: { selectedAt: '2026-09-29T14:00:00.000Z' },
  });

  assert.equal(astrolabe.source, 'astrolabe');
  assert.deepEqual(astrolabe.observer, { latitudeDegrees: 30, longitudeDegrees: -81 });
  assert.equal(orrery.source, 'orrery');
  assert.equal(orrery.observer, null);
  assert.equal(celestial.source, 'celestial-sphere');
  assert.equal(celestial.observer, null);
  assert.equal(astronomyContextFromEvent('something-else', {}), null);
});

test('astronomy context sidecar is explicit adoption only and non-persistent', async () => {
  const sidecar = await readFile(new URL('../src/codex-astronomy-context-sidecar.js', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');

  assert.match(sidecar, /codex:astrolabe-reading/);
  assert.match(sidecar, /codex:orrery-time-change/);
  assert.match(sidecar, /codex:celestial-time-change/);
  assert.match(sidecar, /codex:astronomy-context-offered/);
  assert.match(sidecar, /codex:astronomy-context-adopted/);
  assert.match(sidecar, /automaticAdoption:\s*false/);
  assert.match(sidecar, /automaticRecompute:\s*false/);
  assert.match(sidecar, /persists:\s*false/);
  assert.match(sidecar, /recomputed:\s*false/);
  assert.match(sidecar, /input\.value = localInputValue/);
  assert.doesNotMatch(sidecar, /requestSubmit\s*\(/);
  assert.doesNotMatch(sidecar, /\.submit\s*\(/);
  assert.doesNotMatch(sidecar, /localStorage|sessionStorage/);
  assert.doesNotMatch(sidecar, /setInterval\s*\(|requestAnimationFrame\s*\(/);
  assert.match(entry, /codex-astronomy-context-sidecar\.js/);
});
