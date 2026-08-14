import { loadConstellationRuntimeRoutes } from './constellation-runtime-adapter.js';
import {
  getBifrostIgnitionStatus,
  igniteConstellationVoice,
  igniteDeepReasoner,
  startBifrostOllama,
} from './bifrost-ignition-client.js';

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
    installed: 'installed · cold',
    igniting: 'igniting',
    'runtime-verified': '🔥 runtime verified',
    'activation-pending': 'weights not installed',
    'credential-ready': 'credential ready',
    'credential-needed': 'credential needed',
    'route-unavailable': 'runtime unavailable',
    'runtime-mismatch': 'RUNTIME MISMATCH',
    'existing-runtime-binding': 'existing binding',
    'vessel-unselected': 'vessel unselected',
    'ignition-challenge-failed': 'challenge failed',
    'remote-probe-not-authorised': 'remote verification not authorised',
    'opt-in-required': 'explicit opt-in required',
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
      <strong>Vessel ignition</strong>
      <div class="constellation-vessel-actions">
        <button type="button" class="quiet mini" data-vessel-probe>Probe</button>
        <button type="button" class="quiet mini" data-start-ollama>Start Ollama</button>
      </div>
    </div>
    <div class="constellation-vessel-list" aria-live="polite"><p class="muted">Loading vessel bindings…</p></div>
    <div class="constellation-instrument-list" aria-live="polite"></div>
    <p class="constellation-vessel-note">Probe is read-only. Ignite warms an already-installed assigned vessel and requires the exact Bifröst challenge reply before it becomes runtime verified. No ignition action downloads model weights.</p>
  `;
  runtimeHeading.insertAdjacentElement('afterend', section);
  return section;
}

function ignitionActionMarkup(voiceId, entry, live) {
  if (!entry?.profileId) return '';
  const state = live?.state || entry.status;
  if (state === 'runtime-verified') return '<span class="constellation-vessel-fire" aria-label="verified">🔥</span>';
  const remote = entry.provider && entry.provider !== 'ollama';
  const label = remote ? 'Verify remote' : 'Ignite';
  return `<button type="button" class="quiet mini" data-ignite-voice="${escapeHtml(voiceId)}" data-provider="${escapeHtml(entry.provider || '')}">${label}</button>`;
}

function identityMarkup(identity, fallback) {
  const title = identity?.displayName || identity?.identityName || fallback;
  const details = [];
  if (identity?.identityName && identity.identityName !== title) details.push(identity.identityName);
  if (identity?.affectionateName && identity.affectionateName !== title && identity.affectionateName !== identity.identityName) {
    details.push(identity.affectionateName);
  }
  return {
    title,
    detail: details.length ? `<small>identity · ${details.map(escapeHtml).join(' · ')}</small>` : '',
  };
}

function bindingMarkup(voiceId, entry, live = null) {
  const state = live?.state || entry?.status || 'route-unavailable';
  const model = live?.model || entry?.runtimeModel || '';
  const source = live?.sourceModel || entry?.sourceModel || '';
  const mismatch = state === 'runtime-mismatch';
  const identity = identityMarkup(live?.identity, voiceId);
  return `<article class="constellation-vessel ${mismatch ? 'mismatch' : ''}" data-vessel-id="${escapeHtml(voiceId)}">
    <div class="constellation-vessel-title">
      <strong>${escapeHtml(identity.title)}</strong>
      <span>${escapeHtml(stateLabel(state))}</span>
    </div>
    ${identity.detail}
    <div class="constellation-vessel-model">${escapeHtml(shortModel(model) || 'vessel unselected')}</div>
    ${entry?.profileId ? `<small>${escapeHtml(entry.profileId)}</small>` : ''}
    ${source ? `<small>lineage · ${escapeHtml(shortModel(source))}</small>` : ''}
    ${live?.detail ? `<small>${escapeHtml(live.detail)}</small>` : ''}
    ${live?.error ? `<small class="constellation-vessel-error">${escapeHtml(live.error)}</small>` : ''}
    <div class="constellation-vessel-row-actions">${ignitionActionMarkup(voiceId, entry, live)}</div>
  </article>`;
}

function reasonerMarkup(entry, live = null) {
  if (!entry?.profileId) return '';
  const state = live?.state || entry.status || 'profile-defined';
  return `<article class="constellation-vessel constellation-vessel-instrument" data-vessel-id="deep-reasoner">
    <div class="constellation-vessel-title"><strong>Deep reasoner</strong><span>${escapeHtml(stateLabel(state))}</span></div>
    <div class="constellation-vessel-model">${escapeHtml(shortModel(live?.model || entry.runtimeModel))}</div>
    <small>${escapeHtml(entry.profileId)}</small>
    <small>instrument only · explicit opt-in · never an identity fallback</small>
    ${live?.error ? `<small class="constellation-vessel-error">${escapeHtml(live.error)}</small>` : ''}
    <div class="constellation-vessel-row-actions">
      ${state === 'runtime-verified' ? '<span class="constellation-vessel-fire">🔥</span>' : '<button type="button" class="quiet mini" data-ignite-reasoner>Ignite instrument</button>'}
    </div>
  </article>`;
}

async function ignitionMap() {
  try {
    const status = await getBifrostIgnitionStatus();
    return new Map((status.profiles || []).map((profile) => [profile.profileId, profile]));
  } catch (error) {
    return new Map([['__error__', { state: 'route-unavailable', error: error?.message || String(error) }]]);
  }
}

async function renderBindings(section, { probe = true, override = null } = {}) {
  const list = section.querySelector('.constellation-vessel-list');
  const instruments = section.querySelector('.constellation-instrument-list');
  const registry = await loadConstellationRuntimeRoutes();
  const entries = Object.entries(registry.routes || {});
  const liveByProfile = probe ? await ignitionMap() : new Map();
  if (override?.profileId) liveByProfile.set(override.profileId, override);
  const routeError = liveByProfile.get('__error__');

  if (routeError) {
    list.innerHTML = `<p class="constellation-vessel-error">Ignition API unavailable · ${escapeHtml(routeError.error)}</p>`;
    instruments.innerHTML = '';
    return;
  }

  list.innerHTML = entries.map(([voiceId, entry]) => bindingMarkup(voiceId, entry, entry.profileId ? liveByProfile.get(entry.profileId) : null)).join('');
  const reasoner = registry.optionalProfiles?.deepReasoner;
  instruments.innerHTML = reasoner ? reasonerMarkup(reasoner, liveByProfile.get(reasoner.profileId)) : '';
}

async function runButton(button, action) {
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = 'Igniting…';
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
}

function bindActions(section) {
  if (section.dataset.ignitionBound === 'true') return;
  section.dataset.ignitionBound = 'true';

  section.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.matches('[data-vessel-probe]')) {
      button.disabled = true;
      button.textContent = 'Probing…';
      try { await renderBindings(section, { probe: true }); }
      finally { button.disabled = false; button.textContent = 'Probe'; }
      return;
    }

    if (button.matches('[data-start-ollama]')) {
      const result = await runButton(button, () => startBifrostOllama());
      if (!result.ok && result.error) console.warn('[Bifröst ignition]', result.error);
      await renderBindings(section, { probe: true });
      return;
    }

    if (button.matches('[data-ignite-voice]')) {
      const voiceId = button.dataset.igniteVoice;
      const provider = button.dataset.provider;
      let allowRemoteProbe = false;
      if (provider && provider !== 'ollama') {
        allowRemoteProbe = window.confirm(`Verify ${voiceId} through its remote provider? This sends one tiny model request and may incur provider usage.`);
        if (!allowRemoteProbe) return;
      }
      const receipt = await runButton(button, () => igniteConstellationVoice(voiceId, {
        startOllama: provider === 'ollama',
        allowRemoteProbe,
      }));
      await renderBindings(section, { probe: true, override: receipt });
      return;
    }

    if (button.matches('[data-ignite-reasoner]')) {
      const allowed = window.confirm('Ignite the optional 35B deep-reasoning instrument? This does not make it a Constellation voice and does not download missing weights.');
      if (!allowed) return;
      const receipt = await runButton(button, () => igniteDeepReasoner({ startOllama: true }));
      await renderBindings(section, { probe: true, override: receipt });
    }
  });
}

function injectStyles() {
  if (document.querySelector('#arcsweep-vessel-status-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-vessel-status-styles';
  style.textContent = `
    .constellation-vessel-status { margin:.35rem 0 .7rem; padding:.55rem; border:1px solid color-mix(in srgb,var(--gold) 16%,transparent); border-radius:.65rem; }
    .constellation-vessel-head,.constellation-vessel-title { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem; }
    .constellation-vessel-actions,.constellation-vessel-row-actions { display:flex; gap:.35rem; align-items:center; flex-wrap:wrap; }
    .constellation-vessel-list,.constellation-instrument-list { display:grid; gap:.35rem; margin-top:.4rem; }
    .constellation-vessel { padding:.4rem .45rem; border-radius:.45rem; background:color-mix(in srgb,var(--panel-solid) 88%,transparent); }
    .constellation-vessel-instrument { border:1px dashed color-mix(in srgb,var(--gold) 24%,transparent); }
    .constellation-vessel.mismatch { outline:1px solid currentColor; }
    .constellation-vessel-title { font-size:.74rem; text-transform:none; }
    .constellation-vessel-title span { opacity:.7; }
    .constellation-vessel-model { margin:.12rem 0; font-size:.72rem; overflow-wrap:anywhere; }
    .constellation-vessel small { display:block; font-size:.62rem; opacity:.58; overflow-wrap:anywhere; }
    .constellation-vessel-row-actions { margin-top:.32rem; }
    .constellation-vessel-note { margin:.4rem 0 0; font-size:.68rem; opacity:.66; line-height:1.35; }
    .constellation-vessel-error { color:var(--danger,#e6a0a0); opacity:.9 !important; }
    .constellation-vessel-fire { font-size:.9rem; }
  `;
  document.head.append(style);
}

async function attach() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  const section = ensureStatusArea(root);
  if (!section) return false;
  bindActions(section);
  await renderBindings(section, { probe: true });
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
}

if (typeof document !== 'undefined') installConstellationVesselStatus();
