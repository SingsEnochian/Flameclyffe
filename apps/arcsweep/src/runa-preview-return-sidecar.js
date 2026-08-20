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
  const cycleId = link?.source?.observation_cycle_id || link?.source?.feedback_cycle_id || null;
  const cycle = cycleId ? (state.feedbackCycles || []).find((item) => item.cycle_id === cycleId) || null : null;
  const queueEntry = cycle ? state.feedbackQueue?.entries?.[cycle.cycle_id] || null : null;
  const deepTime = cycle ? (obs.deep_time_records || []).find((item) => item.provenance?.observation_run_id === cycle.cycle_id) || null : null;
  const observationSource = link?.source?.observation_source || queueEntry?.observation_source || 'relational-feedback';
  return { state, world, obs, link, cycle, queueEntry, deepTime, observationSource };
}

function sourceLabel(source) {
  if (source === 'field') return 'Field observation';
  if (source === 'relational-observation') return 'Relational observation';
  return 'Relational Feedback';
}

function render(c, message = '') {
  const status = !c.link ? 'WAITING' : !c.cycle ? 'LINK ONLY' : c.deepTime ? 'RETURNED TO TIME' : c.queueEntry?.status === 'accepted' ? 'ACCEPTED' : (c.queueEntry?.status || 'REVIEW PENDING').toUpperCase();
  const linkId = c.link?.link_id || '—';
  const cycleId = c.cycle?.cycle_id || '—';
  const label = sourceLabel(c.observationSource);
  return `<section class="panel runa-preview-return" data-runa-preview-return><div class="section-heading compact-heading"><div><p class="eyebrow">Render → observation → accepted trajectory</p><h2>Runa Observation Return</h2><p class="muted">A preview render becomes historical state only through a later reviewable observation. Field and relational Feedback use the same human admission gate to DEEPTime.</p></div><span class="bai-topology-badge">${esc(status)}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}<dl class="facts"><div><dt>Observation link</dt><dd>${esc(linkId)}</dd></div><div><dt>Observation source</dt><dd>${esc(label)}</dd></div><div><dt>Observation cycle</dt><dd>${esc(cycleId)}</dd></div><div><dt>Human review</dt><dd>${esc(c.queueEntry?.status || 'not yet reviewed')}</dd></div><div><dt>DEEPTime</dt><dd>${esc(c.deepTime?.id || 'not admitted')}</dd></div></dl>${c.link && c.cycle && c.queueEntry?.status === 'accepted' && !c.deepTime ? '<button type="button" data-runa-return-action="admit">Admit accepted observation to DEEPTime</button>' : ''}${c.link && c.cycle && c.queueEntry?.status !== 'accepted' && !c.deepTime ? `<p class="muted">Review this ${esc(label)} in the shared queue first. The preview does not bypass the acceptance gate.</p>` : ''}${c.deepTime ? `<p class="callout"><b>Trajectory returned.</b> λ ${c.deepTime.lambda} · ${esc(c.deepTime.id)}. This accepted observation can now contribute to later history-sensitive analysis.</p>` : ''}</section>`;
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
    if (!c?.cycle || !c?.queueEntry || !c?.link) throw new Error('A linked reviewable observation is required.');
    if (c.queueEntry.status !== 'accepted') throw new Error('Observation must be explicitly accepted before DEEPTime admission.');
    if (c.deepTime) throw new Error('This observation cycle is already present in DEEPTime.');
    const worldRecords = (c.obs.deep_time_records || [])
      .filter((item) => item.world_id === c.world.id)
      .sort((left, right) => Number(left.lambda) - Number(right.lambda));
    const previousRecord = worldRecords.at(-1) || null;
    const mask = c.observationSource === 'field'
      ? 'runa-preview-field-human-review/v1'
      : 'runa-preview-feedback-human-review/v1';
    const record = await createDeepTimeRecordFromAcceptedFeedback({
      cycle: c.cycle,
      acceptedQueueEntry: c.queueEntry,
      previousRecord,
      acceptanceMaskId: mask,
    });
    const obs = structuredClone(c.obs);
    obs.deep_time_records = [...(obs.deep_time_records || []), structuredClone(record)];
    await persistObservatoryStore(obs, {
      reason: 'runa-preview-observation-deep-time',
      deepTimeRecordId: record.id,
      observationCycleId: c.cycle.cycle_id,
      observationSource: c.observationSource,
      observationLinkId: c.link.link_id,
    });
    notify({ deep_time_record_id: record.id, observation_source: c.observationSource });
    await mount(`Accepted ${sourceLabel(c.observationSource)} admitted to DEEPTime as ${record.id}.`);
  } catch (error) {
    await mount(`Runa observation return stopped: ${error.message}`);
  }
});

globalThis.addEventListener?.('arcsweep:receipts-updated', () => { void mount(); });
const observer = new MutationObserver(() => { if (!document.querySelector('[data-runa-preview-return]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
