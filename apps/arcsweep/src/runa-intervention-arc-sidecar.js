import { loadState } from './storage.js';
import { deriveRunaInterventionArc } from './runa-intervention-arc.js';

let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function stageMarkup(stage) {
  const receipt = stage.receipt_id ? `<small>${esc(stage.receipt_id)}</small>` : '<small>no receipt yet</small>';
  return `<article class="runa-arc-stage" data-stage-status="${esc(stage.status)}"><span>${esc(stage.status)}</span><strong>${esc(stage.label)}</strong>${receipt}</article>`;
}

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  if (!world) return null;
  const arc = deriveRunaInterventionArc({
    worldId: world.id,
    observatory: state.observatory || {},
    feedbackCycles: state.feedbackCycles || [],
    feedbackQueue: state.feedbackQueue || null,
  });
  return { world, arc };
}

function render(c) {
  return `<section class="panel runa-intervention-arc" data-runa-intervention-arc><div class="section-heading compact-heading"><div><p class="eyebrow">The circle, not just the arrow</p><h2>Runa Intervention Arc</h2><p class="muted">Follow one reviewed sound intervention from semantic suggestion to preview, observation, accepted time, and eventual Ash eligibility.</p></div><span class="bai-topology-badge">${esc(c.arc.state)}</span></div><div class="runa-arc-rail">${c.arc.stages.map(stageMarkup).join('')}</div><p class="callout"><b>Next:</b> ${esc(c.arc.next_action)}</p><p class="muted">This is a derived receipt view. Completed stages do not assert that the preview caused the later observation.</p></section>`;
}

function injectStyle() {
  if (document.querySelector('#runa-intervention-arc-style')) return;
  const style = document.createElement('style');
  style.id = 'runa-intervention-arc-style';
  style.textContent = `.runa-intervention-arc{margin-top:1rem}.runa-arc-rail{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem;margin:.75rem 0}.runa-arc-stage{min-width:0;padding:.65rem .7rem;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);border-radius:10px;display:flex;flex-direction:column;gap:.18rem}.runa-arc-stage>span{font-size:.64rem;text-transform:uppercase;letter-spacing:.07em;opacity:.7}.runa-arc-stage small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.65}.runa-arc-stage[data-stage-status="complete"],.runa-arc-stage[data-stage-status="accepted"],.runa-arc-stage[data-stage-status="ready"]{border-color:color-mix(in srgb,var(--gold) 44%,transparent)}.runa-arc-stage[data-stage-status="rejected"],.runa-arc-stage[data-stage-status="discarded"]{opacity:.65}@media(max-width:900px){.runa-arc-rail{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  document.head.appendChild(style);
}

async function mount() {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-runa-intervention-arc]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const c = await context();
    if (!c) return;
    const existing = document.querySelector('[data-runa-intervention-arc]');
    const html = render(c);
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

globalThis.addEventListener?.('arcsweep:receipts-updated', () => { void mount(); });
const observer = new MutationObserver(() => { if (!document.querySelector('[data-runa-intervention-arc]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
