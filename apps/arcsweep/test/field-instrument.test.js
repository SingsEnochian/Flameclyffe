import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyFieldInstrument, createFieldObservationPremaqc, formatFieldAge, isHostedBrowser } from '../src/field-instrument.js';

test('ambient axes are source projections, never silently accepted PREMAQC', () => {
  const instrument = classifyFieldInstrument({
    ambient: { generated_at: '2026-07-02T16:03:07.254Z', field: { P: .58, C: .72, R: null, E: .56, M: .92, A: .97 } },
    now: Date.parse('2026-08-12T04:00:00Z'),
  });
  assert.equal(instrument.source, 'ambient-projection');
  assert.equal(instrument.axes.P.status, 'source-projected');
  assert.equal(instrument.axes.R.status, 'unavailable');
  assert.equal(instrument.axes.R.provenance, null);
  assert.equal(instrument.axes.P.provenanceType, 'source observation');
  assert.equal(instrument.axes.Q.status, 'unavailable');
  assert.equal(instrument.stale, true);
  assert.match(formatFieldAge(instrument.ageMs), /days old/);
});

test('production HTTP routes identify as hosted while local development does not', () => {
  assert.equal(isHostedBrowser({ protocol: 'https:', hostname: 'flameclyffe-starwell.netlify.app' }), true);
  assert.equal(isHostedBrowser({ protocol: 'http:', hostname: 'localhost' }), false);
  assert.equal(isHostedBrowser({ protocol: 'file:', hostname: '' }), false);
});

test('a receipted feedback state takes precedence and exposes its lineage', () => {
  const acceptedPremaqc = { id: 'premaqc-2', receipt_id: 'receipt-2', sequence: 2, state: { P: { value: .81 }, C: { value: .82 }, R: { value: .83 }, E: { value: .4 }, M: { value: .9 }, A: { value: .85 }, Q: { value: .79 } } };
  const instrument = classifyFieldInstrument({ acceptedPremaqc, ambient: { field: { P: .1 } } });
  assert.equal(instrument.source, 'accepted-feedback');
  assert.equal(instrument.axes.P.value, .81);
  assert.equal(instrument.axes.P.status, 'accepted');
  assert.equal(instrument.axes.P.provenance, 'receipt-2');
});

test('missing evidence remains unavailable rather than receiving seed decimals', () => {
  const instrument = classifyFieldInstrument();
  assert.equal(instrument.source, 'unavailable');
  assert.equal(instrument.axes.P.value, null);
  assert.equal(instrument.axes.P.status, 'unavailable');
});

test('Observer receipts six ambient projections plus firsthand Qualia as a complete PREMAQC input', () => {
  const ambient = { generated_at: '2026-08-12T05:00:00Z', field: { P: .5, C: .4, R: .7, E: .6, M: .2, A: .8 } };
  const packet = createFieldObservationPremaqc({ worldId: 'ta-veren-vaen', ambient, qualia: .91, narrative: 'The branch snapped.', observedAt: '2026-08-12T05:01:00Z' });
  assert.equal(packet.state.Q.value, .91);
  assert.equal(packet.state.P.value, .5);
  assert.equal(packet.state.P.contributors[0].source_kind, 'ambient-source-projection');
  assert.equal(packet.state.Q.contributors[0].source_kind, 'firsthand-qualia');
  assert.match(packet.receipt_id, /^observer-field-/);
});

test('Observer refuses an unmeasured or out-of-range firsthand Qualia value', () => {
  const ambient = { generated_at: '2026-08-12T05:00:00Z', field: { P: .5, C: .4, R: .7, E: .6, M: .2, A: .8 } };
  assert.throws(() => createFieldObservationPremaqc({ worldId: 'ta-veren-vaen', ambient, qualia: '' }), /Qualia/);
  assert.throws(() => createFieldObservationPremaqc({ worldId: 'ta-veren-vaen', ambient, qualia: 1.2 }), /Qualia/);
});
