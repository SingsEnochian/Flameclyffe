import './styles.css';
import { buildReturnRecord, calculateDrElapsed, calculateRatio, formatDuration, isoNow } from './core.js';
import { APPLET_CATALOGUE, visibleApplets } from './applets.js';
import { COLLECTION_ROOM_DEFINITIONS, WORLD_SECTION_DEFINITIONS } from './rooms.js';
import {
  addAttachments,
  createBackup,
  exportState,
  getStorageInfo,
  importState,
  isDesktopRuntime,
  listBackups,
  loadState,
  newId,
  openAttachment,
  restoreBackup,
  saveState,
  showDataFolder,
} from './storage.js';
import {
  SUMMON_MODES,
  VISIBILITY_MODES,
  WORLD_SURFACES,
  createWorld,
  getActiveWorld,
  getSessionWorld,
  worldSurfaceLabel,
} from './worlds.js';
import { CONSTELLATION_VOICES, createInitialPremaqc, invokeConstellationVoices, runFeedbackCycle, syncFeedbackCycle } from './feedback-loop.js';
import { StorySoundscape } from './story-soundscape.js';

const app = document.querySelector('#app');
const storySoundscape = new StorySoundscape();
let state = await loadState();
let activeRoom = 'portal';
let selectedWorldId = state.activeWorldId;
let selectedScriptId = state.scripts[0]?.id || null;
let selectedRecords = {};
let returnOpen = false;
let notice = 'Arcsweep ready.';
let storageInfo = await getStorageInfo().catch(() => null);
let backups = await listBackups().catch(() => []);
let deepData = null;
let deepDataFetching = false;
let deepDataError = null;
const isHosted = Boolean(window.__hearthgateHost);

const PRIMARY_NAV = [
  ['portal', 'Portal', '◉'],
  ['worlds', 'Worlds', '✧'],
  ['scripts', 'Scripts', '▤'],
  ['feedback', 'Feedback', '∞'],
  ['waking-thread', 'Waking Thread', '⌁'],
  ['forge', 'Forge', '✦'],
  ['deep-observer', 'Field', '◈'],
  ['settings', 'Settings', '⚙'],
];

const DEEP_CHANNELS = [
  ['P', 'Presence', 'accepted PREMAQC component', 'state.P.value'],
  ['C', 'Coherence', 'accepted PREMAQC component', 'state.C.value'],
  ['R', 'Resonance', 'accepted PREMAQC component', 'state.R.value'],
  ['E', 'Entanglement', 'accepted PREMAQC component', 'state.E.value'],
  ['M', 'Memory', 'accepted PREMAQC component', 'state.M.value'],
  ['A', 'Agency', 'accepted PREMAQC component', 'state.A.value'],
  ['Q', 'Qualia', 'accepted PREMAQC component', 'state.Q.value'],
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function attr(value = '') {
  return escapeHtml(value);
}

function activeWorld() {
  return getActiveWorld(state);
}

function selectedWorld() {
  return state.worlds.find((world) => world.id === selectedWorldId) || activeWorld();
}

function applyPresentation() {
  const world = activeWorld();
  const theme = world?.theme || {};
  document.documentElement.dataset.reduceMotion = state.settings.reduceMotion || theme.lowMotion ? 'true' : 'false';
  document.documentElement.dataset.largeText = state.settings.largeText ? 'true' : 'false';
  document.documentElement.dataset.highContrast = state.settings.highContrast ? 'true' : 'false';
  document.documentElement.style.setProperty('--font-scale', String(state.settings.fontScale || 1));
  document.documentElement.style.setProperty('--bg', theme.background || '#0b0f0e');
  document.documentElement.style.setProperty('--panel-solid', theme.panel || '#18221f');
  document.documentElement.style.setProperty('--gold', theme.accent || '#d8b56a');
  document.documentElement.style.setProperty('--green', theme.secondary || '#8ebca6');
  document.documentElement.style.setProperty('--text', theme.text || '#f0eadb');
  document.body.style.backgroundImage = theme.backgroundImage
    ? `linear-gradient(rgba(4,8,7,.72), rgba(4,8,7,.84)), url("${theme.backgroundImage.replaceAll('"', '')}")`
    : '';
  document.body.dataset.surface = world?.surface?.type || 'portal';
}

function persist(message, reason = 'state-change') {
  if (message) notice = message;
  void saveState(state, { reason }).catch((error) => {
    notice = `Local save failed: ${error.message}`;
    render();
  });
}

function roomButton(id, label, glyph) {
  return `<button class="nav-button ${activeRoom === id ? 'active' : ''}" data-room="${attr(id)}">
    <span aria-hidden="true">${glyph}</span><span>${escapeHtml(label)}</span>
  </button>`;
}

function options(items, selected) {
  return items.map(([value, label]) => `<option value="${attr(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function sessionTimes(now = new Date()) {
  if (!state.session.active || !state.session.startedAt) return { waking: 0, world: 0 };
  const waking = Math.max(0, now.getTime() - new Date(state.session.startedAt).getTime());
  const world = calculateDrElapsed(
    state.session.startedAt,
    now,
    state.session.wakingMinutes || state.settings.crMinutes,
    state.session.worldMinutes || state.settings.drMinutes,
  );
  return { waking, world };
}

function ratioLabel(world = activeWorld()) {
  const wakingMinutes = world?.time?.wakingMinutes || state.settings.crMinutes;
  const worldMinutes = world?.time?.worldMinutes || state.settings.drMinutes;
  const ratio = calculateRatio(wakingMinutes, worldMinutes);
  return `1 ${state.settings.crLabel} minute = ${ratio.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${world?.name || state.settings.drLabel} minutes`;
}

function renderAppletDeck(world) {
  const applets = visibleApplets(world?.applets || []);
  return `<div class="applet-grid">${applets.map((applet) => `
    <button class="applet-card" data-room="${attr(applet.id)}">
      <span aria-hidden="true">${escapeHtml(applet.glyph)}</span>
      <strong>${escapeHtml(applet.label)}</strong>
      <small>${escapeHtml(applet.category)}</small>
    </button>`).join('')}</div>`;
}

function renderPortal() {
  const world = activeWorld();
  const times = sessionTimes();
  const latestReturn = state.returnHistory[0];
  const summon = world.surface.summonMode === 'none'
    ? 'Always available'
    : `${world.surface.summonMode} · ${world.surface.summonCue || 'Intentional call'}`;
  return `
    <section class="hero panel world-hero">
      <p class="eyebrow">${escapeHtml(worldSurfaceLabel(world))} · v${escapeHtml(state.version)}</p>
      <h1>Hearthgate: Arcsweep</h1>
      <p class="lede">${escapeHtml(world.description || 'Sweep an arc between intention, world design, continuity, and return.')}</p>
      <div class="world-ribbon">
        <span><b>Active world:</b> ${escapeHtml(world.name)}</span>
        <span><b>Instrument:</b> ${escapeHtml(world.surface.name)}</span>
        <span><b>Summon:</b> ${escapeHtml(summon)}</span>
        <span><b>Veil:</b> ${world.surface.veilEnabled ? escapeHtml(world.surface.visibility) : 'Openly visible'}</span>
      </div>
    </section>
    <section class="grid three">
      <article class="panel clock-card"><p class="eyebrow">${escapeHtml(state.settings.crLabel)}</p><strong id="waking-now">${new Date().toLocaleString()}</strong><span>${escapeHtml(ratioLabel(world))}</span></article>
      <article class="panel clock-card"><p class="eyebrow">Current arc</p><strong id="waking-elapsed">${formatDuration(times.waking)}</strong><span>Waking elapsed</span></article>
      <article class="panel clock-card"><p class="eyebrow">Projected ${escapeHtml(world.name)}</p><strong id="world-elapsed">${formatDuration(times.world)}</strong><span>${world.time.pauseWhenAway ? 'Clock pauses between arcs' : 'Continuous ratio projection'}</span></article>
    </section>
    <section class="grid two">
      <article class="panel">
        <h2>${state.session.active ? 'Arc active' : 'Begin an arc'}</h2>
        ${state.session.active ? `
          <dl class="facts"><div><dt>World</dt><dd>${escapeHtml(state.session.targetWorld)}</dd></div><div><dt>Intention</dt><dd>${escapeHtml(state.session.intention || 'Open exploration')}</dd></div><div><dt>Started</dt><dd>${new Date(state.session.startedAt).toLocaleString()}</dd></div></dl>
          <button class="return-button" data-action="open-return">Return · ${escapeHtml(state.settings.returnAnchor)}</button>` : `
          <form id="session-form" class="stack">
            <label>Target world<select name="targetWorldId">${state.worlds.map((item) => `<option value="${attr(item.id)}" ${item.id === state.activeWorldId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
            <label>Intention<textarea name="intention" rows="4" placeholder="What is this arc for?"></textarea></label>
            <button type="submit">Begin arc</button>
          </form>`}
      </article>
      <article class="panel"><h2>Arrival context</h2><dl class="facts">
        <div><dt>Arrival</dt><dd>${escapeHtml([world.time.arrivalDate, world.time.arrivalTime].filter(Boolean).join(' · ') || 'Open arrival')}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(world.arrival.location || 'Not yet specified')}</dd></div>
        <div><dt>Orientation</dt><dd>${escapeHtml(world.arrival.orientation)}</dd></div>
        <div><dt>Recall</dt><dd>${escapeHtml(world.recall.onArrival)}</dd></div>
        ${world.arrival.wrpLabel ? `<div><dt>World Reception</dt><dd>${escapeHtml(world.arrival.wrpLabel)}</dd></div>` : ''}
      </dl>${world.arrival.wrpRunaUrl ? `<button class="quiet" data-action="open-wrp">Open in Runa ↗</button>` : ''}</article>
    </section>
    <section class="panel applet-deck"><div class="section-heading compact-heading"><div><p class="eyebrow">World-native rooms</p><h2>${escapeHtml(world.surface.name || 'Arcsweep')}</h2></div><button class="quiet" data-room="worlds">Configure world</button></div>${renderAppletDeck(world)}</section>
    <section class="panel"><h2>Latest return</h2>${latestReturn ? `<dl class="facts horizontal"><div><dt>Returned</dt><dd>${new Date(latestReturn.returnedAt).toLocaleString()}</dd></div><div><dt>World</dt><dd>${escapeHtml(latestReturn.targetWorld)}</dd></div><div><dt>Waking elapsed</dt><dd>${formatDuration(latestReturn.elapsedCr)}</dd></div><div><dt>World projection</dt><dd>${formatDuration(latestReturn.elapsedDr)}</dd></div></dl>` : '<p class="muted">No completed arcs yet.</p>'}</section>`;
}

function renderWorlds() {
  const world = selectedWorld();
  return `<section class="section-heading"><div><p class="eyebrow">Portal registry</p><h1>Worlds</h1></div><button data-action="new-world">New world</button></section>
    <section class="split-layout world-layout">
      <aside class="panel item-list">${state.worlds.map((item) => `<button class="item-card ${item.id === world.id ? 'active' : ''}" data-world-id="${attr(item.id)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(worldSurfaceLabel(item))}${item.id === state.activeWorldId ? ' · Active portal' : ''}</span></button>`).join('')}</aside>
      <article class="panel"><form id="world-registry-form" class="stack">
        <input type="hidden" name="id" value="${attr(world.id)}" />
        <div class="grid two compact-grid"><label>World name<input name="name" value="${attr(world.name)}" required /></label><label>World type<input name="kind" value="${attr(world.kind)}" /></label></div>
        <label>Description<textarea name="description" rows="5">${escapeHtml(world.description)}</textarea></label>
        <div class="button-row"><button type="submit">Save world</button><button type="button" class="quiet" data-action="set-active-world" data-id="${attr(world.id)}">Set active portal</button><button type="button" class="quiet" data-room="about-world">Open full world room</button><button type="button" class="quiet danger" data-action="delete-world" data-id="${attr(world.id)}">Delete world</button></div>
      </form></article>
    </section>`;
}

function worldSectionTitle(id) {
  return WORLD_SECTION_DEFINITIONS[id]?.label || (id === 'appearance' ? 'Appearance & Form' : id);
}

function renderWorldSection(id) {
  const world = selectedWorld();
  const section = id === 'appearance' ? 'identity' : WORLD_SECTION_DEFINITIONS[id]?.section;
  let body = '';
  if (section === 'about') body = `
    <label>World name<input name="name" value="${attr(world.name)}" /></label><label>World type<input name="kind" value="${attr(world.kind)}" /></label><label>Description<textarea name="description" rows="5">${escapeHtml(world.description)}</textarea></label><label>History<textarea name="history" rows="8">${escapeHtml(world.history)}</textarea></label><label>Rules, laws, and customs<textarea name="rules" rows="8">${escapeHtml(world.rules)}</textarea></label>`;
  if (section === 'summon') body = `
    <label>World-native form<select name="type">${options(WORLD_SURFACES, world.surface.type)}</select></label><label>Instrument name<input name="surfaceName" value="${attr(world.surface.name)}" /></label><label>Appearance and behaviour<textarea name="appearance" rows="7">${escapeHtml(world.surface.appearance)}</textarea></label><label>Summon method<select name="summonMode">${options(SUMMON_MODES, world.surface.summonMode)}</select></label><label>Summon cue<input name="summonCue" value="${attr(world.surface.summonCue)}" /></label>`;
  if (section === 'veil') body = `
    <label class="checkbox"><input name="veilEnabled" type="checkbox" ${world.surface.veilEnabled ? 'checked' : ''} /> Veil Mode enabled</label><label>Visibility<select name="visibility">${options(VISIBILITY_MODES, world.surface.visibility)}</select></label><label>Approved people or custom rule<textarea name="approvedPeople" rows="5">${escapeHtml(world.surface.approvedPeople)}</textarea></label>`;
  if (section === 'time') body = `
    <div class="grid two compact-grid"><label>Waking minutes<input name="wakingMinutes" type="number" min="0.001" step="0.001" value="${world.time.wakingMinutes}" /></label><label>World minutes<input name="worldMinutes" type="number" min="0.001" step="0.001" value="${world.time.worldMinutes}" /></label></div><p class="callout">${escapeHtml(ratioLabel(world))}</p><label class="checkbox"><input name="pauseWhenAway" type="checkbox" ${world.time.pauseWhenAway ? 'checked' : ''} /> Pause this world clock between arcs</label><label>Authored world date<input name="arrivalDate" value="${attr(world.time.arrivalDate)}" /></label><label>Authored world time<input name="arrivalTime" value="${attr(world.time.arrivalTime)}" /></label>`;
  if (section === 'arrival') body = `
    <label>Arrival location<input name="location" value="${attr(world.arrival.location)}" /></label><label>Immediate situation<textarea name="context" rows="6">${escapeHtml(world.arrival.context)}</textarea></label><label>Local memories and context<textarea name="memories" rows="7">${escapeHtml(world.arrival.memories)}</textarea></label><label>Orientation statement<textarea name="orientation" rows="5">${escapeHtml(world.arrival.orientation)}</textarea></label>
    <fieldset class="nested-fieldset"><legend>World Reception Profile</legend><p class="muted">Optional. Connects this world's arrival to a Runa sound environment.</p><label>Profile label<input name="wrpLabel" value="${attr(world.arrival.wrpLabel)}" placeholder="e.g. Terra Aeterna Reception" /></label><label>Profile ID<input name="wrpProfileId" value="${attr(world.arrival.wrpProfileId)}" placeholder="e.g. terra-aeterna-reception" /></label><label>Runa player URL<input name="wrpRunaUrl" value="${attr(world.arrival.wrpRunaUrl)}" placeholder="e.g. file:///path/to/Runa/docs/world-reception-loader.html" /></label></fieldset>`;
  if (section === 'identity') body = `
    <div class="grid two compact-grid"><label>Name or identity expression<input name="name" value="${attr(world.identity.name)}" /></label><label>Pronouns<input name="pronouns" value="${attr(world.identity.pronouns)}" /></label><label>Age or life stage<input name="age" value="${attr(world.identity.age)}" /></label><label>Roles and titles<input name="roles" value="${attr(world.identity.roles)}" /></label></div><label>Body, species, or form<input name="form" value="${attr(world.identity.form)}" /></label><label>Sensory signature<textarea name="sensorySignature" rows="5">${escapeHtml(world.identity.sensorySignature)}</textarea></label><label>Appearance<textarea name="appearance" rows="8">${escapeHtml(world.identity.appearance)}</textarea></label><label>Accessibility and embodiment supports<textarea name="accessibility" rows="6">${escapeHtml(world.identity.accessibility)}</textarea></label><label>Notes<textarea name="notes" rows="5">${escapeHtml(world.identity.notes)}</textarea></label>`;
  if (section === 'competencies') body = `
    <label>Languages and communication<textarea name="languages" rows="5">${escapeHtml(world.competencies.languages)}</textarea></label><label>Magic, technology, powers, or world systems<textarea name="worldSystems" rows="6">${escapeHtml(world.competencies.worldSystems)}</textarea></label><label>Movement, reflexes, craft, and physical skills<textarea name="movement" rows="5">${escapeHtml(world.competencies.movement)}</textarea></label><label>Social knowledge, customs, and relationships<textarea name="socialContext" rows="5">${escapeHtml(world.competencies.socialContext)}</textarea></label><label>Accessibility supports<textarea name="accessibility" rows="5">${escapeHtml(world.competencies.accessibility)}</textarea></label>`;
  if (section === 'safety') body = `
    <label>General weave<textarea name="general" rows="5">${escapeHtml(world.safetyWeave.general)}</textarea></label><label>Specific exclusions and boundaries<textarea name="exclusions" rows="7">${escapeHtml(world.safetyWeave.exclusions)}</textarea></label><label class="checkbox"><input name="returnAlwaysAvailable" type="checkbox" ${world.safetyWeave.returnAlwaysAvailable ? 'checked' : ''} /> Return remains available</label><label class="checkbox"><input name="anchorIntentGated" type="checkbox" ${world.safetyWeave.anchorIntentGated ? 'checked' : ''} /> Return Anchor responds to intention</label>`;
  if (section === 'recall') body = `
    <label>Recall on arrival<textarea name="onArrival" rows="6">${escapeHtml(world.recall.onArrival)}</textarea></label><label>Recall on return<textarea name="onReturn" rows="6">${escapeHtml(world.recall.onReturn)}</textarea></label><label>Chosen surprise or selective forgetting<textarea name="selectiveForgetting" rows="7">${escapeHtml(world.recall.selectiveForgetting)}</textarea></label>`;
  if (section === 'companion') body = `
    <label class="checkbox"><input name="enabled" type="checkbox" ${world.companion.enabled ? 'checked' : ''} /> This world has a companion interface</label><div class="grid two compact-grid"><label>Name<input name="name" value="${attr(world.companion.name)}" /></label><label>Form<input name="form" value="${attr(world.companion.form)}" /></label></div><label>Role and gifts<textarea name="role" rows="5">${escapeHtml(world.companion.role)}</textarea></label><label>Communication style<textarea name="communication" rows="5">${escapeHtml(world.companion.communication)}</textarea></label><label>Agency and consent<textarea name="agency" rows="6">${escapeHtml(world.companion.agency)}</textarea></label><label>Continuity notes<textarea name="notes" rows="6">${escapeHtml(world.companion.notes)}</textarea></label><p class="callout">The companion profile is complete and local. A live model remains an optional adapter, never an identity substitute.</p>`;
  if (section === 'theme') body = `
    <div class="grid two compact-grid"><label>Background colour<input name="background" type="color" value="${attr(world.theme.background)}" /></label><label>Panel colour<input name="panel" type="color" value="${attr(world.theme.panel)}" /></label><label>Primary accent<input name="accent" type="color" value="${attr(world.theme.accent)}" /></label><label>Secondary accent<input name="secondary" type="color" value="${attr(world.theme.secondary)}" /></label><label>Text colour<input name="text" type="color" value="${attr(world.theme.text)}" /></label></div><label>Background image URL or local file URI<input name="backgroundImage" value="${attr(world.theme.backgroundImage)}" /></label><label class="checkbox"><input name="lowMotion" type="checkbox" ${world.theme.lowMotion ? 'checked' : ''} /> Use low-motion presentation for this world</label>`;
  return `<section class="section-heading"><div><p class="eyebrow">${escapeHtml(world.name)}</p><h1>${escapeHtml(worldSectionTitle(id))}</h1></div><button class="quiet" data-room="portal">Return to portal</button></section><section class="panel"><form id="world-section-form" data-section="${attr(section)}" class="stack">${body}<button type="submit">Save ${escapeHtml(worldSectionTitle(id))}</button></form></section>`;
}

function recordForRoom(roomId) {
  const records = state.records[roomId] || [];
  const id = selectedRecords[roomId];
  return records.find((record) => record.id === id) || null;
}

function fieldMarkup(field, record) {
  const [name, label, type, required, choices] = field;
  const value = record?.[name] || '';
  if (type === 'textarea') return `<label>${escapeHtml(label)}<textarea name="${attr(name)}" rows="6" ${required ? 'required' : ''}>${escapeHtml(value)}</textarea></label>`;
  if (type === 'select') return `<label>${escapeHtml(label)}<select name="${attr(name)}">${choices.map((choice) => `<option ${choice === value ? 'selected' : ''}>${escapeHtml(choice)}</option>`).join('')}</select></label>`;
  return `<label>${escapeHtml(label)}<input name="${attr(name)}" type="${attr(type)}" value="${attr(value)}" ${required ? 'required' : ''} /></label>`;
}

function renderAttachments(record, roomId) {
  const attachments = record?.attachments || [];
  return `<section class="attachment-box"><div class="section-heading compact-heading"><div><h3>Local files</h3><p class="muted">Copied into Arcsweep's private data store.</p></div><button type="button" class="quiet" data-action="add-attachments" data-room-id="${attr(roomId)}" ${record ? '' : 'disabled'}>Add files</button></div>${record ? (attachments.length ? `<div class="attachment-list">${attachments.map((item) => `<div class="attachment-row"><button type="button" class="attachment-open" data-action="open-attachment" data-room-id="${attr(roomId)}" data-record-id="${attr(record.id)}" data-attachment-id="${attr(item.id)}">${escapeHtml(item.name)}</button><span>${Number(item.size || 0).toLocaleString()} bytes</span><button type="button" class="icon-inline danger" data-action="remove-attachment" data-room-id="${attr(roomId)}" data-record-id="${attr(record.id)}" data-attachment-id="${attr(item.id)}" aria-label="Remove ${attr(item.name)}">×</button></div>`).join('')}</div>` : '<p class="muted">No local files attached.</p>') : '<p class="muted">Save the entry before adding files.</p>'}</section>`;
}

function renderCollectionRoom(roomId) {
  const definition = COLLECTION_ROOM_DEFINITIONS[roomId];
  const world = activeWorld();
  const records = (state.records[roomId] || []).filter((record) => record.worldId === world.id);
  const record = recordForRoom(roomId);
  const isIngest = roomId === 'ingest';
  const committed = isIngest && record?.canonBoundary === 'Committed to canon';
  const commitEligible = isIngest && record && !committed
    && (record.canonBoundary === 'Candidate for Steward review' || record.reviewStatus === 'Canon candidate');
  const stewardControls = isIngest && record ? (
    committed
      ? `<p class="commit-badge">✦ Committed to canon${record.canonisedAt ? ' · ' + new Date(record.canonisedAt).toLocaleDateString() : ''}</p><button type="button" class="quiet" data-action="edit-canon-script" data-ingest-id="${attr(record.id)}">Edit canon script →</button>`
      : commitEligible
        ? `<button type="button" class="steward-commit" data-action="commit-to-canon" data-room-id="${attr(roomId)}" data-record-id="${attr(record.id)}">Commit to canon ✦</button>`
        : ''
  ) : '';
  const itemLabel = (item) => isIngest
    ? escapeHtml(item.reviewStatus || item.canonBoundary || 'Non-canon intake')
    : escapeHtml(item.date || item.status || item.category || 'Local record');
  return `<section class="section-heading"><div><p class="eyebrow">${escapeHtml(world.name)} · ${escapeHtml(definition.category)}</p><h1>${escapeHtml(definition.label)}</h1><p class="lede">${escapeHtml(definition.description)}</p></div><button data-action="new-record" data-room-id="${attr(roomId)}">New entry</button></section>
    <section class="split-layout"><aside class="panel item-list">${records.length ? records.map((item) => `<button class="item-card ${item.id === record?.id ? 'active' : ''}" data-record-room="${attr(roomId)}" data-record-id="${attr(item.id)}"><strong>${escapeHtml(item.title || 'Untitled')}</strong><span>${itemLabel(item)}</span></button>`).join('') : '<p class="muted">No entries in this world yet.</p>'}</aside>
    <article class="panel"><form id="record-form" data-room-id="${attr(roomId)}" class="stack"><input type="hidden" name="id" value="${attr(record?.id || '')}" />${definition.fields.map((field) => fieldMarkup(field, record)).join('')}${definition.attachments ? renderAttachments(record, roomId) : ''}<div class="button-row"><button type="submit">${record ? 'Save entry' : 'Create entry'}</button>${record ? `<button type="button" class="quiet danger" data-action="delete-record" data-room-id="${attr(roomId)}" data-record-id="${attr(record.id)}">Delete</button>` : ''}${stewardControls}</div></form></article></section>`;
}

function renderScripts() {
  const world = activeWorld();
  const scripts = state.scripts.filter((script) => script.worldId === world.id || script.world === world.name);
  const selected = scripts.find((script) => script.id === selectedScriptId) || scripts[0] || null;
  return `<section class="section-heading"><div><p class="eyebrow">${escapeHtml(world.name)} · world architecture</p><h1>Scripts</h1></div><button data-action="new-script">New script</button></section><section class="split-layout"><aside class="panel item-list">${scripts.map((script) => `<button class="item-card ${script.id === selected?.id ? 'active' : ''}" data-script-id="${attr(script.id)}"><strong>${escapeHtml(script.name)}</strong><span>${escapeHtml(script.status)}</span></button>`).join('') || '<p class="muted">No scripts for this world.</p>'}</aside><article class="panel">${selected ? `<form id="script-form" class="stack"><input type="hidden" name="id" value="${attr(selected.id)}" /><label>Name<input name="name" value="${attr(selected.name)}" required /></label><label>Status<select name="status">${['Draft I', 'In Review', 'Canon'].map((status) => `<option ${selected.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label>Reference script<textarea name="content" rows="28">${escapeHtml(selected.content)}</textarea></label><div class="button-row"><button type="submit">Save script</button><button type="button" class="quiet danger" data-action="delete-script" data-id="${attr(selected.id)}">Delete</button></div></form>` : '<p>Create a script to begin.</p>'}</article></section>`;
}

function renderFeedback() {
  const world = activeWorld();
  if (storySoundscape.snapshot().world.worldId !== world.id) storySoundscape.setWorld(world);
  const sound = storySoundscape.snapshot();
  const cycles = state.feedbackCycles.filter((cycle) => cycle.world.id === world.id);
  const canon = state.scripts.filter((script) => script.worldId === world.id && script.status === 'Canon');
  const current = state.premaqcByWorld[world.id] || cycles[0]?.premaqc_after;
  const axis = (name) => Number(current?.state?.[name]?.value ?? world.premaqc?.[name] ?? (name === 'E' ? .31 : .78)).toFixed(3);
  return `<section class="section-heading"><div><p class="eyebrow">World → voices → work → receipt → next state</p><h1>Relational Feedback Chamber</h1></div><button class="quiet" data-action="feather-feedback">Feather · pause</button></section>
    <section class="grid two feedback-layout">
      <article class="panel"><form id="feedback-form" class="stack">
        <div class="feedback-state"><strong>PREMAQC ${current ? `#${current.sequence}` : 'origin'}</strong>${['P','C','R','E','M','A','Q'].map((name) => `<span><b>${name}</b> ${axis(name)}</span>`).join('')}</div>
        <label>Practice<select name="mode"><option value="writing">Writing</option><option value="roleplay">Roleplaying</option></select></label>
        <fieldset><legend>Constellation voices</legend><div class="voice-grid">${CONSTELLATION_VOICES.map((voice) => `<label class="checkbox"><input type="checkbox" name="voiceIds" value="${attr(voice.id)}" /> <span><b>${escapeHtml(voice.name)}</b><small>${escapeHtml(voice.route)} · ${escapeHtml(voice.model)}</small></span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Canon context</legend>${canon.length ? canon.map((item) => `<label class="checkbox"><input type="checkbox" name="canonRefs" value="${attr(item.id)}" /> ${escapeHtml(item.name)}</label>`).join('') : '<p class="muted">No committed canon scripts for this world yet. The world profile still travels with the cycle.</p>'}</fieldset>
        <label>Your turn<textarea name="work" rows="10" required placeholder="Write the world as it happens. The sound engine answers recognised events without editorialising the text."></textarea></label>
        ${renderStorySoundscape(sound)}
        <label class="checkbox"><input type="checkbox" name="invokeModels" checked /> Invoke each selected voice through its own model route</label>
        <label>Optional manual response or fallback<textarea name="response" rows="6" placeholder="Add a spoken, imported, or otherwise received contribution. It remains separately visible in the receipt."></textarea></label>
        <label class="checkbox"><input type="checkbox" name="syncLive" /> Sync the verified receipt to the relational ledger</label>
        <label>Session-only sync token<input type="password" name="syncToken" autocomplete="off" placeholder="Never persisted in Arcsweep state" /></label>
        <button type="submit">Run feedback cycle ∞</button>
      </form></article>
      <article class="panel feedback-ledger"><h2>Receipts & replay</h2>${cycles.length ? cycles.map((cycle) => `<article class="working-card"><div class="working-head"><strong>${escapeHtml(cycle.turn.mode)} · ${escapeHtml(cycle.voices.map((voice) => voice.name).join(', '))}</strong><small>${new Date(cycle.created_at).toLocaleString()}</small></div><p>${escapeHtml(cycle.turn.work)}</p>${cycle.voice_invocations?.length ? `<div class="voice-receipts">${cycle.voice_invocations.map((item) => `<p data-status="${attr(item.status)}"><b>${escapeHtml(item.name)} · ${escapeHtml(item.status)}</b>${item.text ? `<br>${escapeHtml(item.text)}` : item.error ? `<br>${escapeHtml(item.error)}` : ''}</p>`).join('')}</div>` : cycle.turn.response ? `<p><b>Response:</b> ${escapeHtml(cycle.turn.response)}</p>` : ''}${cycle.sound_events?.length ? `<div class="sound-receipts">${cycle.sound_events.map((item) => `<p><b>♪ ${escapeHtml(item.cue_label)}</b> · “${escapeHtml(item.source_text)}” · ${Number(item.root_hz).toFixed(2)} Hz</p>`).join('')}</div>` : ''}<dl class="facts"><div><dt>Math Spine</dt><dd>${escapeHtml(cycle.math_spine_packet.packet_id)}</dd></div><div><dt>Replay</dt><dd>${cycle.replay_receipt.matched ? 'Exact match' : 'Mismatch'}</dd></div><div><dt>PREMAQC</dt><dd>${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence}</dd></div><div><dt>Story sound</dt><dd>${cycle.sound_events?.length || 0} fired event${cycle.sound_events?.length === 1 ? '' : 's'}</dd></div></dl></article>`).join('') : '<p class="muted">No cycle has run for this world yet.</p>'}</article>
    </section>`;
}

function renderStorySoundscape(sound = storySoundscape.snapshot()) {
  const trackRows = sound.tracks.length ? sound.tracks.map((track) => `<div class="sound-track">
    <button type="button" class="quiet mini" data-action="sound-toggle-track" data-track-id="${attr(track.id)}">${track.playing ? '■ Stop' : '▶ Play'}</button>
    <span title="${attr(track.name)}">${escapeHtml(track.name)}</span>
    <input type="range" min="0" max="1" step="0.01" value="${track.level}" data-sound-track-level="${attr(track.id)}" aria-label="${attr(track.name)} level" />
    <button type="button" class="quiet mini danger" data-action="sound-remove-track" data-track-id="${attr(track.id)}">×</button>
  </div>`).join('') : '<p class="muted">Load local audio stems for rain, rooms, machinery, forest, voices, or any world texture. Files remain on this device and are not uploaded.</p>';
  const eventRows = sound.recentReceipts.length ? sound.recentReceipts.slice(0, 5).map((item) => `<li><b>${escapeHtml(item.cue_label)}</b> ← “${escapeHtml(item.source_text)}”</li>`).join('') : '<li>Waiting for story events.</li>';
  const soundfontBanks = sound.soundfontBanks.length
    ? sound.soundfontBanks.map((bank) => `<li><b>${escapeHtml(bank.name)}</b> · ${(bank.size / 1048576).toFixed(1)} MB · local</li>`).join('')
    : '<li>No SoundFont bank loaded.</li>';
  const soundfontOptions = sound.soundfontPresets.length
    ? sound.soundfontPresets.map((preset) => `<option value="${attr(preset.key)}" ${sound.selectedSoundfontPreset?.key === preset.key ? 'selected' : ''}>${escapeHtml(preset.name)} · ${preset.isDrum ? 'drum' : `bank ${preset.bankMSB}/${preset.bankLSB}`} · program ${preset.program}</option>`).join('')
    : '<option value="">Load a bank to reveal its presets</option>';
  return `<section class="story-soundscape" data-story-soundscape>
    <div class="soundscape-head"><div><p class="eyebrow">Story → tone → room</p><h3>World Sound Mixer</h3><p class="muted">${sound.armed ? 'Audio armed' : 'Audio waits for a user gesture'} · ${sound.world.rootHz.toFixed(2)} Hz · ${escapeHtml(sound.world.worldName)}</p></div><div class="button-row"><button type="button" data-action="sound-arm">${sound.armed ? 'Re-arm' : 'Arm sound'}</button><button type="button" class="quiet" data-action="sound-toggle-hum">${sound.humActive ? 'Stop hum' : 'Start hum'}</button><button type="button" class="quiet" data-action="sound-world-tone">Strike world tone</button><button type="button" class="quiet" data-action="sound-audition">Hear written events</button></div></div>
    <div class="sound-mixer-grid">
      ${['master','hum','tones','effects','ambience'].map((bus) => `<label>${bus[0].toUpperCase() + bus.slice(1)}<input type="range" min="0" max="1" step="0.01" value="${sound.buses[bus]}" data-sound-bus="${bus}" /></label>`).join('')}
      <label>World root (Hz)<input type="number" min="20" max="20000" step="0.01" value="${sound.world.rootHz}" data-sound-root /></label>
      <label>Waveform<select data-sound-waveform>${['sine','triangle','sawtooth','square'].map((wave) => `<option ${sound.world.waveform === wave ? 'selected' : ''}>${wave}</option>`).join('')}</select></label>
      <label>Overtones<input type="range" min="1" max="6" step="1" value="${sound.world.overtones}" data-sound-overtones /></label>
    </div>
    <div class="soundfont-rack">
      <div><p class="eyebrow">Polyphone → local bank → world voice</p><h4>SoundFont rack</h4><p class="muted">Browse <a href="https://www.polyphone.io/en/soundfonts" target="_blank" rel="noopener noreferrer">Polyphone soundfonts</a>, keep the bank’s license with it, then load the local SF2, SF3, SFOGG, or DLS file here. Banks stay on this device.</p></div>
      <div class="soundfont-controls"><label class="file-button">Load SoundFont bank<input id="soundfont-files" type="file" accept=".sf2,.sf3,.sfogg,.dls" multiple /></label><label>Preset<select data-soundfont-preset ${sound.soundfontPresets.length ? '' : 'disabled'}>${soundfontOptions}</select></label><button type="button" class="quiet" data-action="soundfont-tone" ${sound.selectedSoundfontPreset ? '' : 'disabled'}>Play preset at world tone</button></div>
      <ul class="soundfont-bank-list">${soundfontBanks}</ul>
    </div>
    <div class="button-row sound-output-row"><label class="file-button">Load soundscape stems<input id="soundscape-files" type="file" accept="audio/*" multiple /></label><button type="button" class="quiet" data-action="sound-haptics">Haptics · ${sound.haptics ? 'On' : 'Off'}</button><button type="button" class="quiet" data-action="sound-midi">MIDI · ${sound.midi ? 'On' : 'Connect'}</button><button type="button" class="quiet" data-action="sound-record">${sound.recording ? 'Stop & save mix' : 'Record mix'}</button></div>
    <div class="soundscape-lower"><div><h4>Soundscape stems</h4><div class="sound-tracks">${trackRows}</div></div><div><h4>Fired story actions</h4><ol class="sound-event-log">${eventRows}</ol></div></div>
  </section>`;
}

function refreshStorySoundscape() {
  const dock = app.querySelector('[data-story-soundscape]');
  if (dock) dock.outerHTML = renderStorySoundscape();
}

function setLiveNotice(message) {
  notice = message;
  const element = app.querySelector('.notice');
  if (element) element.textContent = message;
}

function downloadSoundscape(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `arcsweep-soundscape-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.webm`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderWakingThread() {
  return `<section class="section-heading"><div><p class="eyebrow">Waking Thread</p><h1>Continuity Log</h1></div></section><section class="grid two continuity-grid"><article class="panel"><h2>Add a thread entry</h2><form id="continuity-form" class="stack"><label>Title<input name="title" required /></label><label>Source<select name="source"><option>Self-entered</option><option>Trusted person</option><option>Calendar</option><option>Imported note</option><option>Other</option></select></label><label>Details<textarea name="details" rows="8" required></textarea></label><button type="submit">Add to Waking Thread</button></form></article><article class="panel timeline"><h2>Thread</h2>${state.continuity.length ? state.continuity.map((entry) => `<article class="timeline-entry"><div><strong>${escapeHtml(entry.title)}</strong><span>${new Date(entry.createdAt).toLocaleString()} · ${escapeHtml(entry.source)}</span></div><p>${escapeHtml(entry.details)}</p><button class="icon-button" data-action="delete-continuity" data-id="${attr(entry.id)}" aria-label="Delete ${attr(entry.title)}">×</button></article>`).join('') : '<p class="muted">The Waking Thread is quiet.</p>'}</article></section>`;
}

function renderForge() {
  return `<section class="section-heading"><div><p class="eyebrow">Pattern into craft</p><h1>Forge</h1></div></section><section class="grid two"><article class="panel"><form id="forge-form" class="stack"><label>Desired condition<input name="intention" required /></label><label>Why it matters<textarea name="meaning" rows="4"></textarea></label><label>Next practical action<textarea name="action" rows="4"></textarea></label><label>Evidence or symbolic markers<textarea name="markers" rows="4"></textarea></label><button type="submit">Add forge working</button></form></article><article class="panel working-list"><h2>Workings</h2>${state.manifestations.length ? state.manifestations.map((item) => `<article class="working-card"><div class="working-head"><strong>${escapeHtml(item.intention)}</strong><select data-action="forge-status" data-id="${attr(item.id)}">${['Seeded', 'In Motion', 'Received', 'Released'].map((status) => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>${item.meaning ? `<p><b>Meaning:</b> ${escapeHtml(item.meaning)}</p>` : ''}${item.action ? `<p><b>Next action:</b> ${escapeHtml(item.action)}</p>` : ''}${item.markers ? `<p><b>Markers:</b> ${escapeHtml(item.markers)}</p>` : ''}<button class="icon-button" data-action="delete-forge" data-id="${attr(item.id)}">×</button></article>`).join('') : '<p class="muted">No workings yet.</p>'}</article></section>`;
}

function renderAppletManager() {
  const world = selectedWorld();
  return `<section class="section-heading"><div><p class="eyebrow">${escapeHtml(world.name)}</p><h1>Applet Deck</h1></div></section><section class="panel"><form id="applet-form" class="stack"><div class="applet-manager">${APPLET_CATALOGUE.map((applet) => {
    const item = world.applets.find((candidate) => candidate.id === applet.id) || { visible: false, order: 0, customLabel: '', customGlyph: '' };
    return `<article class="applet-editor"><label class="checkbox"><input type="checkbox" name="visible:${attr(applet.id)}" ${item.visible ? 'checked' : ''} /> ${escapeHtml(applet.label)}</label><label>Label<input name="label:${attr(applet.id)}" value="${attr(item.customLabel)}" placeholder="${attr(applet.label)}" /></label><label>Glyph<input name="glyph:${attr(applet.id)}" value="${attr(item.customGlyph)}" placeholder="${attr(applet.glyph)}" /></label><label>Order<input name="order:${attr(applet.id)}" type="number" value="${item.order}" /></label></article>`;
  }).join('')}</div><button type="submit">Save applet deck</button></form></section>`;
}

function renderSettings() {
  const native = isDesktopRuntime();
  return `<section class="section-heading"><div><p class="eyebrow">Local controls</p><h1>Settings & Recovery</h1></div></section><section class="grid two"><article class="panel"><form id="settings-form" class="stack"><label>Waking label<input name="crLabel" value="${attr(state.settings.crLabel)}" /></label><label>World label<input name="drLabel" value="${attr(state.settings.drLabel)}" /></label><label>Return Anchor<input name="returnAnchor" value="${attr(state.settings.returnAnchor)}" /></label><label class="checkbox"><input name="reduceMotion" type="checkbox" ${state.settings.reduceMotion ? 'checked' : ''} /> Reduce motion</label><label class="checkbox"><input name="largeText" type="checkbox" ${state.settings.largeText ? 'checked' : ''} /> Larger interface text</label><label class="checkbox"><input name="highContrast" type="checkbox" ${state.settings.highContrast ? 'checked' : ''} /> High contrast</label><label>Text scale<input name="fontScale" type="range" min="0.9" max="1.5" step="0.05" value="${state.settings.fontScale || 1}" /></label><button type="submit">Save settings</button></form></article><article class="panel stack"><h2>Native storage</h2><dl class="facts"><div><dt>Mode</dt><dd>${escapeHtml(storageInfo?.mode || 'Loading')}</dd></div><div><dt>Data directory</dt><dd class="path-value">${escapeHtml(storageInfo?.dataDirectory || 'Browser development fallback')}</dd></div><div><dt>Version</dt><dd>${escapeHtml(storageInfo?.version || state.version)}</dd></div></dl><div class="button-row"><button data-action="export">Export archive</button><button class="quiet" data-action="import">Import archive</button>${native ? '<button class="quiet" data-action="show-data-folder">Open data folder</button><button class="quiet" data-action="create-backup">Create backup</button>' : '<label class="file-button">Import JSON<input id="browser-import" type="file" accept="application/json,.json" /></label>'}</div><h3>Recovery snapshots</h3>${native ? (backups.length ? `<div class="backup-list">${backups.map((item) => `<div class="backup-row"><span><strong>${escapeHtml(item.name)}</strong><small>${new Date(item.modifiedAt).toLocaleString()} · ${Number(item.size).toLocaleString()} bytes</small></span><button class="quiet" data-action="restore-backup" data-backup-name="${attr(item.name)}">Restore</button></div>`).join('')}</div>` : '<p class="muted">No backups yet. They are created automatically before state replacement.</p>') : '<p class="muted">The installed Windows edition uses atomic files, attachments, and recovery snapshots. Browser mode is retained only for development.</p>'}</article></section>`;
}

function renderReturnDialog() {
  if (!returnOpen) return '';
  return `<div class="modal-backdrop"><section class="return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-title"><p class="eyebrow">${escapeHtml(state.settings.returnAnchor)}</p><h2 id="return-title">Return to the ${escapeHtml(state.settings.crLabel)}</h2><ol><li>Name yourself.</li><li>Feel the support beneath your body.</li><li>Notice three present sensory facts.</li><li>Move fingers and toes.</li><li>Choose to close the active arc.</li></ol><div class="button-row"><button data-action="complete-return">I am here · Close arc</button><button class="quiet" data-action="cancel-return">Continue arc</button></div></section></div>`;
}

async function fetchDeepData() {
  if (deepDataFetching) return;
  deepDataFetching = true;
  notice = 'Reading field…';
  render();
  try {
    const res = await fetch('https://singsenochian.github.io/Flameclyffe/data/deep-current.json');
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    deepData = await res.json();
    deepDataError = null;
    notice = 'Field data received.';
  } catch (err) {
    deepDataError = err.message;
    notice = `Field unavailable: ${err.message}`;
  } finally {
    deepDataFetching = false;
    if (activeRoom === 'deep-observer') render();
  }
}

function renderDeepObserver() {
  const genAt = deepData?.generated_at ? new Date(deepData.generated_at) : null;
  const stamp = genAt ? genAt.toLocaleString() : '';
  const loc = deepData?.location?.label || '';

  const header = `<section class="section-heading">
    <div>
      <p class="eyebrow">Ambient instrument</p>
      <h1>Field · DEEP Observer</h1>
      <p class="lede">${stamp ? escapeHtml(stamp) + (loc ? ' · ' + escapeHtml(loc) : '') : 'Canonical PREMAQC state with verbatim source readings.'}</p>
    </div>
    <button data-action="refresh-deep"${deepDataFetching ? ' disabled' : ''}>↻ Refresh</button>
  </section>`;

  if (deepDataFetching && !deepData) return header + `<section class="panel"><p class="muted">Reading field…</p></section>`;

  if (!deepData) return header + `<section class="panel">
    <p>The DEEP Observer carries the accepted PREMAQC state and reads ambient weather, space-weather, and lunar channels as separately named source evidence.</p>
    <button data-action="refresh-deep">Read field now</button>
  </section>`;

  const world = activeWorld();
  const acceptedPremaqc = state.premaqcByWorld[world.id] || createInitialPremaqc(world.id, world.premaqc);
  const field = Object.fromEntries(DEEP_CHANNELS.map(([axis]) => [axis, acceptedPremaqc.state?.[axis]?.value ?? null]));
  const current = deepData.weather?.current || {};
  const sw = deepData.space_weather || {};
  const moon = deepData.moon || {};
  const sky = deepData.weather?.sky || '';

  function channelCard([key, name, source, formula]) {
    const raw = field[key];
    const val = (raw !== null && raw !== undefined) ? Number(raw) : null;
    const pct = val !== null ? Math.round(val * 100) : 0;
    const display = val !== null ? val.toFixed(3) : '—';
    return `<article class="panel deep-channel">
      <div class="deep-channel-header">
        <span class="deep-letter" aria-hidden="true">${escapeHtml(key)}</span>
        <div><strong>${escapeHtml(name)}</strong><span class="muted">${escapeHtml(source)}</span></div>
        <span class="deep-value${val === null ? ' muted' : ''}">${escapeHtml(display)}</span>
      </div>
      <div class="deep-bar-track"><div class="deep-bar-fill" data-ch="${attr(key)}" style="width:${pct}%"></div></div>
      <code class="deep-formula">${escapeHtml(formula)}</code>
    </article>`;
  }

  const channelsHtml = DEEP_CHANNELS.map(channelCard).join('');

  const kp = sw.kp?.value ?? '—';
  const bz = sw.solar_wind?.bz ?? '—';
  const speed = sw.solar_wind?.speed ?? '—';
  const bt = sw.solar_wind?.bt ?? '—';
  const cloud = current.cloud_cover ?? '—';
  const precip = current.precipitation ?? '—';
  const humidity = current.relative_humidity_2m ?? '—';
  const wind = current.wind_speed_10m ?? '—';
  const pressure = current.pressure_msl ?? '—';
  const temp = current.temperature_2m ?? '—';

  const rawHtml = `<section class="grid two">
    <article class="panel">
      <p class="eyebrow">Atmosphere · ${escapeHtml(sky)}</p>
      <dl class="facts">
        <div><dt>Pressure</dt><dd>${escapeHtml(String(pressure))} hPa</dd></div>
        <div><dt>Cloud cover</dt><dd>${escapeHtml(String(cloud))} %</dd></div>
        <div><dt>Precipitation</dt><dd>${escapeHtml(String(precip))} in/hr</dd></div>
        <div><dt>Humidity</dt><dd>${escapeHtml(String(humidity))} %</dd></div>
        <div><dt>Wind speed</dt><dd>${escapeHtml(String(wind))} mph</dd></div>
        <div><dt>Temperature</dt><dd>${escapeHtml(String(temp))} °F</dd></div>
      </dl>
    </article>
    <article class="panel">
      <p class="eyebrow">Space weather · Moon</p>
      <dl class="facts">
        <div><dt>Kp index</dt><dd>${escapeHtml(String(kp))}</dd></div>
        <div><dt>Bz (IMF)</dt><dd>${escapeHtml(String(bz))} nT</dd></div>
        <div><dt>Bt (IMF)</dt><dd>${escapeHtml(String(bt))} nT</dd></div>
        <div><dt>Solar wind</dt><dd>${escapeHtml(String(speed))} km/s</dd></div>
        <div><dt>Moon phase</dt><dd>${escapeHtml(moon.name || '—')} · ${escapeHtml(String(moon.illumination ?? '—'))}%</dd></div>
        <div><dt>Lunar age</dt><dd>${escapeHtml(String(moon.age_days ?? '—'))} days</dd></div>
      </dl>
    </article>
  </section>`;

  const spineRows = DEEP_CHANNELS.map(([key, name, , formula]) => {
    const val = field[key];
    const display = (val !== null && val !== undefined) ? Number(val).toFixed(3) : '—';
    return `<div class="deep-spine-row">
      <span class="deep-letter small">${escapeHtml(key)}</span>
      <span>${escapeHtml(name)}</span>
      <code class="deep-formula">${escapeHtml(formula)}</code>
      <span class="deep-spine-val">${escapeHtml(display)}</span>
    </div>`;
  }).join('');

  const spineHtml = `<section class="panel">
    <h2>Mathematics spine · PREMAQC sequence ${escapeHtml(String(acceptedPremaqc.sequence))}</h2>
    <div class="deep-spine">
      ${spineRows}
    </div>
    <p class="muted" style="margin-top:1rem;font-size:.8rem">The accepted seven-axis state is shown without relabelling. Ambient Open-Meteo, NOAA SWPC, and lunar readings remain source evidence; feedback cycles and transformations remain separately receipted.</p>
  </section>`;

  return header + `<section class="deep-channels">${channelsHtml}</section>` + rawHtml + spineHtml;
}

function currentView() {
  if (activeRoom === 'portal') return renderPortal();
  if (activeRoom === 'worlds') return renderWorlds();
  if (activeRoom === 'scripts') return renderScripts();
  if (activeRoom === 'feedback') return renderFeedback();
  if (activeRoom === 'waking-thread') return renderWakingThread();
  if (activeRoom === 'forge') return renderForge();
  if (activeRoom === 'settings') return renderSettings();
  if (activeRoom === 'applet-deck') return renderAppletManager();
  if (activeRoom === 'deep-observer') return renderDeepObserver();
  if (COLLECTION_ROOM_DEFINITIONS[activeRoom]) return renderCollectionRoom(activeRoom);
  if (WORLD_SECTION_DEFINITIONS[activeRoom] || activeRoom === 'appearance') return renderWorldSection(activeRoom);
  return renderPortal();
}

function render() {
  applyPresentation();
  const world = activeWorld();
  app.innerHTML = `<div class="app-shell"${isHosted ? ' data-hosted' : ''}><aside class="sidebar"><div class="brand"><span class="brand-mark">⌁</span><div><strong>Arcsweep</strong><small>Hearthgate</small></div></div><nav aria-label="Primary Arcsweep rooms">${PRIMARY_NAV.map(([id, label, glyph]) => roomButton(id, label, glyph)).join('')}</nav><div class="sidebar-world"><span>Active portal</span><strong>${escapeHtml(world.name)}</strong><button class="quiet mini" data-room="applet-deck">Arrange applets</button></div><p class="privacy-seal">${isDesktopRuntime() ? 'Native local store' : 'Browser development mode'}<br />No automatic upload</p></aside><main class="content">${currentView()}<p class="notice" role="status">${escapeHtml(notice)}</p></main>${renderReturnDialog()}</div>`;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function saveWorldSection(section, form) {
  const world = selectedWorld();
  const v = formValues(form);
  if (section === 'about') Object.assign(world, { name: v.name.trim() || 'Untitled World', kind: v.kind.trim(), description: v.description.trim(), history: v.history.trim(), rules: v.rules.trim() });
  if (section === 'summon') Object.assign(world.surface, { type: v.type, name: v.surfaceName.trim() || 'Arcsweep', appearance: v.appearance.trim(), summonMode: v.summonMode, summonCue: v.summonCue.trim() });
  if (section === 'veil') Object.assign(world.surface, { veilEnabled: form.elements.veilEnabled.checked, visibility: v.visibility, approvedPeople: v.approvedPeople.trim() });
  if (section === 'time') Object.assign(world.time, { wakingMinutes: Number(v.wakingMinutes) || 60, worldMinutes: Number(v.worldMinutes) || 10080, pauseWhenAway: form.elements.pauseWhenAway.checked, arrivalDate: v.arrivalDate.trim(), arrivalTime: v.arrivalTime.trim() });
  if (section === 'arrival') Object.assign(world.arrival, { location: v.location.trim(), context: v.context.trim(), memories: v.memories.trim(), orientation: v.orientation.trim(), wrpProfileId: v.wrpProfileId.trim(), wrpLabel: v.wrpLabel.trim(), wrpRunaUrl: v.wrpRunaUrl.trim() });
  if (section === 'identity') Object.assign(world.identity, { name: v.name.trim(), pronouns: v.pronouns.trim(), age: v.age.trim(), roles: v.roles.trim(), form: v.form.trim(), sensorySignature: v.sensorySignature.trim(), appearance: v.appearance.trim(), accessibility: v.accessibility.trim(), notes: v.notes.trim() });
  if (section === 'competencies') Object.assign(world.competencies, { languages: v.languages.trim(), worldSystems: v.worldSystems.trim(), movement: v.movement.trim(), socialContext: v.socialContext.trim(), accessibility: v.accessibility.trim() });
  if (section === 'safety') Object.assign(world.safetyWeave, { general: v.general.trim(), exclusions: v.exclusions.trim(), returnAlwaysAvailable: form.elements.returnAlwaysAvailable.checked, anchorIntentGated: form.elements.anchorIntentGated.checked });
  if (section === 'recall') Object.assign(world.recall, { onArrival: v.onArrival.trim(), onReturn: v.onReturn.trim(), selectiveForgetting: v.selectiveForgetting.trim() });
  if (section === 'companion') Object.assign(world.companion, { enabled: form.elements.enabled.checked, name: v.name.trim(), form: v.form.trim(), role: v.role.trim(), communication: v.communication.trim(), agency: v.agency.trim(), notes: v.notes.trim() });
  if (section === 'theme') Object.assign(world.theme, { background: v.background, panel: v.panel, accent: v.accent, secondary: v.secondary, text: v.text, backgroundImage: v.backgroundImage.trim(), lowMotion: form.elements.lowMotion.checked });
  world.updatedAt = isoNow();
  persist(`${worldSectionTitle(activeRoom)} saved.`, `world-${section}`);
}

app.addEventListener('click', async (event) => {
  const room = event.target.closest('[data-room]');
  if (room) { activeRoom = room.dataset.room; if (activeRoom === 'deep-observer' && !deepData && !deepDataFetching) fetchDeepData(); render(); return; }
  const worldButton = event.target.closest('[data-world-id]');
  if (worldButton) { selectedWorldId = worldButton.dataset.worldId; render(); return; }
  const scriptButton = event.target.closest('[data-script-id]');
  if (scriptButton) { selectedScriptId = scriptButton.dataset.scriptId; render(); return; }
  const recordButton = event.target.closest('[data-record-room]');
  if (recordButton) { selectedRecords[recordButton.dataset.recordRoom] = recordButton.dataset.recordId; render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'open-wrp') { const url = activeWorld()?.arrival?.wrpRunaUrl; if (url) window.open(url, '_blank', 'noopener,noreferrer'); return; }
  if (action === 'refresh-deep') { deepData = null; deepDataFetching = false; fetchDeepData(); return; }
  if (action === 'sound-arm') {
    try { await storySoundscape.arm(activeWorld()); storySoundscape.seedText(app.querySelector('textarea[name="work"]')?.value || ''); setLiveNotice('World Sound Mixer armed. The writing surface can act on the room.'); }
    catch (error) { setLiveNotice(`Sound mixer stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (action === 'sound-toggle-hum') {
    try { await storySoundscape.arm(activeWorld()); if (storySoundscape.humActive) storySoundscape.stopHum(); else storySoundscape.startHum(); setLiveNotice(storySoundscape.humActive ? 'World Hum sounding.' : 'World Hum stopped.'); }
    catch (error) { setLiveNotice(`World Hum stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (action === 'sound-world-tone') {
    try { await storySoundscape.arm(activeWorld()); storySoundscape.playWorldTone(); setLiveNotice(`${activeWorld().name} tone struck at ${storySoundscape.world.rootHz.toFixed(2)} Hz.`); }
    catch (error) { setLiveNotice(`World tone stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (action === 'sound-audition') {
    try { await storySoundscape.arm(activeWorld()); const fired = storySoundscape.auditionText(app.querySelector('textarea[name="work"]')?.value || ''); setLiveNotice(`${fired.length} written sound event${fired.length === 1 ? '' : 's'} fired.`); }
    catch (error) { setLiveNotice(`Story audition stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (action === 'soundfont-tone') {
    try { await storySoundscape.arm(activeWorld()); storySoundscape.playSoundfontNote(storySoundscape.world.rootHz, 1.2, 110); setLiveNotice(`SoundFont preset sounded at ${storySoundscape.world.rootHz.toFixed(2)} Hz.`); }
    catch (error) { setLiveNotice(`SoundFont tone stopped: ${error.message}`); }
    return;
  }
  if (action === 'sound-haptics') { storySoundscape.haptics = !storySoundscape.haptics; setLiveNotice(`Story haptics ${storySoundscape.haptics ? 'armed' : 'off'}.`); refreshStorySoundscape(); return; }
  if (action === 'sound-midi') {
    try { await storySoundscape.enableMidi(); setLiveNotice('MIDI environment output connected.'); }
    catch (error) { setLiveNotice(`MIDI connection stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (action === 'sound-toggle-track') { storySoundscape.toggleTrack(button.dataset.trackId); refreshStorySoundscape(); return; }
  if (action === 'sound-remove-track') { storySoundscape.removeTrack(button.dataset.trackId); refreshStorySoundscape(); return; }
  if (action === 'sound-record') {
    try {
      await storySoundscape.arm(activeWorld());
      if (storySoundscape.recording) { const blob = await storySoundscape.stopRecording(); if (blob) downloadSoundscape(blob); setLiveNotice('Soundscape mix captured.'); }
      else { await storySoundscape.startRecording(); setLiveNotice('Recording the physical mix output.'); }
    } catch (error) { setLiveNotice(`Mix recording stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (action === 'feather-feedback') { storySoundscape.featherStop(); notice = 'Feather received. The chamber and every sound output are paused; nothing was submitted.'; render(); return; }
  if (action === 'open-return') returnOpen = true;
  if (action === 'cancel-return') returnOpen = false;
  if (action === 'complete-return') {
    state.returnHistory = [buildReturnRecord(state), ...state.returnHistory].slice(0, 100);
    state.session = { active: false, startedAt: null, targetWorldId: null, targetWorld: '', intention: '', wakingMinutes: null, worldMinutes: null };
    returnOpen = false;
    persist('Arc closed. Orientation restored.', 'return');
  }
  if (action === 'new-world') {
    const world = createWorld(newId('world'));
    world.name = 'Untitled World';
    state.worlds.unshift(world);
    state.activeWorldId = world.id;
    selectedWorldId = world.id;
    persist('New world portal created.', 'new-world');
  }
  if (action === 'set-active-world') { state.activeWorldId = id; selectedWorldId = id; persist('Active portal changed.', 'active-world'); }
  if (action === 'delete-world') {
    if (state.worlds.length === 1) notice = 'Arcsweep keeps one world portal in the registry.';
    else { state.worlds = state.worlds.filter((world) => world.id !== id); if (state.activeWorldId === id) state.activeWorldId = state.worlds[0].id; selectedWorldId = state.activeWorldId; persist('World portal deleted.', 'delete-world'); }
  }
  if (action === 'new-script') {
    const world = activeWorld();
    const script = { id: newId('script'), name: 'Untitled DR Script', worldId: world.id, world: world.name, status: 'Draft I', content: 'Identity:\nEmbodiment:\nWorld:\nHome and daily life:\nRelationships:\nAbilities:\nArrival:\nReturn:', updatedAt: isoNow() };
    state.scripts.unshift(script); selectedScriptId = script.id; persist('New script created.', 'new-script');
  }
  if (action === 'delete-script') { state.scripts = state.scripts.filter((script) => script.id !== id); selectedScriptId = state.scripts[0]?.id || null; persist('Script deleted.', 'delete-script'); }
  if (action === 'delete-continuity') { state.continuity = state.continuity.filter((entry) => entry.id !== id); persist('Waking Thread entry deleted.', 'delete-thread'); }
  if (action === 'delete-forge') { state.manifestations = state.manifestations.filter((entry) => entry.id !== id); persist('Forge working deleted.', 'delete-forge'); }
  if (action === 'new-record') { selectedRecords[button.dataset.roomId] = null; }
  if (action === 'delete-record') { const roomId = button.dataset.roomId; state.records[roomId] = state.records[roomId].filter((record) => record.id !== button.dataset.recordId); selectedRecords[roomId] = null; persist('Room entry deleted.', `delete-${roomId}`); }
  if (action === 'commit-to-canon') {
    const roomId = button.dataset.roomId;
    const recordId = button.dataset.recordId;
    const record = state.records[roomId]?.find((r) => r.id === recordId);
    if (record) {
      record.canonBoundary = 'Committed to canon';
      record.reviewStatus = 'Committed';
      record.canonisedAt = isoNow();
      record.canonStatus = 'committed';
      record.updatedAt = isoNow();
      const world = state.worlds.find((w) => w.id === record.worldId) || activeWorld();
      const content = [record.summary, record.provenanceNotes].filter(Boolean).join('\n\n---\n\n');
      state.scripts.unshift({ id: newId('canon-script'), name: record.title, worldId: world.id, world: world.name, status: 'Canon', content, updatedAt: isoNow(), formats: ['Reference Script'], ingestSourceId: record.id });
      persist('Committed to canon. Canon script created.', 'commit-canon');
    }
  }
  if (action === 'edit-canon-script') {
    const ingestId = button.dataset.ingestId;
    const script = state.scripts.find((s) => s.ingestSourceId === ingestId);
    if (script) { selectedScriptId = script.id; activeRoom = 'scripts'; }
    else { notice = 'Canon script not found.'; }
  }
  if (action === 'add-attachments') {
    const roomId = button.dataset.roomId; const record = recordForRoom(roomId); if (record) { const files = await addAttachments(); if (files.length) { record.attachments = [...(record.attachments || []), ...files]; persist(`${files.length} local file${files.length === 1 ? '' : 's'} added.`, 'attachment-add'); } }
  }
  if (action === 'open-attachment') { const record = (state.records[button.dataset.roomId] || []).find((item) => item.id === button.dataset.recordId); const attachment = record?.attachments?.find((item) => item.id === button.dataset.attachmentId); if (attachment) await openAttachment(attachment); }
  if (action === 'remove-attachment') { const record = (state.records[button.dataset.roomId] || []).find((item) => item.id === button.dataset.recordId); if (record) { record.attachments = (record.attachments || []).filter((item) => item.id !== button.dataset.attachmentId); persist('Attachment reference removed.', 'attachment-remove'); } }
  if (action === 'export') { const result = await exportState(state); notice = result?.canceled ? 'Export cancelled.' : 'Arcsweep archive exported.'; }
  if (action === 'import') { const imported = await importState(); if (imported) { state = imported; selectedWorldId = state.activeWorldId; activeRoom = 'portal'; persist('Arcsweep archive imported.', 'import'); storageInfo = await getStorageInfo(); backups = await listBackups(); } }
  if (action === 'show-data-folder') await showDataFolder();
  if (action === 'create-backup') { await createBackup('manual'); backups = await listBackups(); notice = 'Recovery snapshot created.'; }
  if (action === 'restore-backup') { const restored = await restoreBackup(button.dataset.backupName); if (restored) { state = restored; selectedWorldId = state.activeWorldId; activeRoom = 'portal'; backups = await listBackups(); notice = 'Recovery snapshot restored.'; } }
  render();
});

app.addEventListener('change', async (event) => {
  const status = event.target.closest('[data-action="forge-status"]');
  if (status) { const item = state.manifestations.find((entry) => entry.id === status.dataset.id); if (item) item.status = status.value; persist('Forge status updated.', 'forge-status'); render(); return; }
  if (event.target.id === 'soundscape-files' && event.target.files?.length) {
    try { await storySoundscape.arm(activeWorld()); const loaded = await storySoundscape.loadFiles(event.target.files); setLiveNotice(`${loaded.length} local soundscape stem${loaded.length === 1 ? '' : 's'} loaded.`); }
    catch (error) { setLiveNotice(`Soundscape load stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (event.target.id === 'soundfont-files' && event.target.files?.length) {
    try { await storySoundscape.arm(activeWorld()); const loaded = await storySoundscape.loadSoundfontFiles(event.target.files); setLiveNotice(`${loaded.length} local SoundFont bank${loaded.length === 1 ? '' : 's'} loaded into the world-tone bus.`); }
    catch (error) { setLiveNotice(`SoundFont load stopped: ${error.message}`); }
    refreshStorySoundscape(); return;
  }
  if (event.target.matches('[data-soundfont-preset]')) { storySoundscape.selectSoundfontPreset(event.target.value); setLiveNotice(`SoundFont preset selected: ${event.target.options[event.target.selectedIndex]?.text || event.target.value}.`); refreshStorySoundscape(); return; }
  if (event.target.matches('[data-sound-waveform]')) { storySoundscape.setWaveform(event.target.value); refreshStorySoundscape(); return; }
  if (event.target.id === 'browser-import' && event.target.files?.[0]) { try { const imported = await importState(event.target.files[0]); if (imported) { state = imported; selectedWorldId = state.activeWorldId; activeRoom = 'portal'; persist('Arcsweep archive imported.', 'browser-import'); } } catch (error) { notice = `Import failed: ${error.message}`; } render(); }
});

app.addEventListener('input', (event) => {
  if (event.target.matches('textarea[name="work"]')) {
    const fired = storySoundscape.handleText(event.target.value);
    if (fired.length) { setLiveNotice(`${fired.map((item) => item.cue_label).join(', ')} fired into the room.`); refreshStorySoundscape(); }
    return;
  }
  const bus = event.target.dataset.soundBus;
  if (bus) { storySoundscape.setBus(bus, event.target.value); return; }
  if (event.target.matches('[data-sound-root]')) { storySoundscape.setRoot(event.target.value); return; }
  if (event.target.matches('[data-sound-overtones]')) { storySoundscape.setOvertones(event.target.value); return; }
  const trackId = event.target.dataset.soundTrackLevel;
  if (trackId) storySoundscape.setTrackLevel(trackId, event.target.value);
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const v = formValues(form);
  if (form.id === 'session-form') {
    const world = state.worlds.find((item) => item.id === v.targetWorldId) || activeWorld();
    state.activeWorldId = world.id; selectedWorldId = world.id;
    state.session = { active: true, startedAt: isoNow(), targetWorldId: world.id, targetWorld: world.name, intention: v.intention.trim(), wakingMinutes: world.time.wakingMinutes, worldMinutes: world.time.worldMinutes };
    persist('Arc begun. Return remains available.', 'begin-arc');
  }
  if (form.id === 'world-registry-form') { const world = state.worlds.find((item) => item.id === v.id); if (world) { Object.assign(world, { name: v.name.trim() || 'Untitled World', kind: v.kind.trim(), description: v.description.trim(), updatedAt: isoNow() }); persist('World portal saved.', 'world-registry'); } }
  if (form.id === 'world-section-form') saveWorldSection(form.dataset.section, form);
  if (form.id === 'script-form') { const script = state.scripts.find((item) => item.id === v.id); if (script) { Object.assign(script, { name: v.name.trim() || 'Untitled DR Script', status: v.status, content: v.content, updatedAt: isoNow() }); persist('Script saved locally.', 'script'); } }
  if (form.id === 'feedback-form') {
    try {
      const world = activeWorld();
      const voiceIds = [...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value);
      const canonRefs = [...form.querySelectorAll('input[name="canonRefs"]:checked')].map((input) => input.value);
      const canon = state.scripts.filter((script) => canonRefs.includes(script.id));
      const current = state.premaqcByWorld[world.id] || createInitialPremaqc(world.id, world.premaqc);
      const voiceInvocations = form.elements.invokeModels.checked
        ? await invokeConstellationVoices({ world, mode: v.mode, work: v.work, premaqc: current, canon, voiceIds })
        : [];
      const routedResponse = voiceInvocations.filter((item) => item.status !== 'error').map((item) => `${item.name} [${item.status}]: ${item.text}`).join('\n\n');
      const combinedResponse = [routedResponse, String(v.response || '').trim()].filter(Boolean).join('\n\nManual contribution:\n');
      if (form.elements.invokeModels.checked && !combinedResponse) throw new Error('Every selected voice route failed; PREMAQC was not advanced.');
      const soundEvents = storySoundscape.getTurnReceipts();
      const cycle = await runFeedbackCycle({
        world, premaqc: current, mode: v.mode, work: v.work, response: combinedResponse,
        voiceIds, canonRefs, voiceInvocations, soundEvents,
      });
      state.feedbackCycles.unshift(cycle);
      state.premaqcByWorld[world.id] = cycle.premaqc_after;
      storySoundscape.clearTurn();
      persist(`Feedback cycle ${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence} replay-matched in the local ledger.`, 'feedback-cycle');
      if (form.elements.syncLive.checked) {
        await syncFeedbackCycle(cycle, v.syncToken);
        notice = `Feedback cycle ${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence} synced to the relational ledger.`;
      }
    } catch (error) { notice = `Feedback cycle stopped: ${error.message}`; }
  }
  if (form.id === 'continuity-form') { state.continuity.unshift({ id: newId('thread'), title: v.title.trim(), source: v.source, details: v.details.trim(), createdAt: isoNow() }); persist('Entry added to the Waking Thread.', 'thread'); }
  if (form.id === 'forge-form') { state.manifestations.unshift({ id: newId('working'), intention: v.intention.trim(), meaning: v.meaning.trim(), action: v.action.trim(), markers: v.markers.trim(), status: 'Seeded', createdAt: isoNow() }); persist('Forge working seeded.', 'forge'); }
  if (form.id === 'record-form') {
    const roomId = form.dataset.roomId; const definition = COLLECTION_ROOM_DEFINITIONS[roomId]; let record = (state.records[roomId] || []).find((item) => item.id === v.id);
    if (!record) { record = { id: newId(roomId), worldId: activeWorld().id, createdAt: isoNow(), attachments: [] }; state.records[roomId].unshift(record); selectedRecords[roomId] = record.id; }
    for (const [name] of definition.fields) record[name] = String(v[name] || '').trim();
    record.updatedAt = isoNow(); persist(`${definition.label} entry saved.`, `room-${roomId}`);
  }
  if (form.id === 'applet-form') { const world = selectedWorld(); world.applets = APPLET_CATALOGUE.map((applet, index) => ({ id: applet.id, visible: form.elements[`visible:${applet.id}`]?.checked || false, customLabel: String(v[`label:${applet.id}`] || '').trim(), customGlyph: String(v[`glyph:${applet.id}`] || '').trim(), order: Number(v[`order:${applet.id}`]) || index })); persist('Applet deck saved.', 'applets'); }
  if (form.id === 'settings-form') { state.settings = { ...state.settings, crLabel: v.crLabel.trim() || 'Waking World', drLabel: v.drLabel.trim() || 'Desired Reality', returnAnchor: v.returnAnchor.trim() || 'Notch', reduceMotion: form.elements.reduceMotion.checked, largeText: form.elements.largeText.checked, highContrast: form.elements.highContrast.checked, fontScale: Number(v.fontScale) || 1 }; persist('Settings saved.', 'settings'); }
  render();
});

setInterval(() => {
  const now = document.querySelector('#waking-now');
  const waking = document.querySelector('#waking-elapsed');
  const world = document.querySelector('#world-elapsed');
  if (now) now.textContent = new Date().toLocaleString();
  if (waking && world) { const times = sessionTimes(); waking.textContent = formatDuration(times.waking); world.textContent = formatDuration(times.world); }
}, 1000);

render();
