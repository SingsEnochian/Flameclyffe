import {
  WORLDSEED_MIME,
  buildWorldseedPackage,
  importWorldseedPackage,
  parseWorldseedPackage,
  serializeWorldseedPackage,
} from './worldseed-package.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const ROOT_ID = 'worldseed-package-live';
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

async function writeState(state, reason = 'worldseed-package') {
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

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'world';
}

function notice(message) {
  const status = document.querySelector('.notice');
  if (status) status.textContent = message;
}

function downloadPackage(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: WORLDSEED_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function mount() {
  const heading = document.querySelector('main.content h1');
  if (heading?.textContent?.trim() !== 'Seedhouse') {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  const state = await readState();
  const host = document.getElementById('worldseed-live-instrument');
  const world = state?.worlds?.find((item) => item.id === state.activeWorldId) || state?.worlds?.[0];
  if (!host || !world) return;
  const latestImport = (state.worldseedImportReceipts || []).find((receipt) => receipt.worldId === world.id);
  const markup = `<article id="${ROOT_ID}" class="worldseed-live-card" data-world-id="${esc(world.id)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Ark Transfer · .worldseed v1</p><h3>Carry the world</h3><p class="muted">One file carries the compiled seed, its Seedhouse roots, canon, timeline, world records, lineage receipts, and reconstruction fingerprint.</p></div><div class="button-row"><button type="button" data-worldseed-package-export>Export .worldseed</button><label class="file-button">Import .worldseed<input type="file" accept=".worldseed,${WORLDSEED_MIME},application/json" data-worldseed-package-import /></label></div></div>
    <p class="muted">Exact import preserves the source world id and never overwrites an existing world. Local attachment references remain indexed for later binary Ark packing.</p>
    ${latestImport ? `<p class="commit-badge">✦ Last exact import · ${esc(latestImport.importedAt)} · <code>${esc(latestImport.fingerprint)}</code></p>` : ''}
  </article>`;
  const current = document.getElementById(ROOT_ID);
  if (current) current.outerHTML = markup;
  else host.insertAdjacentHTML('beforeend', markup);
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-worldseed-package-export]');
  if (!button) return;
  const root = button.closest(`#${ROOT_ID}`);
  const worldId = root?.dataset.worldId;
  const state = await readState();
  if (!state || !worldId) return;
  try {
    const pkg = buildWorldseedPackage(state, worldId);
    const text = serializeWorldseedPackage(pkg);
    downloadPackage(`${slug(pkg.world.name)}.worldseed`, text);
    notice(`Ark exported · ${pkg.worldseed.fingerprint} · ${pkg.world.name}.worldseed`);
  } catch (error) {
    notice(`Worldseed export stopped: ${error.message}`);
  }
});

document.addEventListener('change', async (event) => {
  const input = event.target.closest('[data-worldseed-package-import]');
  if (!input?.files?.[0]) return;
  const state = await readState();
  if (!state) return;
  try {
    const text = await input.files[0].text();
    const pkg = parseWorldseedPackage(text);
    const result = importWorldseedPackage(state, pkg);
    await writeState(state, 'worldseed-package-import');
    notice(`Worldseed imported exactly · ${result.world.name} · ${result.verification.actualFingerprint}.`);
    location.reload();
  } catch (error) {
    notice(`Worldseed import stopped: ${error.message}`);
    input.value = '';
  }
});

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
