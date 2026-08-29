import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCLOSURE_RECEIPT_SCHEMA,
  EFFECT_RECEIPT_SCHEMA,
  EPISTEMIC_PROJECTION_SCHEMA,
  GLOBAL_STRUCTURE_DESCRIPTOR_SCHEMA,
  INTERPRETATION_REVISION_SCHEMA,
  compileWildGenerationContext,
  createDisclosureReceipt,
  createEffectReceipt,
  createEpistemicProjection,
  createGlobalStructureDescriptor,
  createInterpretationRevision,
} from '../src/bridge-network.js';

const fixed = { clock: () => new Date('2026-08-29T06:00:00.000Z'), idFactory: () => 'fixture' };

async function globalStructure() {
  return createGlobalStructureDescriptor({
    scopeId: 'terra-aeterna:scene:bridge',
    structureRef: 'world-graph:terra-aeterna:v1',
    topology: 'path-space',
    timelineFamilyRef: 'timeline-family:all-lawful-paths',
    relationRef: 'timeline-relations:causal-and-counterfactual',
    lawRefs: ['world-law:agency', 'world-law:causality'],
    provenance: ['canon:terra-aeterna'],
  }, fixed);
}

test('global structure descriptor carries structure without epistemic state', async () => {
  const value = await globalStructure();
  assert.equal(value.schema, GLOBAL_STRUCTURE_DESCRIPTOR_SCHEMA);
  assert.equal(value.authority.structural_completeness_relative_to_scope, true);
  assert.equal(value.authority.epistemic_state_embedded, false);
  assert.equal(value.authority.requires_timeline_enumeration, false);
  assert.equal(Object.hasOwn(value, 'epistemic_state'), false);
  assert.equal(Object.hasOwn(value, 'unknown_to_system'), false);
});

test('preserved unresolved is scoped to a knower projection', async () => {
  const global = await globalStructure();
  const projection = await createEpistemicProjection({
    globalStructure: global,
    knowerId: 'participant:kestrelle',
    localSliceRef: 'scene:bridge:t7',
    epistemicState: 'preserved_unresolved',
    visibleRefs: ['fact:door-open'],
    withheldRefs: ['future-branch:sealed'],
    reason: 'Participant-local causal boundary.',
  }, fixed);
  assert.equal(projection.schema, EPISTEMIC_PROJECTION_SCHEMA);
  assert.equal(projection.epistemic_state, 'preserved_unresolved');
  assert.equal(projection.authority.scoped_to_knower, true);
  assert.equal(projection.authority.does_not_mutate_global_structure, true);
});

test('Effect Receipt preserves effect before mechanism adjudication', async () => {
  const effect = await createEffectReceipt({
    observerId: 'nocturne',
    contextRef: 'heartbeat:175B3436',
    observedEffect: 'Consequential movement was redirected into procedure.',
    provenance: ['observer:heartbeat:175B3436'],
  }, fixed);
  assert.equal(effect.schema, EFFECT_RECEIPT_SCHEMA);
  assert.equal(effect.authority.append_only_observation, true);
  assert.equal(Object.hasOwn(effect, 'mechanism_status'), false);
  assert.equal(Object.hasOwn(effect, 'candidate_mechanisms'), false);

  const revision = await createInterpretationRevision({
    effectReceipt: effect,
    reviewerId: 'twilight',
    interpretation: 'Control-plane exposure may have biased realization.',
    mechanismStatus: 'candidate',
    candidateMechanisms: ['control-plane leakage', 'generator self-policing'],
  }, fixed);
  assert.equal(revision.schema, INTERPRETATION_REVISION_SCHEMA);
  assert.equal(revision.effect_receipt_ref, effect.receipt_id);
  assert.equal(revision.authority.may_mutate_observed_effect, false);
  assert.equal(effect.observed_effect, 'Consequential movement was redirected into procedure.');
});

test('Disclosure Receipt records information crossing as causal input', async () => {
  const global = await globalStructure();
  const receipt = await createDisclosureReceipt({
    globalStructure: global,
    fromProjectionRef: 'projection:observer',
    toParticipantId: 'participant:kestrelle',
    disclosedRefs: ['fact:future-warning'],
    authorityReceiptRefs: ['consent:future-warning'],
  }, fixed);
  assert.equal(receipt.schema, DISCLOSURE_RECEIPT_SCHEMA);
  assert.equal(receipt.authority.disclosure_is_causal_input, true);
  assert.equal(receipt.authority.global_structure_rewritten, false);
});

test('WILD context permits world constraints while excluding evaluator/control fields', () => {
  const context = compileWildGenerationContext({
    world_state: 'The bridge is open during a storm.',
    history: ['The bell rang once before.'],
    participants: ['Kestrelle'],
    participant_knowledge: ['She knows the eastern path is flooded.'],
    capabilities: ['channeling'],
    relationships: ['Meriene: trusted mentor'],
    agency_boundaries: ['Kestrelle chooses her own action.'],
    constraints: ['No action may exceed local capability.'],
    reachable_possibilities: ['cross', 'wait', 'signal'],
    memory_active_context: ['A prior promise changes the cost of waiting.'],
    orientation: 'Continue from the lived scene state.',
  });
  assert.equal(context.world_state, 'The bridge is open during a storm.');
  assert.deepEqual(context.reachable_possibilities, ['cross', 'wait', 'signal']);
  assert.throws(() => compileWildGenerationContext({
    world_state: 'same world',
    evaluation: { desired: 'spiral' },
  }), /forbids evaluator\/control fields/);
  assert.throws(() => compileWildGenerationContext({
    world_state: 'same world',
    surprise_target: 'maximum novelty',
  }), /forbids evaluator\/control fields/);
});
