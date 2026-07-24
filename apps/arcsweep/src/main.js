import './styles.css';
import { buildReturnRecord, calculateDrElapsed, calculateRatio, formatDuration } from './core.js';
import { APPLET_CATALOGUE, visibleApplets } from './applets.js';
import { downloadState, loadState, newId, readStateFile, saveState } from './storage.js';
import {
  SUMMON_MODES,
  VISIBILITY_MODES,
  WORLD_SURFACES,
  createWorld,
  getActiveWorld,
  getSessionWorld,
  worldSurfaceLabel,
} from './worlds.js';

let state = loadState();
let activeTab = 'portal';
let selectedScriptId = state.scripts[0]?.id || null;
let selectedWorldId = state.activeWorldId || state.worlds[0]?.id || null;
let returnOpen = false;
let notice = 'Arcsweep ready.';

const app = document.querySelector('#app');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function persist(message) {
  saveState(state);
  if (message) notice = message;
}

function activeWorld() {
  return getActiveWorld(state);
}

function selectedWorld() {
  return state.worlds.find((world) => world.id === selectedWorldId) || activeWorld();
}

function ratioWorld() {
  return state.session.active ? getSessionWorld(state) : activeWorld();
}

function ratioLabel(world = ratioWorld()) {
  const wakingMinutes = world?.time?.wakingMinutes || state.settings.crMinutes;
  const worldMinutes = world?.time?.worldMinutes || state.settings.drMinutes;
  const ratio = calculateRatio(wakingMinutes, worldMinutes);
  return `1 ${state.settings.crLabel} minute = ${ratio.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} ${world?.name || state.settings.drLabel} minutes`;
}

function sessionTimes(now = new Date()) {
  if (!state.session.active || !state.session.startedAt) return { cr: 0, dr: 0 };
  const cr = Math.max(0, now.getTime() - new Date(state.session.startedAt).getTime());
  const wakingMinutes = state.session.wakingMinutes || state.settings.crMinutes;
  const worldMinutes = state.session.worldMinutes || state.settings.drMinutes;
  const dr = calculateDrElapsed(
    state.session.startedAt,
    now,
    wakingMinutes,
    worldMinutes,
  );
  return { cr, dr };
}

function navButton(id, label, glyph) {
  return `<button class="nav-button ${activeTab === id ? 'active' : ''}" data-tab="${id}">
    <span aria-hidden="true">${glyph}</span><span>${label}</span>
  </button>`;
}

function options(items, selected) {
  return items.map(([value, label]) => (
    `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`
  )).join('');
}

function renderAppletDeck(world) {
  const applets = visibleApplets(world?.applets || []);
  if (!applets.length) return '<p class="muted">This world has no visible applets yet.</p>';
  return `<div class="applet-grid">${applets.map((applet) => `
    <button class="applet-card" data-applet-id="${applet.id}">
      <span aria-hidden="true">${escapeHtml(applet.glyph)}</span>
      <strong>${escapeHtml(applet.label)}</strong>
      <small>${escapeHtml(applet.category)}</small>
    </button>
  `).join('')}</div>`;
}

function renderPortal() {
  const world = activeWorld();
  const times = sessionTimes();
  const latestReturn = state.returnHistory[0];
  const summon = world?.surface?.summonMode === 'none'
    ? 'Always available'
    : `${world?.surface?.summonMode || 'phrase'} · ${world?.surface?.summonCue || 'Intentional call'}`;

  return `
    <section class="hero panel world-hero" data-surface="${escapeHtml(world?.surface?.type || 'portal')}">
      <p class="eyebrow">${escapeHtml(worldSurfaceLabel(world))} · v${escapeHtml(state.version)}</p>
      <h1>Hearthgate: Arcsweep</h1>
      <p class="lede">${escapeHtml(world?.description || 'Sweep an arc between intention, world design, continuity, and return.')}</p>
      <div class="world-ribbon">
        <span><b>Active world:</b> ${escapeHtml(world?.name || 'Unassigned World')}</span>
        <span><b>Surface:</b> ${escapeHtml(world?.surface?.name || 'Arcsweep')}</span>
        <span><b>Summon:</b> ${escapeHtml(summon)}</span>
        <span><b>Veil:</b> ${world?.surface?.veilEnabled ? escapeHtml(world.surface.visibility) : 'Openly visible'}</span>
      </div>
    </section>

    <section class="grid three">
      <article class="panel clock-card">
        <p class="eyebrow">${escapeHtml(state.settings.crLabel)}</p>
        <strong id="cr-now">${new Date().toLocaleString()}</strong>
        <span>${escapeHtml(ratioLabel(world))}</span>
      </article>
      <article class="panel clock-card">
        <p class="eyebrow">Current arc</p>
        <strong id="cr-elapsed">${formatDuration(times.cr)}</strong>
        <span>Waking elapsed</span>
      </article>
      <article class="panel clock-card">
        <p class="eyebrow">Projected ${escapeHtml(world?.name || state.settings.drLabel)}</p>
        <strong id="dr-elapsed">${formatDuration(times.dr)}</strong>
        <span>${world?.time?.pauseWhenAway ? 'World clock pauses between arcs' : 'Continuous ratio projection'}</span>
      </article>
    </section>

    <section class="grid two">
      <article class="panel">
        <h2>${state.session.active ? 'Arc active' : 'Begin an arc'}</h2>
        ${state.session.active ? `
          <dl class="facts">
            <div><dt>World</dt><dd>${escapeHtml(state.session.targetWorld || world?.name)}</dd></div>
            <div><dt>Intention</dt><dd>${escapeHtml(state.session.intention || 'Open exploration')}</dd></div>
            <div><dt>Started</dt><dd>${new Date(state.session.startedAt).toLocaleString()}</dd></div>
          </dl>
          <button class="return-button" data-action="open-return">Return · ${escapeHtml(state.settings.returnAnchor)}</button>
        ` : `
          <form id="session-form" class="stack">
            <label>Target world<select name="targetWorldId">
              ${state.worlds.map((item) => `<option value="${item.id}" ${item.id === state.activeWorldId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
            </select></label>
            <label>Intention<textarea name="intention" rows="4" placeholder="What is this arc for?"></textarea></label>
            <button type="submit">Begin arc</button>
          </form>
        `}
      </article>

      <article class="panel">
        <h2>Arrival context</h2>
        <dl class="facts">
          <div><dt>Arrival</dt><dd>${escapeHtml([world?.time?.arrivalDate, world?.time?.arrivalTime].filter(Boolean).join(' · ') || 'Open arrival')}</dd></div>
          <div><dt>Location</dt><dd>${escapeHtml(world?.arrival?.location || 'Not yet specified')}</dd></div>
          <div><dt>Orientation</dt><dd>${escapeHtml(world?.arrival?.orientation || '')}</dd></div>
          <div><dt>Recall</dt><dd>${escapeHtml(world?.recall?.onArrival || '')}</dd></div>
        </dl>
      </article>
    </section>

    <section class="panel applet-deck">
      <div class="section-heading compact-heading">
        <div><p class="eyebrow">World-native instrument</p><h2>${escapeHtml(world?.surface?.name || 'Arcsweep')}</h2></div>
        <button class="quiet" data-tab="worlds">Configure world</button>
      </div>
      ${renderAppletDeck(world)}
    </section>

    <section class="panel">
      <h2>Latest return</h2>
      ${latestReturn ? `
        <dl class="facts horizontal">
          <div><dt>Returned</dt><dd>${new Date(latestReturn.returnedAt).toLocaleString()}</dd></div>
          <div><dt>World</dt><dd>${escapeHtml(latestReturn.targetWorld)}</dd></div>
          <div><dt>Waking elapsed</dt><dd>${formatDuration(latestReturn.elapsedCr)}</dd></div>
          <div><dt>World projection</dt><dd>${formatDuration(latestReturn.elapsedDr)}</dd></div>
        </dl>
      ` : '<p class="muted">No completed arcs yet.</p>'}
    </section>
  `;
}

function renderWorlds() {
  const world = selectedWorld();
  if (world && world.id !== selectedWorldId) selectedWorldId = world.id;
  return `
    <section class="section-heading">
      <div><p class="eyebrow">Portal registry</p><h1>Worlds</h1></div>
      <button data-action="new-world">New world</button>
    </section>
    <section class="split-layout world-layout">
      <aside class="panel item-list">
        ${state.worlds.map((item) => `
          <button class="item-card ${item.id === selectedWorldId ? 'active' : ''}" data-world-id="${item.id}">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(worldSurfaceLabel(item))}${item.id === state.activeWorldId ? ' · Active portal' : ''}</span>
          </button>
        `).join('')}
      </aside>
      <article class="panel">
        ${world ? `
          <form id="world-form" class="stack">
            <input type="hidden" name="id" value="${world.id}" />
            <div class="grid two compact-grid">
              <label>World name<input name="name" value="${escapeHtml(world.name)}" required /></label>
              <label>World type<input name="kind" value="${escapeHtml(world.kind)}" placeholder="Desired Reality, Waiting Room, Dreaming Grove…" /></label>
            </div>
            <label>World description<textarea name="description" rows="4">${escapeHtml(world.description)}</textarea></label>

            <fieldset>
              <legend>World-native interface</legend>
              <div class="grid two compact-grid">
                <label>Form<select name="surfaceType">${options(WORLD_SURFACES, world.surface.type)}</select></label>
                <label>World name for the instrument<input name="surfaceName" value="${escapeHtml(world.surface.name)}" /></label>
              </div>
              <label>Appearance and behaviour<textarea name="surfaceAppearance" rows="4" placeholder="A copper mirror, moonlit pearl, pocket dragon, living codex…">${escapeHtml(world.surface.appearance)}</textarea></label>
              <div class="grid two compact-grid">
                <label>Summon mode<select name="summonMode">${options(SUMMON_MODES, world.surface.summonMode)}</select></label>
                <label>Summon cue<input name="summonCue" value="${escapeHtml(world.surface.summonCue)}" /></label>
              </div>
              <label class="checkbox"><input name="veilEnabled" type="checkbox" ${world.surface.veilEnabled ? 'checked' : ''} /> Veil Mode enabled</label>
              <div class="grid two compact-grid">
                <label>Visibility<select name="visibility">${options(VISIBILITY_MODES, world.surface.visibility)}</select></label>
                <label>Approved people or custom rule<input name="approvedPeople" value="${escapeHtml(world.surface.approvedPeople)}" /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>World clock and arrival</legend>
              <div class="grid two compact-grid">
                <label>Waking minutes<input name="wakingMinutes" type="number" min="0.001" step="0.001" value="${world.time.wakingMinutes}" /></label>
                <label>World minutes<input name="worldMinutes" type="number" min="0.001" step="0.001" value="${world.time.worldMinutes}" /></label>
              </div>
              <p class="callout">${escapeHtml(ratioLabel(world))}</p>
              <label class="checkbox"><input name="pauseWhenAway" type="checkbox" ${world.time.pauseWhenAway ? 'checked' : ''} /> Pause this world clock between arcs</label>
              <div class="grid three compact-grid">
                <label>Arrival date<input name="arrivalDate" value="${escapeHtml(world.time.arrivalDate)}" placeholder="World-local date" /></label>
                <label>Arrival time<input name="arrivalTime" value="${escapeHtml(world.time.arrivalTime)}" placeholder="World-local time" /></label>
                <label>Arrival location<input name="arrivalLocation" value="${escapeHtml(world.arrival.location)}" /></label>
              </div>
              <label>Immediate situation<textarea name="arrivalContext" rows="4">${escapeHtml(world.arrival.context)}</textarea></label>
              <label>Local memories and context<textarea name="arrivalMemories" rows="4">${escapeHtml(world.arrival.memories)}</textarea></label>
              <label>Orientation statement<textarea name="arrivalOrientation" rows="3">${escapeHtml(world.arrival.orientation)}</textarea></label>
            </fieldset>

            <fieldset>
              <legend>World competencies</legend>
              <label>Languages and communication<textarea name="languages" rows="3">${escapeHtml(world.competencies.languages)}</textarea></label>
              <label>Magic, technology, powers, or world systems<textarea name="worldSystems" rows="4">${escapeHtml(world.competencies.worldSystems)}</textarea></label>
              <label>Movement, reflexes, craft, and physical skills<textarea name="movement" rows="3">${escapeHtml(world.competencies.movement)}</textarea></label>
              <label>Social knowledge, customs, and relationships<textarea name="socialContext" rows="3">${escapeHtml(world.competencies.socialContext)}</textarea></label>
              <label>Accessibility and embodiment supports<textarea name="accessibility" rows="3">${escapeHtml(world.competencies.accessibility)}</textarea></label>
            </fieldset>

            <fieldset>
              <legend>Safety Weave and Continuity Recall</legend>
              <label>General weave<textarea name="safetyGeneral" rows="3">${escapeHtml(world.safetyWeave.general)}</textarea></label>
              <label>Specific exclusions or boundaries<textarea name="safetyExclusions" rows="4">${escapeHtml(world.safetyWeave.exclusions)}</textarea></label>
              <label class="checkbox"><input name="returnAlwaysAvailable" type="checkbox" ${world.safetyWeave.returnAlwaysAvailable ? 'checked' : ''} /> Return remains available</label>
              <label class="checkbox"><input name="anchorIntentGated" type="checkbox" ${world.safetyWeave.anchorIntentGated ? 'checked' : ''} /> Return Anchor responds to intention</label>
              <label>Recall on arrival<textarea name="recallOnArrival" rows="3">${escapeHtml(world.recall.onArrival)}</textarea></label>
              <label>Recall on return<textarea name="recallOnReturn" rows="3">${escapeHtml(world.recall.onReturn)}</textarea></label>
              <label>Chosen surprise or selective forgetting<textarea name="selectiveForgetting" rows="3">${escapeHtml(world.recall.selectiveForgetting)}</textarea></label>
            </fieldset>

            <fieldset>
              <legend>Companion interface</legend>
              <label class="checkbox"><input name="companionEnabled" type="checkbox" ${world.companion.enabled ? 'checked' : ''} /> This interface has a companion form</label>
              <div class="grid two compact-grid">
                <label>Name<input name="companionName" value="${escapeHtml(world.companion.name)}" /></label>
                <label>Form<input name="companionForm" value="${escapeHtml(world.companion.form)}" placeholder="Dragon, unicorn, bluebird, person, flame…" /></label>
              </div>
              <label>Role and gifts<textarea name="companionRole" rows="3">${escapeHtml(world.companion.role)}</textarea></label>
              <label>Communication style<textarea name="companionCommunication" rows="3">${escapeHtml(world.companion.communication)}</textarea></label>
              <label>Agency and consent<textarea name="companionAgency" rows="4">${escapeHtml(world.companion.agency)}</textarea></label>
            </fieldset>

            <fieldset>
              <legend>Applet deck</legend>
              <div class="check-grid">
                ${APPLET_CATALOGUE.map((applet) => {
                  const layout = world.applets.find((item) => item.id === applet.id);
                  return `<label class="checkbox applet-check"><input name="appletVisible" value="${applet.id}" type="checkbox" ${layout?.visible ? 'checked' : ''} /> <span>${escapeHtml(applet.glyph)} ${escapeHtml(applet.label)}</span></label>`;
                }).join('')}
              </div>
            </fieldset>

            <div class="button-row">
              <button type="submit">Save world</button>
              <button type="button" class="quiet" data-action="set-active-world" data-id="${world.id}">Set active portal</button>
              <button type="button" class="quiet danger" data-action="delete-world" data-id="${world.id}">Delete world</button>
            </div>
          </form>
        ` : '<p>Create a world to begin.</p>'}
      </article>
    </section>
  `;
}

function renderScripts() {
  const selected = state.scripts.find((script) => script.id === selectedScriptId) || state.scripts[0];
  if (selected && selected.id !== selectedScriptId) selectedScriptId = selected.id;
  return `
    <section class="section-heading">
      <div><p class="eyebrow">World architecture</p><h1>Scripts</h1></div>
      <button data-action="new-script">New script</button>
    </section>
    <section class="split-layout">
      <aside class="panel item-list">
        ${state.scripts.map((script) => `
          <button class="item-card ${script.id === selectedScriptId ? 'active' : ''}" data-script-id="${script.id}">
            <strong>${escapeHtml(script.name)}</strong>
            <span>${escapeHtml(script.world)} · ${escapeHtml(script.status)}</span>
          </button>
        `).join('') || '<p class="muted">No scripts yet.</p>'}
      </aside>
      <article class="panel">
        ${selected ? `
          <form id="script-form" class="stack">
            <input type="hidden" name="id" value="${selected.id}" />
            <div class="grid two compact-grid">
              <label>Name<input name="name" value="${escapeHtml(selected.name)}" required /></label>
              <label>World<select name="world">
                ${state.worlds.map((world) => `<option ${selected.world === world.name ? 'selected' : ''}>${escapeHtml(world.name)}</option>`).join('')}
                <option ${!state.worlds.some((world) => world.name === selected.world) ? 'selected' : ''}>${escapeHtml(selected.world || 'Unassigned')}</option>
              </select></label>
            </div>
            <label>Status<select name="status">
              ${['Draft I', 'In Review', 'Canon'].map((status) => `<option ${selected.status === status ? 'selected' : ''}>${status}</option>`).join('')}
            </select></label>
            <label>Reference script<textarea name="content" rows="22">${escapeHtml(selected.content)}</textarea></label>
            <div class="button-row">
              <button type="submit">Save script</button>
              <button type="button" class="quiet danger" data-action="delete-script" data-id="${selected.id}">Delete</button>
            </div>
          </form>
        ` : '<p>Create a script to begin.</p>'}
      </article>
    </section>
  `;
}

function renderContinuity() {
  return `
    <section class="section-heading">
      <div><p class="eyebrow">Waking Thread</p><h1>Continuity Log</h1></div>
    </section>
    <section class="grid two continuity-grid">
      <article class="panel">
        <h2>Add a thread entry</h2>
        <p class="muted">Record events, messages, care notes, calendar facts, or context that should remain available across an arc.</p>
        <form id="continuity-form" class="stack">
          <label>Title<input name="title" required placeholder="What changed?" /></label>
          <label>Source<select name="source">
            <option>Self-entered</option>
            <option>Trusted person</option>
            <option>Calendar</option>
            <option>Imported note</option>
            <option>Other</option>
          </select></label>
          <label>Details<textarea name="details" rows="7" required></textarea></label>
          <button type="submit">Add to Waking Thread</button>
        </form>
      </article>
      <article class="panel timeline">
        <h2>Thread</h2>
        ${state.continuity.length ? state.continuity.map((entry) => `
          <article class="timeline-entry">
            <div>
              <strong>${escapeHtml(entry.title)}</strong>
              <span>${new Date(entry.createdAt).toLocaleString()} · ${escapeHtml(entry.source)}</span>
            </div>
            <p>${escapeHtml(entry.details)}</p>
            <button class="icon-button" data-action="delete-continuity" data-id="${entry.id}" aria-label="Delete ${escapeHtml(entry.title)}">×</button>
          </article>
        `).join('') : '<p class="muted">The Waking Thread is quiet.</p>'}
      </article>
    </section>
  `;
}

function renderForge() {
  return `
    <section class="section-heading">
      <div><p class="eyebrow">Pattern into craft</p><h1>Forge</h1></div>
    </section>
    <section class="grid two">
      <article class="panel">
        <h2>Forge an intention</h2>
        <form id="manifestation-form" class="stack">
          <label>Desired condition<input name="intention" required placeholder="A finished dress, travel funds, a calmer room…" /></label>
          <label>Why it matters<textarea name="meaning" rows="4"></textarea></label>
          <label>Next practical action<textarea name="action" rows="4" placeholder="Sketch, budget, search materials, ask, schedule…"></textarea></label>
          <label>Evidence or symbolic markers<textarea name="markers" rows="3" placeholder="What will show movement or arrival?"></textarea></label>
          <button type="submit">Add forge working</button>
        </form>
      </article>
      <article class="panel working-list">
        <h2>Workings</h2>
        ${state.manifestations.length ? state.manifestations.map((item) => `
          <article class="working-card">
            <div class="working-head">
              <strong>${escapeHtml(item.intention)}</strong>
              <select data-action="forge-status" data-id="${item.id}" aria-label="Status for ${escapeHtml(item.intention)}">
                ${['Seeded', 'In Motion', 'Received', 'Released'].map((status) => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
              </select>
            </div>
            ${item.meaning ? `<p><b>Meaning:</b> ${escapeHtml(item.meaning)}</p>` : ''}
            ${item.action ? `<p><b>Next action:</b> ${escapeHtml(item.action)}</p>` : ''}
            ${item.markers ? `<p><b>Markers:</b> ${escapeHtml(item.markers)}</p>` : ''}
            <small>${new Date(item.createdAt).toLocaleString()}</small>
            <button class="icon-button" data-action="delete-forge" data-id="${item.id}" aria-label="Delete working">×</button>
          </article>
        `).join('') : '<p class="muted">No workings in the forge yet.</p>'}
      </article>
    </section>
  `;
}

function renderAppearance() {
  const profile = state.appearance;
  return `
    <section class="section-heading"><div><p class="eyebrow">Chosen embodiment</p><h1>Appearance & Form</h1></div></section>
    <section class="grid two">
      <article class="panel">
        <form id="appearance-form" class="stack">
          <label>Name or identity expression<input name="name" value="${escapeHtml(profile.name)}" /></label>
          <label>Body, species, or form<input name="form" value="${escapeHtml(profile.form)}" placeholder="Human, alicorn, wolf, celestial…" /></label>
          <label>Sensory signature<textarea name="sensorySignature" rows="5">${escapeHtml(profile.sensorySignature)}</textarea></label>
          <label>Appearance, accessibility, and embodiment notes<textarea name="notes" rows="14">${escapeHtml(profile.notes)}</textarea></label>
          <button type="submit">Save profile</button>
        </form>
      </article>
      <article class="panel">
        <h2>Embodiment weave</h2>
        <p>A form deserves precise specifications: movement, energy, hearing, vision, pain, texture, temperature, clothing, transformation controls, privacy, and return.</p>
        <p class="callout">Mythic design becomes more vivid when it knows how wings fold, paws meet stone, fabric sits against fur, and accessibility travels with the self.</p>
      </article>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="section-heading"><div><p class="eyebrow">Local controls</p><h1>Settings</h1></div></section>
    <section class="grid two">
      <article class="panel">
        <form id="settings-form" class="stack">
          <label>Waking label<input name="crLabel" value="${escapeHtml(state.settings.crLabel)}" /></label>
          <label>World label<input name="drLabel" value="${escapeHtml(state.settings.drLabel)}" /></label>
          <label>Return Anchor<input name="returnAnchor" value="${escapeHtml(state.settings.returnAnchor)}" /></label>
          <label class="checkbox"><input name="reduceMotion" type="checkbox" ${state.settings.reduceMotion ? 'checked' : ''} /> Reduce motion</label>
          <button type="submit">Save settings</button>
        </form>
      </article>
      <article class="panel stack">
        <h2>Portability</h2>
        <p>Export creates a JSON backup containing worlds, scripts, applet layouts, Waking Thread entries, Forge workings, and return history.</p>
        <button data-action="export">Export Arcsweep JSON</button>
        <label class="file-button">Import Arcsweep JSON<input id="import-file" type="file" accept="application/json,.json" /></label>
        <hr />
        <h2>Source lineage</h2>
        <p>Community LIFA traditions supplied the seed forms. Hearthgate added world registries, polymorphic surfaces, provenance, consent, continuity, local ownership, and the Waking Thread.</p>
      </article>
    </section>
  `;
}

function renderReturnDialog() {
  if (!returnOpen) return '';
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-title">
        <p class="eyebrow">${escapeHtml(state.settings.returnAnchor)}</p>
        <h2 id="return-title">Return to the ${escapeHtml(state.settings.crLabel)}</h2>
        <ol>
          <li>Name yourself.</li>
          <li>Feel the support beneath your body.</li>
          <li>Notice three present sensory facts.</li>
          <li>Move fingers and toes.</li>
          <li>Choose to close the active arc.</li>
        </ol>
        <div class="button-row">
          <button data-action="complete-return">I am here · Close arc</button>
          <button class="quiet" data-action="cancel-return">Continue arc</button>
        </div>
      </section>
    </div>
  `;
}

function currentView() {
  if (activeTab === 'worlds') return renderWorlds();
  if (activeTab === 'scripts') return renderScripts();
  if (activeTab === 'continuity') return renderContinuity();
  if (activeTab === 'forge') return renderForge();
  if (activeTab === 'appearance') return renderAppearance();
  if (activeTab === 'settings') return renderSettings();
  return renderPortal();
}

function render() {
  document.documentElement.dataset.reduceMotion = state.settings.reduceMotion ? 'true' : 'false';
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark" aria-hidden="true">⌁</span><div><strong>Arcsweep</strong><small>Hearthgate</small></div></div>
        <nav aria-label="Arcsweep rooms">
          ${navButton('portal', 'Portal', '◉')}
          ${navButton('worlds', 'Worlds', '✧')}
          ${navButton('scripts', 'Scripts', '▤')}
          ${navButton('continuity', 'Waking Thread', '⌁')}
          ${navButton('forge', 'Forge', '✦')}
          ${navButton('appearance', 'Appearance', '◇')}
          ${navButton('settings', 'Settings', '⚙')}
        </nav>
        <p class="privacy-seal">Local-first<br />No automatic upload</p>
      </aside>
      <main class="content">
        ${currentView()}
        <p class="notice" role="status">${escapeHtml(notice)}</p>
      </main>
      ${renderReturnDialog()}
    </div>
  `;
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

app.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    activeTab = tab.dataset.tab;
    render();
    return;
  }

  const worldButton = event.target.closest('[data-world-id]');
  if (worldButton) {
    selectedWorldId = worldButton.dataset.worldId;
    render();
    return;
  }

  const scriptButton = event.target.closest('[data-script-id]');
  if (scriptButton) {
    selectedScriptId = scriptButton.dataset.scriptId;
    render();
    return;
  }

  const appletButton = event.target.closest('[data-applet-id]');
  if (appletButton) {
    const routes = {
      portal: 'portal',
      scripts: 'scripts',
      'waking-thread': 'continuity',
      forge: 'forge',
      appearance: 'appearance',
      'about-world': 'worlds',
      time: 'worlds',
      theme: 'worlds',
      identity: 'appearance',
    };
    activeTab = routes[appletButton.dataset.appletId] || 'worlds';
    selectedWorldId = state.activeWorldId;
    notice = routes[appletButton.dataset.appletId]
      ? `${appletButton.textContent.trim()} opened.`
      : `${appletButton.textContent.trim()} is registered in the world deck and ready for its room implementation.`;
    render();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;

  if (action === 'open-return') {
    returnOpen = true;
  } else if (action === 'cancel-return') {
    returnOpen = false;
  } else if (action === 'complete-return') {
    const record = buildReturnRecord(state);
    state.returnHistory = [record, ...state.returnHistory].slice(0, 100);
    state.session = {
      active: false,
      startedAt: null,
      targetWorldId: null,
      targetWorld: '',
      intention: '',
      wakingMinutes: null,
      worldMinutes: null,
    };
    returnOpen = false;
    persist('Arc closed. Orientation restored.');
  } else if (action === 'new-world') {
    const world = createWorld(newId('world'));
    world.name = 'Untitled World';
    state.worlds = [world, ...state.worlds];
    state.activeWorldId = world.id;
    selectedWorldId = world.id;
    persist('New world portal created.');
  } else if (action === 'set-active-world') {
    state.activeWorldId = id;
    selectedWorldId = id;
    persist('Active portal changed.');
  } else if (action === 'delete-world') {
    if (state.worlds.length === 1) {
      notice = 'Arcsweep keeps one world portal in the registry.';
    } else {
      state.worlds = state.worlds.filter((world) => world.id !== id);
      if (state.activeWorldId === id) state.activeWorldId = state.worlds[0].id;
      selectedWorldId = state.activeWorldId;
      persist('World portal deleted.');
    }
  } else if (action === 'new-script') {
    const script = {
      id: newId('script'),
      name: 'Untitled DR Script',
      world: activeWorld()?.name || 'Unassigned',
      status: 'Draft I',
      content: 'Identity:\nEmbodiment:\nWorld:\nHome and daily life:\nRelationships:\nAbilities:\nArrival:\nReturn:',
      updatedAt: new Date().toISOString(),
    };
    state.scripts = [script, ...state.scripts];
    selectedScriptId = script.id;
    persist('New script created.');
  } else if (action === 'delete-script') {
    state.scripts = state.scripts.filter((script) => script.id !== id);
    selectedScriptId = state.scripts[0]?.id || null;
    persist('Script deleted.');
  } else if (action === 'delete-continuity') {
    state.continuity = state.continuity.filter((entry) => entry.id !== id);
    persist('Waking Thread entry deleted.');
  } else if (action === 'delete-forge') {
    state.manifestations = state.manifestations.filter((entry) => entry.id !== id);
    persist('Forge working deleted.');
  } else if (action === 'export') {
    downloadState(state);
    notice = 'Arcsweep backup exported.';
  }

  render();
});

app.addEventListener('change', async (event) => {
  const statusSelect = event.target.closest('[data-action="forge-status"]');
  if (statusSelect) {
    const item = state.manifestations.find((entry) => entry.id === statusSelect.dataset.id);
    if (item) item.status = statusSelect.value;
    persist('Forge status updated.');
    render();
    return;
  }

  if (event.target.id === 'import-file' && event.target.files?.[0]) {
    try {
      state = await readStateFile(event.target.files[0]);
      selectedScriptId = state.scripts[0]?.id || null;
      selectedWorldId = state.activeWorldId;
      activeTab = 'portal';
      persist('Arcsweep backup imported.');
    } catch (error) {
      notice = `Import failed: ${error.message}`;
    }
    render();
  }
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const values = formObject(form);

  if (form.id === 'session-form') {
    const world = state.worlds.find((item) => item.id === values.targetWorldId) || activeWorld();
    state.activeWorldId = world.id;
    selectedWorldId = world.id;
    state.session = {
      active: true,
      startedAt: new Date().toISOString(),
      targetWorldId: world.id,
      targetWorld: world.name,
      intention: values.intention.trim(),
      wakingMinutes: world.time.wakingMinutes,
      worldMinutes: world.time.worldMinutes,
    };
    persist('Arc begun. Return remains available.');
  } else if (form.id === 'world-form') {
    const world = state.worlds.find((item) => item.id === values.id);
    if (world) {
      const visibleIds = new Set(
        [...form.querySelectorAll('input[name="appletVisible"]:checked')].map((input) => input.value),
      );
      world.name = values.name.trim() || 'Untitled World';
      world.kind = values.kind.trim() || 'Desired Reality';
      world.description = values.description.trim();
      world.surface = {
        ...world.surface,
        type: values.surfaceType,
        name: values.surfaceName.trim() || 'Arcsweep',
        appearance: values.surfaceAppearance.trim(),
        summonMode: values.summonMode,
        summonCue: values.summonCue.trim(),
        veilEnabled: form.elements.veilEnabled.checked,
        visibility: values.visibility,
        approvedPeople: values.approvedPeople.trim(),
      };
      world.time = {
        ...world.time,
        wakingMinutes: Number(values.wakingMinutes) || 60,
        worldMinutes: Number(values.worldMinutes) || 10080,
        pauseWhenAway: form.elements.pauseWhenAway.checked,
        arrivalDate: values.arrivalDate.trim(),
        arrivalTime: values.arrivalTime.trim(),
      };
      world.arrival = {
        ...world.arrival,
        location: values.arrivalLocation.trim(),
        context: values.arrivalContext.trim(),
        memories: values.arrivalMemories.trim(),
        orientation: values.arrivalOrientation.trim(),
      };
      world.competencies = {
        languages: values.languages.trim(),
        worldSystems: values.worldSystems.trim(),
        movement: values.movement.trim(),
        socialContext: values.socialContext.trim(),
        accessibility: values.accessibility.trim(),
      };
      world.safetyWeave = {
        general: values.safetyGeneral.trim(),
        exclusions: values.safetyExclusions.trim(),
        returnAlwaysAvailable: form.elements.returnAlwaysAvailable.checked,
        anchorIntentGated: form.elements.anchorIntentGated.checked,
      };
      world.recall = {
        onArrival: values.recallOnArrival.trim(),
        onReturn: values.recallOnReturn.trim(),
        selectiveForgetting: values.selectiveForgetting.trim(),
      };
      world.companion = {
        enabled: form.elements.companionEnabled.checked,
        name: values.companionName.trim(),
        form: values.companionForm.trim(),
        role: values.companionRole.trim(),
        communication: values.companionCommunication.trim(),
        agency: values.companionAgency.trim(),
      };
      world.applets = APPLET_CATALOGUE.map((applet, index) => {
        const existing = world.applets.find((item) => item.id === applet.id) || {};
        return {
          id: applet.id,
          visible: visibleIds.has(applet.id),
          order: Number.isFinite(existing.order) ? existing.order : index,
          customLabel: existing.customLabel || '',
          customGlyph: existing.customGlyph || '',
        };
      });
      world.updatedAt = new Date().toISOString();
      persist('World portal saved.');
    }
  } else if (form.id === 'script-form') {
    const script = state.scripts.find((item) => item.id === values.id);
    if (script) {
      script.name = values.name.trim() || 'Untitled DR Script';
      script.world = values.world.trim() || 'Unassigned';
      script.status = values.status;
      script.content = values.content;
      script.updatedAt = new Date().toISOString();
      persist('Script saved locally.');
    }
  } else if (form.id === 'continuity-form') {
    state.continuity = [{
      id: newId('thread'),
      title: values.title.trim(),
      source: values.source,
      details: values.details.trim(),
      createdAt: new Date().toISOString(),
    }, ...state.continuity];
    persist('Entry added to the Waking Thread.');
  } else if (form.id === 'manifestation-form') {
    state.manifestations = [{
      id: newId('working'),
      intention: values.intention.trim(),
      meaning: values.meaning.trim(),
      action: values.action.trim(),
      markers: values.markers.trim(),
      status: 'Seeded',
      createdAt: new Date().toISOString(),
    }, ...state.manifestations];
    persist('Forge working seeded.');
  } else if (form.id === 'appearance-form') {
    state.appearance = {
      name: values.name.trim(),
      form: values.form.trim(),
      sensorySignature: values.sensorySignature.trim(),
      notes: values.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    persist('Appearance and form profile saved.');
  } else if (form.id === 'settings-form') {
    state.settings = {
      ...state.settings,
      crLabel: values.crLabel.trim() || 'Waking World',
      drLabel: values.drLabel.trim() || 'Desired Reality',
      returnAnchor: values.returnAnchor.trim() || 'Notch',
      reduceMotion: form.elements.reduceMotion.checked,
    };
    persist('Settings saved.');
  }

  render();
});

setInterval(() => {
  const crNow = document.querySelector('#cr-now');
  const crElapsed = document.querySelector('#cr-elapsed');
  const drElapsed = document.querySelector('#dr-elapsed');
  if (crNow) crNow.textContent = new Date().toLocaleString();
  if (crElapsed && drElapsed) {
    const times = sessionTimes();
    crElapsed.textContent = formatDuration(times.cr);
    drElapsed.textContent = formatDuration(times.dr);
  }
}, 1000);

render();
