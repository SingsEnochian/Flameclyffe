import {
  CONSTELLATION_REASONING_PREFERENCE_EVENT,
  reasoningSummariesEnabled,
  setReasoningSummariesEnabled,
} from './constellation-reasoning-preference.js';

let mounting = false;

function activeRoom() {
  return document.querySelector('.nav-button.active[data-room]')?.dataset.room || null;
}

function markup(enabled) {
  return `<section class="panel constellation-reasoning-toggle-panel" data-constellation-reasoning-toggle-panel>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Constellation · answer transparency</p><h2>Reasoning Summaries</h2><p class="muted">Ask each responding Flame for a brief, deliberately shareable rationale beside its visible answer.</p></div></div>
    <label class="toggle-row"><input type="checkbox" data-constellation-reasoning-toggle ${enabled ? 'checked' : ''}> <span>Show reasoning summaries</span></label>
    <p class="muted">This requests a concise visible rationale. It does not expose or store private hidden chain-of-thought.</p>
  </section>`;
}

function mount() {
  if (mounting) return;
  const room = activeRoom();
  if (!['settings', 'deep-observer', 'commons'].includes(room)) return;
  mounting = true;
  try {
    const html = markup(reasoningSummariesEnabled());
    const existing = document.querySelector('[data-constellation-reasoning-toggle-panel]');
    if (existing) {
      existing.outerHTML = html;
      return;
    }
    const semantic = document.querySelector('[data-semantic-projection-panel]');
    if (semantic && room !== 'settings') semantic.insertAdjacentHTML('beforebegin', html);
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally {
    mounting = false;
  }
}

document.addEventListener('change', (event) => {
  const input = event.target.closest?.('[data-constellation-reasoning-toggle]');
  if (!input) return;
  setReasoningSummariesEnabled(Boolean(input.checked));
});

globalThis.addEventListener?.(CONSTELLATION_REASONING_PREFERENCE_EVENT, () => mount());
const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
