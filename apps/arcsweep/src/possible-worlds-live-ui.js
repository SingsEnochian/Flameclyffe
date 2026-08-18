import { compileWorldseedForState } from './worldseed-live-state.js';
import { comparePossibleWorlds } from './possible-worlds.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const ROOT_ID = 'possible-worlds-live';
const desktop = window.arcsweepDesktop ?? window.arcsweep ?? null;
let comparisonTargetId = null;

async function readState() {
  try {
    if (desktop?.loadState) return (await desktop.loadState())?.state || null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function selectedWorldId(state) {
  return document.querySelector('[data-world-id].active')?.dataset.worldId || state?.activeWorldId || state?.worlds?.[0]?.id;
}

function deltaCount(change) {
  return (change?.added?.length || 0) + (change?.removed?.length || 0);
}

function renderComparison(state, leftId, rightId) {
  const left = compileWorldseedForState(state, leftId);
  const right = compileWorldseedForState(state, rightId);
  const comparison = comparePossibleWorlds(left, right);
  const genomeRows = comparison.changedGenomeFields.map((field) => {
    const change = comparison.continuityGenome[field];
    return `<div><b>${esc(field)}</b><span>+${change.added.length} / −${change.removed.length}</span></div>`;
  }).join('') || '<p class="muted">Continuity Genome unchanged.</p>';
  const inheritanceRows = comparison.changedInheritanceAxes.map((axis) => {
    const change = comparison.inheritance[axis];
    return `<div><b>${esc(axis)}</b><span>+${change.added.length} / −${change.removed.length}</span></div>`;
  }).join('') || '<p class="muted">Inheritance unchanged.</p>';
  const sectionRows = Object.entries(comparison.sectionCounts)
    .filter(([, values]) => values.left !== values.right)
    .map(([section, values]) => `<div><b>${esc(section)}</b><span>${values.left} → ${values.right}</span></div>`)
    .join('') || '<p class="muted">Typed organ counts unchanged.</p>';

  return `<div class="worldseed-live-grid">
    <article class="worldseed-live-card"><span class="eyebrow">Genome divergence</span><strong>${comparison.summary.changedGenomeFieldCount}</strong><div class="worldseed-kv">${genomeRows}</div></article>
    <article class="worldseed-live-card"><span class="eyebrow">Inheritance divergence</span><strong>${comparison.summary.changedInheritanceAxisCount}</strong><div class="worldseed-kv">${inheritanceRows}</div></article>
    <article class="worldseed-live-card"><span class="eyebrow">Structural divergence</span><strong>${comparison.summary.sectionCountChanges}</strong><div class="worldseed-kv">${sectionRows}</div></article>
    <article class="worldseed-live-card"><span class="eyebrow">Seed identity</span><strong>${comparison.sameFingerprint ? 'same seed' : 'distinct worlds'}</strong><small><code>${esc(left.fingerprint)}</code><br />↔<br /><code>${esc(right.fingerprint)}</code></small></article>
  </div>`;
}

async function mount() {
  const heading = document.querySelector('main.content h1');
  if (heading?.textContent?.trim() !== 'Worlds') {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  const state = await readState();
  const host = document.getElementById('worldseed-live-instrument');
  if (!host || !state?.worlds?.length) return;
  const leftId = selectedWorldId(state);
  const candidates = state.worlds.filter((world) => world.id !== leftId);
  if (!candidates.length) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  if (!comparisonTargetId || !candidates.some((world) => world.id === comparisonTargetId)) comparisonTargetId = candidates[0].id;
  const left = state.worlds.find((world) => world.id === leftId);
  const options = candidates.map((world) => `<option value="${esc(world.id)}" ${world.id === comparisonTargetId ? 'selected' : ''}>${esc(world.name)}</option>`).join('');
  let body;
  try {
    body = renderComparison(state, leftId, comparisonTargetId);
  } catch (error) {
    body = `<p class="callout">Possible Worlds comparison stopped: ${esc(error.message)}</p>`;
  }
  const markup = `<article id="${ROOT_ID}" class="worldseed-live-card">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Possible Worlds Observatory</p><h3>Compare without overwrite</h3><p class="muted">${esc(left?.name || leftId)} remains intact while another branch is read beside it.</p></div><label>Compare with<select data-possible-world-target>${options}</select></label></div>
    ${body}
  </article>`;
  const current = document.getElementById(ROOT_ID);
  if (current) current.outerHTML = markup;
  else host.insertAdjacentHTML('beforeend', markup);
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-possible-world-target]');
  if (!select) return;
  comparisonTargetId = select.value;
  void mount();
});

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
