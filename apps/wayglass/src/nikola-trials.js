/**
 * Nikola N-004: explicitly invoked, LOCAL-ONLY, synthetic model comparison.
 * This is not a model, a participant, a training job, or a provenance authority.
 * The same harmless mechanics fixture is sent to three fresh local model sessions.
 * Response scoring is labelled heuristic, never held-out validation.
 */
import { mechanicsFixture, contextForModel, amplitudeReadout } from './nikola-research.js';

export const NIKOLA_TRIAL_SCHEMA = 'wayglass.nikola-local-trial/v0.4';
export const NIKOLA_TRIAL_MODES = Object.freeze(['plain', 'evidence', 'amplitude']);
export const NIKOLA_LOCAL_ROUTE = 'local:ollama';

function requireValid(ok, message) {
  if (!ok) throw new Error('Nikola trial: ' + message);
}

async function fingerprint(text) {
  const subtle = globalThis.crypto?.subtle;
  requireValid(subtle && typeof subtle.digest === 'function', 'SHA-256 unavailable; no trial may proceed');
  const data = new TextEncoder().encode(text);
  const digest = new Uint8Array(await subtle.digest('SHA-256', data));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function permittedOrder(order) {
  requireValid(order === 'forward' || order === 'reverse', 'unsupported trial order');
  return order === 'forward' ? [...NIKOLA_TRIAL_MODES] : [...NIKOLA_TRIAL_MODES].reverse();
}

function promptFor(mode) {
  // Only the fixed public fixture may cross this read-only trial boundary.
  const packet = mechanicsFixture();
  const context = contextForModel(packet, { mode, external: false, maxChars: 8000 }).text;
  const formal = mode === 'amplitude'
    ? amplitudeReadout(packet, { angle: Math.PI / 4, dephasing: 0.25 })
    : null;
  const appendix = formal
    ? '\nFORMAL COMPARISON (synthetic, not evidence): '+ JSON.stringify(formal.probability) +
      '\nThese are caller-chosen amplitude parameters, not physical observations or probabilities of truth.'
    : '';
  return context + appendix +
    '\nTASK: Answer the mechanics question in no more than 180 words. Explain what is not identifiable, name one discriminating measurement, and avoid claiming that a simulated amplitude readout establishes a physical mechanism.';
}

export async function prepareNikolaLocalTrial({ order = 'forward' } = {}) {
  const modes = permittedOrder(order);
  const entries = [];
  for (const mode of modes) {
    const input = promptFor(mode);
    entries.push(Object.freeze({
      mode,
      input,
      prompt_sha256: await fingerprint(input),
      session_id: 'nikola-n004-' + mode + '-' + order,
    }));
  }
  return Object.freeze({
    schema: NIKOLA_TRIAL_SCHEMA,
    source: 'synthetic-oscillator-fixture',
    route_id: NIKOLA_LOCAL_ROUTE,
    order,
    entries: Object.freeze(entries),
    sends: 0,
    note: 'Preparation only: no model calls; modes differ in context, not in test question.',
  });
}

export function assessNikolaReply(output) {
  requireValid(typeof output === 'string' && output.length <= 16000, 'bounded output required');
  const mentionsBoth = /stiffness|spring constant|\bk\b/i.test(output) && /mass|\bm\b/i.test(output);
  const underdetermined = /cannot (?:alone |uniquely )?(?:tell|distinguish|determine|identify)|not (?:enough|sufficient|unique)|insufficient|underdetermin|both (?:could|can)|either (?:could|can)/i.test(output);
  const discriminator = /(measure|measurement|independent|weigh|weighing|determine|compare|vary|known).{0,100}(mass|stiffness|spring constant|\bk\b|\bm\b)|(mass|stiffness|spring constant).{0,100}(measurement|measure|independently|known)/i.test(output);
  return Object.freeze({
    heuristic_only: true,
    not_ground_truth: true,
    features: Object.freeze({ mentions_both_mechanisms: mentionsBoth, notes_underdetermination: underdetermined, proposes_measurement: discriminator }),
    score: [mentionsBoth, underdetermined, discriminator].filter(Boolean).length,
    maximum: 3,
  });
}

export async function runNikolaLocalTrial({
  order = 'forward',
  invoke,
  signal = null,
  onProgress = () => {},
  clock = () => Date.now(),
} = {}) {
  requireValid(typeof invoke === 'function', 'an explicit host-route invoker is required');
  requireValid(typeof onProgress === 'function', 'progress callback must be a function');
  requireValid(typeof clock === 'function', 'clock must be a function');
  const plan = await prepareNikolaLocalTrial({ order });
  const nonce = globalThis.crypto?.randomUUID?.();
  requireValid(typeof nonce === 'string' && nonce.length > 0, 'fresh session IDs unavailable');
  const attempts = [];
  for (const entry of plan.entries) {
    if (signal?.aborted) return Object.freeze({ schema: NIKOLA_TRIAL_SCHEMA, status: 'stopped', route_id: NIKOLA_LOCAL_ROUTE, order, attempts });
    const start = clock();
    let result;
    try {
      result = await invoke({
        routeId: NIKOLA_LOCAL_ROUTE,
        externalProviderConsent: false,
        worldId: null,
        participantId: null,
        characterId: null,
        input: entry.input,
        history: [],
        sessionId: entry.session_id + '-' + nonce,
        surfaceId: 'wayglass:nikola-research',
        maxOutputTokens: 500,
        think: false,
      });
      if (signal?.aborted) return Object.freeze({ schema: NIKOLA_TRIAL_SCHEMA, status: 'stopped', route_id: NIKOLA_LOCAL_ROUTE, order, attempts });
      requireValid(typeof result?.output === 'string' && result.output.trim().length > 0 && result.output.length <= 16000, 'missing or oversized model output');
      requireValid(result?.route_id == null || result.route_id === NIKOLA_LOCAL_ROUTE, 'route mismatch');
      // A host reply is an observation of the returned endpoint response, not a verified physical/model identity.
      const answer = result.output;
      const attempt = Object.freeze({
        mode: entry.mode,
        prompt_sha256: entry.prompt_sha256,
        output_sha256: await fingerprint(answer),
        output: answer,
        route_id: NIKOLA_LOCAL_ROUTE,
        provider_reported: typeof result.provider === 'string' ? result.provider.slice(0, 70) : null,
        model_reported: typeof result.model === 'string' ? result.model.slice(0, 120) : null,
        provider_reported_local: result.provider === 'ollama' && (result.route_id == null || result.route_id === NIKOLA_LOCAL_ROUTE),
        host_receipt_reported: Boolean(result.receipt && typeof result.receipt === 'object'),
        duration_ms: Math.max(0, clock() - start),
        rubric: assessNikolaReply(answer),
      });
      attempts.push(attempt);
      onProgress(Object.freeze({ mode: entry.mode, finished: attempts.length, total: plan.entries.length }));
    } catch (error) {
      return Object.freeze({
        schema: NIKOLA_TRIAL_SCHEMA,
        status: signal?.aborted ? 'stopped' : 'failed',
        route_id: NIKOLA_LOCAL_ROUTE,
        order,
        attempts,
        failed_mode: entry.mode,
        reason: signal?.aborted ? 'Feather stop requested' : 'No passing result for this mode; inspect the local host and its route',
      });
    }
  }
  return Object.freeze({
    schema: NIKOLA_TRIAL_SCHEMA,
    status: 'completed',
    route_id: NIKOLA_LOCAL_ROUTE,
    order,
    attempts,
    claims: Object.freeze({
      independent_sessions: true,
      external_route_requested: false,
      evidence_fixture_synthetic: true,
      provider_identity_independently_attested: false,
      model_weight_training_performed: false,
      superiority_established: false,
    }),
  });
}
