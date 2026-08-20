import { loadState } from './storage.js';
import { ensureContinuityEvidenceLedger } from './continuity-evidence-state.js';
import { createContinuityEvidenceReplay } from './continuity-evidence-replay.js';

let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function replaySurfaceActive() {
  const room = document.querySelector('.nav-button.active[data-room]')?.dataset.room;
  return room === 'feedback' || room === 'replay';
}

function activeWorld(state) {
  return state.worlds?.find((world) => world.id === state.activeWorldId) || state.worlds?.[0] || null;
}

async function renderReplay() {
  const state = await loadState();
  const world = activeWorld(state);
  const ledger = ensureContinuityEvidenceLedger(state);
  const replay = await createContinuityEvidenceReplay({ ledger, worldId: world?.id || null });
  return `<section class="panel continuity-replay-panel" data-continuity-replay-panel>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Receipts & replay · Continuity Evidence</p><h2>Continuity Replay</h2><p class="muted">Rebuild the current evidence slice from immutable receipt fingerprints without reclassifying it.</p></div></div>
    <dl class="facts"><div><dt>Evidence</dt><dd>${replay.evidence_count}</dd></div><div><dt>Recognition</dt><dd>${replay.summary.recognition_count}</dd></div><div><dt>Residuals</dt><dd>${replay.summary.residual_count}</dd></div><div><dt>World</dt><dd>${esc(world?.name || 'all worlds')}</dd></div></dl>
    <p><b>Replay fingerprint</b><br><code>${esc(replay.evidence_fingerprint)}</code></p>
    <button type="button" class="quiet" data-continuity-replay-refresh>Recompute replay fingerprint</button>
    <p class="muted">Exact match means the receipted evidence slice is unchanged. It does not prove identity, fulfilment, or canon.</p>
  </section>`;
}

async function mount() {
  if (mounting || !replaySurfaceActive()) return;
  mounting = true;
  try {
    const html = await renderReplay();
    const existing = document.querySelector('[data-continuity-replay-panel]');
    if (existing) existing.outerHTML = html;
    else {
      const anchor = document.querySelector('.feedback-ledger') || document.querySelector('main.content');
      anchor?.insertAdjacentHTML('beforeend', html);
    }
  } finally { mounting = false; }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-continuity-replay-refresh]')) void mount();
});

globalThis.addEventListener?.('arcsweep:continuity-evidence-updated', () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
