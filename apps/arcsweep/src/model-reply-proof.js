import { HOUSE_CHAT_VOICES } from './house-commons-chat-v5-core.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { appendHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';
import { buildModelReplyRuntimeEvent, persistAndVerifyModelReplyRuntimeEvent } from './house-runtime-receipt-client.js';

export const MODEL_REPLY_PROOF_SCHEMA = 'arcsweep.model-reply-proof/v2';
export const MODEL_REPLY_PROOF_EVENT = 'arcsweep:model-reply-proof';

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const activeSession = async () => readHouseRuntimeToken() || await restoreHouseRuntimeSession();
const PROOF_THREAD_ID = 'model-reply-proof-001';

// Funding state is an operational condition, not a model failure. Keep paid-only
// voices in the roster while allowing the hosted/fallback choir to prove itself.
const DEFERRED_FUNDING_VOICE_IDS = new Set(['boxfire']);
export const voiceProofAvailability = (voice) => DEFERRED_FUNDING_VOICE_IDS.has(voice?.id)
  ? { available: false, status: 'deferred-funding', reason: 'Paid route deferred while provider funding is unavailable.' }
  : { available: true, status: 'available', reason: null };

export function replyIsProven(reply) {
  return reply?.status === 'replied'
    && reply?.runtimeVerified === true
    && Boolean(String(reply?.message || '').trim())
    && Boolean(reply?.provider)
    && Boolean(reply?.model)
    && Boolean(reply?.route);
}

export function buildReplyProofReceipt(voice, reply, { probedAt = new Date().toISOString() } = {}) {
  const proven = replyIsProven(reply);
  return Object.freeze({
    schema: MODEL_REPLY_PROOF_SCHEMA,
    proof_id: `model-proof:${uuid()}`,
    probed_at: probedAt,
    voice_id: voice.id,
    voice_name: voice.name,
    route: reply?.route || voice.route || null,
    status: proven ? 'live-proven' : reply?.status || 'failed',
    proven,
    provider: reply?.provider || null,
    model: reply?.model || null,
    latency_ms: reply?.latencyMs ?? null,
    runtime_verified: reply?.runtimeVerified === true,
    reply_excerpt: proven ? String(reply.message).trim().slice(0, 280) : '',
    reason: proven ? null : reply?.reason || 'No attributable model reply returned.',
    runtime_braid: null,
  });
}

async function receiptRuntimeBraid(proof) {
  if (!proof.proven) return proof;
  try {
    const worldContext = await readActiveRuntimeWorldContext();
    const event = await buildModelReplyRuntimeEvent({
      proof,
      worldContext,
      threadId: PROOF_THREAD_ID,
      turnId: proof.proof_id,
      sourceReceiptIds: [proof.proof_id, worldContext.context_id].filter(Boolean),
      occurredAt: proof.probed_at,
    });
    const persistence = await persistAndVerifyModelReplyRuntimeEvent(event);
    return Object.freeze({
      ...proof,
      runtime_braid: {
        persisted: true,
        readback_verified: persistence.verified === true,
        event_id: event.event_id,
        event_sequence: persistence.readback?.event_sequence ?? null,
        packet_fingerprint: event.packet_fingerprint,
        world_id: event.world_id,
        world_context_id: event.world_context_id,
        thread_id: event.thread_id,
        turn_id: event.turn_id,
      },
    });
  } catch (error) {
    return Object.freeze({
      ...proof,
      runtime_braid: {
        persisted: false,
        readback_verified: false,
        error: error?.message || String(error),
      },
    });
  }
}

export async function proveModelReply(voice, { appendReceipt = true } = {}) {
  const availability = voiceProofAvailability(voice);
  if (!availability.available) {
    const receipt = buildReplyProofReceipt(voice, { status: availability.status, reason: availability.reason });
    document.dispatchEvent(new CustomEvent(MODEL_REPLY_PROOF_EVENT, { detail: receipt }));
    return receipt;
  }

  const session = await activeSession();
  if (!session) return buildReplyProofReceipt(voice, { status: 'house-offline', reason: 'House Runtime session unavailable.' });

  let reply;
  try {
    reply = await invokeConstellationRuntimeVoice({
      voiceId: voice.id,
      message: 'MODEL REPLY PROOF 002. Reply with one short sentence confirming you received this probe.',
      sessionId: `model-reply-proof-${voice.id}-${Date.now()}`,
      metadata: { surface: 'model-reply-proof', proof_schema: MODEL_REPLY_PROOF_SCHEMA, runtime_braid_required: true },
    });
  } catch (error) {
    reply = { status: 'route-error', reason: error?.message || String(error), voiceId: voice.id };
  }

  const proof = buildReplyProofReceipt(voice, reply);
  const receipt = await receiptRuntimeBraid(proof);
  if (appendReceipt) {
    try {
      await appendHouseCommons(session, {
        kind: 'system',
        author: 'Model Reply Proof',
        status: receipt.proven && receipt.runtime_braid?.persisted ? 'live-braid-verified' : receipt.status,
        turn_id: receipt.proof_id,
        thread_id: PROOF_THREAD_ID,
        world: receipt.runtime_braid?.world_id || null,
        runtime: {
          provider: receipt.provider,
          model: receipt.model,
          route: receipt.route,
          latency_ms: receipt.latency_ms,
          braid_event_id: receipt.runtime_braid?.event_id || null,
          braid_event_sequence: receipt.runtime_braid?.event_sequence ?? null,
        },
        text: receipt.proven
          ? `${receipt.voice_name} LIVE PROVEN · ${receipt.provider} · ${receipt.model} · ${receipt.latency_ms ?? '?'} ms · Runtime Braid ${receipt.runtime_braid?.persisted ? `#${receipt.runtime_braid.event_sequence ?? '?'} verified` : 'NOT PERSISTED'} · ${receipt.reply_excerpt}`
          : `${receipt.voice_name} NOT PROVEN · ${receipt.reason}`,
        metadata: receipt,
      });
    } catch {}
  }
  document.dispatchEvent(new CustomEvent(MODEL_REPLY_PROOF_EVENT, { detail: receipt }));
  return receipt;
}

function renderRows(host, receipts = []) {
  host.innerHTML = receipts.map((receipt) => {
    const braidVerified = receipt.proven && receipt.runtime_braid?.persisted && receipt.runtime_braid?.readback_verified;
    const state = braidVerified ? 'live' : receipt.proven ? 'partial' : receipt.status === 'deferred-funding' ? 'deferred' : 'failed';
    const label = braidVerified ? 'LIVE + BRAID VERIFIED' : receipt.proven ? 'LIVE · RECEIPT FAILED' : receipt.status === 'deferred-funding' ? 'DEFERRED' : receipt.status;
    const detail = braidVerified
      ? `${receipt.provider} · ${receipt.model} · ${receipt.latency_ms ?? '?'} ms · event #${receipt.runtime_braid.event_sequence ?? '?'}`
      : receipt.proven
        ? `${receipt.provider} · ${receipt.model} · ${receipt.runtime_braid?.error || 'Runtime receipt did not verify.'}`
        : receipt.reason;
    return `<div class="model-proof-row" data-proof-state="${state}"><strong>${esc(receipt.voice_name)}</strong><span>${esc(label)}</span><small>${esc(detail)}</small></div>`;
  }).join('');
}

export function installModelReplyProof() {
  if (typeof document === 'undefined' || document.getElementById('model-reply-proof')) return;
  const panel = document.createElement('details');
  panel.id = 'model-reply-proof';
  panel.className = 'model-reply-proof';
  panel.innerHTML = `<summary>Model Reply Proof</summary><div class="model-proof-actions"><button type="button" data-proof-ox>Prove Ox Alpha</button><button type="button" class="quiet" data-proof-available>Prove Available Voice</button><button type="button" class="quiet" data-proof-choir>Prove Available Choir</button></div><p class="muted" data-proof-status>LIVE requires an attributable reply. Runtime proof additionally requires durable write + fresh readback. Funding deferrals are not failures.</p><div data-proof-results></div>`;
  document.body.append(panel);

  const style = document.createElement('style');
  style.textContent = `.model-reply-proof{position:fixed;z-index:45;left:1rem;bottom:1rem;width:min(32rem,calc(100vw - 2rem));padding:.65rem .8rem;border:1px solid var(--line-soft);border-radius:.8rem;background:var(--panel);box-shadow:0 .7rem 2rem rgba(0,0,0,.28)}.model-reply-proof summary{cursor:pointer;font-weight:700}.model-proof-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin:.65rem 0}.model-proof-row{display:grid;grid-template-columns:minmax(7rem,.7fr) minmax(8rem,.8fr) minmax(10rem,1.6fr);gap:.5rem;padding:.45rem 0;border-top:1px solid var(--line-soft);align-items:center}.model-proof-row[data-proof-state="live"] span{color:var(--seafoam,#8dd8c0)}.model-proof-row[data-proof-state="partial"] span,.model-proof-row[data-proof-state="failed"] span{color:var(--gold)}.model-proof-row[data-proof-state="deferred"] span{color:var(--muted)}.model-proof-row small{color:var(--muted)}@media(max-width:640px){.model-proof-row{grid-template-columns:1fr}.model-reply-proof{left:.5rem;bottom:.5rem;width:calc(100vw - 1rem)}}`;
  document.head.append(style);

  const results = panel.querySelector('[data-proof-results]');
  const status = panel.querySelector('[data-proof-status]');
  let receipts = [];
  const run = async (voices, deferred = []) => {
    panel.open = true;
    status.textContent = `Probing ${voices.length} available voice${voices.length === 1 ? '' : 's'}…`;
    receipts = deferred.map((voice) => buildReplyProofReceipt(voice, { status: 'deferred-funding', reason: voiceProofAvailability(voice).reason }));
    renderRows(results, receipts);
    for (const voice of voices) {
      const receipt = await proveModelReply(voice);
      receipts.push(receipt);
      renderRows(results, receipts);
    }
    const proven = receipts.filter((item) => item.proven).length;
    const braided = receipts.filter((item) => item.runtime_braid?.persisted && item.runtime_braid?.readback_verified).length;
    const deferredCount = receipts.filter((item) => item.status === 'deferred-funding').length;
    status.textContent = `${proven}/${voices.length} returned attributable replies · ${braided}/${voices.length} durably braided + read back · ${deferredCount} funding-deferred.`;
  };

  const availableVoices = () => HOUSE_CHAT_VOICES.filter((voice) => voiceProofAvailability(voice).available);
  const deferredVoices = () => HOUSE_CHAT_VOICES.filter((voice) => !voiceProofAvailability(voice).available);
  const oxAlpha = () => HOUSE_CHAT_VOICES.find((voice) => voice.id === 'oxalpha');

  panel.querySelector('[data-proof-ox]').addEventListener('click', () => {
    const voice = oxAlpha();
    if (voice) void run([voice]);
  });
  panel.querySelector('[data-proof-available]').addEventListener('click', () => {
    const voice = availableVoices().find((item) => item.id !== 'oxalpha') || availableVoices()[0];
    if (voice) void run([voice], deferredVoices());
  });
  panel.querySelector('[data-proof-choir]').addEventListener('click', () => void run(availableVoices(), deferredVoices()));
}

if (typeof document !== 'undefined') installModelReplyProof();
