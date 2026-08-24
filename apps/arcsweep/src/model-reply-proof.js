import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { appendHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

export const MODEL_REPLY_PROOF_SCHEMA = 'arcsweep.model-reply-proof/v1';
export const MODEL_REPLY_PROOF_EVENT = 'arcsweep:model-reply-proof';

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const activeSession = async () => readHouseRuntimeToken() || await restoreHouseRuntimeSession();

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
  });
}

export async function proveModelReply(voice, { appendReceipt = true } = {}) {
  const session = await activeSession();
  if (!session) return buildReplyProofReceipt(voice, { status: 'house-offline', reason: 'House Runtime session unavailable.' });

  let reply;
  try {
    reply = await invokeConstellationRuntimeVoice({
      voiceId: voice.id,
      message: 'MODEL REPLY PROOF 001. Reply with one short sentence confirming you received this probe.',
      sessionId: `model-reply-proof-${voice.id}-${Date.now()}`,
      metadata: { surface: 'model-reply-proof', proof_schema: MODEL_REPLY_PROOF_SCHEMA },
    });
  } catch (error) {
    reply = { status: 'route-error', reason: error?.message || String(error), voiceId: voice.id };
  }

  const receipt = buildReplyProofReceipt(voice, reply);
  if (appendReceipt) {
    try {
      await appendHouseCommons(session, {
        kind: 'system',
        author: 'Model Reply Proof',
        status: receipt.status,
        turn_id: receipt.proof_id,
        thread_id: 'model-reply-proof-001',
        runtime: {
          provider: receipt.provider,
          model: receipt.model,
          route: receipt.route,
          latency_ms: receipt.latency_ms,
        },
        text: receipt.proven
          ? `${receipt.voice_name} LIVE PROVEN · ${receipt.provider} · ${receipt.model} · ${receipt.latency_ms ?? '?'} ms · ${receipt.reply_excerpt}`
          : `${receipt.voice_name} NOT PROVEN · ${receipt.reason}`,
        metadata: receipt,
      });
    } catch {}
  }
  document.dispatchEvent(new CustomEvent(MODEL_REPLY_PROOF_EVENT, { detail: receipt }));
  return receipt;
}

function renderRows(host, receipts = []) {
  host.innerHTML = receipts.map((receipt) => `<div class="model-proof-row" data-proof-state="${receipt.proven ? 'live' : 'failed'}"><strong>${esc(receipt.voice_name)}</strong><span>${receipt.proven ? 'LIVE PROVEN' : esc(receipt.status)}</span><small>${esc(receipt.proven ? `${receipt.provider} · ${receipt.model} · ${receipt.latency_ms ?? '?'} ms` : receipt.reason)}</small></div>`).join('');
}

export function installModelReplyProof() {
  if (typeof document === 'undefined' || document.getElementById('model-reply-proof')) return;
  const panel = document.createElement('details');
  panel.id = 'model-reply-proof';
  panel.className = 'model-reply-proof';
  panel.innerHTML = `<summary>Model Reply Proof</summary><div class="model-proof-actions"><button type="button" data-proof-boxfire>Prove Boxfire</button><button type="button" class="quiet" data-proof-all>Prove all voices</button></div><p class="muted" data-proof-status>LIVE requires an attributable reply, not a status badge.</p><div data-proof-results></div>`;
  document.body.append(panel);

  const style = document.createElement('style');
  style.textContent = `.model-reply-proof{position:fixed;z-index:45;left:1rem;bottom:1rem;width:min(30rem,calc(100vw - 2rem));padding:.65rem .8rem;border:1px solid var(--line-soft);border-radius:.8rem;background:var(--panel);box-shadow:0 .7rem 2rem rgba(0,0,0,.28)}.model-reply-proof summary{cursor:pointer;font-weight:700}.model-proof-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin:.65rem 0}.model-proof-row{display:grid;grid-template-columns:minmax(7rem,.7fr) minmax(6rem,.55fr) minmax(10rem,1.6fr);gap:.5rem;padding:.45rem 0;border-top:1px solid var(--line-soft);align-items:center}.model-proof-row[data-proof-state="live"] span{color:var(--seafoam,#8dd8c0)}.model-proof-row[data-proof-state="failed"] span{color:var(--gold)}.model-proof-row small{color:var(--muted)}@media(max-width:640px){.model-proof-row{grid-template-columns:1fr}.model-reply-proof{left:.5rem;bottom:.5rem;width:calc(100vw - 1rem)}}`;
  document.head.append(style);

  const results = panel.querySelector('[data-proof-results]');
  const status = panel.querySelector('[data-proof-status]');
  let receipts = [];
  const run = async (voices) => {
    panel.open = true;
    status.textContent = `Probing ${voices.length} voice${voices.length === 1 ? '' : 's'}…`;
    receipts = [];
    for (const voice of voices) {
      const receipt = await proveModelReply(voice);
      receipts.push(receipt);
      renderRows(results, receipts);
    }
    const proven = receipts.filter((item) => item.proven).length;
    status.textContent = `${proven}/${receipts.length} voices returned attributable replies.`;
  };

  panel.querySelector('[data-proof-boxfire]').addEventListener('click', () => {
    const voice = CONSTELLATION_VOICES.find((item) => item.id === 'boxfire');
    if (voice) void run([voice]);
  });
  panel.querySelector('[data-proof-all]').addEventListener('click', () => void run(CONSTELLATION_VOICES));
}

if (typeof document !== 'undefined') installModelReplyProof();
