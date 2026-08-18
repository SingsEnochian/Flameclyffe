import {
  carryRecordToCanon,
  receiptWorldseedBraidReplay,
  rootCanonInSeedhouse,
  worldseedBraidSnapshot,
} from './worldseed-braid.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const ROOT_ID = 'worldseed-braid-live';
const desktop = window.arcsweepDesktop ?? window.arcsweep ?? null;

async function readState() {
  try {
    if (desktop?.loadState) return (await desktop.loadState())?.state || null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeState(state, reason) {
  state.provenance = { ...(state.provenance || {}), updatedAt: new Date().toISOString() };
  if (desktop?.saveState) return desktop.saveState(state, { reason });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return { ok: true };
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function notice(message) {
  const status = document.querySelector('.notice');
  if (status) status.textContent = message;
}

function activeRoom() {
  return document.querySelector('[data-room].active')?.dataset.room || null;
}

function worldForState(state) {
  return state?.worlds?.find((world) => world.id === state.activeWorldId) || state?.worlds?.[0] || null;
}

function renameMountedSurfaces(room) {
  const heading = document.querySelector('main.content h1');
  if (room === 'scripts' && heading?.textContent?.trim() === 'Scripts') heading.textContent = 'Canon Studio';
  if (room === 'continuity-recall' && heading?.textContent?.trim() === 'Continuity Recall') heading.textContent = 'Replay';
  document.querySelectorAll('[data-room="scripts"] span:last-child').forEach((node) => { if (node.textContent === 'Scripts') node.textContent = 'Canon Studio'; });
  document.querySelectorAll('[data-room="continuity-recall"] span:last-child').forEach((node) => { if (node.textContent === 'Continuity Recall') node.textContent = 'Replay'; });
}

function braidNav() {
  return `<div class="button-row" aria-label="Worldseed braid">
    <button type="button" class="quiet" data-room="records">Records Room</button>
    <button type="button" class="quiet" data-room="scripts">Canon Studio</button>
    <button type="button" class="quiet" data-room="seedhouse">Seedhouse</button>
    <button type="button" class="quiet" data-room="continuity-recall">Replay</button>
  </div>`;
}

function stagesMarkup(snapshot) {
  const latest = snapshot.stages.replay.latest;
  return `<div class="worldseed-live-grid">
    <article class="worldseed-live-card"><span class="eyebrow">Records Room</span><strong>${snapshot.stages.records.count}</strong><small>${snapshot.stages.records.requestedCanonCarry} awaiting Canon Carry</small></article>
    <article class="worldseed-live-card"><span class="eyebrow">Canon Studio</span><strong>${snapshot.stages.canonStudio.count}</strong><small>committed canon statements</small></article>
    <article class="worldseed-live-card"><span class="eyebrow">Seedhouse</span><strong>${snapshot.stages.seedhouse.count}</strong><small><code>${esc(snapshot.stages.seedhouse.fingerprint)}</code></small></article>
    <article class="worldseed-live-card"><span class="eyebrow">Replay</span><strong>${latest ? (latest.matched ? 'exact' : 'diverged') : 'unread'}</strong><small>${snapshot.stages.replay.count} braid replay receipt${snapshot.stages.replay.count === 1 ? '' : 's'}</small></article>
  </div>`;
}

function recordsBody(state, world) {
  const pending = (state.records?.records || []).filter((record) => record.worldId === world.id && record.canonCarry === 'Requested for review');
  if (!pending.length) return '<p class="muted">No Records Room entries are currently requesting Canon Carry.</p>';
  return `<div class="stack">${pending.map((record) => `<article class="worldseed-live-card"><h4>${esc(record.title || 'Untitled record')}</h4><p>${esc(record.canonExcerpt || record.content || '')}</p><button type="button" data-braid-canon-carry="${esc(record.id)}">Carry excerpt to Canon Studio</button></article>`).join('')}</div>`;
}

function canonBody(state, world) {
  const canonical = (state.scripts || []).filter((script) => script.worldId === world.id && script.status === 'Canon');
  if (!canonical.length) return '<p class="muted">No committed Canon Studio entries yet. Records Room can carry reviewed excerpts here.</p>';
  return `<div class="stack">${canonical.slice(0, 12).map((canon) => {
    const rooted = (state.records?.seedhouse || []).some((seed) => seed.worldId === world.id && seed.rootedFromCanonId === canon.id);
    return `<article class="worldseed-live-card"><h4>${esc(canon.name || 'Canon')}</h4><p>${esc(canon.content || '')}</p><small>${esc(canon.authority || 'Committed canon')} · ${esc(canon.sourceRecordId ? `Records Room ${canon.sourceRecordId}` : 'direct Canon Studio entry')}</small><div class="button-row"><button type="button" ${rooted ? 'disabled' : ''} data-braid-root-canon="${esc(canon.id)}">${rooted ? 'Rooted in Seedhouse' : 'Root in Seedhouse'}</button></div></article>`;
  }).join('')}</div>`;
}

function replayBody(snapshot) {
  const latest = snapshot.stages.replay.latest;
  return `<article class="worldseed-live-card"><h4>Reconstruction proof</h4>${latest ? `<p><b>${latest.matched ? 'Exact reconstruction' : 'Fingerprint divergence'}</b></p><p><code>${esc(latest.expectedFingerprint)}</code><br />${latest.matched ? '=' : '≠'}<br /><code>${esc(latest.actualFingerprint)}</code></p>` : '<p class="muted">No braid Replay receipt yet.</p>'}<button type="button" data-braid-replay>Replay current Worldseed</button></article>`;
}

async function mount() {
  const room = activeRoom();
  renameMountedSurfaces(room);
  if (!['records', 'scripts', 'seedhouse', 'continuity-recall'].includes(room)) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  const state = await readState();
  const world = worldForState(state);
  const heading = document.querySelector('main.content h1');
  const host = heading?.closest('.section-heading') || heading;
  if (!state || !world || !host) return;

  let snapshot;
  try {
    snapshot = worldseedBraidSnapshot(state, world.id);
  } catch (error) {
    const markup = `<section id="${ROOT_ID}" class="panel worldseed-live"><p class="callout">Worldseed braid stopped: ${esc(error.message)}</p></section>`;
    const current = document.getElementById(ROOT_ID);
    if (current) current.outerHTML = markup;
    else host.insertAdjacentHTML('afterend', markup);
    return;
  }

  let body = '';
  if (room === 'records') body = recordsBody(state, world);
  if (room === 'scripts') body = canonBody(state, world);
  if (room === 'seedhouse') body = '<p class="muted">Canon that becomes inheritable is rooted here. The live compiler below remains the source of the Worldseed fingerprint.</p>';
  if (room === 'continuity-recall') body = replayBody(snapshot);

  const markup = `<section id="${ROOT_ID}" class="panel worldseed-live" data-world-id="${esc(world.id)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Worldseed foundational braid</p><h2>Records → Canon → Seed → Replay</h2><p class="muted">Experience becomes committed truth, committed truth becomes inheritance, inheritance becomes reconstructible.</p></div>${braidNav()}</div>
    ${stagesMarkup(snapshot)}
    ${body}
  </section>`;
  const current = document.getElementById(ROOT_ID);
  if (current) current.outerHTML = markup;
  else host.insertAdjacentHTML('afterend', markup);
}

document.addEventListener('click', async (event) => {
  const carry = event.target.closest('[data-braid-canon-carry]');
  if (carry) {
    event.preventDefault();
    const state = await readState();
    const world = worldForState(state);
    if (!state || !world) return;
    try {
      const result = carryRecordToCanon(state, { worldId: world.id, recordId: carry.dataset.braidCanonCarry });
      await writeState(state, 'canon-carry');
      notice(`Canon Carry committed · ${result.canon.name}.`);
      await mount();
    } catch (error) {
      notice(`Canon Carry stopped: ${error.message}`);
    }
    return;
  }

  const root = event.target.closest('[data-braid-root-canon]');
  if (root) {
    event.preventDefault();
    const state = await readState();
    const world = worldForState(state);
    if (!state || !world) return;
    try {
      const result = rootCanonInSeedhouse(state, { worldId: world.id, canonId: root.dataset.braidRootCanon });
      await writeState(state, 'canon-root-seedhouse');
      notice(`Canon rooted in Seedhouse · ${result.seed.title}.`);
      await mount();
    } catch (error) {
      notice(`Seed rooting stopped: ${error.message}`);
    }
    return;
  }

  const replay = event.target.closest('[data-braid-replay]');
  if (!replay) return;
  event.preventDefault();
  const state = await readState();
  const world = worldForState(state);
  if (!state || !world) return;
  try {
    const result = receiptWorldseedBraidReplay(state, world.id);
    await writeState(state, 'worldseed-braid-replay');
    notice(result.replay.matched ? `Replay exact · ${result.replay.actualFingerprint}.` : `Replay divergence · ${result.replay.actualFingerprint}.`);
    await mount();
  } catch (error) {
    notice(`Replay stopped: ${error.message}`);
  }
});

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
