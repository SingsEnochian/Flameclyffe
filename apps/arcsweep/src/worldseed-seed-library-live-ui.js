import {
  plantSeedFromLibrary,
  publishSeedToLibrary,
  seedLibrarySnapshot,
} from './worldseed-seed-library.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const ROOT_ID = 'worldseed-seed-library-live';
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

function activeWorld(state) {
  return state?.worlds?.find((world) => world.id === state.activeWorldId) || state?.worlds?.[0] || null;
}

function candidatesMarkup(snapshot) {
  if (!snapshot.candidates.length) return '<p class="muted">Give a Seedhouse record a transferable seed or descendant inheritance statement and it can be published here.</p>';
  return snapshot.candidates.map((candidate) => `<article class="worldseed-live-card"><span class="eyebrow">${esc(candidate.seedType || 'Seed')}</span><h4>${esc(candidate.title)}</h4><p>${esc(candidate.transferableSeed || candidate.descendantsInherit)}</p><button type="button" ${candidate.published ? 'disabled' : ''} data-seed-library-publish="${esc(candidate.id)}">${candidate.published ? 'Published to Seed Library' : 'Carry this forward'}</button></article>`).join('');
}

function libraryMarkup(snapshot) {
  if (!snapshot.availableToPlant.length) return '<p class="muted">No seeds from other worlds are waiting here yet.</p>';
  return snapshot.availableToPlant.map((entry) => `<article class="worldseed-live-card"><span class="eyebrow">From ${esc(entry.sourceWorld?.name || entry.sourceWorld?.id || 'another world')}</span><h4>${esc(entry.title)}</h4><p>${esc(entry.carried?.transferableSeed || entry.carried?.descendantsInherit || entry.carried?.mustSurvive || '')}</p><small><code>${esc(entry.sourceWorldseedFingerprint)}</code></small><button type="button" data-seed-library-plant="${esc(entry.id)}">Plant in ${esc(snapshot.world.name)}</button></article>`).join('');
}

async function mount() {
  const heading = document.querySelector('main.content h1');
  if (heading?.textContent?.trim() !== 'Seedhouse') {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  const state = await readState();
  const world = activeWorld(state);
  const host = document.getElementById('worldseed-live-instrument');
  if (!state || !world || !host) return;
  let snapshot;
  try {
    snapshot = seedLibrarySnapshot(state, world.id);
  } catch (error) {
    const markup = `<article id="${ROOT_ID}" class="worldseed-live-card"><p class="callout">Seed Library stopped: ${esc(error.message)}</p></article>`;
    const current = document.getElementById(ROOT_ID);
    if (current) current.outerHTML = markup;
    else host.insertAdjacentHTML('beforeend', markup);
    return;
  }
  const markup = `<article id="${ROOT_ID}" class="worldseed-live-card" data-world-id="${esc(world.id)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Seed Library · carry this forward</p><h3>Cross-world inheritance</h3><p class="muted">Publish one living pattern from this world. Plant another world's pattern here as germinating inheritance, with its ancestry intact.</p></div><span class="commit-badge">${snapshot.publishedByWorld.length} published · ${snapshot.availableToPlant.length} available</span></div>
    <div class="grid two">
      <section><h4>What ${esc(world.name)} can teach</h4><div class="stack">${candidatesMarkup(snapshot)}</div></section>
      <section><h4>Seeds from other worlds</h4><div class="stack">${libraryMarkup(snapshot)}</div></section>
    </div>
    <p class="muted">Planted seeds begin as Germinating. They do not become this world's rooted inheritance until reviewed here.</p>
  </article>`;
  const current = document.getElementById(ROOT_ID);
  if (current?.outerHTML === markup) return;
  if (current) current.outerHTML = markup;
  else host.insertAdjacentHTML('beforeend', markup);
}

document.addEventListener('click', async (event) => {
  const publish = event.target.closest('[data-seed-library-publish]');
  if (publish) {
    const state = await readState();
    const world = activeWorld(state);
    if (!state || !world) return;
    try {
      const entry = publishSeedToLibrary(state, {
        sourceWorldId: world.id,
        seedhouseRecordId: publish.dataset.seedLibraryPublish,
      });
      await writeState(state, 'worldseed-seed-library-publish');
      notice(`Seed published · ${entry.title} · ${entry.sourceWorldseedFingerprint}.`);
      await mount();
    } catch (error) {
      notice(`Seed publication stopped: ${error.message}`);
    }
    return;
  }

  const plant = event.target.closest('[data-seed-library-plant]');
  if (!plant) return;
  const state = await readState();
  const world = activeWorld(state);
  if (!state || !world) return;
  try {
    const result = plantSeedFromLibrary(state, {
      librarySeedId: plant.dataset.seedLibraryPlant,
      targetWorldId: world.id,
    });
    await writeState(state, 'worldseed-seed-library-plant');
    notice(`Seed planted in ${world.name} · ${result.record.title} is germinating.`);
    await mount();
  } catch (error) {
    notice(`Seed planting stopped: ${error.message}`);
  }
});

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
