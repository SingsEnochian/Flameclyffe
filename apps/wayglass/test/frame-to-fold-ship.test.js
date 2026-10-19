import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleFrameToFold, auralFrameCue, auralFrameSweep, FRAME_TO_FOLD_SCHEMA } from '../src/frame-to-fold-model.js';
import { createFrameAudition } from '../src/frame-to-fold-audio.js';
import { resolveWayglassDeck, WAYGLASS_DECKS, WAYGLASS_DEFAULT_ROUTE, WAYGLASS_SHIP_RUNTIME } from '../src/ship-environment.js';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');

test('mathematical fold is certified at x=0 and sonified with model marker', () => {
  const near = sampleFrameToFold('fold', 0.49);
  const fold = sampleFrameToFold('fold', 0.5);
  const past = sampleFrameToFold('fold', 0.75);
  assert.equal(fold.schema, FRAME_TO_FOLD_SCHEMA);
  assert.equal(near.rank_loss_certified, false);
  assert.equal(fold.rank_loss_certified, true);
  assert.equal(fold.local_classification, 'MODEL_FOLD');
  assert.equal(fold.determinant, 0);
  assert.equal(fold.sigma_min, 0);
  assert.equal(fold.physical_fold_probability, null);
  assert.equal(auralFrameCue(fold).marker, 'MODEL_FOLD');
  assert.equal(past.plane_position, 'NEGATIVE_SIDE');
  assert.ok(auralFrameCue(near).frequency_hz > auralFrameCue(sampleFrameToFold('fold', 0)).frequency_hz);
});

test('reference plane and severe conditioning never certify a fold', () => {
  for (const t of [0, 0.5, 1]) {
    const stretch = sampleFrameToFold('stretch', t);
    assert.equal(stretch.determinant, 100);
    assert.equal(stretch.local_classification, 'NO_LOCAL_FOLD');
    assert.equal(stretch.rank_loss_certified, false);
    assert.ok(stretch.fold_index > 0.98);
  }
  assert.equal(auralFrameCue(sampleFrameToFold('stretch', 0.5)).marker, 'REFERENCE_PLANE');
});

test('STARWELL distinct converging sheets remain locally nonsingular', () => {
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const sample = sampleFrameToFold('sheets', t);
    assert.ok(Math.abs(sample.determinant + 2) < 1e-7);
    assert.equal(sample.rank_loss_certified, false);
    assert.equal(sample.local_classification, 'NO_LOCAL_FOLD');
    assert.equal(sample.physical_observation, 'NOT_MEASURED');
  }
});

test('aural plan is bounded, explicit and mono accessible', () => {
  const cues = auralFrameSweep('fold', 17);
  assert.equal(cues.length, 17);
  assert.ok(cues.every(c => c.gain <= 0.022 && c.duration_ms <= 170));
  assert.equal(cues.filter(c => c.marker === 'MODEL_FOLD').length, 1);
  assert.equal(cues[0].pan, -cues.at(-1).pan);
  assert.throws(() => auralFrameSweep('fold', 34), /odd number/);
  assert.throws(() => sampleFrameToFold('fold', NaN), /finite/);
});

test('user-initiated audio scheduling supports mono and immediate stop', async () => {
  const events = [];
  const envelope = { gain:{ setValueAtTime(){},linearRampToValueAtTime(){} },connect(){},disconnect(){} };
  const oscillator = { type:'sine', frequency:{setValueAtTime(){}}, connect(){},start(){events.push('start')},stop(){events.push('stop')},disconnect(){} };
  const context = { currentTime:0, state:'running', destination:{}, createOscillator:()=>({...oscillator,frequency:{setValueAtTime(){}}}), createGain:()=>({ ...envelope,gain:{ setValueAtTime(){},linearRampToValueAtTime(){} } }), close:async()=>events.push('close') };
  const clock = { setTimeout:()=>1,clearTimeout:()=>{} };
  const player = createFrameAudition({contextFactory:()=>context,clock});
  assert.equal(player.active, false);
  const result = await player.play([auralFrameCue(sampleFrameToFold('fold',0.5))],{stereo:false});
  assert.equal(result.scheduled, true);
  assert.equal(result.device_verified, false);
  assert.equal(player.active, true);
  assert.ok(events.includes('start'));
  await player.stop();
  assert.equal(player.active, false);
  assert.ok(events.includes('stop') && events.includes('close'));
});

test('ship is a shared environment, not separate mandatory login surfaces', () => {
  assert.equal(resolveWayglassDeck('?room=fold'), 'wayglass:frame-to-fold');
  assert.equal(resolveWayglassDeck('?room=writing'), 'arcsweep:writing-room');
  assert.equal(resolveWayglassDeck('?room=organs'), 'wayglass:systems');
  assert.equal(resolveWayglassDeck('?room=not-a-room'), 'arcsweep:writing-room');
  assert.ok(WAYGLASS_DECKS.find(deck => deck.slug === 'commons'));
  assert.equal(WAYGLASS_DEFAULT_ROUTE, 'local:crow');
  assert.equal(WAYGLASS_SHIP_RUNTIME.navigation_auth_required, false);
  assert.equal(WAYGLASS_SHIP_RUNTIME.native_wayglass_llm_trained, false);
  const main = read('../src/main.js');
  assert.doesNotMatch(main, /await openWayglassAuthorization\(\);/);
  assert.match(main, /mountWayglassShipNavigation/);
  assert.match(main, /surface_id: 'wayglass:frame-to-fold'/);
  assert.match(main, /wayglass\.mount\(startRoom\)/);
});

test('Crow is identity-neutral and SpicyChat remains participant-specific', () => {
  const registry = read('../../../lib/wayglass-route-registry.cjs');
  const writing = read('../src/surfaces/arcsweep-writing.js');
  assert.match(registry, /'local:crow': Object\.freeze/);
  assert.match(registry, /identity_owner: null, substrate: 'the-crow'/);
  assert.match(registry, /'flame:bluebird:crow'/);
  assert.match(registry, /'flame:bluebird:spicychat'/);
  assert.match(writing, /let selectedRoute = 'local:crow'/);
  assert.match(writing, /I approve sending this turn and permitted same-world context to Bluebird/);
  const auth = read('../src/authorization.js');
  assert.match(auth, /Not now · enter ship/);
  assert.match(auth, /skipped: true/);
});
