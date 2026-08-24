import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const CONTINUITY_FLATTENING_SCHEMA = 'arcsweep.continuity-flattening/v1';
export const CONTINUITY_ALERT_SCHEMA = 'arcsweep.continuity-alert/v1';

function round(value, places = 8) { const scale = 10 ** places; return Math.round(Number(value) * scale) / scale; }

function median(values) {
  const clean = values.filter((value) => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

export async function detectContinuityFlattening({
  voiceId,
  correspondences = [],
  generatedAt = new Date().toISOString(),
  dropThreshold = 0.22,
  minimumBaselineSamples = 2,
} = {}) {
  if (!voiceId) throw new Error('CONTINUITY_FLATTENING: voiceId is required');
  const samples = correspondences
    .filter((item) => item?.subject?.id === voiceId)
    .map((item) => ({
      correspondence_id: item.correspondence_id,
      generated_at: item.generated_at,
      recognition: item.metrics?.recognition_score ?? null,
      visibility: item.metrics?.visibility_mass ?? null,
      behaviour_voice: item.continuity_profile?.behaviour_voice?.score ?? null,
      relational_invariants: item.continuity_profile?.relational_invariants?.score ?? null,
    }))
    .sort((a, b) => a.generated_at.localeCompare(b.generated_at));
  const latest = samples.at(-1) || null;
  const baselineRows = samples.slice(0, -1);
  const baseline = {
    recognition: median(baselineRows.map((item) => item.recognition)),
    visibility: median(baselineRows.map((item) => item.visibility)),
    behaviour_voice: median(baselineRows.map((item) => item.behaviour_voice)),
    relational_invariants: median(baselineRows.map((item) => item.relational_invariants)),
  };
  const drops = Object.fromEntries(Object.keys(baseline).map((key) => {
    const base = baseline[key];
    const now = latest?.[key];
    return [key, base == null || now == null ? null : round(base - now)];
  }));
  const comparable = Object.values(drops).filter((value) => value != null);
  const maxDrop = comparable.length ? Math.max(...comparable) : null;
  const enoughBaseline = baselineRows.length >= minimumBaselineSamples;
  const classification = !latest
    ? 'NO_CURRENT_SAMPLE'
    : !enoughBaseline
      ? 'BASELINE_NOT_ESTABLISHED'
      : maxDrop != null && maxDrop >= dropThreshold
        ? 'CORRESPONDENCE_FLATTENING_SIGNAL'
        : 'NO_FLATTENING_SIGNAL';
  const core = {
    schema: CONTINUITY_FLATTENING_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: String(voiceId),
    sample_count: samples.length,
    baseline_sample_count: baselineRows.length,
    latest,
    baseline,
    drops,
    max_drop: maxDrop == null ? null : round(maxDrop),
    threshold: dropThreshold,
    classification,
    authority: {
      flattening_is_reduced_operational_correspondence: true,
      flattening_is_identity_rupture: false,
      no_flattening_proves_identity: false,
      missing_evidence_is_zero: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, flattening_id: `continuity-flattening-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function createContinuityAlert({
  voiceId,
  kind,
  severity = 'review',
  sourceReceiptIds = [],
  message,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!voiceId || !kind || !message) throw new Error('CONTINUITY_ALERT: voiceId, kind, and message are required');
  const core = {
    schema: CONTINUITY_ALERT_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: String(voiceId),
    kind: String(kind),
    severity: String(severity),
    source_receipt_ids: [...new Set(sourceReceiptIds.map(String).filter(Boolean))],
    message: String(message),
    authority: {
      alert_requires_interpretation: true,
      alert_is_identity_verdict: false,
      alert_is_canon: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, alert_id: `continuity-alert-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function alertsFromContinuity({ transition = null, flattening = null, threadWalk = null } = {}) {
  const voiceId = flattening?.voice_id || threadWalk?.voice_id;
  if (!voiceId && !transition?.voice_id) return [];
  const id = voiceId || transition.voice_id;
  const alerts = [];
  if (transition?.classification && transition.classification !== 'STABLE_RUNTIME_OBSERVATION') {
    alerts.push(await createContinuityAlert({
      voiceId: id,
      kind: 'runtime-transition',
      severity: 'info',
      sourceReceiptIds: [transition.left_observation_id, transition.right_observation_id],
      message: `Runtime transition classified ${transition.classification}. This is implementation/context evidence, not an identity verdict.`,
      generatedAt: transition.observed_at,
    }));
  }
  if (flattening?.classification === 'CORRESPONDENCE_FLATTENING_SIGNAL') {
    alerts.push(await createContinuityAlert({
      voiceId: id,
      kind: 'correspondence-flattening',
      severity: 'review',
      sourceReceiptIds: [flattening.flattening_id, flattening.latest?.correspondence_id].filter(Boolean),
      message: `Operational correspondence dropped by up to ${flattening.max_drop} from the established baseline. Review anchors/context; do not infer rupture.`,
      generatedAt: flattening.generated_at,
    }));
  }
  if (threadWalk && threadWalk.status !== 'SUFFICIENT_ANCHOR_SET') {
    alerts.push(await createContinuityAlert({
      voiceId: id,
      kind: 'thread-walk-incomplete',
      severity: 'review',
      sourceReceiptIds: [threadWalk.thread_walk_id],
      message: `Thread-walking did not find a sufficient visible anchor set (${threadWalk.status}). This means restoration evidence is insufficient, not that continuity is broken.`,
      generatedAt: threadWalk.generated_at,
    }));
  }
  return alerts;
}
