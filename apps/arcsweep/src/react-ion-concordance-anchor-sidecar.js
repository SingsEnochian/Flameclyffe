import { loadState } from './storage.js';
import { createConcordanceAnchorDestination } from './react-ion-concordance-anchor.js';
import {
  readReactionRegistryStore,
  writeReactionRegistryStore,
} from './react-ion-registry-sidecar.js';

const ANCHOR_SHELF_KEY = 'pocket-concordance-lens-anchor-shelf-v0-1';
let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readAnchors() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(ANCHOR_SHELF_KEY) || '[]');
    return Array.isArray(value) ? value.filter((anchor) => anchor && typeof anchor === 'object') : [];
  } catch {
    return [];
  }
}

function render(state, message = '') {
  const anchors = readAnchors();
  const anchorOptions = anchors.map((anchor) => `<option value="${esc(anchor.id || anchor.slug)}">${esc(anchor.display_name || anchor.label || anchor.id || 'Unnamed anchor')} · ${esc(anchor.status || 'unknown')} · ${esc(anchor.consent_scope || 'private')}</option>`).join('');
  const worldOptions = (state.worlds || []).map((world) => `<option value="${esc(world.id)}">${esc(world.name)}</option>`).join('');
  return `<section class="panel reaction-concordance-bridge" data-reaction-concordance-bridge>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Pocket Concordance Lens · Bifröst</p><h3>Anchor DNS Bridge</h3><p class="muted">Publish local anchor metadata into the dimensional registry only by explicit action. Screen position never becomes an address, and camera image/video are not copied.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    ${anchors.length ? `<form data-reaction-concordance-form class="stack compact-stack">
      <div class="grid two compact-grid"><label>Concordance anchor<select name="anchorId">${anchorOptions}</select></label><label>World<select name="worldId">${worldOptions}</select></label></div>
      <div class="grid two compact-grid"><label>DNS name<input name="dnsName" required placeholder="window.hearthweave.terra" /></label><label>Aliases<input name="aliases" placeholder="first-window, desk-window" /></label></div>
      <label>Dimensional address<input name="address" required placeholder="10.20.30.40@220" /></label>
      <div class="grid two compact-grid"><label>Registration state<select name="state"><option>draft</option><option>approved</option><option>deprecated</option></select></label><label class="checkbox"><input name="publicationAuthorised" type="checkbox" /> I explicitly authorise publication when state is approved.</label></div>
      <button type="submit">Bridge anchor metadata into DNS</button>
    </form>` : '<p class="muted">No Pocket Concordance Lens anchors are present in this browser profile.</p>'}
  </section>`;
}

async function mount() {
  if (mounting || document.querySelector('[data-reaction-concordance-bridge]')) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (title !== 'Worlds') return;
  const main = document.querySelector('main.content');
  if (!main) return;
  mounting = true;
  try {
    const state = await loadState();
    const tone = main.querySelector('[data-reaction-world-tone-sync]');
    if (tone) tone.insertAdjacentHTML('afterend', render(state));
    else main.insertAdjacentHTML('beforeend', render(state));
  } finally {
    mounting = false;
  }
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-reaction-concordance-form]');
  if (!form) return;
  event.preventDefault();
  const panel = form.closest('[data-reaction-concordance-bridge]');
  try {
    const state = await loadState();
    const data = new FormData(form);
    const anchors = readAnchors();
    const anchor = anchors.find((item) => String(item.id || item.slug) === String(data.get('anchorId')));
    if (!anchor) throw new Error('The selected Concordance anchor is no longer available.');
    const world = (state.worlds || []).find((item) => item.id === data.get('worldId'));
    if (!world) throw new Error('The selected Arcsweep world is unavailable.');
    const store = readReactionRegistryStore();
    if (store.destinations.some((item) => item?.anchor?.id === (anchor.id || anchor.slug))) {
      throw new Error('This anchor already has a dimensional registration. Delete or deprecate it before publishing another.');
    }
    const bridge = await createConcordanceAnchorDestination({
      anchor,
      registrationId: uid('reaction-anchor'),
      dnsName: data.get('dnsName'),
      aliases: data.get('aliases'),
      worldId: world.id,
      worldName: world.name,
      address: data.get('address'),
      state: data.get('state'),
      publicationAuthorised: form.elements.publicationAuthorised.checked,
    });
    store.destinations.push(structuredClone(bridge.registration));
    writeReactionRegistryStore(store);
    panel.outerHTML = render(state, `${bridge.registration.name} registered as ${bridge.registration.state}. Anchor consent ${bridge.anchor_ref.consent_scope}; metadata only.`);
    const registry = document.querySelector('[data-reaction-registry]');
    if (registry) registry.remove();
  } catch (error) {
    panel.outerHTML = render(await loadState(), `Anchor bridge stopped: ${error.message}`);
  }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
