import {
  PROJECT_STORAGE_KEY,
  loadLocalJson,
  normaliseProject,
} from '../../starwell/src/components/glyph-studio/glyphStudioIO.js';
import {
  MAGIC_BOOK_BINDING_KEY,
  MAGIC_BOOK_RECEIPTS_KEY,
} from './magic-book-model.js';
import {
  MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY,
  evaluateMagicBookPhysicalAcceptance,
  sealMagicBookPhysicalAcceptance,
} from './magic-book-physical-acceptance.js';

const ROOT_ID = 'arcsweep-magic-book';
const PANEL_ID = 'magic-book-physical-acceptance';
const proofs = new Map();
let observer = null;
let renderQueued = false;
let lastStatus = null;
let lastDeviceProof = null;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readJson(key, fallback = null) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function bookOnReceiptsPage() {
  const binding = readJson(MAGIC_BOOK_BINDING_KEY, null);
  return binding?.open === true && binding?.active_page_id === 'receipts';
}

function recordInputProof(detail = {}) {
  const pointerType = String(detail.pointer_type || 'unknown').toLowerCase().slice(0, 32);
  if (!['touch', 'pen'].includes(pointerType)) return;
  const prior = proofs.get(pointerType) || {
    pointer_type: pointerType,
    pressure_observed: false,
    tilt_observed: false,
    twist_observed: false,
    observed_at: null,
  };
  proofs.set(pointerType, Object.freeze({
    pointer_type: pointerType,
    pressure_observed: prior.pressure_observed || Number(detail.pressure || 0) > 0,
    tilt_observed: prior.tilt_observed || Math.abs(Number(detail.tilt_x || 0)) > 0 || Math.abs(Number(detail.tilt_y || 0)) > 0,
    twist_observed: prior.twist_observed || Number(detail.twist || 0) !== 0,
    observed_at: new Date().toISOString(),
  }));
}

async function readDeviceCapability(capabilityId) {
  try {
    const registry = globalThis.__arcsweepOS?.capabilities;
    if (!registry?.invoke) return null;
    const receipt = await registry.invoke(capabilityId, {}, {
      authority: 'read',
      expected_authority: 'read',
      source: 'magic-book-physical-acceptance',
    });
    return receipt?.status === 'applied' ? receipt.output : null;
  } catch {
    return null;
  }
}

async function candidate({ refreshDevice = false } = {}) {
  if (refreshDevice || !lastStatus) {
    const [status, proof] = await Promise.all([
      readDeviceCapability('device.status'),
      readDeviceCapability('device.input-proof'),
    ]);
    if (status) lastStatus = status;
    if (proof) lastDeviceProof = proof;
  }
  const receipts = readJson(MAGIC_BOOK_RECEIPTS_KEY, []);
  const project = normaliseProject(loadLocalJson(PROJECT_STORAGE_KEY, null));
  return evaluateMagicBookPhysicalAcceptance({
    deviceStatus: lastStatus,
    deviceProof: lastDeviceProof,
    deviceProofs: [...proofs.values()],
    receipts: Array.isArray(receipts) ? receipts : [],
    persistedProject: project,
  });
}

function checkRows(checks = {}) {
  const labels = {
    pointer_events_available: 'Pointer Events available',
    touch_capable_device: 'Touch-capable device',
    proof_session_opened: 'Proof session opened in the Book',
    touch_stroke_observed: 'Real touch stroke recorded',
    pencil_stroke_observed: 'Apple Pencil / pen stroke recorded',
    pencil_pressure_observed: 'Pencil pressure observed',
    glyph_forge_page_entered: 'Glyph Forge entered during this proof session',
    brush_selected: 'Brush selected during this proof session',
    brush_setting_changed: 'Brush setting changed during this proof session',
    proof_strokes_persisted: 'Touch + Pencil strokes read back from persisted project',
    leave_return_observed: 'Book closed and reopened after proof strokes',
  };
  return Object.entries(labels).map(([key, label]) => (
    `<li data-acceptance-check="${esc(key)}" data-pass="${checks[key] === true ? 'true' : 'false'}">` +
      `<span aria-hidden="true">${checks[key] === true ? '✓' : '○'}</span><span>${esc(label)}</span></li>`
  )).join('');
}

async function renderPanel({ refreshDevice = false } = {}) {
  const root = document.getElementById(ROOT_ID);
  const page = root?.querySelector('[data-magic-book-right]');
  if (!root || !page || !bookOnReceiptsPage()) return;

  let panel = page.querySelector('#' + PANEL_ID);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'magic-book-physical-acceptance';
    page.prepend(panel);
  }

  const result = await candidate({ refreshDevice });
  const liveRoot = document.getElementById(ROOT_ID);
  const livePage = liveRoot?.querySelector('[data-magic-book-right]');
  if (!bookOnReceiptsPage() || !panel.isConnected || livePage !== page) return;

  const sealed = readJson(MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY, null);
  const sealedOk = sealed?.schema === 'arcsweep.magic-book-physical-acceptance/v0.1' && sealed?.human_confirmed === true;

  panel.innerHTML = [
    '<p class="magic-book-kicker">rc.8 physical gate</p>',
    '<h2>iPad + Apple Pencil proving</h2>',
    sealedOk
      ? `<p class="magic-book-acceptance-sealed"><strong>Physical gate sealed.</strong> ${esc(sealed.sealed_at || '')}</p>`
      : '<p>Use this page on the real iPad. Open the Book, enter Glyph Forge, choose a brush, change a setting, make one touch stroke and one Apple Pencil stroke with pressure, close and reopen the Book, then return here.</p>',
    `<ul class="magic-book-acceptance-checks">${checkRows(result.checks)}</ul>`,
    result.missing.length
      ? `<p class="magic-book-glyph-status">Still needed: ${esc(result.missing.join(', '))}</p>`
      : '<p class="magic-book-glyph-status"><strong>Evidence complete.</strong> This device is ready for the explicit human seal.</p>',
    '<div class="magic-book-glyph-actions">',
      '<button type="button" data-magic-book-acceptance-refresh>Refresh physical proof</button>',
      `<button type="button" data-magic-book-acceptance-seal ${result.ready_to_seal && !sealedOk ? '' : 'disabled'}>Seal this iPad proof</button>`,
    '</div>',
    '<p class="magic-book-glyph-status">The acceptance receipt stores pointer classes, receipt IDs, and pass/fail evidence only. It does not store coordinates, drawing content, or text. Sealing does not auto-promote the final release.</p>',
  ].join('');
  panel.dataset.readyToSeal = result.ready_to_seal ? 'true' : 'false';
}

function queueRender(options = {}) {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    void renderPanel(options);
  });
}

function mutationIsInsidePanel(mutation) {
  const target = mutation?.target;
  const element = target?.nodeType === 1 ? target : target?.parentElement;
  return Boolean(element?.closest?.('#' + PANEL_ID));
}

async function sealCurrentDevice() {
  const result = await candidate({ refreshDevice: true });
  if (!result.ready_to_seal) {
    await renderPanel();
    return;
  }
  const confirmed = typeof globalThis.confirm === 'function'
    ? globalThis.confirm('Seal this physical iPad touch + Apple Pencil proof? This records the completed acceptance evidence but does not promote the final release.')
    : false;
  if (!confirmed) return;
  const receipt = sealMagicBookPhysicalAcceptance(result, { humanConfirmed: true });
  if (!writeJson(MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY, receipt)) return;
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:magic-book-physical-acceptance', { detail: receipt }));
  try {
    globalThis.__arcsweepOS?.bus?.publish?.('arcsweep:magic-book-physical-acceptance', receipt, { source: 'magic-book-physical-acceptance' });
  } catch {}
  await renderPanel();
}

function install() {
  if (globalThis.__magicBookPhysicalAcceptance) return globalThis.__magicBookPhysicalAcceptance;

  globalThis.addEventListener?.('arcsweep:glyph-brush-sample', (event) => {
    recordInputProof(event.detail || {});
  });
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', () => queueRender());

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-magic-book-acceptance-refresh]')) {
      void renderPanel({ refreshDevice: true });
      return;
    }
    if (event.target.closest?.('[data-magic-book-acceptance-seal]')) void sealCurrentDevice();
  }, true);

  observer = new MutationObserver((mutations) => {
    if (mutations.every(mutationIsInsidePanel)) return;
    queueRender();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  queueRender({ refreshDevice: true });

  const api = Object.freeze({
    schema: 'arcsweep.magic-book-physical-acceptance-sidecar/v0.1',
    candidate: () => candidate({ refreshDevice: true }),
    sealed: () => readJson(MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY, null),
  });
  globalThis.__magicBookPhysicalAcceptance = api;
  return api;
}

export const magicBookPhysicalAcceptance = typeof document !== 'undefined' ? install() : null;

globalThis.addEventListener?.('pagehide', () => observer?.disconnect?.(), { once: true });
