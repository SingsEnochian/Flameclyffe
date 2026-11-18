#!/usr/bin/env node
/**
 * Owner-authorised Wayglass Eightfold trial client.
 *
 * Only the existing Supabase authorised-crossing service can queue/review.
 * This module never manufactures a response, mints tokens, changes canon,
 * chooses an owner on behalf of the caller or falls back to another host.
 *
 * Inference is third-party provider activity; both owner JWT and explicit
 * external-provider consent are mandatory before even the readiness probe.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PHASE_NAMES = Object.freeze([
  'Perceive', 'Compress', 'Release', 'Verify',
  'Integrate', 'Choose', 'Return', 'Transcend',
]);
export const PROJECT_REF = 'rufrmjyusalnifpegllj';
export const CROSSING_URL =
  `https://${PROJECT_REF}.supabase.co/functions/v1/wayglass-authorized-crossing`;
const MAX_RECEIPT_BYTES = 200_000;
const MAX_INPUT_BYTES = 65_536;

function requireCondition(condition, message) {
  if (!condition) throw new Error('Wayglass Eightfold: ' + message);
}
function clean(value, length = 120) {
  return typeof value === 'string' && value.trim() &&
    value.length <= length && !/[\x00-\x1f]/.test(value);
}

export function validatePresentation(packet) {
  requireCondition(packet && typeof packet === 'object' && !Array.isArray(packet),
    'presentation object required');
  requireCondition(clean(packet.presentation_id, 160),
    'stable presentation_id required');
  requireCondition(clean(packet.source_ref, 1024), 'source_ref required');
  requireCondition(clean(packet.intent, 1024), 'intent required');
  const phases = packet.presentation?.phases || packet.presentation?.eightfold;
  requireCondition(Array.isArray(phases) && phases.length === PHASE_NAMES.length,
    'exactly eight phases required');
  phases.forEach((phase, index) => {
    requireCondition(phase && phase.index === index + 1 &&
      (phase.name || phase.phase) === PHASE_NAMES[index],
    'phase order/name mismatch at ' + (index + 1));
  });
  const raw = JSON.stringify(packet);
  requireCondition(Buffer.byteLength(raw, 'utf8') <= MAX_INPUT_BYTES,
    'presentation exceeds service request limit');
  return packet;
}

export function approveInvocation({ token, consent }) {
  // A Supabase signed-in user access JWT, not an anon/publishable key.
  requireCondition(typeof token === 'string' && token.split('.').length === 3 &&
    token.length < 12_000 && token.length > 40 &&
    !/\s/.test(token), 'signed-in owner JWT required');
  requireCondition(consent === true, 'explicit external-provider consent required');
  return true;
}

async function receive(fetchImpl, method, token, data = null, receiptId = null) {
  const url = receiptId
    ? CROSSING_URL + '?receipt_id=' + encodeURIComponent(receiptId)
    : CROSSING_URL;
  const response = await fetchImpl(url, {
    method,
    redirect: 'manual',
    headers: {
      authorization: 'Bearer ' + token,
      ...(data === null ? {} : { 'content-type': 'application/json' }),
    },
    ...(data === null ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(method === 'GET' ? 20_000 : 65_000),
  });
  requireCondition(response && typeof response.status === 'number',
    'missing host response');
  // Refuse redirect forwarding, including redirects to a credential-stealing host.
  requireCondition(response.status >= 200 && response.status < 300,
    'authorised crossing refused request (HTTP ' + response.status + ')');
  const raw = await response.text();
  requireCondition(raw.length > 0 && raw.length <= MAX_RECEIPT_BYTES,
    'invalid receipt length');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('Wayglass Eightfold: response was not JSON'); }
  requireCondition(parsed && parsed.schema === 'wayglass.authorized-crossing/v1',
    'unexpected Wayglass service schema');
  return parsed;
}

export async function runEightfoldTrial(packet, {
  token,
  consent = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  validatePresentation(packet);
  approveInvocation({ token, consent });
  requireCondition(typeof fetchImpl === 'function', 'transport unavailable');

  // Never queue a private presentation if the authenticated host is not ready.
  const readiness = await receive(fetchImpl, 'GET', token);
  requireCondition(readiness.ready === true && readiness.owner === true &&
    readiness.model_available === true && readiness.receipt_store === 'configured',
    'owner-authenticated model/store readiness not confirmed');

  const queued = await receive(fetchImpl, 'POST', token, {
    action: 'present',
    presentation_id: packet.presentation_id,
    source_ref: packet.source_ref,
    intent: packet.intent,
    presentation: packet.presentation,
  });
  requireCondition(typeof queued.receipt_id === 'string' &&
    /^[a-zA-Z0-9-]{12,80}$/.test(queued.receipt_id) &&
    (queued.status === 'queued' || queued.status === 'responded'),
    'no attributable queue receipt returned');

  // Replays may return a previously responded receipt; read and inspect it,
  // never re-review or silently replace a stored reply.
  let review = null;
  if (queued.status === 'queued') {
    review = await receive(fetchImpl, 'POST', token, {
      action: 'review',
      receipt_id: queued.receipt_id,
      external_provider_consent: true,
    });
    requireCondition(review.status === 'responded' &&
      review.receipt_id === queued.receipt_id,
      'external model review did not complete for queued receipt');
  }

  // The persisted receipt, not just the immediate HTTP response, is the proof.
  const readback = await receive(fetchImpl, 'GET', token, null, queued.receipt_id);
  const stored = readback.receipt;
  requireCondition(stored?.receipt_id === queued.receipt_id &&
    stored?.presentation_id === packet.presentation_id &&
    stored?.source_ref === packet.source_ref &&
    stored?.status === 'responded',
    'persisted receipt missing, substituted, or incomplete');
  const reply = stored.model_reply;
  const p = packet.presentation;
  const requiredReviewDomain = p?.review_domain === 'narrative-branch' ||
    (p?.review_domain === undefined && p?.schema === 'wayglass.sihrel.divergence-study/v0.1' &&
      p?.study_type === 'counterfactual-narrative-causal-simulation')
    ? 'narrative-branch' : 'engineering';
  requireCondition(reply?.kind === 'attributable-external-model-output' &&
    clean(reply.provider, 80) && clean(reply.model, 200) &&
    typeof reply.text === 'string' && reply.text.trim().length > 0,
    'no attributable persisted external model text');
  requireCondition(reply.review_domain === requiredReviewDomain,
    'returned review domain does not match requested narrative/engineering study');
  if (review?.reply) {
    requireCondition(review.reply.provider === reply.provider &&
      review.reply.model === reply.model &&
      review.reply.review_domain === reply.review_domain &&
      review.reply.text === reply.text,
      'provider output changed between review and persisted readback');
  }
  return {
    schema: 'wayglass.eightfold-live-trial-receipt/v0.1',
    state: 'external-model-response-verified',
    subject: 'Wayglass authorised crossing',
    model_route_is_wayglass_identity: false,
    presentation_id: packet.presentation_id,
    receipt_id: queued.receipt_id,
    provider: reply.provider,
    model: reply.model,
    review_domain: reply.review_domain,
    provider_response_id: reply.provider_response_id || null,
    provider_response_id_available: !!reply.provider_response_id,
    output: reply.text,
    completed_at: reply.completed_at || null,
    attribution: 'owner-authenticated Supabase crossing; persisted external model reply',
    canon_commit: false,
  };
}

async function cli() {
  const inputFile = process.env.WAYGLASS_EIGHTFOLD_INPUT_FILE;
  const receiptFile = process.env.WAYGLASS_EIGHTFOLD_RECEIPT_FILE;
  requireCondition(inputFile && receiptFile, 'private input/receipt file paths required');
  const token = process.env.WAYGLASS_OWNER_ACCESS_TOKEN;
  const consent = process.env.WAYGLASS_EXTERNAL_PROVIDER_CONSENT === 'YES';
  // Do not read/transmit private story content without consent and an owner JWT.
  approveInvocation({ token, consent });
  const packet = JSON.parse(readFileSync(resolve(inputFile), 'utf8'));
  const result = await runEightfoldTrial(packet, { token, consent });
  // Exclusively create a private receipt file; never overwrite a previous run.
  writeFileSync(resolve(receiptFile), JSON.stringify(result, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({
    status: result.state,
    presentation_id: result.presentation_id,
    receipt_id: result.receipt_id,
    provider: result.provider,
    model: result.model,
    provider_response_id_available: result.provider_response_id_available,
    private_receipt_written: true,
    canon_commit: false,
  }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  cli().catch(error => {
    // Never echo a private prompt, bearer, provider response text or stack.
    console.error(JSON.stringify({
      status: 'not-verified',
      error_class: 'wayglass-eightfold-trial-blocked',
      reason: String(error.message || 'unknown').slice(0, 260),
    }));
    process.exitCode = 1;
  });
}
