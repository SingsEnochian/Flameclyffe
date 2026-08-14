import { loadState, persistObservatoryStore } from './storage.js';
import { createDeepTimeRecordFromAcceptedFeedback } from './deep-time-bridge.js';

let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function notify(detail = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass('arcsweep:receipts-updated', { detail: { runa_preview_return: true, ...detail } }));
  }
}

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  if (!world) return null;
  const obs = state.observatory || {};
  const link = [...(obs.runa_preview_observation_links || [])].reverse().find((item) => item.world_id === world.id) || null;
  const cycle = link ? (state.feedbackCycles || []).find((item) => item.cycle_id === link.source?.feedback_cycle_id) || null : null;
  const queueEntry = cycle ? state.feedbackQueue?.entries?.[cycle.cycle_id] || null : null;
  const deepTime = cycle ? (obs.deep_time_records || []).find((item) => item.provenance?.observation_run_id === cycle.cycle_id) || null : null;
  return { state, world, obs, link, cycle, queueEntry, deepTime };
}

function render(c, message = '') {
  const status = !c.link ? 'WAITING' : !c.cycle ? 'LINK ONLY' : c.deepTime ? 'RETURNED TO TIME' : c.queueEntry?.status === 'accepted' ? 'ACCEPTED' : (c.queueEntry?.status || 'REVIEW PENDING').toUpperCase();
  const linkId = c.link?.link_id || '—';
  const cycleId = c.cycle?.cycle_id || '—';
  return `<section class="panel runa-preview-return" data-runa-preview-return><div class="section-heading compact-heading"><div><p class="eyebrow">Render → observation → accepted trajectory</p><h2>Runa Observation Return</h2><p class="muted">A preview render becomes historical state only through an observed Feedback cycle. Human review remains the admission gate to DEEPTime.</p></div><span class="bai-topology-badge">${esc(status)}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}<dl class="facts"><div><dt>Observation link</dt><dd>${esc(linkId)}</dd></div><div><dt>Feedback cycle</dt><dd>${esc(cycleId)}</dd></div><div><dt>Feedback review</dt><dd>${esc(c.queueEntry?.status || 'not yet reviewed')}</dd></div><div><dt>DEEPTime</dt><dd>${esc(c.deepTime?.id || 'not admitted')}</dd></div></dl>${c.link && c.cycle && c.queueEntry?.status === 'accepted' && !c.deepTime ? '<button type="button" data-runa-return-action="admit">Admit accepted observation to DEEPTime</button>' : ''}${c.link && c.cycle && c.queueEntry?.status !== 'accepted' && !c.deepTime ? '<p class="muted">Review this Feedback cycle in the normal queue first. The preview does not bypass the acceptance gate.</p>' : ''}${c.deepTime ? `<p class="callout"><b>Trajectory returned.</b> λ ${c.deepTime.lambda} · ${esc(c.deepTime.id)}. This accepted observation can now contribute to later history-sensitive analysis.</p>` : ''}</section>`;
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-runa-preview-return]')?.remove();
    return;
  }
  mounting = true;
  try {
    const c = await context();
    if (!c) return;
    const existing = document.querySelector('[data-runa-preview-return]');
    const html = render(c, message);
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-runa-return-action="admit"]');
  if (!button) return;
  try {
    const c = await context();
    if (!c?.cycle || !c?.queueEntry || !c?.link) throw new Error('A linked Feedback observation is required.');
    if (c.queueEntry.status !== 'accepted') throw new Error('Feedback must be explicitly accepted before DEEPTime admission.');
    if (c.deepTime) throw new Error('This Feedback cycle is already present in DEEPTime.');
    const worldRecords = (c.obs.deep_time_records || [])
      .filter((item) => item.world_id === c.world.id)
      .sort((left, right) => Number(left.lambda) - Number(right.lambda));
    const previousRecord = worldRecords.at(-1) || null;
    const record = await createDeepTimeRecordFromAcceptedFeedback({
      cycle: c.cycle,
      acceptedQueueEntry: c.queueEntry,
      previousRecord,
      acceptanceMaskId: 'runa-preview-feedback-human-review/v1',
    });
    const obs = structuredClone(c.obs);
    obs.deep_time_records = [...(obs.deep_time_records || []), structuredClone(record)];
    await persistObservatoryStore(obs, {
      reason: 'runa-preview-observation-deep-time',
      deepTimeRecordId: record.id,
      feedbackCycleId: c.cycle.cycle_id,
      observationLinkId: c.link.link_id,
    });
    notify({ deep_time_record_id: record.id });
    await mount(`Accepted preview observation admitted to DEEPTime as ${record.id}.`);
  } catch (error) {
    await mount(`Runa observation return stopped: ${error.message}`);
  }
});

globalThis.addEventListener?.('arcsweep:receipts-updated', () => { void mount(); });
const observer = new MutationObserver(() => { if (!document.querySelector('[data-runa-preview-return]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
