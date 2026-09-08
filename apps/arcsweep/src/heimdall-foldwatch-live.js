import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { createFoldTelemetry, HEIMDALL_FOLDWATCH_SCHEMA } from './heimdall-foldwatch.js';

export const HEIMDALL_LIVE_ADAPTER_SCHEMA = 'arcsweep.heimdall-live-premaqc/v1';
export const HEIMDALL_SWARM_RUN_SCHEMA = 'arcsweep.heimdall-role-swarm/v1';
export const PREMAQC_DYNAMIC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A']);

export const HEIMDALL_ROLE_SWARM = Object.freeze([
  Object.freeze({ role: 'geometry', voice_id: 'yggdrasil', instruction: 'Read only the measured differential geometry. Examine singular spectrum, soft direction, rank-loss, conditioning, persistence, and curvature. State what is measured, what is inferred, and what remains unavailable.' }),
  Object.freeze({ role: 'continuation', voice_id: 'atlas', instruction: 'Treat fold and Crossing as distinct. Examine whether the available temporal sequence supports approach, fold, branch continuation, release, or hysteresis. Require continuation evidence before naming Crossing.' }),
  Object.freeze({ role: 'provenance', voice_id: 'boxfire', instruction: 'Audit source authority and lineage. Separate direct broker data, derived Jacobian estimates, telemetry classification, model interpretation, and unknowns. Flag any accidental inference of Qualia or relational participation.' }),
]);

export const HEIMDALL_SYNTHESIS_ROLE = Object.freeze({
  role: 'synthesis',
  voice_id: 'runeweaver',
  instruction: 'Synthesize the specialist reports without erasing disagreement. Preserve measurement, derivation, interpretation, and unknown as separate layers. Recommend the smallest next instrument action that would increase information.'
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function numeric(value) {
  if (value && typeof value === 'object' && Number.isFinite(Number(value.value))) return Number(value.value);
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function valueAt(container, axis) {
  if (!container || typeof container !== 'object') return null;
  return numeric(container[axis] ?? container[axis.toLowerCase()]);
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === 'object') || null;
}

export function extractPremaqcState(snapshot) {
  const observation = snapshot?.observation || snapshot?.snapshot?.observation || snapshot || {};
  const premaqc = firstObject(
    observation.premaqc,
    observation.premaq,
    observation.premaqc_state,
    observation.coordinates,
    observation.premaqc_coordinates,
    snapshot?.premaqc,
  ) || {};
  const state = firstObject(premaqc.state, premaqc.coordinates, premaqc) || {};
  const values = Object.fromEntries(PREMAQC_DYNAMIC_AXES.map((axis) => [axis, valueAt(state, axis)]));
  const complete = PREMAQC_DYNAMIC_AXES.every((axis) => Number.isFinite(values[axis]));
  const qContainer = premaqc.qualia || state.Q || state.q || null;
  return Object.freeze({
    axes: PREMAQC_DYNAMIC_AXES,
    values: Object.freeze(values),
    vector: Object.freeze(PREMAQC_DYNAMIC_AXES.map((axis) => values[axis])),
    complete,
    qualia_present: Boolean(qContainer?.present === true),
    qualia_inferred: Boolean(qContainer?.inferred === true),
    observed_at: observation.observed_at || observation.timestamp || snapshot?.observed_at || snapshot?.created_at || null,
    world_id: observation.world_id || snapshot?.world_id || snapshot?.world?.id || null,
    receipt_id: observation.receipt_id || snapshot?.latest_receipt?.receipt_id || snapshot?.latest_receipt?.id || snapshot?.provenance?.cycle_id || null,
  });
}

function matrixTranspose(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function matrixMultiply(a, b) {
  const bt = matrixTranspose(b);
  return a.map((row) => bt.map((column) => row.reduce((sum, value, index) => sum + value * column[index], 0)));
}

function identity(n) {
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0));
}

export function invertMatrix(matrix, epsilon = 1e-12) {
  const n = matrix.length;
  if (!n || matrix.some((row) => row.length !== n)) throw new Error('HEIMDALL_LIVE: matrix must be square');
  const augmented = matrix.map((row, r) => [...row.map(Number), ...identity(n)[r]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) <= epsilon) throw new Error('HEIMDALL_LIVE: matrix is singular');
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const scale = augmented[column][column];
    augmented[column] = augmented[column].map((value) => value / scale);
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map((row) => row.slice(n));
}

function secondsBetween(a, b, fallback = 1) {
  const ta = Date.parse(a || '');
  const tb = Date.parse(b || '');
  if (!Number.isFinite(ta) || !Number.isFinite(tb) || tb <= ta) return fallback;
  return Math.max(1e-3, (tb - ta) / 1000);
}

export function estimateFlowJacobian(samples, { ridge = 1e-4 } = {}) {
  const usable = (samples || []).map((sample) => sample?.vector ? sample : extractPremaqcState(sample)).filter((sample) => sample.complete);
  const n = PREMAQC_DYNAMIC_AXES.length;
  if (usable.length < n + 2) return null;
  const points = usable.slice(-(Math.max(n + 2, Math.min(24, usable.length))));
  const centers = Array(n).fill(0);
  points.forEach((point) => point.vector.forEach((value, index) => { centers[index] += value / points.length; }));
  const xColumns = [];
  const yColumns = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const dt = secondsBetween(current.observed_at, next.observed_at, 1);
    xColumns.push(current.vector.map((value, axis) => value - centers[axis]));
    yColumns.push(next.vector.map((value, axis) => (value - current.vector[axis]) / dt));
  }
  const X = matrixTranspose(xColumns);
  const Y = matrixTranspose(yColumns);
  const Xt = matrixTranspose(X);
  const gram = matrixMultiply(X, Xt);
  const regularized = gram.map((row, r) => row.map((value, c) => value + (r === c ? ridge : 0)));
  const inverse = invertMatrix(regularized);
  return matrixMultiply(matrixMultiply(Y, Xt), inverse);
}

export function directJacobianFromSnapshot(snapshot) {
  const observation = snapshot?.observation || snapshot || {};
  const candidates = [
    observation.jacobian,
    observation.math_spine?.jacobian,
    observation.math_spine_packet?.input?.jacobian,
    observation.math_spine_packet?.jacobian,
    snapshot?.jacobian,
  ];
  return candidates.find((matrix) => Array.isArray(matrix) && matrix.length && matrix.every((row) => Array.isArray(row) && row.length === matrix[0].length && row.every(Number.isFinite))) || null;
}

export function buildLiveFoldTelemetry({ snapshot, snapshots = [], history = [], previousState = 'CLEAR' } = {}) {
  const current = extractPremaqcState(snapshot);
  if (!current.complete) throw new Error('Live observation does not contain complete dynamic PREMAQC coordinates P,C,R,E,M,A.');
  const direct = directJacobianFromSnapshot(snapshot);
  const empirical = direct ? null : estimateFlowJacobian([...snapshots.map(extractPremaqcState), current]);
  const jacobian = direct || empirical;
  if (!jacobian) return Object.freeze({
    schema: HEIMDALL_LIVE_ADAPTER_SCHEMA,
    status: 'collecting',
    required_samples: PREMAQC_DYNAMIC_AXES.length + 2,
    available_samples: snapshots.map(extractPremaqcState).filter((item) => item.complete).length + 1,
    premaqc: current,
    authority: Object.freeze({ jacobian: 'unavailable', qualia: 'firsthand-only', relational_participation: 'unavailable-without-U-coordinate' }),
  });
  const telemetry = createFoldTelemetry({
    t: Number.isFinite(Date.parse(current.observed_at || '')) ? Date.parse(current.observed_at) / 1000 : Date.now() / 1000,
    jacobian,
    history,
    previousState,
    relationalIndices: [],
    branchId: null,
    previousBranchId: history[history.length - 1]?.branch_id ?? null,
  });
  return Object.freeze({
    schema: HEIMDALL_LIVE_ADAPTER_SCHEMA,
    status: 'ready',
    source: direct ? 'broker-jacobian' : 'empirical-local-flow-jacobian',
    premaqc: current,
    telemetry,
    jacobian: clone(jacobian),
    authority: Object.freeze({
      broker_snapshot: true,
      jacobian: direct ? 'source-carried' : 'derived-from-observation-sequence',
      qualia: 'firsthand-only-not-used-in-jacobian-fit',
      relational_participation: 'unavailable-without-U-coordinate',
      crossing_claim: 'requires-continuation-evidence',
    }),
  });
}

async function runtimeToken(fetchImpl = fetch) {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession(fetchImpl);
}

function authHeaders(token) {
  return token && token !== 'cookie-session' ? { authorization: `Bearer ${token}` } : {};
}

export async function readLiveObservationSnapshots({ worldId = null, limit = 16, token = null, fetchImpl = fetch } = {}) {
  const activeToken = token || await runtimeToken(fetchImpl);
  if (!activeToken) throw new Error('House Runtime offline. Connect once in Settings.');
  const params = new URLSearchParams();
  if (worldId) params.set('world_id', worldId);
  params.set('limit', String(Math.max(1, Math.min(32, Number(limit) || 16))));
  const response = await fetchImpl(`/api/v1/house/observations?${params}`, { credentials: 'same-origin', cache: 'no-store', headers: authHeaders(activeToken) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Observation live read returned ${response.status}.`);
  const snapshots = data.snapshots || data.observations || data.items || data.results || data.data || [];
  return Object.freeze({ token: activeToken, envelope: data, snapshots: Object.freeze(Array.isArray(snapshots) ? snapshots : [snapshots].filter(Boolean)) });
}

function voiceById(id) {
  return CONSTELLATION_VOICES.find((voice) => voice.id === id) || null;
}

function compactTelemetry(live) {
  const telemetry = live?.telemetry || live;
  if (telemetry?.schema !== HEIMDALL_FOLDWATCH_SCHEMA) return telemetry;
  return {
    state: telemetry.state,
    fold_score: telemetry.fold_score,
    sigma_min: telemetry.sigma_min,
    sigma_max: telemetry.sigma_max,
    singular_values: telemetry.singular_values,
    condition_number: telemetry.condition_number,
    soft_direction: telemetry.soft_direction,
    rank_loss_score: telemetry.rank_loss_score,
    softening_score: telemetry.softening_score,
    soft_persistence: telemetry.soft_persistence,
    curvature: telemetry.curvature,
    relational_participation: telemetry.relational_participation,
    relational_participation_status: telemetry.relational_participation_status,
  };
}

async function invokeRole({ role, live, snapshot, token, fetchImpl = fetch, context = '' }) {
  const voice = voiceById(role.voice_id);
  if (!voice) throw new Error(`Unknown Foldwatch swarm voice: ${role.voice_id}`);
  const payload = {
    telemetry: compactTelemetry(live),
    source: live?.source || 'synthetic/provided',
    authority: live?.authority || null,
    premaqc: live?.premaqc || null,
    provenance: snapshot?.provenance || null,
    continuity: snapshot?.continuity || null,
  };
  const message = `HEIMDALL FOLDWATCH ROLE: ${role.role.toUpperCase()}\n\n${role.instruction}\n\nPacket:\n${JSON.stringify(payload, null, 2)}${context ? `\n\nPrior specialist reports:\n${context}` : ''}\n\nReturn a concise visible report with: FINDINGS, EVIDENCE, UNKNOWNS, NEXT TEST. Do not invent missing measurements.`;
  const response = await fetchImpl(`/api/v1/flames/${voice.route}/chat`, {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ message, session_id: `heimdall-foldwatch-${Date.now()}`, context: [] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${voice.name} route failed.`);
  return Object.freeze({ role: role.role, voice_id: voice.id, name: voice.name, provider: data.provider || null, model: data.model || voice.model, status: 'replied', text: String(data.message || '').trim() });
}

export async function runFoldwatchRoleSwarm({ live, snapshot = null, token = null, fetchImpl = fetch } = {}) {
  if (!live || (live.status && live.status !== 'ready')) throw new Error('Foldwatch swarm requires ready telemetry.');
  const activeToken = token || await runtimeToken(fetchImpl);
  if (!activeToken) throw new Error('House Runtime offline. Connect once in Settings.');
  const settled = await Promise.allSettled(HEIMDALL_ROLE_SWARM.map((role) => invokeRole({ role, live, snapshot, token: activeToken, fetchImpl })));
  const specialists = settled.map((result, index) => result.status === 'fulfilled' ? result.value : Object.freeze({
    role: HEIMDALL_ROLE_SWARM[index].role,
    voice_id: HEIMDALL_ROLE_SWARM[index].voice_id,
    name: voiceById(HEIMDALL_ROLE_SWARM[index].voice_id)?.name || HEIMDALL_ROLE_SWARM[index].voice_id,
    status: 'error', text: '', error: result.reason?.message || 'Role failed.',
  }));
  const context = specialists.map((item) => `[${item.role.toUpperCase()} · ${item.name} · ${item.status}]\n${item.text || item.error || ''}`).join('\n\n');
  let synthesis;
  try {
    synthesis = await invokeRole({ role: HEIMDALL_SYNTHESIS_ROLE, live, snapshot, token: activeToken, fetchImpl, context });
  } catch (error) {
    synthesis = Object.freeze({ role: 'synthesis', voice_id: HEIMDALL_SYNTHESIS_ROLE.voice_id, name: voiceById(HEIMDALL_SYNTHESIS_ROLE.voice_id)?.name || HEIMDALL_SYNTHESIS_ROLE.voice_id, status: 'error', text: '', error: error.message });
  }
  return Object.freeze({
    schema: HEIMDALL_SWARM_RUN_SCHEMA,
    generated_at: new Date().toISOString(),
    specialists: Object.freeze(specialists),
    synthesis,
    authority: Object.freeze({ model_reports_are_interpretation: true, telemetry_remains_source_or_derived_as_labelled: true, disagreement_preserved: true, canon_commit: false }),
  });
}
