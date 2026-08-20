import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const BAI_TOPOLOGY_RECEIPT_SCHEMA = 'arcsweep.bone-ash-intention-topology/v1';
export const ARCSWEEP_TOPOLOGY_STATES = Object.freeze(['OPEN', 'FOLD_NEAR', 'BRANCH', 'CUSP_NEAR', 'HYSTERETIC']);
const EPSILON = 1e-9;

function invariant(condition, message) { if (!condition) throw new Error(`ARCSWEEP_BAI: ${message}`); }
function finite(value, field) { const number = Number(value); invariant(Number.isFinite(number), `${field} must be finite`); return number; }
function clamp(value, minimum = 0, maximum = 1) { return Math.min(maximum, Math.max(minimum, value)); }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }

function normaliseComponent(component, index) {
  invariant(component && typeof component === 'object', `bone component ${index} must be an object`);
  const value = clamp(finite(component.value, `bone component ${index}.value`));
  const weight = component.weight == null ? 1 : finite(component.weight, `bone component ${index}.weight`);
  invariant(weight >= 0, `bone component ${index}.weight must be nonnegative`);
  return { id: String(component.id || component.name || `component-${index + 1}`), value, weight, source: String(component.source || 'explicit-observation') };
}

export function normaliseBone(bone, { structure = null, structureScale = 2 } = {}) {
  const scale = finite(structureScale, 'structureScale');
  invariant(scale > 0, 'structureScale must be positive');
  if (bone && typeof bone === 'object' && !Array.isArray(bone)) {
    const components = Array.isArray(bone.components) ? bone.components.map(normaliseComponent) : [];
    let value;
    if (bone.value != null) value = clamp(finite(bone.value, 'bone.value'));
    else {
      invariant(components.length > 0, 'bone requires value or components');
      const weight = components.reduce((sum, item) => sum + item.weight, 0);
      invariant(weight > 0, 'bone component weights require positive mass');
      value = clamp(components.reduce((sum, item) => sum + item.value * item.weight, 0) / weight);
    }
    return deepFreeze({ value, components, confidence: bone.confidence == null ? null : clamp(finite(bone.confidence, 'bone.confidence')), source: String(bone.source || (components.length ? 'continuity-components' : 'explicit-observation')) });
  }
  if (bone != null) return deepFreeze({ value: clamp(finite(bone, 'bone')), components: [], confidence: null, source: 'explicit-observation' });
  invariant(structure != null, 'bone or explicit cusp structure is required');
  return deepFreeze({ value: clamp(Math.abs(finite(structure, 'structure')) / scale), components: [], confidence: null, source: 'legacy-explicit-structure-projection' });
}

export function projectBoneToCuspStructure(bone, { structureScale = 2 } = {}) {
  const normalised = normaliseBone(bone, { structureScale });
  const scale = finite(structureScale, 'structureScale');
  invariant(scale > 0, 'structureScale must be positive');
  return Number((-normalised.value * scale).toFixed(12));
}

function normaliseAshReceipt(receipt, index) {
  invariant(receipt && typeof receipt === 'object', `ash receipt ${index} must be an object`);
  const stateChange = Math.max(0, finite(receipt.state_change ?? receipt.stateChange ?? 0, `ash receipt ${index}.state_change`));
  const persistence = clamp(finite(receipt.persistence ?? 1, `ash receipt ${index}.persistence`));
  const confidence = clamp(finite(receipt.receipt_confidence ?? receipt.confidence ?? 1, `ash receipt ${index}.receipt_confidence`));
  const consequence = clamp(finite(receipt.consequence_weight ?? receipt.consequenceWeight ?? 1, `ash receipt ${index}.consequence_weight`));
  const contribution = stateChange * persistence * confidence * consequence;
  const direction = receipt.direction && typeof receipt.direction === 'object' ? Object.fromEntries(Object.entries(receipt.direction).map(([axis, value]) => [axis, finite(value, `ash receipt ${index}.direction.${axis}`)])) : {};
  return { receipt_id: String(receipt.receipt_id || receipt.id || `ash-${index + 1}`), source: String(receipt.source || 'receipted-history'), state_change: stateChange, persistence, receipt_confidence: confidence, consequence_weight: consequence, contribution, direction };
}

export function deriveAsh(historyReceipts = []) {
  invariant(Array.isArray(historyReceipts), 'ash history must be an array');
  const receipts = historyReceipts.map(normaliseAshReceipt);
  const rawAccumulation = receipts.reduce((sum, item) => sum + item.contribution, 0);
  const magnitude = 1 - Math.exp(-rawAccumulation);
  const axes = [...new Set(receipts.flatMap((item) => Object.keys(item.direction)))];
  const direction = {};
  for (const axis of axes) {
    const weighted = receipts.reduce((sum, item) => sum + (item.direction[axis] ?? 0) * item.contribution, 0);
    direction[axis] = rawAccumulation > EPSILON ? weighted / rawAccumulation : 0;
  }
  return deepFreeze({ magnitude, raw_accumulation: rawAccumulation, direction, receipt_count: receipts.length, receipts, history_complete: receipts.length > 0 });
}

export function calculateBaiBranchDiscriminant({ bone, ash, intention, epsilon = EPSILON } = {}) {
  const B = clamp(finite(bone, 'bone')); const H = clamp(finite(ash, 'ash')); const I = finite(intention, 'intention');
  const signed = H ** 2 - 4 * B * I; const magnitudeControlled = H ** 2 - 4 * B * Math.abs(I);
  const classify = (value) => Math.abs(value) <= epsilon ? 'near-zero' : value > 0 ? 'positive' : 'negative';
  return deepFreeze({ equation: 'H^2 - 4*B*I', signed, magnitude_controlled: magnitudeControlled, signed_class: classify(signed), magnitude_class: classify(magnitudeControlled), interpretation: 'reduced-branch-diagnostic' });
}

function derivativeDiagnostics(observation) {
  const x = observation?.selected_equilibrium?.value ?? observation?.order_parameter;
  if (!Number.isFinite(Number(x))) return deepFreeze({ x: null, first: null, second: null, third: 6 });
  const state = Number(x); const structure = finite(observation.controls?.structure, 'cusp controls.structure');
  return deepFreeze({ x: state, first: 3 * state ** 2 + structure, second: 6 * state, third: 6 });
}

export function classifyArcsweepTopology({ cuspObservation, cuspTrace = null, mathSpinePacket = null, thresholds = {} } = {}) {
  invariant(cuspObservation && typeof cuspObservation === 'object', 'cusp observation is required');
  const foldIndex = Number(mathSpinePacket?.projection?.jacobian?.fold_index);
  const foldActive = Boolean(mathSpinePacket?.projection?.fold?.active);
  const enterThreshold = Number(mathSpinePacket?.projection?.fold?.enter_threshold);
  const structure = finite(cuspObservation.controls?.structure, 'cusp controls.structure');
  const intention = finite(cuspObservation.controls?.intention, 'cusp controls.intention');
  const derivatives = derivativeDiagnostics(cuspObservation);
  const cuspDistance = Math.hypot(structure, intention);
  const cuspControlTolerance = finite(thresholds.cuspControlTolerance ?? 0.12, 'cuspControlTolerance');
  const firstDerivativeTolerance = finite(thresholds.firstDerivativeTolerance ?? 0.12, 'firstDerivativeTolerance');
  const secondDerivativeTolerance = finite(thresholds.secondDerivativeTolerance ?? 0.35, 'secondDerivativeTolerance');
  const foldIndexThreshold = finite(thresholds.foldIndexThreshold ?? (Number.isFinite(enterThreshold) ? enterThreshold : 0.82), 'foldIndexThreshold');
  const hysteretic = Boolean(cuspTrace?.hysteresis_detected);
  const derivativeCuspNear = derivatives.first != null && Math.abs(derivatives.first) <= firstDerivativeTolerance && Math.abs(derivatives.second) <= secondDerivativeTolerance;
  const cuspNear = cuspObservation.regime === 'cusp-point' || cuspDistance <= cuspControlTolerance || derivativeCuspNear;
  const branching = cuspObservation.regime === 'multistable' || (cuspObservation.equilibria?.length ?? 0) >= 3;
  const foldNear = cuspObservation.regime === 'fold-boundary' || foldActive || (Number.isFinite(foldIndex) && foldIndex >= foldIndexThreshold);
  const state = hysteretic ? 'HYSTERETIC' : cuspNear ? 'CUSP_NEAR' : branching ? 'BRANCH' : foldNear ? 'FOLD_NEAR' : 'OPEN';
  return deepFreeze({ state, fold_index: Number.isFinite(foldIndex) ? foldIndex : null, fold_active: foldActive, cusp_distance: cuspDistance, derivatives, branch_count: cuspObservation.equilibria?.length ?? 0, regime: cuspObservation.regime, hysteresis_witnessed: hysteretic, thresholds: { cusp_control_tolerance: cuspControlTolerance, first_derivative_tolerance: firstDerivativeTolerance, second_derivative_tolerance: secondDerivativeTolerance, fold_index_threshold: foldIndexThreshold } });
}

export function ashHistoryFromCuspPackets(packets = [], { halfLifeReceipts = 8 } = {}) {
  invariant(Array.isArray(packets), 'cusp packets must be an array'); const halfLife = finite(halfLifeReceipts, 'halfLifeReceipts'); invariant(halfLife > 0, 'halfLifeReceipts must be positive');
  const usable = packets.filter((packet) => packet?.observation?.controls && packet?.packet_id);
  return usable.map((packet, index) => {
    const observation = packet.observation; const previous = index > 0 ? usable[index - 1]?.observation : null;
    const currentState = Number(observation.selected_equilibrium?.value ?? observation.order_parameter); const previousState = Number(previous?.selected_equilibrium?.value ?? previous?.order_parameter);
    const stateChange = Number.isFinite(currentState) && Number.isFinite(previousState) ? Math.abs(currentState - previousState) : 0;
    const persistence = 2 ** (-(usable.length - 1 - index) / halfLife);
    return deepFreeze({ receipt_id: packet.packet_id, source: 'arcsweep-cusp-history', state_change: stateChange, persistence, receipt_confidence: 1, consequence_weight: 1, direction: { order_parameter: Number.isFinite(currentState) && Number.isFinite(previousState) ? currentState - previousState : 0, intention: Number(observation.controls.intention) - Number(previous?.controls?.intention ?? observation.controls.intention), structure: Number(observation.controls.structure) - Number(previous?.controls?.structure ?? observation.controls.structure) } });
  });
}

export async function createBaiTopologyReceipt({ worldId, bone = null, structure = null, structureScale = 2, ashHistory = [], intention, cuspObservation, cuspTrace = null, mathSpinePacket = null, generatedAt } = {}) {
  invariant(typeof worldId === 'string' && worldId.length > 0, 'worldId is required');
  const normalisedBone = normaliseBone(bone, { structure, structureScale });
  const cuspStructure = structure == null ? projectBoneToCuspStructure(normalisedBone, { structureScale }) : finite(structure, 'structure');
  const H = deriveAsh(ashHistory); const I = finite(intention, 'intention');
  const discriminant = calculateBaiBranchDiscriminant({ bone: normalisedBone.value, ash: H.magnitude, intention: I });
  const topology = classifyArcsweepTopology({ cuspObservation, cuspTrace, mathSpinePacket });
  const core = { schema: BAI_TOPOLOGY_RECEIPT_SCHEMA, schema_version: 1, world_id: worldId, bai: { bone: normalisedBone, ash: H, intention: { value: I, source: 'declared-request-control', premaqc_agency: false }, branch_discriminant: discriminant }, model: { cusp_structure: cuspStructure, structure_projection: structure == null ? `a=-${structureScale}*B` : 'explicit-structure', cusp_intention: I }, topology, authority: { observational_model: true, physical_claim: false, branch_discriminant_is_reduced_diagnostic: true, topology_requires_cusp_and_jacobian_evidence: true, intention_is_declared_not_inferred: true, intention_is_premaqc_agency: false, qualia_inferred: false, ash_requires_receipted_history: true, canon_commit: false } };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({ ...core, receipt_id: `arcsweep-bai-${fingerprint.slice(0, 24)}`, receipt_fingerprint: fingerprint, generated_at: generatedAt ?? new Date().toISOString() });
}
