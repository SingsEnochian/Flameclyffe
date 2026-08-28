import { invokeAemethParticipant } from './aemeth-lens.js';
import { readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

export const AEMETH_LIVE_DECORATOR_VERSION = 'aemeth-chamber-live/v1';

export function aemethRecordFromForm(form) {
  if (!form) return {};
  const values = Object.fromEntries(new FormData(form).entries());
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? '')]));
}

export function formatAemethModelWitness(receipt) {
  const provenance = [receipt.provider, receipt.model].filter(Boolean).join(' · ');
  return [
    `OA · ${receipt.createdAt || new Date().toISOString()} · ${receipt.status || 'replied'}`,
    provenance,
    receipt.text || '',
  ].filter(Boolean).join('\n');
}

export function appendAemethModelWitness(current, receipt) {
  return [String(current || '').trim(), formatAemethModelWitness(receipt)].filter(Boolean).join('\n\n---\n\n');
}

function statusNode(root) {
  return root.querySelector('[data-aemeth-oa-status]');
}

function setStatus(root, message, state = 'idle') {
  const node = statusNode(root);
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

async function resolveHouseToken() {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession();
}

export async function inviteOxAlphaFromAemethForm(form, { fetchImpl = fetch } = {}) {
  const token = await resolveHouseToken();
  if (!token) throw new Error('Connect the House Runtime before inviting OA.');
  const record = aemethRecordFromForm(form);
  const receipt = await invokeAemethParticipant({ record, participantId: 'oxalpha', token, fetchImpl });
  const log = form.querySelector('[name="modelWitnessLog"]');
  if (!log) throw new Error('Aemeth model witness lane is unavailable.');
  log.value = appendAemethModelWitness(log.value, receipt);
  log.dispatchEvent(new Event('input', { bubbles: true }));
  log.dispatchEvent(new Event('change', { bubbles: true }));
  return receipt;
}

function decorateAemethForm(form) {
  if (!form || form.dataset.aemethLiveDecorator === AEMETH_LIVE_DECORATOR_VERSION) return;
  form.dataset.aemethLiveDecorator = AEMETH_LIVE_DECORATOR_VERSION;
  const log = form.querySelector('[name="modelWitnessLog"]');
  if (!log) return;

  const panel = document.createElement('section');
  panel.className = 'aemeth-oa-panel';
  panel.dataset.aemethOaPanel = 'true';
  panel.innerHTML = `
    <div class="aemeth-oa-heading">
      <div>
        <p class="eyebrow">Model witness · separate lane</p>
        <h3>Ox Alpha · OA</h3>
      </div>
      <span class="aemeth-oa-route">Hugging Face · GLM-5.3-Flash</span>
    </div>
    <p class="muted">OA receives the chamber configuration and Rowan-authored witness as a structured packet. OA's reply is stored here as model interpretation; it never replaces firsthand witness or infers Qualia.</p>
    <div class="button-row">
      <button type="button" data-aemeth-invite-oa>Invite OA into this chamber state</button>
      <span class="aemeth-oa-status" data-aemeth-oa-status data-state="idle">Ready when the House Runtime is connected.</span>
    </div>`;
  log.closest('label')?.insertAdjacentElement('beforebegin', panel);

  panel.querySelector('[data-aemeth-invite-oa]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    setStatus(panel, 'OA is reading the chamber packet…', 'working');
    try {
      const receipt = await inviteOxAlphaFromAemethForm(form);
      setStatus(panel, `${receipt.displayName} replied · ${receipt.provider} · ${receipt.model}. Saving receipt…`, 'success');
      const submitter = form.querySelector('button[type="submit"]');
      if (submitter) form.requestSubmit(submitter);
    } catch (error) {
      setStatus(panel, `OA invitation stopped: ${error.message}`, 'error');
      button.disabled = false;
    }
  });
}

export function installAemethLiveDecorator(root = document) {
  const decorate = () => {
    const form = root.querySelector?.('#record-form[data-room-id="aemeth-lens"]');
    if (form) decorateAemethForm(form);
  };
  decorate();
  const target = root.querySelector?.('#app') || root.body || root.documentElement;
  if (!target || typeof MutationObserver === 'undefined') return null;
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      decorate();
    });
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
}

if (typeof document !== 'undefined') installAemethLiveDecorator(document);
