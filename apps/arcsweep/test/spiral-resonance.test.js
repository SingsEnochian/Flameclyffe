import assert from 'node:assert/strict';
import test from 'node:test';
import { createStateSnapshot, createCrossingEnvelope } from '../src/bifrost-crossing-envelope.js';
import { calculateSpiralResonance, attachResonanceToHolonomy } from '../src/spiral-resonance.js';

function snap(world, id, p, phase = 'release') {
  return createStateSnapshot({
    worldIdentity: world,
    frameworkLabel: world,
    worldRevision: 1,
    stateId: id,
    stateHash: `sha256:${id}`,
    effectiveAt: '2026-08-23T05:30:00Z',
    state: {
      premaqc: { schema: 'premaqc/v1', P: p, C: .8, R: .9, E: .2, M: .7, A: .9, Q: .8 },
      spiral: { schema: 'spiral-state/v1', phase, direction: 'ascending', confidence: .9 },
    },
  });
}

const traveller = snap('Earth Prime', 'prime:departure', .7);
const destination = snap('terra-aeterna', 'ta:pre', .8);
const crossing = createCrossingEnvelope({
  crossingId: 'bridge-test-001:resonance',
  createdAt: '2026-08-23T05:30:00Z',
  source: traveller,
  destination,
  translation: {
    profile_id: 'earth-prime-to-terra-aeterna',
    candidate_invariants: ['identity_lineage', 'provenance', 'agency'],
    transformed_fields: ['tone', 'glyph_geometry'],
    untranslatable: ['world-local-tone'],
    status: 'PARTIALLY_TRANSLATED',
  },
});

test('Spiral Resonance measures the relation between traveller, destination, and crossing', () => {
  const resonance = calculateSpiralResonance({ travellerSnapshot: traveller, destinationSnapshot: destination, crossingEnvelope: crossing });
  assert.deepEqual(resonance.relation, ['earth_prime', 'terra-aeterna']);
  assert.ok(Math.abs(resonance.premaqc_correspondence.per_axis.P - .9) < 1e-12);
  assert.equal(resonance.spiral_correspondence.phase, 1);
  assert.deepEqual(resonance.untranslated_residue, ['world-local-tone']);
});

test('Spiral Resonance keeps projection channels independent and does not collapse to one score', () => {
  const resonance = calculateSpiralResonance({
    travellerSnapshot: traveller,
    destinationSnapshot: destination,
    crossingEnvelope: crossing,
    relational: { edge_distortion: .17 },
    worldHum: { source_hz: 220, destination_hz: 220, relation: 'unison-root' },
    glyph: { structural_correspondence: .82 },
    runa: { harmonic_correspondence: .91 },
    storywork: { response_correspondence: .76 },
  });
  assert.equal(resonance.scalar_summary, null);
  assert.equal(resonance.projections.runa.harmonic_correspondence, .91);
  assert.equal(resonance.world_hum.relation, 'unison-root');
});

test('Spiral Resonance can braid into Holonomy without mutating the original record', () => {
  const resonance = calculateSpiralResonance({ travellerSnapshot: traveller, destinationSnapshot: destination, crossingEnvelope: crossing });
  const holonomy = Object.freeze({ schema: 'arcsweep.spiral-holonomy/v1', holonomy_id: 'h:001' });
  const braided = attachResonanceToHolonomy(holonomy, resonance);
  assert.equal(holonomy.resonance, undefined);
  assert.equal(braided.resonance.resonance_id, 'spiral-resonance:bridge-test-001:resonance');
  assert.equal(Object.isFrozen(braided), true);
});
