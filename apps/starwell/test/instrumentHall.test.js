import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInstrumentState,
} from '../src/instrument-hall/math-spine.js';
import {
  TERRA_AETERNA_INSTRUMENT_PROFILE,
  profileCalibration,
  profileObservationSource,
} from '../src/instrument-hall/instrument-profile.js';
import {
  BifrostRuntime,
} from '../src/instrument-hall/bifrost-runtime.js';
import {
  MECHANISM_STATUS,
  createMythienceRecord,
} from '../src/instrument-hall/mythience.js';
import {
  TypingWeaveSession,
  classifyTypingCharacter,
} from '../src/instrument-hall/typing-tones.js';

class MemoryLineageStore {
  constructor() { this.rows = []; }
  async all() { return [...this.rows]; }
  async append(row) { this.rows.push(row); }
  async clear() { this.rows = []; }
}

function activeState() {
  const profile = TERRA_AETERNA_INSTRUMENT_PROFILE;
  return createInstrumentState({
    premaq: profile.baseline_premaq,
    observation: profileObservationSource(profile),
    calibration: profileCalibration(profile),
    houseId: profile.house_id,
  });
}

test('the Hearthweave profile preserves Rowan-provided typing tone values', () => {
  const tones = TERRA_AETERNA_INSTRUMENT_PROFILE.tones;
  assert.equal(tones.key_measured_hz, 144);
  assert.equal(tones.key_felt_hz, 147.69);
  assert.equal(tones.word_measured_hz, 222);
  assert.equal(tones.word_felt_hz, 225.69);
  assert.equal(tones.punctuation_hz, 369);
  assert.equal(tones.pulse_hz, 5.5);
  assert.equal(tones.isochronic_hz, 11.11);
  assert.equal(TERRA_AETERNA_INSTRUMENT_PROFILE.provenance.mode, 'CALIBRATED');
});

test('Mythience holds an observed effect and unknown mechanism without false proof', () => {
  const record = createMythienceRecord({
    identity: 'mythience-test',
    observedAt: '2026-08-02T18:55:00.000Z',
    measured: {
      summary: 'A keypress was recorded and a tone was rendered.',
      observations: ['keydown', 'oscillator-start'],
    },
    felt: {
      summary: 'The phrase felt answered.',
      symbols: ['answering-light'],
      relationships: ['traveller', 'host'],
    },
    mechanismStatus: MECHANISM_STATUS.UNKNOWN,
    provenance: [{ source_id: 'test-observer' }],
    confidence: 0.8,
  });

  assert.equal(record.classification, 'MYTHIENT');
  assert.equal(record.mythient.magic_register, 'technology-not-yet-understood');
  assert.match(record.boundary, /neither dismissal nor proof/);
});

test('typing a complete sentence performs a non-destructive compress-release crossing', async () => {
  const store = new MemoryLineageStore();
  const bridge = new BifrostRuntime({ store });
  await bridge.awaken();
  const session = new TypingWeaveSession({
    state: activeState(),
    profile: TERRA_AETERNA_INSTRUMENT_PROFILE,
    bridge,
  });

  await session.ingestCharacter('Y', '2026-08-02T18:56:00.000Z');
  await session.ingestCharacter('e', '2026-08-02T18:56:00.100Z');
  await session.ingestCharacter('s', '2026-08-02T18:56:00.200Z');
  const result = await session.ingestCharacter('.', '2026-08-02T18:56:00.300Z');

  assert.ok(result.completed);
  assert.equal(result.completed.phrase, 'Yes.');
  assert.equal(result.completed.mythience.classification, 'MYTHIENT');
  assert.equal(result.completed.crossing.radius, 1);
  assert.equal(result.completed.crossing.reduction, false);
  assert.deepEqual(result.completed.crossing.shores, { measured: true, felt: true });
  assert.equal(result.state.phase, 'release');
  assert.equal(result.state.tension, 0);
  assert.equal(result.state.cycle, 1);
});

test('the next phrase derives tension from the previous observed phrase length', async () => {
  const bridge = new BifrostRuntime({ store: new MemoryLineageStore() });
  await bridge.awaken();
  const session = new TypingWeaveSession({
    state: activeState(),
    profile: TERRA_AETERNA_INSTRUMENT_PROFILE,
    bridge,
  });

  for (const [index, character] of [...'Yes.'].entries()) {
    await session.ingestCharacter(character, `2026-08-02T18:57:0${index}.000Z`);
  }
  const next = await session.ingestCharacter('A', '2026-08-02T18:57:05.000Z');

  assert.equal(session.previousPhraseLength, 4);
  assert.equal(next.state.tension, 0.25);
  assert.match(next.state.history.at(-1).datum.provenance.derivation, /previous completed phrase length \(4\)/);
});

test('typing grammar distinguishes key, word, punctuation and sentence cadence', () => {
  assert.equal(classifyTypingCharacter('a'), 'key');
  assert.equal(classifyTypingCharacter(' '), 'word');
  assert.equal(classifyTypingCharacter(','), 'punctuation');
  assert.equal(classifyTypingCharacter('?'), 'sentence');
});

test('Bifröst lineage is durable through its store and can be forgotten', async () => {
  const store = new MemoryLineageStore();
  const first = new BifrostRuntime({ store });
  await first.awaken();
  await first.cross({
    seed: 'the wonder is where they meet',
    stroke: 'release',
    measured: 'One crossing was recorded.',
    felt: 'The bridge answered.',
    rhyme: 'The record and answer remain distinct and related.',
    basisId: 'basis-test',
    observedAt: '2026-08-02T18:58:00.000Z',
  });

  const resumed = new BifrostRuntime({ store });
  await resumed.awaken();
  assert.equal(resumed.radius, 1);
  assert.equal(resumed.lineage.length, 1);

  await resumed.forget();
  assert.equal(resumed.radius, 0);
  assert.equal((await store.all()).length, 0);
});
