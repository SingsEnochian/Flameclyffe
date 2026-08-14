import { loadState } from './storage.js';
import { createRunaTrajectorySuggestion } from './runa-trajectory-suggestion.js';

const STORE_KEY = 'hearthgate.arcsweep.domain-control-bench.v1';
const MAX_SUGGESTIONS = 24;
let mounting = false;
let fallback = { version: 1, advisor_receipts: [], deep_time_records: [], runa_suggestions: [] };

function esc(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function fixed(value, digits = 3) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }
function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1) {
      parsed.advisor_receipts ||= [];
      parsed.deep_time_records ||= [];
      parsed.runa_suggestions ||= [];
      return parsed;
    }
  } catch {}
  return structuredClone(fallback);
}
function writeStore(store) { fallback = structuredClone(store); try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {} }

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  return { world };
}

function suggestionForAdvice(store, advice) {
  return advice ? [...(store.runa_suggestions || [])].reverse().find((item) => item.source?.advisor_receipt_id === advice.receipt_id) || null : null;
}

function signature(store, world) {
  const advice = store.advisor_receipts?.at(-1) || null;
  const suggestion = suggestionForAdvice(store, advice);
  return `${world?.id || 'none'}:${advice?.receipt_id || 'none'}:${suggestion?.suggestion_id || 'none'}:${store.deep_time_records?.length || 0}`;
}

function render(store, world, message = '') {
  const advice = store.advisor_receipts?.at(-1) || null;
  const suggestion = suggestionForAdvice(store, advice);
  const eligible = advice?.recommendation?.status === 'REVIEW_ACCEPTANCE_GATE';
  const key = signature(store, world);
  return `<section class="panel runa-trajectory-gate" data-runa-trajectory-gate data-runa-key="${esc(key)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Time preserves the path · Runa may listen</p><h2>Runa Trajectory Suggestion Gate</h2><p class="muted">DEEPTime may suggest a gradual semantic transition. No DSP parameter, tone, haptic, sensory-bus event, or autoplay action is generated here.</p></div><span class="bai-topology-badge">${eligible ? 'READY' : 'WAITING'}</span></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    ${advice ? `<p>Advisor: <b>${esc(advice.recommendation.status)}</b> · ${esc(advice.receipt_id)}</p><p class="muted">${esc(advice.recommendation.rationale)}</p>` : '<p class="muted">No Theory-Grounded Advisor receipt exists yet.</p>'}
    ${eligible && !suggestion ? `<button type="button" data-runa-action="suggest">Create Runa trajectory suggestion</button>` : ''}
    ${suggestion ? `<article class="runa-suggestion-card"><p class="eyebrow">Suggestion receipt</p><strong>${esc(suggestion.suggestion_id)}</strong><dl class="facts"><div><dt>World</dt><dd>${esc(suggestion.world_id)}</dd></div><div><dt>λ window</dt><dd>${suggestion.trajectory.lambda_start} → ${suggestion.trajectory.lambda_end}</dd></div><div><dt>Movement</dt><dd>${fixed(suggestion.semantic_intent.transition_amount)}</dd></div><div><dt>Envelope</dt><dd>${esc(suggestion.semantic_intent.transition_envelope)}</dd></div><div><dt>DSP assigned</dt><dd>no</dd></div><div><dt>Sensory bus</dt><dd>not published</dd></div></dl><div class="runa-suggestion-actions">${suggestion.subsystem_suggestions.map((item) => `<span>${esc(item.subsystem)} · ${esc(item.action)} · ${fixed(item.semantic_weight)}</span>`).join('')}</div><p class="muted">Human approval remains required before any future Runa renderer turns this semantic packet into sound or haptics.</p></article>` : ''}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#runa-trajectory-gate-style')) return;
  const style = document.createElement('style');
  style.id = 'runa-trajectory-gate-style';
  style.textContent = `.runa-trajectory-gate{margin-top:1rem}.runa-suggestion-card{margin-top:.8rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px}.runa-suggestion-actions{display:grid;gap:.35rem;margin:.6rem 0}.runa-suggestion-actions span{padding:.45rem .6rem;border-radius:8px;background:color-mix(in srgb,var(--panel-solid) 86%,transparent);font-size:.84rem}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) { document.querySelector('[data-runa-trajectory-gate]')?.remove(); return; }
  mounting = true;
  try {
    injectStyle();
    const store = readStore();
    const { world } = await context();
    if (!world) return;
    const existing = document.querySelector('[data-runa-trajectory-gate]');
    const key = signature(store, world);
    if (!message && existing?.dataset.runaKey === key) return;
    if (existing) existing.outerHTML = render(store, world, message);
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', render(store, world, message));
  } finally { mounting = false; }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-runa-action="suggest"]');
  if (!button) return;
  try {
    const store = readStore();
    const advice = store.advisor_receipts?.at(-1) || null;
    if (!advice) throw new Error('No advisor receipt is available.');
    if (suggestionForAdvice(store, advice)) throw new Error('This advisor receipt already has a Runa suggestion.');
    const { world } = await context();
    const records = (store.deep_time_records || []).filter((record) => record.world_id === world.id).sort((a, b) => Number(a.lambda) - Number(b.lambda));
    const suggestion = await createRunaTrajectorySuggestion({ advisorReceipt: advice, deepTimeRecords: records, worldId: world.id });
    store.runa_suggestions = [...(store.runa_suggestions || []), structuredClone(suggestion)].slice(-MAX_SUGGESTIONS);
    writeStore(store);
    await mount(`Runa suggestion receipted as ${suggestion.suggestion_id}. No sound, haptic, or sensory activation was published.`);
  } catch (error) { await mount(`Runa suggestion stopped: ${error.message}`); }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
