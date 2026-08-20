import {
  WORLDSEED_MIME,
  buildWorldseedPackage,
  importWorldseedPackage,
  parseWorldseedPackage,
  serializeWorldseedPackage,
  verifyWorldseedPackage,
} from './worldseed-package.js';
import {
  binaryArkStatus,
  collectWorldseedPackageAttachments,
  embedWorldseedBinaryPayloads,
  remapWorldseedPackageAttachments,
} from './worldseed-binary.js';
import {
  WORLD_REGISTRY_JOURNAL_KEY,
  createWorldRegistryJournal,
  normaliseWorldRegistryJournal,
  recordWorldSnapshot,
} from './world-registry-journal.js';

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

function readRegistryJournal() {
  try {
    const raw = localStorage.getItem(WORLD_REGISTRY_JOURNAL_KEY);
    return normaliseWorldRegistryJournal(raw ? JSON.parse(raw) : createWorldRegistryJournal());
  } catch {
    return createWorldRegistryJournal();
  }
}

function writeRegistryWorldSnapshot(world, writtenAt) {
  const journal = recordWorldSnapshot(readRegistryJournal(), world, writtenAt);
  try {
    localStorage.setItem(WORLD_REGISTRY_JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    throw new Error('the durable World Registry recovery journal could not record this Worldseed admission');
  }
  return journal;
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

async function packBinaryAttachments(pkg) {
  const attachments = collectWorldseedPackageAttachments(pkg);
  if (!attachments.length) return embedWorldseedBinaryPayloads(pkg, []);
  if (!desktop?.readAttachmentPayload) return pkg;
  const payloads = await Promise.all(attachments.map((attachment) => desktop.readAttachmentPayload(attachment)));
  return embedWorldseedBinaryPayloads(pkg, payloads);
}

async function materializeBinaryAttachments(pkg) {
  const entries = Array.isArray(pkg?.binary?.entries) ? pkg.binary.entries : [];
  if (!entries.length) return pkg;
  if (!desktop?.writeAttachmentPayload) {
    throw new Error('This .worldseed contains embedded assets. Import it in the Arcsweep desktop runtime so the Ark can materialize them.');
  }
  const receipts = [];
  for (const entry of entries) receipts.push(await desktop.writeAttachmentPayload(entry));
  return remapWorldseedPackageAttachments(pkg, receipts);
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
  const binaryMode = desktop?.readAttachmentPayload && desktop?.writeAttachmentPayload
    ? 'Binary Ark packing active · maps, images, audio, documents, and other attached bytes travel inside the .worldseed.'
    : 'Reference Ark mode · world data travels now; embedded local asset materialization is available in the desktop runtime.';
  const markup = `<article id="${ROOT_ID}" class="worldseed-live-card" data-world-id="${esc(world.id)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Ark Transfer · .worldseed v1</p><h3>Carry the world</h3><p class="muted">One file carries the compiled seed, its Seedhouse roots, canon, timeline, world records, lineage receipts, reconstruction fingerprint, and portable assets.</p></div><div class="button-row"><button type="button" data-worldseed-package-export>Export .worldseed</button><label class="file-button">Import .worldseed<input type="file" accept=".worldseed,${WORLDSEED_MIME},application/json" data-worldseed-package-import /></label></div></div>
    <p class="muted">${esc(binaryMode)}</p>
    <p class="muted">Exact import preserves the source world id, reconstructs the fingerprint before admission, and never overwrites an existing world.</p>
    ${latestImport ? `<p class="commit-badge">✦ Last exact import · ${esc(latestImport.importedAt)} · <code>${esc(latestImport.fingerprint)}</code></p>` : ''}
  </article>`;
  const current = document.getElementById(ROOT_ID);
  if (current?.outerHTML === markup) return;
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
    let pkg = buildWorldseedPackage(state, worldId);
    pkg = await packBinaryAttachments(pkg);
    const status = binaryArkStatus(pkg);
    const text = serializeWorldseedPackage(pkg);
    downloadPackage(`${slug(pkg.world.name)}.worldseed`, text);
    notice(`Ark exported · ${pkg.worldseed.fingerprint} · ${status.embeddedCount}/${status.attachmentCount} assets embedded.`);
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
    let pkg = parseWorldseedPackage(text);
    const verification = verifyWorldseedPackage(pkg);
    if (!verification.matched) throw new Error('Worldseed package does not reconstruct to its declared fingerprint.');
    if (state.worlds?.some((world) => world.id === pkg.world?.id)) throw new Error(`World ${pkg.world.id} already exists. Exact import never overwrites an existing world.`);
    pkg = await materializeBinaryAttachments(pkg);
    const result = importWorldseedPackage(state, pkg);
    writeRegistryWorldSnapshot(result.world, result.receipt.importedAt);
    await writeState(state, 'worldseed-package-import');
    const status = binaryArkStatus(pkg);
    notice(`Worldseed imported exactly · ${result.world.name} · ${status.embeddedCount} assets materialized.`);
    location.reload();
  } catch (error) {
    notice(`Worldseed import stopped: ${error.message}`);
    input.value = '';
  }
});

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
