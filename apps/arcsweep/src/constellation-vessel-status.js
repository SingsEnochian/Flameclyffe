import {
  getConstellationRuntimeVoiceStatus,
  hasConstellationRuntimeToken,
  loadConstellationRuntimeRoutes,
  CONSTELLATION_RUNTIME_EVENTS,
} from './constellation-runtime-adapter.js';

const ROOT_ID = 'arcsweep-constellation-presence';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shortModel(value = '') {
  const text = String(value || '');
  const slash = text.lastIndexOf('/');
  return slash >= 0 ? text.slice(slash + 1) : text;
}

function stateLabel(state = '') {
  const labels = {
    'profile-defined': 'profile defined',
    installed: 'installed',
    running: 'running',
    'runtime-verified': 'runtime verified',
    'activation-pending': 'activation pending',
    'credential-ready': 'credential ready',
    'credential-needed': 'credential needed',
    'route-unavailable': 'route unavailable',
    'offline-no-token': 'token needed to probe',
    'runtime-mismatch': 'RUNTIME MISMATCH',
    'existing-runtime-binding': 'existing binding',
    'vessel-unselected': 'vessel unselected',
  };
  return labels[state] || state || 'unresolved';
}

function ensureStatusArea(root) {
  let section = root.querySelector('.constellation-vessel-status');
  if (section) return section;
  const runtimeHeading = [...root.querySelectorAll('.constellation-presence-subhead')]
    .find((node) => node.textContent.trim() === 'Runtime bridge');
  if (!runtimeHeading) return null;
  section = document.createElement('section');
  section.className = 'constellation-vessel-status';
  section.setAttribute('data-constellation-lens-ignore', 'true');
  section.innerHTML = `
    <div class="constellation-vessel-head">
      <strong>Vessel bindings</strong>
      <button type="button" class="quiet mini" data-vessel-probe>Probe vessels</button>
    </div>
    <div class="constellation-vessel-list" aria-live="polite"><p class="muted">Loading profile bindings…</p></div>
    <p class="constellation-vessel-note">Profile identity is checked on both shores. “Installed” means the assigned local model is present; “runtime verified” requires a successful attested reply from that exact vessel.</p>
  `;
  runtimeHeading.insertAdjacentElement('afterend', section);
  return section;
}

function bindingMarkup(voiceId, entry, live = null) {
  const state = live?.status || entry?.status || 'route-unavailable';
  const model = live?.model || entry?.runtimeModel || '';
  const source = live?.sourceModel || entry?.sourceModel || '';
  const mismatch = state === 'runtime-mismatch';
  return `<article class="constellation-vessel ${mismatch ? 'mismatch' : ''}" data-vessel-id="${escapeHtml(voiceId)}">
    <div class="constellation-vessel-title"><strong>${escapeHtml(voiceId)}</strong><span>${escapeHtml(stateLabel(state))}</span></div>
    <div class="constellation-vessel-model">${escapeHtml(shortModel(model) || 'vessel unselected')}</div>
    ${entry?.profileId ? `<small>${escapeHtml(entry.profileId)}</small>` : ''}
    ${source ? `<small>lineage · ${escapeHtml(shortModel(source))}</small>` : ''}
    ${live?.detail ? `<small>${escapeHtml(live.detail)}</small>` : ''}
  </article>`;
}

async function renderBindings(section, { probe = false } = {}) {
  const list = section.querySelector('.constellation-vessel-list');
  const registry = await loadConstellationRuntimeRoutes();
  const entries = Object.entries(registry.routes || {});
  let liveByVoice = new Map();

  if (probe && hasConstellationRuntimeToken()) {
    const results = await Promise.all(entries.map(async ([voiceId]) => {
      try { return [voiceId, await getConstellationRuntimeVoiceStatus(voiceId)]; }
      catch (error) { return [voiceId, { status: 'route-unavailable', detail: error?.message || String(error) }]; }
    }));
    liveByVoice = new Map(results);
  } else if (probe) {
    liveByVoice = new Map(entries.map(([voiceId]) => [voiceId, { status: 'offline-no-token' }]));
  }

  list.innerHTML = entries.map(([voiceId, entry]) => bindingMarkup(voiceId, entry, liveByVoice.get(voiceId))).join('');
}

function injectStyles() {
  if (document.querySelector('#arcsweep-vessel-status-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-vessel-status-styles';
  style.textContent = `
    .constellation-vessel-status { margin:.35rem 0 .7rem; padding:.55rem; border:1px solid color-mix(in srgb,var(--gold) 16%,transparent); border-radius:.65rem; }
    .constellation-vessel-head,.constellation-vessel-title { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem; }
    .constellation-vessel-list { display:grid; gap:.35rem; margin-top:.4rem; }
    .constellation-vessel { padding:.4rem .45rem; border-radius:.45rem; background:color-mix(in srgb,var(--panel-solid) 88%,transparent); }
    .constellation-vessel.mismatch { outline:1px solid currentColor; }
    .constellation-vessel-title { font-size:.74rem; text-transform:capitalize; }
    .constellation-vessel-title span { opacity:.68; }
    .constellation-vessel-model { margin:.12rem 0; font-size:.72rem; overflow-wrap:anywhere; }
    .constellation-vessel small { display:block; font-size:.62rem; opacity:.58; overflow-wrap:anywhere; }
    .constellation-vessel-note { margin:.4rem 0 0; font-size:.68rem; opacity:.66; line-height:1.35; }
  `;
  document.head.append(style);
}

async function attach() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  const section = ensureStatusArea(root);
  if (!section) return false;
  await renderBindings(section);
  section.querySelector('[data-vessel-probe]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Probing…';
    try { await renderBindings(section, { probe: true }); }
    finally { button.disabled = false; button.textContent = 'Probe vessels'; }
  });
  return true;
}

export function installConstellationVesselStatus() {
  if (typeof document === 'undefined') return;
  injectStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void attach());
  else void attach();
  const observer = new MutationObserver(() => {
    const root = document.getElementById(ROOT_ID);
    if (root && !root.querySelector('.constellation-vessel-status')) void attach();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener(CONSTELLATION_RUNTIME_EVENTS.token, () => {
    const section = document.querySelector('.constellation-vessel-status');
    if (section) void renderBindings(section);
  });
}

if (typeof document !== 'undefined') installConstellationVesselStatus();
