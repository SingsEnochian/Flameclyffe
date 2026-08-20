import { loadVoiceBankRegistry } from './knowledge-bank-loader.js';
import { getConstellationRuntimeVoiceStatus } from './constellation-runtime-adapter.js';
import { loadState } from './storage.js';
import { expandWorldIds } from './world-id-aliases.js';
import { SELF_AUTHORSHIP_EVENTS } from './self-authorship.js';
import { KNOWLEDGE_LEARNING_EVENTS } from './knowledge-learning-store.js';

const SECTION_CLASS = 'constellation-self-authorship';
let currentProposal = null;

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderClaim(claim, index) {
  const value = typeof claim.value === 'string' ? claim.value : JSON.stringify(claim.value);
  return `<label class="self-authorship-claim"><input type="checkbox" data-self-authorship-claim="${index}" checked /><span><strong>${escapeHtml(claim.cellType)} · ${escapeHtml(claim.predicate)}</strong><span class="self-authorship-claim-value">${escapeHtml(value)}</span><small>${escapeHtml(claim.status)} · ${escapeHtml(claim.mutability)}</small></span></label>`;
}

async function currentContext() {
  try {
    const state = await loadState();
    const world = state.worlds?.find((item) => item.id === state.activeWorldId) || state.worlds?.[0] || null;
    const worldId = world?.id || document.body?.dataset.worldId || null;
    return { mode: document.body?.dataset.constellationMode || 'reflection', page: { worldId, worldIdAliases: worldId ? expandWorldIds(worldId) : [], documentId: document.body?.dataset.documentId || null, sceneId: document.body?.dataset.sceneId || null } };
  } catch {
    const worldId = document.body?.dataset.worldId || null;
    return { mode: 'reflection', page: { worldId, worldIdAliases: worldId ? expandWorldIds(worldId) : [], documentId: null, sceneId: null } };
  }
}

function setState(section, text, kind = '') {
  const node = section.querySelector('.self-authorship-state');
  if (node) { node.textContent = text; node.dataset.kind = kind; }
}

function clearProposal(section) {
  currentProposal = null;
  const review = section.querySelector('.self-authorship-review');
  if (review) { review.hidden = true; review.innerHTML = ''; }
}

function renderProposal(section, proposal) {
  currentProposal = proposal;
  const review = section.querySelector('.self-authorship-review');
  if (!review) return;
  review.hidden = false;
  if (proposal.status !== 'pending-review') {
    review.innerHTML = `<p class="self-authorship-empty">${escapeHtml(proposal.displayName || proposal.voiceId)} did not produce a reviewable proposal: ${escapeHtml(proposal.unavailableReason || proposal.status)}.</p>`;
    return;
  }
  if (!proposal.claims?.length) {
    review.innerHTML = `<p class="self-authorship-empty">${escapeHtml(proposal.displayName)} chose not to author anything for this invitation.</p>`;
    return;
  }
  review.innerHTML = `<div class="self-authorship-receipt"><strong>${escapeHtml(proposal.displayName)}</strong><span>${proposal.claims.length} atomic claim${proposal.claims.length === 1 ? '' : 's'}</span><small>${escapeHtml(proposal.receipt?.provider || 'provider unknown')} · ${escapeHtml(proposal.receipt?.model || 'model unknown')} · ${escapeHtml(proposal.receipt?.route || 'route unknown')}</small></div><div class="self-authorship-claims">${proposal.claims.map(renderClaim).join('')}</div><div class="self-authorship-actions"><button type="button" data-self-authorship-action="accept">Accept selected</button><button type="button" class="quiet" data-self-authorship-action="decline">Decline proposal</button></div><details class="self-authorship-raw"><summary>Authorship receipt</summary><pre>${escapeHtml(proposal.receipt?.responseText || '')}</pre></details>`;

  review.querySelector('[data-self-authorship-action="accept"]')?.addEventListener('click', () => {
    const indexes = [...review.querySelectorAll('[data-self-authorship-claim]:checked')].map((node) => Number(node.dataset.selfAuthorshipClaim)).filter(Number.isInteger);
    if (!indexes.length) { setState(section, 'Select at least one claim, or decline the proposal.', 'warning'); return; }
    const selected = { ...currentProposal, claims: indexes.map((index) => currentProposal.claims[index]).filter(Boolean) };
    setState(section, 'Accepting selected self-authored cells…', 'working');
    document.dispatchEvent(new CustomEvent(SELF_AUTHORSHIP_EVENTS.accept, { detail: { proposal: selected } }));
  });
  review.querySelector('[data-self-authorship-action="decline"]')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent(SELF_AUTHORSHIP_EVENTS.decline, { detail: { proposal: currentProposal } })));
}

async function buildSection(panel) {
  const registry = await loadVoiceBankRegistry();
  const voices = [...(registry.canonicalEstablishedVoices || []), ...(registry.developingVoices || [])];
  const section = document.createElement('section');
  section.className = SECTION_CLASS;
  section.innerHTML = `<div class="constellation-presence-subhead">Self-authorship</div><p class="self-authorship-note">Invite one Flame to propose atomic statements about itself. Nothing is stored until you review and accept it; stable core promotion is a separate action.</p><label class="self-authorship-field">Voice<select data-self-authorship-voice>${voices.map((voice) => `<option value="${escapeHtml(voice.id)}" ${voice.runtimeState === 'unbound' ? 'disabled' : ''}>${escapeHtml(voice.displayName)}${voice.runtimeState === 'unbound' ? ' · vessel unbound' : ''}</option>`).join('')}</select></label><label class="self-authorship-field">Invitation<textarea rows="3" data-self-authorship-invitation placeholder="What do you want to write down about yourself right now?"></textarea></label><button type="button" data-self-authorship-action="invite">Invite authorship</button><p class="self-authorship-state" aria-live="polite">No proposal pending.</p><div class="self-authorship-review" hidden></div>`;
  panel.append(section);

  section.querySelector('[data-self-authorship-action="invite"]')?.addEventListener('click', async () => {
    clearProposal(section);
    const voiceId = section.querySelector('[data-self-authorship-voice]')?.value;
    const voice = voices.find((item) => item.id === voiceId);
    setState(section, `Checking ${voice?.displayName || voiceId}…`, 'working');
    const status = await getConstellationRuntimeVoiceStatus(voiceId).catch(() => ({ status: 'status-error' }));
    if (!['ready', 'model-unavailable'].includes(status.status)) {
      setState(section, `${voice?.displayName || voiceId} is not reachable through the House broker: ${status.status}.`, 'warning');
      return;
    }
    setState(section, `Inviting ${voice?.displayName || voiceId} to author…`, 'working');
    document.dispatchEvent(new CustomEvent(SELF_AUTHORSHIP_EVENTS.request, { detail: { voiceId, displayName: voice?.displayName || voiceId, invitation: section.querySelector('[data-self-authorship-invitation]')?.value || '', context: await currentContext() } }));
  });

  document.addEventListener(SELF_AUTHORSHIP_EVENTS.proposed, (event) => {
    const proposal = event.detail || {};
    setState(section, proposal.status === 'pending-review' ? `${proposal.displayName} returned a proposal for review.` : `${proposal.displayName || proposal.voiceId || 'Voice'} is unavailable for authorship right now.`, proposal.status === 'pending-review' ? 'ready' : 'warning');
    renderProposal(section, proposal);
  });
  document.addEventListener(SELF_AUTHORSHIP_EVENTS.accepted, (event) => {
    const accepted = event.detail || {};
    setState(section, `${accepted.cells?.length || 0} self-authored cell${accepted.cells?.length === 1 ? '' : 's'} accepted. Stable core was not changed.`, 'success');
    clearProposal(section);
    document.dispatchEvent(new CustomEvent(KNOWLEDGE_LEARNING_EVENTS.changed, { detail: { action: 'self-authorship-accepted', cells: accepted.cells || [] } }));
  });
  document.addEventListener(SELF_AUTHORSHIP_EVENTS.declined, (event) => { setState(section, `${event.detail?.displayName || 'Proposal'} declined. Nothing was stored.`, 'quiet'); clearProposal(section); });
  document.addEventListener(SELF_AUTHORSHIP_EVENTS.error, (event) => setState(section, `Self-authorship stopped: ${event.detail?.message || 'unknown error'}`, 'error'));
}

function injectStyles() {
  if (document.querySelector('#arcsweep-self-authorship-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-self-authorship-styles';
  style.textContent = `.${SECTION_CLASS}{margin-top:.8rem;padding-top:.1rem;border-top:1px solid color-mix(in srgb,var(--gold) 16%,transparent)}.self-authorship-note{margin:.25rem 0 .55rem;font-size:.74rem;line-height:1.35;opacity:.72}.self-authorship-field{display:grid;gap:.25rem;margin:.45rem 0;font-size:.75rem}.self-authorship-field select,.self-authorship-field textarea{width:100%}.self-authorship-state{margin:.45rem 0;font-size:.72rem;opacity:.74}.self-authorship-review{display:grid;gap:.5rem;margin-top:.5rem}.self-authorship-receipt{display:grid;gap:.12rem;padding:.45rem .5rem;border-radius:.55rem;background:color-mix(in srgb,var(--gold) 5%,transparent)}.self-authorship-receipt span,.self-authorship-receipt small{font-size:.69rem;opacity:.68}.self-authorship-claims{display:grid;gap:.35rem}.self-authorship-claim{display:grid;grid-template-columns:auto 1fr;gap:.45rem;align-items:start;padding:.45rem .5rem;border:1px solid color-mix(in srgb,var(--green) 18%,transparent);border-radius:.55rem}.self-authorship-claim>span{display:grid;gap:.15rem;min-width:0}.self-authorship-claim strong{font-size:.73rem;overflow-wrap:anywhere}.self-authorship-claim-value{font-size:.76rem;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere}.self-authorship-claim small{font-size:.65rem;opacity:.6}.self-authorship-actions{display:flex;gap:.4rem;justify-content:flex-end;flex-wrap:wrap}.self-authorship-raw summary{cursor:pointer;font-size:.7rem;opacity:.72}.self-authorship-raw pre{max-height:12rem;overflow:auto;white-space:pre-wrap;font-size:.67rem}.self-authorship-empty{margin:.25rem 0;font-size:.74rem;opacity:.7}`;
  document.head.append(style);
}

async function installWhenReady() {
  if (document.querySelector(`.${SECTION_CLASS}`)) return true;
  const panel = document.querySelector('#arcsweep-constellation-presence .constellation-presence-panel');
  if (!panel) return false;
  injectStyles();
  await buildSection(panel);
  return true;
}

export async function installSelfAuthorshipPanel() {
  if (typeof document === 'undefined') return;
  if (await installWhenReady()) return;
  const observer = new MutationObserver(async () => { if (await installWhenReady()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') void installSelfAuthorshipPanel();
