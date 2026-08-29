import { compareStateDisplacement } from './semantic-source-contract.js';
import {
  evaluateBranchGarden,
  compareWitnessRealizations,
  classifyDebtTransition,
  causalDensity,
  projectParticipantSceneView,
} from './semantic-transition-contract.js';

export const NARRATIVE_CIRCUIT_VERSION = 'arcsweep.narrative-circuit/v1';

function selectAdmissibleBranch(branches, selectedBranchId) {
  const garden = evaluateBranchGarden(branches);
  const admissible = garden.candidates.filter((candidate) => candidate.admissible);
  const selected = selectedBranchId
    ? admissible.find((candidate) => candidate.id === selectedBranchId)
    : admissible[0];
  return { garden, selected: selected || null };
}

function selectWitness(realizations, selectedWitnessId) {
  const witnessSet = compareWitnessRealizations({}, realizations);
  const selected = selectedWitnessId
    ? witnessSet.realizations.find((item) => item.id === selectedWitnessId)
    : witnessSet.realizations.find((item) => item.preserves_target);
  return { witnessSet, selected: selected || null };
}

export function runNarrativeCircuit({
  beforeState = {},
  afterState = {},
  beforeDebt = [],
  afterDebt = [],
  branches = [],
  selectedBranchId = null,
  witnessRealizations = [],
  selectedWitnessId = null,
  participantKnown = {},
  sources = [],
  requestedCapabilities = ['scene_fact', 'participant_knowledge', 'dialogue_content', 'narrative_style', 'narrative_particulars'],
  initiatingEvents = [],
  consequentialChanges = [],
} = {}) {
  const { garden, selected: selectedBranch } = selectAdmissibleBranch(branches, selectedBranchId);
  const targetTransition = selectedBranch?.vector || {};
  const witnessComparison = compareWitnessRealizations(targetTransition, witnessRealizations);
  const selectedWitness = selectedWitnessId
    ? witnessComparison.realizations.find((item) => item.id === selectedWitnessId)
    : witnessComparison.realizations.find((item) => item.preserves_target);

  const arrival = compareStateDisplacement(beforeState, afterState);
  const debt = classifyDebtTransition(beforeDebt, afterDebt);
  const perspective = projectParticipantSceneView({
    globalState: afterState,
    participantKnown,
    sources,
    requestedCapabilities,
  });
  const density = causalDensity({ initiatingEvents, consequentialChanges });

  const blockers = [];
  if (!selectedBranch) blockers.push('no_admissible_branch');
  if (!selectedWitness) blockers.push('no_target_preserving_witness');
  if (arrival.semantic_inflation_warning) blockers.push('semantic_inflation');
  if (selectedWitness && selectedWitness.preserves_target === false) blockers.push('witness_changed_target_transition');

  const stages = Object.freeze({
    branch_garden: garden,
    transition_forge: selectedBranch ? Object.freeze({
      schema: 'arcsweep.transition-forge-handoff/v1',
      branch_id: selectedBranch.id,
      vector: Object.freeze({ ...targetTransition }),
      scalar_utility: null,
      vector_primary: true,
    }) : null,
    witness_swap: Object.freeze({
      ...witnessComparison,
      target_transition: Object.freeze({ ...targetTransition }),
      selected_witness_id: selectedWitness?.id || null,
    }),
    arrival_validation: Object.freeze({
      semantic_inflation: arrival,
      debt_loom: debt,
      perspective_lantern: perspective,
      causal_density: density,
    }),
  });

  return Object.freeze({
    schema: NARRATIVE_CIRCUIT_VERSION,
    ready_for_narrative_use: blockers.length === 0,
    blockers: Object.freeze(blockers),
    stages,
    authority: 'inspection-and-selection-only',
    mutation_authority: false,
    rule: 'branch -> constrained displacement -> witness -> evidenced arrival',
  });
}
