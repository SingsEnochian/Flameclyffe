import {
  compileWorldseedForState,
  forkWorldInState,
  receiptWorldseedReplay,
  worldseedLiveSnapshot,
} from './worldseed-live-state.js';
import { buildWorldseedArkManifest } from './worldseed-ark.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const ROOT_ID = 'worldseed-live-instrument';
const STYLE_ID = 'worldseed-live-style';
const desktop = window.arcsweepDesktop ?? window.arcsweep ?? null;

async function readState() {
  try {
    if (desktop?.loadState) {
      const result = await desktop.loadState();
      return result?.state || null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeState(state, reason = 'worldseed-live-state') {
  const now = new Date().toISOString();
  state.version = state.version || '0.3.0';
  state.provenance = {
    ...(state.provenance || {}),
    updatedAt: now,
    storage: desktop?.saveState ? 'desktop-local-store' : 'browser-development-fallback',
  };
  if (desktop?.saveState) return desktop.saveState(state, { reason });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return { ok: true, mode: 'browser-development-fallback' };
}

function activeWorldId(state) {
  return state?.activeWorldId || state?.worlds?.[0]?.id || null;
}

function selectedWorldId(state) {
  const selected = document.querySelector('[data-world-id].active')?.dataset.worldId;
  return selected || activeWorldId(state);
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'world';
}

function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function notice(message) {
  const status = document.querySelector('.notice');
  if (status) status.textContent = message;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .worldseed-live { margin: 1rem 0; display:grid; gap:1rem; }
    .worldseed-live-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.75rem; }
    .worldseed-live-card { border:1px solid color-mix(in srgb,var(--gold) 34%,transparent); border-radius:12px; padding:.85rem; background:color-mix(in srgb,var(--panel-solid) 88%,transparent); }
    .worldseed-live-card strong { display:block; font-size:1.05rem; }
    .worldseed-live-card small { display:block; opacity:.72; margin-top:.25rem; }
    .worldseed-live code { overflow-wrap:anywhere; }
    .worldseed-lineage-row { display:flex; gap:.45rem; align-items:center; flex-wrap:wrap; }
    .worldseed-lineage-node { border:1px solid color-mix(in srgb,var(--green) 42%,transparent); border-radius:999px; padding:.3rem .65rem; }
    .worldseed-fork-form { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:.65rem; align-items:end; }
    .worldseed-fork-form label { display:grid; gap:.25rem; }
    .worldseed-fork-form .wide { grid-column:1/-1; }
    .worldseed-kv { display:grid; gap:.3rem; }
    .worldseed-kv div { display:flex; justify-content:space-between; gap:1rem; border-bottom:1px solid rgba(255,255,255,.07); padding:.28rem 0; }
  `;
  document.head.appendChild(style);
}

function seedhouseMarkup(state, worldId) {
  const snapshot = worldseedLiveSnapshot(state, worldId);
  const seed = snapshot.seed;
  const world = state.worlds.find((item) => item.id === worldId);
  const sectionCounts = Object.entries(snapshot.sectionCounts)
    .filter(([, count]) => count)
    .map(([key, count]) => `<div><span>${esc(key)}</span><b>${count}</b></div>`)
    .join('') || '<div><span>No typed sections yet</span><b>0</b></div>';
  const inheritance = seed.inheritance || {};
  const inheritedCount = Object.values(inheritance).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);
  const genome = snapshot.genomeCoverage;
  const latestReplay = (state.worldseedReplayReceipts || []).find((item) => item.worldId === worldId);
  const ark = buildWorldseedArkManifest(seed);
  const pathNames = snapshot.lineagePath.map((id) => state.worlds.find((item) => item.id === id)?.name || id);

  return `<section id="${ROOT_ID}" class="panel worldseed-live" data-world-id="${esc(worldId)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Worldseed Foundry · live compile</p><h2>${esc(world?.name || worldId)}</h2><p class="muted">The Seedhouse now compiles the world it is holding.</p></div><div class="button-row"><button type="button" data-worldseed-action="refresh">Compile</button><button type="button" class="quiet" data-worldseed-action="export">Export JSON</button><button type="button" class="quiet" data-worldseed-action="replay">Replay</button></div></div>
    <div class="worldseed-live-grid">
      <article class="worldseed-live-card"><span class="eyebrow">Fingerprint</span><strong><code>${esc(seed.fingerprint)}</code></strong><small>${seed.readiness.rooted ? 'rooted' : 'germinating'} · ${seed.readiness.recordCount} seed record${seed.readiness.recordCount === 1 ? '' : 's'}</small></article>
      <article class="worldseed-live-card"><span class="eyebrow">Continuity Genome</span><strong>${genome.count}/${genome.total || 10} fields</strong><small>${esc(genome.defined.join(' · ') || 'No genome fields defined yet')}</small></article>
      <article class="worldseed-live-card"><span class="eyebrow">Inheritance</span><strong>${inheritedCount} carried statement${inheritedCount === 1 ? '' : 's'}</strong><small>${inheritance.mustSurvive?.length || 0} must survive · ${inheritance.descendantsInherit?.length || 0} descendant gifts</small></article>
      <article class="worldseed-live-card"><span class="eyebrow">Ark</span><strong>${esc(ark.status)}</strong><small>${seed.readiness.exportReady ? '.worldseed ready to serialize' : 'Add an Export-ready Ark seed'}</small></article>
    </div>
    <div class="grid two">
      <article class="worldseed-live-card"><h3>Typed organs</h3><div class="worldseed-kv">${sectionCounts}</div></article>
      <article class="worldseed-live-card"><h3>Lineage</h3><div class="worldseed-lineage-row">${pathNames.map((name, index) => `${index ? '<span>→</span>' : ''}<span class="worldseed-lineage-node">${esc(name)}</span>`).join('')}</div><p class="muted">${esc(world?.branchPoint || 'Root world or branch point not yet named.')}</p></article>
    </div>
    <article class="worldseed-live-card"><h3>Replay</h3>${latestReplay ? `<p><b>${latestReplay.matched ? 'Exact reconstruction' : 'Fingerprint mismatch'}</b> · ${esc(latestReplay.replayedAt || '')}</p><code>${esc(latestReplay.actualFingerprint || '')}</code>` : '<p class="muted">No replay receipt yet. Replay reconstructs this seed from the current Seedhouse records.</p>'}</article>
  </section>`;
}

function worldsMarkup(state, worldId) {
  const world = state.worlds.find((item) => item.id === worldId);
  if (!world) return '';
  const snapshot = worldseedLiveSnapshot(state, worldId);
  const graph = snapshot.graph;
  const node = graph.nodes.find((item) => item.id === worldId);
  const parent = world.parentWorldId ? state.worlds.find((item) => item.id === world.parentWorldId) : null;
  const children = (node?.childWorldIds || []).map((id) => state.worlds.find((item) => item.id === id)).filter(Boolean);
  const allNodes = graph.nodes.map((item) => `<span class="worldseed-lineage-node" title="${esc(item.branchPoint || item.forkReason || '')}">${esc(item.name)}</span>`).join('<span>↝</span>');

  return `<section id="${ROOT_ID}" class="panel worldseed-live" data-world-id="${esc(worldId)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">World lineage · Possible Worlds</p><h2>${esc(world.name)}</h2><p class="muted">Ancestry is visible. Branches do not overwrite one another.</p></div><span class="commit-badge">${graph.healthy ? '✦ lineage coherent' : '⚠ lineage needs repair'}</span></div>
    <div class="worldseed-live-grid">
      <article class="worldseed-live-card"><span class="eyebrow">Parent</span><strong>${esc(parent?.name || 'Root world')}</strong><small>${esc(world.parentSeedFingerprint || 'No parent seed fingerprint')}</small></article>
      <article class="worldseed-live-card"><span class="eyebrow">Branch point</span><strong>${esc(world.branchPoint || 'Root')}</strong><small>${esc(world.lineageLabel || 'root')} · ${esc(world.forkReason || 'No fork reason recorded')}</small></article>
      <article class="worldseed-live-card"><span class="eyebrow">Descendants</span><strong>${children.length}</strong><small>${esc(children.map((item) => item.name).join(' · ') || 'No descendants yet')}</small></article>
      <article class="worldseed-live-card"><span class="eyebrow">Current seed</span><strong><code>${esc(snapshot.seed.fingerprint)}</code></strong><small>${snapshot.seed.readiness.recordCount} Seedhouse records</small></article>
    </div>
    <article class="worldseed-live-card"><h3>Branch graph</h3><div class="worldseed-lineage-row">${allNodes || '<span class="muted">No worlds.</span>'}</div></article>
    <article class="worldseed-live-card"><h3>Fork World</h3><form class="worldseed-fork-form" data-worldseed-fork-form>
      <label>Branch name<input name="name" required value="${esc(world.name)} · Branch" /></label>
      <label>Mode<select name="mode"><option value="descendant">Descendant</option><option value="experimental">Experimental branch</option><option value="sibling">Sibling</option></select></label>
      <label class="wide">Branch point<input name="branchPoint" placeholder="Where does this world diverge?" /></label>
      <label class="wide">Reason<textarea name="reason" rows="3" placeholder="What question or future does this branch carry?"></textarea></label>
      <button type="submit">Fork from compiled Worldseed ✤</button>
    </form></article>
  </section>`;
}

async function mount() {
  ensureStyle();
  const existing = document.getElementById(ROOT_ID);
  const heading = document.querySelector('main.content h1');
  const title = heading?.textContent?.trim();
  if (!heading || !['Seedhouse', 'Worlds'].includes(title)) {
    existing?.remove();
    return;
  }
  const state = await readState();
  if (!state?.worlds?.length) return;
  const worldId = title === 'Worlds' ? selectedWorldId(state) : activeWorldId(state);
  if (!worldId) return;
  let markup;
  try {
    markup = title === 'Seedhouse' ? seedhouseMarkup(state, worldId) : worldsMarkup(state, worldId);
  } catch (error) {
    markup = `<section id="${ROOT_ID}" class="panel worldseed-live"><p class="callout">Worldseed live instrument stopped: ${esc(error.message)}</p></section>`;
  }
  const host = heading.closest('.section-heading');
  const current = document.getElementById(ROOT_ID);
  if (current) current.outerHTML = markup;
  else host?.insertAdjacentHTML('afterend', markup);
}

function makeChildId(name) {
  return `world-${slug(name)}-${Date.now().toString(36)}`;
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-worldseed-action]');
  if (!button) return;
  const instrument = button.closest(`#${ROOT_ID}`);
  const worldId = instrument?.dataset.worldId;
  const state = await readState();
  if (!state || !worldId) return;
  try {
    const seed = compileWorldseedForState(state, worldId);
    if (button.dataset.worldseedAction === 'refresh') {
      const world = state.worlds.find((item) => item.id === worldId);
      world.worldseedFingerprint = seed.fingerprint;
      world.updatedAt = new Date().toISOString();
      await writeState(state, 'worldseed-compile');
      notice(`Worldseed compiled · ${seed.fingerprint}.`);
      await mount();
      return;
    }
    if (button.dataset.worldseedAction === 'export') {
      const ark = buildWorldseedArkManifest(seed);
      downloadJson(`${slug(seed.world.name)}.worldseed-preview.json`, { manifest: ark, worldseed: seed });
      notice(`Worldseed preview exported · ${seed.fingerprint}.`);
      return;
    }
    if (button.dataset.worldseedAction === 'replay') {
      const expected = state.worlds.find((item) => item.id === worldId)?.worldseedFingerprint || seed.fingerprint;
      const replay = receiptWorldseedReplay(state, worldId, expected);
      await writeState(state, 'worldseed-replay');
      notice(replay.matched ? `Replay exact · ${replay.actualFingerprint}.` : `Replay mismatch · expected ${replay.expectedFingerprint}, rebuilt ${replay.actualFingerprint}.`);
      await mount();
    }
  } catch (error) {
    notice(`Worldseed action stopped: ${error.message}`);
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-worldseed-fork-form]');
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  const instrument = form.closest(`#${ROOT_ID}`);
  const worldId = instrument?.dataset.worldId;
  const state = await readState();
  if (!state || !worldId) return;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    const result = forkWorldInState(state, {
      worldId,
      childId: makeChildId(values.name),
      childName: values.name,
      mode: values.mode,
      branchPoint: values.branchPoint,
      reason: values.reason,
    });
    await writeState(state, 'worldseed-fork');
    notice(`World forked · ${result.child.name} carries ${result.seed.fingerprint}. Reloading into the descendant.`);
    location.reload();
  } catch (error) {
    notice(`Fork stopped: ${error.message}`);
  }
}, true);

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
