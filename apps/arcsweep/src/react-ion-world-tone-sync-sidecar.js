import {
  readReactionRegistryStore,
  writeReactionRegistryStore,
} from './react-ion-registry-sidecar.js';
import { syncApprovedWorldTonesToRegistry } from './react-ion-world-tone-sync.js';

const APPROVAL_KEY = 'hearthgate.world-tone-approvals.v1';
let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function approvalReceipts() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(APPROVAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function render(message = '') {
  const receipts = approvalReceipts();
  const approved = receipts.filter((receipt) => receipt?.decision === 'approved').length;
  return `<section class="panel reaction-world-tone-sync" data-reaction-world-tone-sync>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Runa · approved World Tone bridge</p><h3>World Tone Sync</h3><p class="muted">Import approved human-calibrated World Tone roots into existing world-level dimensional registrations. Frequency can enrich a registered destination; it can never manufacture a dimensional address.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <p class="muted">${receipts.length} World Tone decision receipt${receipts.length === 1 ? '' : 's'} present · ${approved} approval${approved === 1 ? '' : 's'} in the ledger.</p>
    <button type="button" data-reaction-world-tone-action="sync">Sync approved World Tones into DNS profiles</button>
  </section>`;
}

function mount() {
  if (mounting || document.querySelector('[data-reaction-world-tone-sync]')) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (title !== 'Worlds') return;
  const main = document.querySelector('main.content');
  if (!main) return;
  mounting = true;
  try {
    const registry = main.querySelector('[data-reaction-registry]');
    if (registry) registry.insertAdjacentHTML('afterend', render());
    else main.insertAdjacentHTML('beforeend', render());
  } finally {
    mounting = false;
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-reaction-world-tone-action="sync"]');
  if (!button) return;
  const panel = button.closest('[data-reaction-world-tone-sync]');
  button.disabled = true;
  try {
    const result = await syncApprovedWorldTonesToRegistry({
      store: readReactionRegistryStore(),
      approvalReceipts: approvalReceipts(),
    });
    writeReactionRegistryStore(result.store);
    const report = result.report;
    const pieces = [
      `${report.updated.length} destination profile${report.updated.length === 1 ? '' : 's'} updated`,
      `${report.unchanged.length} already current`,
      `${report.missing_destination.length} approval${report.missing_destination.length === 1 ? '' : 's'} awaiting a world-level dimensional address`,
    ];
    panel.outerHTML = render(pieces.join(' · '));
    const registry = document.querySelector('[data-reaction-registry]');
    if (registry) registry.remove();
  } catch (error) {
    panel.outerHTML = render(`World Tone sync stopped: ${error.message}`);
  }
});

const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
