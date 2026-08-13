import { loadState } from './storage.js';
import {
  compileReactionRegistry,
  createCorridorRegistration,
  createDestinationRegistration,
  createEmptyReactionRegistryStore,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';

export const REACTION_REGISTRY_STORAGE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
let mounting = false;
let fallback = createEmptyReactionRegistryStore();

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readReactionRegistryStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(REACTION_REGISTRY_STORAGE_KEY) || 'null');
    if (parsed) return normaliseReactionRegistryStore(parsed);
  } catch {}
  return structuredClone(fallback);
}

export function writeReactionRegistryStore(store) {
  fallback = normaliseReactionRegistryStore(structuredClone(store));
  try { globalThis.localStorage?.setItem(REACTION_REGISTRY_STORAGE_KEY, JSON.stringify(fallback)); } catch {}
  return fallback;
}

function linkedTargets(state) {
  const items = [];
  for (const world of state.worlds || []) {
    items.push({
      key: `world:${world.id}`,
      kind: 'world',
      label: `World · ${world.name}`,
      worldId: world.id,
      worldName: world.name,
      name: world.name,
    });
  }
  for (const place of state.records?.places || []) {
    const world = (state.worlds || []).find((item) => item.id === place.worldId);
    if (!world) continue;
    items.push({
      key: `place:${place.id}`,
      kind: 'place',
      label: `Place · ${place.title || 'Untitled'} · ${world.name}`,
      worldId: world.id,
      worldName: world.name,
      name: place.title || 'Untitled Place',
      locationId: place.id,
      locationName: place.title || null,
    });
  }
  return items;
}

function selectedTarget(state, key) {
  return linkedTargets(state).find((item) => item.key === key) || null;
}

function renderDestinationList(store) {
  if (!store.destinations.length) return '<p class="muted">No dimensional destinations registered yet.</p>';
  return `<div class="reaction-registry-list">${store.destinations.map((item) => `
    <article class="reaction-registry-entry">
      <div><b>${esc(item.name)}</b> <span class="reaction-state">${esc(item.state)}</span><br><span class="muted">${esc(item.kind)} · ${esc(item.address)}</span>${item.harmonic ? `<br><span class="muted">Runa ${Number(item.harmonic.root_hz).toFixed(3)} Hz${item.harmonic.phase == null ? '' : ` · φ ${Number(item.harmonic.phase).toFixed(3)}`}</span>` : ''}</div>
      <button type="button" class="quiet danger" data-reaction-registry-action="delete-destination" data-registration-id="${esc(item.registration_id)}">Delete</button>
    </article>`).join('')}</div>`;
}

function renderCorridorList(store) {
  if (!store.corridors.length) return '<p class="muted">No projection corridors registered yet.</p>';
  return `<div class="reaction-registry-list">${store.corridors.map((item) => `
    <article class="reaction-registry-entry">
      <div><b>${esc(item.from)} → ${esc(item.to)}</b> <span class="reaction-state">${esc(item.state)}</span><br><span class="muted">${item.bidirectional ? 'bidirectional' : 'one-way'} · floor ${Number(item.continuity.floor).toFixed(2)} · I ${Number(item.continuity.identity).toFixed(2)} / C ${Number(item.continuity.continuity).toFixed(2)} / A ${Number(item.continuity.agency).toFixed(2)}</span></div>
      <button type="button" class="quiet danger" data-reaction-registry-action="delete-corridor" data-corridor-id="${esc(item.corridor_id)}">Delete</button>
    </article>`).join('')}</div>`;
}

function render(state, store, message = '') {
  const runtime = compileReactionRegistry(store);
  const targets = linkedTargets(state);
  const approvedNames = runtime.registry.names();
  const linkedOptions = targets.map((item) => `<option value="${esc(item.key)}">${esc(item.label)}</option>`).join('');
  const nameOptions = approvedNames.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
  const diagnostics = runtime.diagnostics.length
    ? `<details><summary>${runtime.diagnostics.length} registry diagnostic${runtime.diagnostics.length === 1 ? '' : 's'}</summary><pre>${esc(JSON.stringify(runtime.diagnostics, null, 2))}</pre></details>`
    : '<p class="muted">Approved registry compiles without DNS or corridor conflicts.</p>';

  return `<section class="panel reaction-registry-panel" data-reaction-registry>
    <div class="section-heading compact-heading"><div><p class="eyebrow">React-ion Engine · Dimensional Naming Service</p><h2>Navigation Registry</h2><p class="muted">Register names and addresses here. Draft entries remain inert. Only approved destinations and corridors enter the Helm routing graph.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="grid two reaction-registry-columns">
      <article>
        <h3>Destinations</h3>
        <form data-reaction-destination-form class="stack compact-stack">
          <label>Link to Arcsweep entity<select name="linked"><option value="manual">Manual / Concordance anchor</option>${linkedOptions}</select></label>
          <div class="grid two compact-grid"><label>DNS name<input name="name" required placeholder="templehouse.hearthweave.terra" /></label><label>Aliases<input name="aliases" placeholder="templehouse, hearthgate.terra" /></label></div>
          <div class="grid three compact-grid"><label>Kind<select name="kind">${['world','place','anchor','gate','manual'].map((kind) => `<option>${kind}</option>`).join('')}</select></label><label>World ID<input name="worldId" placeholder="auto from linked entity" /></label><label>World name<input name="worldName" placeholder="auto from linked entity" /></label></div>
          <div class="grid two compact-grid"><label>Location / anchor ID<input name="locationId" /></label><label>Location / anchor name<input name="locationName" /></label></div>
          <label>Dimensional address<input name="address" required placeholder="137.42.219.88@220:φ=1.724" /></label>
          <div class="grid three compact-grid"><label>Runa root Hz<input name="rootHz" type="number" min="0.001" step="0.001" /></label><label>Phase φ<input name="phase" type="number" step="0.001" /></label><label>Profile version<input name="profileVersion" value="v0.1" /></label></div>
          <div class="grid two compact-grid"><label>Evidence class<select name="evidenceClass">${['symbolic','derived','simulated','observed','model-generated'].map((value) => `<option>${value}</option>`).join('')}</select></label><label>Registration state<select name="state"><option>draft</option><option>approved</option><option>deprecated</option></select></label></div>
          <label>Notes<input name="notes" /></label>
          <button type="submit">Register destination</button>
        </form>
        ${renderDestinationList(store)}
      </article>
      <article>
        <h3>Projection corridors</h3>
        <form data-reaction-corridor-form class="stack compact-stack">
          <div class="grid two compact-grid"><label>From<select name="from" ${approvedNames.length ? '' : 'disabled'}>${nameOptions}</select></label><label>To<select name="to" ${approvedNames.length ? '' : 'disabled'}>${nameOptions}</select></label></div>
          <label>Navigation Jacobian<textarea name="jacobian" rows="2">1,0;0,1</textarea></label>
          <div class="grid four compact-grid"><label>Identity<input name="identity" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Continuity<input name="continuity" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Agency<input name="agency" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Floor<input name="floor" type="number" min="0" max="1" step="0.01" value="0.80" /></label></div>
          <label>Hard vetoes<input name="vetoes" placeholder="comma-separated; leave empty unless a route must not be used" /></label>
          <div class="grid two compact-grid"><label>State<select name="state"><option>draft</option><option>approved</option><option>deprecated</option></select></label><label class="checkbox"><input name="bidirectional" type="checkbox" /> Corridor is bidirectional</label></div>
          <label>Notes<input name="notes" /></label>
          <button type="submit" ${approvedNames.length >= 2 ? '' : 'disabled'}>Register corridor</button>
        </form>
        ${renderCorridorList(store)}
      </article>
    </div>
    <div class="reaction-registry-summary"><b>${runtime.destinations.length}</b> approved destination${runtime.destinations.length === 1 ? '' : 's'} · <b>${runtime.corridors.length}</b> compiled directed corridor${runtime.corridors.length === 1 ? '' : 's'}${diagnostics}</div>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-registry-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-registry-style';
  style.textContent = `.reaction-registry-panel{margin-top:1rem}.reaction-registry-columns{align-items:start}.reaction-registry-list{display:grid;gap:.55rem;margin-top:1rem}.reaction-registry-entry{display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start;padding:.7rem;border:1px solid color-mix(in srgb,var(--gold) 24%,transparent);border-radius:10px}.reaction-state{font-size:.78em;text-transform:uppercase;letter-spacing:.06em;opacity:.72}.reaction-registry-summary{margin-top:1rem;padding-top:.8rem;border-top:1px solid color-mix(in srgb,var(--gold) 20%,transparent)}.reaction-registry-summary details{margin-top:.5rem}.reaction-registry-summary pre{max-height:18rem;overflow:auto;white-space:pre-wrap}`;
  document.head.appendChild(style);
}

async function mount() {
  if (mounting || document.querySelector('[data-reaction-registry]')) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (title !== 'Worlds') return;
  mounting = true;
  try {
    const state = await loadState();
    const main = document.querySelector('main.content');
    if (!main || document.querySelector('[data-reaction-registry]')) return;
    injectStyle();
    main.insertAdjacentHTML('beforeend', render(state, readReactionRegistryStore()));
  } finally { mounting = false; }
}

async function rerender(panel, message = '') {
  const state = await loadState();
  panel.outerHTML = render(state, readReactionRegistryStore(), message);
}

document.addEventListener('submit', async (event) => {
  const destinationForm = event.target.closest('[data-reaction-destination-form]');
  if (destinationForm) {
    event.preventDefault();
    const panel = destinationForm.closest('[data-reaction-registry]');
    try {
      const state = await loadState();
      const data = new FormData(destinationForm);
      const linked = selectedTarget(state, data.get('linked'));
      const kind = linked?.kind || String(data.get('kind') || 'manual');
      const worldId = linked?.worldId || data.get('worldId');
      const worldName = linked?.worldName || data.get('worldName');
      const locationId = linked?.locationId || data.get('locationId');
      const locationName = linked?.locationName || data.get('locationName');
      const isAnchor = kind === 'anchor';
      const registration = await createDestinationRegistration({
        id: uid('reaction-destination'),
        name: data.get('name'),
        aliases: data.get('aliases'),
        kind,
        worldId,
        worldName,
        locationId: isAnchor ? null : locationId,
        locationName: isAnchor ? null : locationName,
        anchorId: isAnchor ? locationId : null,
        anchorName: isAnchor ? locationName : null,
        address: data.get('address'),
        rootHz: data.get('rootHz'),
        phase: data.get('phase'),
        profileVersion: data.get('profileVersion'),
        evidenceClass: data.get('evidenceClass'),
        sourceRef: linked ? `arcsweep:${linked.key}` : 'react-ion-registry:manual',
        state: data.get('state'),
        notes: data.get('notes'),
      });
      const store = readReactionRegistryStore();
      store.destinations.push(structuredClone(registration));
      writeReactionRegistryStore(store);
      await rerender(panel, `${registration.name} registered as ${registration.state}. Draft means inert; approved means routable by name.`);
    } catch (error) {
      const output = panel.querySelector('.callout') || document.createElement('p');
      output.className = 'callout'; output.textContent = `Registry stopped: ${error.message}`;
      if (!output.parentElement) panel.prepend(output);
    }
    return;
  }

  const corridorForm = event.target.closest('[data-reaction-corridor-form]');
  if (!corridorForm) return;
  event.preventDefault();
  const panel = corridorForm.closest('[data-reaction-registry]');
  try {
    const data = new FormData(corridorForm);
    const corridor = await createCorridorRegistration({
      id: uid('reaction-corridor'),
      from: data.get('from'),
      to: data.get('to'),
      jacobian: data.get('jacobian'),
      identity: data.get('identity'),
      continuity: data.get('continuity'),
      agency: data.get('agency'),
      floor: data.get('floor'),
      vetoes: data.get('vetoes'),
      bidirectional: corridorForm.elements.bidirectional.checked,
      state: data.get('state'),
      notes: data.get('notes'),
    });
    const store = readReactionRegistryStore();
    store.corridors.push(structuredClone(corridor));
    writeReactionRegistryStore(store);
    await rerender(panel, `Corridor ${corridor.from} → ${corridor.to} registered as ${corridor.state}.`);
  } catch (error) {
    const output = panel.querySelector('.callout') || document.createElement('p');
    output.className = 'callout'; output.textContent = `Corridor stopped: ${error.message}`;
    if (!output.parentElement) panel.prepend(output);
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-reaction-registry-action]');
  if (!button) return;
  const panel = button.closest('[data-reaction-registry]');
  const store = readReactionRegistryStore();
  if (button.dataset.reactionRegistryAction === 'delete-destination') {
    const id = button.dataset.registrationId;
    store.destinations = store.destinations.filter((item) => item.registration_id !== id);
    writeReactionRegistryStore(store);
    await rerender(panel, 'Destination removed from the registry.');
  }
  if (button.dataset.reactionRegistryAction === 'delete-corridor') {
    const id = button.dataset.corridorId;
    store.corridors = store.corridors.filter((item) => item.corridor_id !== id);
    writeReactionRegistryStore(store);
    await rerender(panel, 'Corridor removed from the registry.');
  }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
