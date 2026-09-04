import './cosmology-lineage-sidecar.js';
import {
  GEOLOGICAL_ATLAS,
  HUMAN_HISTORY_LATTICE,
  LUNAR_HISTORY,
  SOLAR_SYSTEM_FAMILY,
  geologicalSpanWidth,
  humanHistoryConcurrency,
} from './deep-history-atlas.js';
import { provenanceClass } from './truth-provenance.js';

export const DEEP_HISTORY_ATLAS_SIDECAR_VERSION = 'arcsweep.deep-history-atlas-sidecar/v1';

let installed = false;
let observer = null;
let queued = false;
let activeView = 'geology';
let humanYear = 1200;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function badge(status) {
  const item = provenanceClass(status);
  return `<span class="deep-atlas-badge" title="${esc(item.authority)}">${esc(item.label)}</span>`;
}

function spanRows(items, group) {
  return items.map((item) => {
    const pos = geologicalSpanWidth(item);
    return `<article class="deep-span-row"><div><strong>${esc(item.label)}</strong>${badge(item.provenance)}<p>${esc(item.summary)}</p></div><div class="deep-span-track" aria-label="${esc(item.startMa)} to ${esc(item.endMa)} million years ago"><i style="left:${(pos.left * 100).toFixed(2)}%;width:${(pos.width * 100).toFixed(2)}%"></i></div><small>${esc(item.startMa)}–${esc(item.endMa)} Ma · ${esc(group)}</small></article>`;
  }).join('');
}

function geologyMarkup() {
  return `<div class="deep-atlas-callout">The geological axis is logarithmic so Hadean billions of years and late Quaternary thousands of years can coexist without crushing recent history into a one-pixel apology.</div>${spanRows(GEOLOGICAL_ATLAS.eons, 'eon')}${spanRows(GEOLOGICAL_ATLAS.supercontinents, 'supercontinent')}${spanRows(GEOLOGICAL_ATLAS.massExtinctions, 'mass extinction')}${spanRows(GEOLOGICAL_ATLAS.climateAndAtmosphere, 'climate / atmosphere')}${spanRows(GEOLOGICAL_ATLAS.magnetic, 'magnetic field')}${spanRows(GEOLOGICAL_ATLAS.impacts, 'impact')}`;
}

function solarMarkup() {
  const groups = [
    ['Origin', [SOLAR_SYSTEM_FAMILY.root, SOLAR_SYSTEM_FAMILY.star]],
    ['Terrestrial family', SOLAR_SYSTEM_FAMILY.terrestrial],
    ['Giant planets', SOLAR_SYSTEM_FAMILY.giants],
    ['Dwarf planets', SOLAR_SYSTEM_FAMILY.dwarfPlanets],
    ['Small-body reservoirs', SOLAR_SYSTEM_FAMILY.reservoirs],
  ];
  return `<div class="solar-family-tree">${groups.map(([label, items]) => `<section><h3>${esc(label)}</h3><div class="solar-family-grid">${items.map((item) => `<article><strong>${esc(item.label)}</strong><span>${esc(item.family)}</span>${badge(item.provenance)}<p>${esc(item.notes)}</p><small>formation context ~${esc(item.formedGa)} Ga</small></article>`).join('')}</div></section>`).join('')}</div>`;
}

function lunarMarkup() {
  return `<div class="lunar-history-grid">${LUNAR_HISTORY.phases.map((phase) => `<article><header><strong>${esc(phase.label)}</strong>${badge(phase.provenance)}</header><p>${esc(phase.summary)}</p><small>${esc(phase.startMa)}–${esc(phase.endMa)} Ma</small></article>`).join('')}</div><section class="deep-atlas-open-questions"><h3>Open lunar questions</h3><ul>${LUNAR_HISTORY.openQuestions.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`;
}

function humanMarkup() {
  const active = humanHistoryConcurrency(humanYear);
  return `<div class="human-lattice-control"><label>Inspect a year <input type="range" min="-50000" max="2026" step="25" value="${humanYear}" data-human-year /></label><output data-human-year-output>${humanYear < 0 ? `${Math.abs(humanYear)} BCE` : `${humanYear} CE`}</output></div><div class="human-concurrency"><p class="eyebrow">Concurrent history at selected year</p>${active.length ? active.map((item) => `<article><header><strong>${esc(item.label)}</strong>${badge(item.provenance)}</header><p>${esc(item.summary)}</p><p class="muted">${item.regions.map(esc).join(' · ')}</p></article>`).join('') : '<p class="muted">No broad lattice node covers this exact sample year yet. The gap remains visible rather than being filled by a single civilisational narrative.</p>'}</div><div class="human-lattice-all">${HUMAN_HISTORY_LATTICE.nodes.map((item) => `<article><div><strong>${esc(item.label)}</strong><small>${item.startYear < 0 ? `${Math.abs(item.startYear)} BCE` : item.startYear} → ${item.endYear < 0 ? `${Math.abs(item.endYear)} BCE` : `${item.endYear} CE`}</small></div><p>${esc(item.summary)}</p><span>${item.regions.map(esc).join(' · ')}</span></article>`).join('')}</div>`;
}

function viewMarkup() {
  if (activeView === 'solar') return solarMarkup();
  if (activeView === 'lunar') return lunarMarkup();
  if (activeView === 'human') return humanMarkup();
  return geologyMarkup();
}

function mount() {
  queued = false;
  const truth = document.querySelector('[data-terra-prime-truth-sidecar]');
  if (!truth) return;
  let root = document.querySelector('[data-deep-history-atlas-sidecar]');
  if (!root) {
    root = document.createElement('section');
    root.className = 'panel deep-history-atlas-sidecar';
    root.dataset.deepHistoryAtlasSidecar = DEEP_HISTORY_ATLAS_SIDECAR_VERSION;
    truth.insertAdjacentElement('afterend', root);
  }
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Terra Prime · embodied chronology</p><h2>Deep History Atlas</h2></div><span class="deep-atlas-badge">log-scale aware</span></div><nav class="deep-atlas-tabs" aria-label="Deep history atlas"><button type="button" data-deep-view="geology" class="quiet mini${activeView === 'geology' ? ' active' : ''}">Geology</button><button type="button" data-deep-view="solar" class="quiet mini${activeView === 'solar' ? ' active' : ''}">Solar family</button><button type="button" data-deep-view="lunar" class="quiet mini${activeView === 'lunar' ? ' active' : ''}">Moon</button><button type="button" data-deep-view="human" class="quiet mini${activeView === 'human' ? ' active' : ''}">Human lattice</button></nav><div data-deep-history-view>${viewMarkup()}</div>`;
  root.querySelectorAll('[data-deep-view]').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.deepView; mount(); }));
  const slider = root.querySelector('[data-human-year]');
  slider?.addEventListener('input', () => { humanYear = Number(slider.value); mount(); });
}

function queueMount() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(mount);
}

function styles() {
  if (document.querySelector('[data-deep-history-atlas-style]')) return;
  const style = document.createElement('style');
  style.dataset.deepHistoryAtlasStyle = DEEP_HISTORY_ATLAS_SIDECAR_VERSION;
  style.textContent = `.deep-history-atlas-sidecar{display:grid;gap:1rem}.deep-atlas-tabs{display:flex;gap:.4rem;flex-wrap:wrap}.deep-atlas-tabs .active{outline:1px solid var(--accent)}.deep-atlas-badge{display:inline-flex;border:1px solid var(--line-soft);border-radius:999px;padding:.12rem .42rem;font-size:.68rem}.deep-atlas-callout{padding:.75rem;border-left:2px solid var(--accent);color:var(--muted)}.deep-span-row{display:grid;grid-template-columns:minmax(14rem,1fr) minmax(12rem,1fr) auto;gap:1rem;align-items:center;padding:.75rem 0;border-bottom:1px solid var(--line-soft)}.deep-span-row p{margin:.3rem 0}.deep-span-track{position:relative;height:.55rem;border-radius:999px;background:color-mix(in srgb,var(--text) 8%,transparent);overflow:hidden}.deep-span-track i{position:absolute;top:0;bottom:0;min-width:.2rem;border-radius:999px;background:var(--accent)}.solar-family-tree,.solar-family-tree section,.deep-atlas-open-questions{display:grid;gap:.7rem}.solar-family-grid,.lunar-history-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.65rem}.solar-family-grid article,.lunar-history-grid article,.human-concurrency article,.human-lattice-all article{padding:.75rem;border:1px solid var(--line-soft);border-radius:.8rem}.solar-family-grid article>span{display:block;color:var(--muted);font-size:.78rem}.human-lattice-control{display:flex;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}.human-lattice-control label{display:grid;gap:.35rem;min-width:min(24rem,100%)}.human-lattice-control output{font-weight:700}.human-concurrency,.human-lattice-all{display:grid;gap:.65rem}.human-lattice-all{margin-top:1rem}.human-lattice-all article{display:grid;grid-template-columns:minmax(12rem,.45fr) 1fr;gap:1rem}.human-lattice-all article small,.human-lattice-all article span{display:block;color:var(--muted);font-size:.74rem}@media(max-width:760px){.deep-span-row,.human-lattice-all article{grid-template-columns:1fr}.deep-span-row small{order:2}}`;
  document.head.append(style);
}

export function installDeepHistoryAtlasSidecar() {
  if (installed || typeof document === 'undefined') return false;
  installed = true;
  styles();
  observer = new MutationObserver(queueMount);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
  queueMount();
  return true;
}

if (typeof document !== 'undefined') installDeepHistoryAtlasSidecar();
