import { readWorldseedThreshold, receiptWorldseedThreshold } from './worldseed-threshold.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';
const ROOT_ID = 'worldseed-threshold-live';
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

async function writeState(state, reason = 'worldseed-threshold') {
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

function notice(message) {
  const status = document.querySelector('.notice');
  if (status) status.textContent = message;
}

function selectedWorldId(state) {
  return document.querySelector('[data-world-id].active')?.dataset.worldId || state?.activeWorldId || state?.worlds?.[0]?.id;
}

function proposalMarkup(proposal) {
  const detector = proposal.detector || {};
  const fold = detector.foldIndex === null || detector.foldIndex === undefined ? '—' : Number(detector.foldIndex).toFixed(4);
  return `<div class="worldseed-live-grid">
    <article class="worldseed-live-card"><span class="eyebrow">Threshold state</span><strong>${esc(proposal.status)}</strong><small>${detector.cycleId ? esc(detector.cycleId) : 'No receipted cycle yet'}</small></article>
    <article class="worldseed-live-card"><span class="eyebrow">Fold</span><strong>${detector.foldActive ? 'ACTIVE' : 'clear'}</strong><small>index ${esc(fold)} · ${proposal.detector.replayMatched === false ? 'replay mismatch' : 'replay intact or unavailable'}</small></article>
    <article class="worldseed-live-card"><span class="eyebrow">Threshold rules</span><strong>${proposal.thresholdRules.length}</strong><small>${esc(proposal.thresholdRules.map((rule) => rule.title).join(' · ') || 'No rooted Threshold Rule seeds')}</small></article>
    <article class="worldseed-live-card"><span class="eyebrow">Branch gate</span><strong>${proposal.branchCandidate ? 'candidate open' : 'no branch draft'}</strong><small>Branch creation remains a separate Steward action.</small></article>
  </div>`;
}

async function mount() {
  const heading = document.querySelector('main.content h1');
  if (heading?.textContent?.trim() !== 'Worlds') {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  const state = await readState();
  const host = document.getElementById('worldseed-live-instrument');
  if (!host || !state?.worlds?.length) return;
  const worldId = selectedWorldId(state);
  const world = state.worlds.find((item) => item.id === worldId);
  if (!world) return;
  let proposal;
  try {
    proposal = (state.worldseedThresholdProposals || []).find((item) => item.world?.id === worldId)
      || readWorldseedThreshold(state, worldId);
  } catch (error) {
    const markup = `<article id="${ROOT_ID}" class="worldseed-live-card"><p class="callout">Threshold Detector stopped: ${esc(error.message)}</p></article>`;
    const current = document.getElementById(ROOT_ID);
    if (current?.outerHTML === markup) return;
    if (current) current.outerHTML = markup;
    else host.insertAdjacentHTML('beforeend', markup);
    return;
  }
  const markup = `<article id="${ROOT_ID}" class="worldseed-live-card" data-world-id="${esc(worldId)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Threshold Detector · Worldseed branch gate</p><h3>${esc(world.name)}</h3><p class="muted">Reads the latest Math Spine fold and turns it into a branch proposal, never an automatic fork.</p></div><div class="button-row"><button type="button" data-worldseed-threshold-read>Read latest Threshold</button>${proposal.branchDraft ? '<button type="button" class="quiet" data-worldseed-threshold-draft>Use as Fork draft</button>' : ''}</div></div>
    ${proposalMarkup(proposal)}
    ${proposal.branchDraft ? `<article class="worldseed-live-card"><h4>Prepared branch</h4><p><b>${esc(proposal.branchDraft.childName)}</b></p><p>${esc(proposal.branchDraft.branchPoint)}</p><p class="muted">${esc(proposal.branchDraft.reason)}</p></article>` : ''}
  </article>`;
  const current = document.getElementById(ROOT_ID);
  if (current?.outerHTML === markup) return;
  if (current) current.outerHTML = markup;
  else host.insertAdjacentHTML('beforeend', markup);
}

document.addEventListener('click', async (event) => {
  const readButton = event.target.closest('[data-worldseed-threshold-read]');
  if (readButton) {
    const root = readButton.closest(`#${ROOT_ID}`);
    const worldId = root?.dataset.worldId;
    const state = await readState();
    if (!state || !worldId) return;
    try {
      const proposal = receiptWorldseedThreshold(state, worldId);
      await writeState(state, 'worldseed-threshold-read');
      notice(proposal.branchCandidate
        ? `Threshold branch candidate receipted · ${proposal.detector.cycleId}.`
        : `Threshold read · ${proposal.status}.`);
      await mount();
    } catch (error) {
      notice(`Threshold read stopped: ${error.message}`);
    }
    return;
  }

  const draftButton = event.target.closest('[data-worldseed-threshold-draft]');
  if (!draftButton) return;
  const root = draftButton.closest(`#${ROOT_ID}`);
  const worldId = root?.dataset.worldId;
  const state = await readState();
  const proposal = (state?.worldseedThresholdProposals || []).find((item) => item.world?.id === worldId && item.branchDraft);
  const form = document.querySelector('[data-worldseed-fork-form]');
  if (!proposal?.branchDraft || !form) {
    notice('Threshold draft could not find the Fork World form.');
    return;
  }
  const draft = proposal.branchDraft;
  if (form.elements.name) form.elements.name.value = draft.childName;
  if (form.elements.mode) form.elements.mode.value = draft.mode;
  if (form.elements.branchPoint) form.elements.branchPoint.value = draft.branchPoint;
  if (form.elements.reason) form.elements.reason.value = draft.reason;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  notice('Threshold proposal copied into Fork World. Review it, then choose whether to create the branch.');
});

const observer = new MutationObserver(() => queueMicrotask(() => { void mount(); }));
observer.observe(document.getElementById('app'), { childList: true, subtree: true });
void mount();
