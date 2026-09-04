import './deep-history-atlas-sidecar.js';
import { loadState } from './storage.js';
import { TERRA_PRIME_HISTORY_INGEST } from './terra-prime-history-ingest.js';
import { PROVENANCE_CLASSES, logarithmicTimePosition, provenanceClass, worldCompletionReport } from './truth-provenance.js';

export const TERRA_PRIME_TRUTH_SIDECAR_VERSION = 'arcsweep.terra-prime-truth-sidecar/v1';

const SECTIONS = Object.freeze([
  ['cosmologicalHistory', 'Cosmic'],
  ['solarAndPlanetaryHistory', 'Solar · lunar · planetary'],
  ['geologicalHistory', 'Geological'],
  ['biologicalAndHumanHistory', 'Life · human'],
  ['houseWorkHistory', 'House'],
  ['multiverseHistory', 'Multiverse models'],
]);

let selectedSection = 'cosmologicalHistory';
let installed = false;
let observer = null;
let renderQueued = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function yearsAgoFromEra(era = '') {
  const text = String(era).toLowerCase().replaceAll(',', '');
  if (/present|current|2026|21st century/.test(text)) return 0;
  const match = text.match(/(?:~|at least ~|very early solar system, likely ~)?([0-9]+(?:\.[0-9]+)?)\s*(billion|million|thousand)?/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (match[2] === 'billion') return value * 1e9;
  if (match[2] === 'million') return value * 1e6;
  if (match[2] === 'thousand') return value * 1e3;
  if (/years ago/.test(text)) return value;
  return 0;
}

function badge(status) {
  const item = provenanceClass(status);
  return `<span class="truth-badge" data-truth-tone="${esc(item.tone)}" title="Authority: ${esc(item.authority)}">${esc(item.label)}</span>`;
}

function chronology(entries) {
  return entries.map((item) => {
    const years = yearsAgoFromEra(item.era);
    const pos = logarithmicTimePosition(years);
    return `<article class="truth-event"><div class="truth-time"><span>${esc(item.era)}</span><i style="left:${(pos * 100).toFixed(2)}%"></i></div><div><header><strong>${esc(item.title)}</strong>${badge(item.epistemicStatus)}</header><p>${esc(item.summary)}</p></div></article>`;
  }).join('');
}

function completionMarkup(world, state) {
  const report = state.worldCompletionReports?.[world.id] || worldCompletionReport(world);
  const percent = Math.round(report.completionRatio * 100);
  const unknown = report.fields.filter((field) => field.state === 'unknown').slice(0, 12);
  const latestReceipt = [...(state.worldHydrationReceipts || [])].reverse().find((receipt) => receipt.worldId === world.id);
  return `<section class="truth-completion"><div class="truth-meter"><div><span class="eyebrow">World completion</span><strong>${percent}% explicit</strong></div><progress max="100" value="${percent}">${percent}%</progress></div><p class="muted">${report.counts.complete || 0} complete · ${report.counts.unknown || 0} unknown · unknown is evidence, not a blank to hallucinate into.</p>${latestReceipt ? `<details><summary>Latest hydration receipt · +${latestReceipt.summary.added} added · ${latestReceipt.summary.changed} changed · ${latestReceipt.summary.preserved} preserved</summary><div class="truth-receipt"><strong>Added</strong><p>${esc(latestReceipt.added.join(' · ') || 'None')}</p><strong>Changed</strong><p>${esc(latestReceipt.changed.join(' · ') || 'None')}</p></div></details>` : '<p class="muted">No hydration receipt recorded yet.</p>'}${unknown.length ? `<details><summary>Unknown fields</summary><p class="truth-field-list">${unknown.map((field) => `<code>${esc(field.path)}</code>`).join(' ')}</p></details>` : ''}</section>`;
}

async function render() {
  renderQueued = false;
  const form = document.querySelector('#world-registry-form');
  if (!form) return;
  const state = await loadState().catch(() => null);
  const world = state?.worlds?.find((candidate) => candidate.id === state.activeWorldId) || state?.worlds?.[0];
  if (!state || !world) return;
  let root = document.querySelector('[data-terra-prime-truth-sidecar]');
  if (!root) {
    root = document.createElement('section');
    root.className = 'panel terra-prime-truth-sidecar';
    root.dataset.terraPrimeTruthSidecar = TERRA_PRIME_TRUTH_SIDECAR_VERSION;
    form.closest('.panel')?.insertAdjacentElement('afterend', root);
  }
  const section = TERRA_PRIME_HISTORY_INGEST[selectedSection] || [];
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Truth spine · ${esc(world.name)}</p><h2>Completion & deep-time atlas</h2></div><span class="truth-badge" data-truth-tone="boundary">provenance visible</span></div>${completionMarkup(world, state)}<nav class="truth-scale-nav" aria-label="Temporal scale">${SECTIONS.map(([id, label]) => `<button type="button" class="quiet mini${selectedSection === id ? ' active' : ''}" data-truth-section="${id}">${esc(label)}</button>`).join('')}</nav><div class="truth-axis" aria-hidden="true"><span>deep past</span><span>logarithmic time</span><span>present</span></div><div class="truth-events">${chronology(section)}</div><details class="truth-legend"><summary>Provenance legend</summary><div>${Object.entries(PROVENANCE_CLASSES).map(([id]) => badge(id)).join(' ')}</div></details>`;
  root.querySelectorAll('[data-truth-section]').forEach((button) => button.addEventListener('click', () => { selectedSection = button.dataset.truthSection; void render(); }));
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => void render());
}

function installStyles() {
  if (document.querySelector('[data-terra-prime-truth-style]')) return;
  const style = document.createElement('style');
  style.dataset.terraPrimeTruthStyle = TERRA_PRIME_TRUTH_SIDECAR_VERSION;
  style.textContent = `.terra-prime-truth-sidecar{display:grid;gap:1rem}.truth-completion{display:grid;gap:.55rem}.truth-meter{display:grid;grid-template-columns:minmax(0,1fr) minmax(10rem,18rem);gap:1rem;align-items:center}.truth-meter strong{display:block;font-size:1.1rem}.truth-meter progress{width:100%}.truth-scale-nav{display:flex;gap:.4rem;flex-wrap:wrap}.truth-scale-nav button.active{outline:1px solid var(--accent)}.truth-axis,.truth-time{position:relative;display:flex;justify-content:space-between;gap:1rem;font-size:.72rem;color:var(--muted)}.truth-axis{border-bottom:1px solid var(--line-soft);padding-bottom:.3rem}.truth-events{display:grid;gap:.75rem}.truth-event{display:grid;grid-template-columns:minmax(9rem,14rem) minmax(0,1fr);gap:1rem;padding:.7rem 0;border-bottom:1px solid var(--line-soft)}.truth-time{display:block;padding-top:.25rem}.truth-time i{position:absolute;top:1.6rem;width:.55rem;height:.55rem;border-radius:999px;background:currentColor;transform:translateX(-50%)}.truth-event header{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.truth-event p{margin:.35rem 0 0}.truth-badge{display:inline-flex;border:1px solid var(--line-soft);border-radius:999px;padding:.12rem .42rem;font-size:.68rem;letter-spacing:.02em}.truth-badge[data-truth-tone="hypothesis"],.truth-badge[data-truth-tone="boundary"]{border-style:dashed}.truth-badge[data-truth-tone="unknown"]{opacity:.65}.truth-field-list{display:flex;gap:.35rem;flex-wrap:wrap}.truth-receipt{padding:.6rem;border-left:2px solid var(--line-soft)}@media(max-width:760px){.truth-event,.truth-meter{grid-template-columns:1fr}.truth-time i{display:none}}`;
  document.head.append(style);
}

export function installTerraPrimeTruthSidecar() {
  if (installed || typeof document === 'undefined') return false;
  installed = true;
  installStyles();
  observer = new MutationObserver(queueRender);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', (event) => { if (event.target?.closest?.('[data-room="worlds"]')) setTimeout(queueRender, 0); }, true);
  globalThis.addEventListener?.('arcsweep:terra-prime-synchronised', queueRender);
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
  queueRender();
  return true;
}

if (typeof document !== 'undefined') installTerraPrimeTruthSidecar();
