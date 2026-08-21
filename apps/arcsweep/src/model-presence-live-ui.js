import {
  MODEL_PRESENCE_EVENT,
  currentModelPresence,
  refreshModelPresence,
} from './model-presence-bus.js';

const ROOT_ID = 'arcsweep-model-presence-live';

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function selectedVoiceIds() {
  return [...new Set(String(document.body?.dataset.constellationVoices || '')
    .split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function row(record) {
  const model = [record.provider, record.model].filter(Boolean).join(' · ') || 'route not attested';
  const detail = [
    record.world_id ? `world ${record.world_id}` : null,
    record.latency_ms != null ? `${record.latency_ms} ms` : null,
    record.task ? `task ${record.task}` : null,
  ].filter(Boolean).join(' · ') || 'no active task';
  return `<article class="model-presence-row" data-model-presence-voice="${escapeHtml(record.voice_id)}" data-state="${escapeHtml(record.state)}">
    <div class="model-presence-head"><strong>${escapeHtml(record.display_name || record.voice_id)}</strong><span>${escapeHtml(record.state)}</span></div>
    <div class="model-presence-model">${escapeHtml(model)}</div>
    <small>${escapeHtml(detail)}</small>
    ${record.reason ? `<small class="model-presence-reason">${escapeHtml(record.reason)}</small>` : ''}
  </article>`;
}

function render(root) {
  const records = currentModelPresence().sort((a, b) => a.voice_id.localeCompare(b.voice_id));
  const list = root.querySelector('[data-model-presence-list]');
  const count = root.querySelector('[data-model-presence-count]');
  if (count) count.textContent = `${records.length} tracked`;
  if (list) list.innerHTML = records.length ? records.map(row).join('') : '<p class="model-presence-empty">No Flame presence has been observed in this session yet.</p>';
}

async function refreshSelected(root) {
  const ids = selectedVoiceIds();
  const button = root.querySelector('[data-model-presence-refresh]');
  if (button) button.disabled = true;
  try {
    await Promise.all(ids.map((voiceId) => refreshModelPresence(voiceId)));
  } finally {
    if (button) button.disabled = false;
    render(root);
  }
}

function styles() {
  if (document.getElementById('arcsweep-model-presence-live-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-model-presence-live-styles';
  style.textContent = `#${ROOT_ID}{position:fixed;left:1rem;bottom:1rem;z-index:69;width:min(24rem,calc(100vw - 2rem));font:inherit}.model-presence-toggle{display:flex;align-items:center;gap:.45rem;border-radius:999px;padding:.55rem .8rem}.model-presence-toggle small{opacity:.68}.model-presence-panel{margin-top:.45rem;max-height:min(72vh,38rem);overflow:auto;padding:.75rem;border:1px solid color-mix(in srgb,var(--green) 28%,transparent);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 96%,black);box-shadow:0 .7rem 2.2rem rgb(0 0 0/.34)}.model-presence-toolbar{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.55rem}.model-presence-list{display:grid;gap:.4rem}.model-presence-row{padding:.5rem .55rem;border:1px solid color-mix(in srgb,var(--gold) 18%,transparent);border-radius:.65rem}.model-presence-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.model-presence-head span{text-transform:uppercase;letter-spacing:.08em;font-size:.68rem}.model-presence-model{margin-top:.2rem;font-size:.78rem}.model-presence-row small{display:block;margin-top:.18rem;opacity:.68;font-size:.68rem;overflow-wrap:anywhere}.model-presence-reason{opacity:.9!important}.model-presence-row[data-state="thinking"],.model-presence-row[data-state="speaking"]{border-color:color-mix(in srgb,var(--gold) 50%,transparent)}.model-presence-row[data-state="degraded"],.model-presence-row[data-state="error"]{border-color:color-mix(in srgb,#d78b78 62%,transparent)}.model-presence-empty{font-size:.75rem;opacity:.65}@media(max-width:700px){#${ROOT_ID}{left:.6rem;bottom:4.2rem;width:calc(100vw - 1.2rem)}}`;
  document.head.append(style);
}

export function installModelPresenceLiveUi() {
  if (typeof document === 'undefined') return;
  styles();
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('aside');
    root.id = ROOT_ID;
    root.setAttribute('aria-label', 'Live model presence');
    root.innerHTML = `<button type="button" class="model-presence-toggle" aria-expanded="false"><span aria-hidden="true">⌁</span><span>Model Presence</span><small data-model-presence-count>0 tracked</small></button><section class="model-presence-panel" hidden><div class="model-presence-toolbar"><strong>House Runtime live read</strong><button type="button" class="quiet" data-model-presence-refresh>Refresh</button></div><div class="model-presence-list" data-model-presence-list aria-live="polite"></div></section>`;
    document.body.append(root);
  }
  const toggle = root.querySelector('.model-presence-toggle');
  const panel = root.querySelector('.model-presence-panel');
  toggle?.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    render(root);
    if (open) void refreshSelected(root);
  });
  root.querySelector('[data-model-presence-refresh]')?.addEventListener('click', () => void refreshSelected(root));
  document.addEventListener(MODEL_PRESENCE_EVENT, () => render(root));
  document.addEventListener('arcsweep:constellation-selection-changed', () => { if (!panel.hidden) void refreshSelected(root); });
  render(root);
}

if (typeof document !== 'undefined') installModelPresenceLiveUi();
