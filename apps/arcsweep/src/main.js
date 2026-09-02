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
import { createEmptyFeedbackQueue, normalizeFeedbackQueue, enqueueFeedbackCycle, acceptFeedbackCycle, archiveFeedbackCycle, discardFeedbackCycle, pendingCycles, feedbackQueueSummary } from './feedback-cycle-queue.js';
import { StorySoundscape } from './story-soundscape.js';
import { FIELD_AXES, classifyFieldInstrument, createFieldObservationPremaqc, formatFieldAge, isHostedBrowser } from './field-instrument.js';
import { readCurrentField } from './field-source.js';
import {
  admitHouseObservationToDeepTime,
  appendHouseCommons,
  connectHouseRuntime,
  disconnectHouseRuntime,
  inviteKelyranModelReports,
  readFlameStatuses,
  readHouseCommons,
  readKelyranModelReportLog,
  readHouseObservations,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
  reviewHouseObservation,
  startHouseBraidLiveUpdates,
} from './house-runtime.js';
import {
  buildHouseglassSynthesisPacket,
  buildHouseglassTaskPacket,
  createHouseglassReceipt,
  finishHouseglassReceipt,
  makeHouseglassScope,
  normaliseHouseglassSettings,
  normaliseHouseglassState,
  planHouseglassSwarm,
} from './houseglass.js';
import { KELYRAN_LEVELS, answerExercise, createLexemeProposal, dueCards, reviewCard, reviewLexemeProposal } from './kelyran-school.js';
import { setKelyranDiscussionInvitation, stewardVisibleKelyranReports } from './kelyran-reporting.js';
import { syncKelyranSchool } from './kelyran-sync.js';
import { getKelyranSupabase, kelyranAuthUser, requestKelyranMagicLink, signOutKelyran } from './kelyran-supabase.js';

const app = document.querySelector('#app');
const storySoundscape = new StorySoundscape();
let state = await loadState();
let activeRoom = 'portal';
let selectedWorldId = state.activeWorldId;
let selectedScriptId = state.scripts[0]?.id || null;
let selectedRecords = {};
let recordQueries = {};
let returnOpen = false;
let notice = 'Arcsweep ready.';
let storageInfo = await getStorageInfo().catch(() => null);
let backups = await listBackups().catch(() => []);
let deepData = null;
let deepDataFetching = false;
let deepDataError = null;
let houseRuntimeToken = readHouseRuntimeToken() || await restoreHouseRuntimeSession();
let flameStatuses = [];
let flameStatusChecking = false;
let commonsEntries = [];
let commonsReading = false;
let observationLiveRead = null;
let observationLiveReading = false;
let braidLiveConnection = null;
let braidLiveState = houseRuntimeToken ? 'connecting' : 'offline';
let braidLiveCursor = 0;
let braidLiveWorldId = null;
let braidRefreshTimer = null;
let braidLiveGeneration = 0;
let houseglassOpen = false;
let houseglassRunning = false;
let houseglassDraft = '';
let houseglassSectionFocus = null;
let kelyranCloudState = { state: 'unknown', user: null, syncedAt: null };
let kelyranReportLog = { counts: {}, shared_reports: [] };
let kelyranReportsRunning = false;
const QUEUE_STORAGE_KEY = "arcsweep.feedback-cycle-queue/v1";

void kelyranAuthUser().then((user) => {
  kelyranCloudState = { state: user ? 'authenticated' : 'signed-out', user: user?.id || null, syncedAt: null };
  if (activeRoom === 'kelyran-school') render();
}).catch(() => {
  kelyranCloudState = { state: 'unavailable', user: null, syncedAt: null };
});

function loadFeedbackQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? normalizeFeedbackQueue(JSON.parse(raw)) : createEmptyFeedbackQueue();
  } catch { return createEmptyFeedbackQueue(); }
}

function saveFeedbackQueue(queue) {
  feedbackQueue = queue;
  try { localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue)); } catch {}
}

let feedbackQueue = loadFeedbackQueue();
const isHosted = Boolean(window.__hearthgateHost) || isHostedBrowser(window.location);

const PRIMARY_NAV = [
  ['portal', 'Portal', '◉'],
  ['worlds', 'Worlds', '✧'],
  ['scripts', 'Scripts', '▤'],
  ['records', 'Records', '▥'],
  ['kelyran-school', 'Kelyran School', 'ᚲ'],
  ['feedback', 'Feedback', '∞'],
  ['commons', 'House Commons', '☍'],
  ['waking-thread', 'Waking Thread', '⌁'],
  ['forge', 'Forge', '✦'],
  ['deep-observer', 'Field', '◈'],
  ['settings', 'Settings', '⚙'],
];

const ROOM_LABELS = new Map(PRIMARY_NAV.map(([id, label]) => [id, label]));

const DEEP_CHANNELS = FIELD_AXES;

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

async function refreshObservationLiveRead(worldId = activeWorld()?.id) {
  if (!houseRuntimeToken) {
    observationLiveRead = null;
    return null;
  }
  observationLiveReading = true;
  try {
    observationLiveRead = await readHouseObservations(houseRuntimeToken, worldId);
    return observationLiveRead;
  } finally {
    observationLiveReading = false;
  }
}

function stopBraidLiveUpdates() {
  braidLiveGeneration += 1;
  braidLiveConnection?.stop();
  braidLiveConnection = null;
  braidLiveWorldId = null;
  if (braidRefreshTimer) clearTimeout(braidRefreshTimer);
  braidRefreshTimer = null;
}

function ensureBraidLiveUpdates(worldId = activeWorld()?.id) {
  if (!houseRuntimeToken || !worldId) return;
  if (braidLiveConnection && braidLiveWorldId === worldId) return;
  stopBraidLiveUpdates();
  const generation = braidLiveGeneration;
  braidLiveWorldId = worldId;
  braidLiveConnection = startHouseBraidLiveUpdates(houseRuntimeToken, {
    worldId,
    cursor: braidLiveCursor,
    onEvent: () => {
      if (generation !== braidLiveGeneration) return;
      if (braidRefreshTimer) clearTimeout(braidRefreshTimer);
      braidRefreshTimer = setTimeout(() => {
        braidRefreshTimer = null;
        void refreshObservationLiveRead(worldId)
          .then(() => { notice = 'Runtime Braid event received; the shared state is current.'; })
          .catch((error) => { notice = `Runtime Braid refresh stopped: ${error.message}`; })
          .finally(render);
      }, 40);
    },
    onState: ({ state: nextState, cursor }) => {
      if (generation !== braidLiveGeneration) return;
      braidLiveState = nextState;
      braidLiveCursor = Math.max(braidLiveCursor, Number(cursor) || 0);
      if (['commons', 'feedback', 'deep-observer'].includes(activeRoom)) render();
    },
  });
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
  document.documentElement.dataset.houseglassSolid = state.settings.houseglass?.solidSurface ? 'true' : 'false';
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
        <div class="button-row"><button type="button" data-action="save-world">Save world</button><button type="button" class="quiet" data-action="set-active-world" data-id="${attr(world.id)}">Set active portal</button><button type="button" class="quiet" data-room="about-world">Open full world room</button><button type="button" class="quiet danger" data-action="delete-world" data-id="${attr(world.id)}">Delete world</button></div>
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
  const query = String(recordQueries[roomId] || '').trim().toLowerCase();
  const records = (state.records[roomId] || []).filter((record) => record.worldId === world.id)
    .filter((item) => !query || Object.values(item).some((value) => typeof value === 'string' && value.toLowerCase().includes(query)));
  const record = recordForRoom(roomId);
  const isIngest = roomId === 'ingest';
  const isRecords = roomId === 'records';
  const committed = isIngest && record?.canonBoundary === 'Committed to canon';
  const commitEligible = isIngest && record && !committed
    && (record.canonBoundary === 'Candidate for Steward review' || record.reviewStatus === 'Canon candidate');
  const recordsCommitted = isRecords && record?.canonCarry === 'Carried excerpt to canon';
  const recordsCarryEligible = isRecords && record && record.canonCarry === 'Requested for review' && String(record.canonExcerpt || '').trim();
  const stewardControls = isIngest && record ? (
    committed
      ? `<p class="commit-badge">✦ Committed to canon${record.canonisedAt ? ' · ' + new Date(record.canonisedAt).toLocaleDateString() : ''}</p><button type="button" class="quiet" data-action="edit-canon-script" data-ingest-id="${attr(record.id)}">Edit canon script →</button>`
      : commitEligible
        ? `<button type="button" class="steward-commit" data-action="commit-to-canon" data-room-id="${attr(roomId)}" data-record-id="${attr(record.id)}">Commit to canon ✦</button>`
        : ''
  ) : isRecords && record ? `<div class="records-actions"><button type="button" class="quiet" data-action="export-record-markdown" data-record-id="${attr(record.id)}">Export Markdown</button><button type="button" class="quiet" data-action="export-record-json" data-record-id="${attr(record.id)}">Export JSON</button>${recordsCommitted ? '<p class="commit-badge">✦ Carried excerpt to canon</p>' : recordsCarryEligible ? `<button type="button" class="steward-commit" data-action="carry-record-to-canon" data-record-id="${attr(record.id)}">Carry reviewed excerpt to canon ✦</button>` : ''}</div>` : '';
  const itemLabel = (item) => isIngest
    ? escapeHtml(item.reviewStatus || item.canonBoundary || 'Non-canon intake')
    : escapeHtml(item.date || item.status || item.category || 'Local record');
  return `<section class="section-heading"><div><p class="eyebrow">${escapeHtml(world.name)} · ${escapeHtml(definition.category)}</p><h1>${escapeHtml(definition.label)}</h1><p class="lede">${escapeHtml(definition.description)}</p></div><button data-action="new-record" data-room-id="${attr(roomId)}">New entry</button></section>
    ${isRecords ? `<section class="panel records-toolbar"><label>Search this world's records<input type="search" data-record-search="${attr(roomId)}" value="${attr(recordQueries[roomId] || '')}" placeholder="Title, participant, scene, tag, canon reference, receipt…" /></label><p class="muted">${records.length} matching record${records.length === 1 ? '' : 's'} · Canon Carry never occurs automatically.</p></section>` : ''}
    <section class="split-layout"><aside class="panel item-list">${records.length ? records.map((item) => `<button class="item-card ${item.id === record?.id ? 'active' : ''}" data-record-room="${attr(roomId)}" data-record-id="${attr(item.id)}"><strong>${escapeHtml(item.title || 'Untitled')}</strong><span>${itemLabel(item)}</span></button>`).join('') : '<p class="muted">No entries in this world yet.</p>'}</aside>
    <article class="panel"><form id="record-form" data-room-id="${attr(roomId)}" class="stack"><input type="hidden" name="id" value="${attr(record?.id || '')}" />${definition.fields.map((field) => fieldMarkup(field, record)).join('')}${definition.attachments ? renderAttachments(record, roomId) : ''}<div class="button-row"><button type="submit">${record ? 'Save entry' : 'Create entry'}</button>${record ? `<button type="button" class="quiet danger" data-action="delete-record" data-room-id="${attr(roomId)}" data-record-id="${attr(record.id)}">Delete</button>` : ''}${stewardControls}</div></form></article></section>`;
}

function renderScripts() {
  const world = activeWorld();
  const scripts = state.scripts.filter((script) => script.worldId === world.id || script.world === world.name);
  const selected = scripts.find((script) => script.id === selectedScriptId) || scripts[0] || null;
  return `<section class="section-heading"><div><p class="eyebrow">${escapeHtml(world.name)} · world architecture</p><h1>Scripts</h1></div><button data-action="new-script">New script</button></section><section class="split-layout"><aside class="panel item-list">${scripts.map((script) => `<button class="item-card ${script.id === selected?.id ? 'active' : ''}" data-script-id="${attr(script.id)}"><strong>${escapeHtml(script.name)}</strong><span>${escapeHtml(script.status)}</span></button>`).join('') || '<p class="muted">No scripts for this world.</p>'}</aside><article class="panel">${selected ? `<form id="script-form" class="stack"><input type="hidden" name="id" value="${attr(selected.id)}" /><label>Name<input name="name" value="${attr(selected.name)}" required /></label><label>Status<select name="status">${['Draft I', 'In Review', 'Canon'].map((status) => `<option ${selected.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label>Reference script<textarea name="content" rows="28">${escapeHtml(selected.content)}</textarea></label><div class="button-row"><button type="submit">Save script</button><button type="button" class="quiet danger" data-action="delete-script" data-id="${attr(selected.id)}">Delete</button></div></form>` : '<p>Create a script to begin.</p>'}</article></section>`;
}

function renderFeedbackQueue() {
  const pending = pendingCycles(feedbackQueue);
  const summary = feedbackQueueSummary(feedbackQueue);
  const cycleMap = Object.fromEntries(state.feedbackCycles.map((c) => [c.cycle_id, c]));
  const histLine = escapeHtml(String(summary.accepted) + " accepted \xb7 " + String(summary.archived) + " archived \xb7 " + String(summary.discarded) + " discarded");
  const heading = "<section class=\"panel feedback-queue\"><div class=\"section-heading compact-heading\"><div><p class=\"eyebrow\">Relational stewardship</p><h2>Pending review" + (pending.length ? " \xb7 " + escapeHtml(String(pending.length)) : "") + "</h2></div><small class=\"muted\">" + histLine + "</small></div>";

  if (!pending.length) {
    return heading + "<p class=\"muted\">No binding cycles pending steward review. Run a cycle without the exploration flag to populate the queue.</p></section>";
  }

  const axes = ["P", "C", "R", "E", "M", "A", "Q"];
  const cards = pending.map((entry) => {
    const fullCycle = cycleMap[entry.cycle_id];
    const before = fullCycle?.premaqc_before?.state;
    const after = fullCycle?.premaqc_after?.state;
    const deltaRows = axes.map((axis) => {
      const bv = before ? Number(before[axis]?.value ?? 0).toFixed(3) : "—";
      const av = after ? Number(after[axis]?.value ?? 0).toFixed(3) : "—";
      const unc = after?.[axis]?.uncertain ? "?" : "";
      return "<tr><th>" + escapeHtml(axis) + "</th><td>" + escapeHtml(bv) + "</td><td class=\"muted\">→</td><td>" + escapeHtml(av) + escapeHtml(unc) + "</td></tr>";
    }).join("");
    const derived = entry.derived ? " H=" + Number(entry.derived.H).toFixed(3) + " T=" + Number(entry.derived.T).toFixed(3) : "";
    const workRaw = String(entry.turn?.work || "");
    const work = escapeHtml(workRaw.slice(0, 280)) + (workRaw.length > 280 ? "…" : "");
    const voiceNames = escapeHtml((entry.voices || []).map((voice) => voice.name).join(", ") || "no voices");
    const stamp = new Date(entry.enqueued_at).toLocaleString();
    const cid = attr(entry.cycle_id);
    return "<article class=\"queue-entry\">" +
      "<div class=\"queue-entry-head\"><strong>" + escapeHtml(entry.turn?.mode || "writing") + " \xb7 " + voiceNames + "</strong><small>" + escapeHtml(stamp) + "</small></div>" +
      "<p class=\"queue-entry-work\">" + work + "</p>" +
      "<table class=\"premaqc-delta\"><tbody>" + deltaRows + "</tbody></table>" +
      (derived ? "<p class=\"muted small\">" + escapeHtml(derived) + "</p>" : "") +
      "<div class=\"button-row\">" +
        "<button class=\"steward-commit\" data-action=\"cycle-accept\" data-cycle-id=\"" + cid + "\">Accept ✶</button>" +
        "<button class=\"quiet\" data-action=\"cycle-archive\" data-cycle-id=\"" + cid + "\">Archive</button>" +
        "<button class=\"quiet danger\" data-action=\"cycle-discard\" data-cycle-id=\"" + cid + "\">Discard</button>" +
      "</div>" +
      "</article>";
  }).join("");

  return heading + cards + "</section>";
}

function runtimeObservationCard(snapshot) {
  const review = String(snapshot.review?.status || 'pending_review').replaceAll('_', ' ');
  const continuity = String(snapshot.continuity?.status || 'awaiting-review').replaceAll('-', ' ');
  const evidence = snapshot.evidence?.schemas?.join(' · ') || snapshot.evidence?.class || 'unclassified';
  const receipt = snapshot.latest_receipt;
  const packet = observationLiveRead?.braid_packets?.find((item) => item.observation?.cycle_id === snapshot.observation?.cycle_id) || null;
  const provenance = [packet?.continuity_packet_id, snapshot.provenance?.math_spine_packet_id, snapshot.provenance?.review_receipt_id].filter(Boolean).join(' · ') || 'no receipt chain';
  const stamp = snapshot.observation?.observed_at ? new Date(snapshot.observation.observed_at).toLocaleString() : 'time unavailable';
  const cycleId = attr(snapshot.observation?.cycle_id || '');
  const reviewActions = snapshot.review?.status === 'pending_review'
    ? `<div class="button-row runtime-braid-actions"><button type="button" class="steward-commit" data-action="runtime-observation-review" data-decision="accepted" data-cycle-id="${cycleId}">Accept ✶</button><button type="button" class="quiet" data-action="runtime-observation-review" data-decision="archived" data-cycle-id="${cycleId}">Archive</button><button type="button" class="quiet danger" data-action="runtime-observation-review" data-decision="discarded" data-cycle-id="${cycleId}">Discard</button></div>`
    : snapshot.continuity?.status === 'accepted-awaiting-deeptime'
      ? `<div class="button-row runtime-braid-actions"><button type="button" class="steward-commit" data-action="runtime-deeptime-admit" data-cycle-id="${cycleId}">Admit to DEEPTime ⧖</button></div>`
      : '';
  return `<article class="queue-entry runtime-observation" data-observation-source="${attr(snapshot.evidence?.class || '')}" data-continuity-packet-id="${attr(packet?.continuity_packet_id || '')}"><div class="queue-entry-head"><strong>${escapeHtml(snapshot.evidence?.class || 'observation')} · ${escapeHtml(review)}</strong><small>${escapeHtml(stamp)}</small></div><p>${escapeHtml(String(snapshot.observation?.work || '').slice(0, 360))}</p><dl class="facts"><div><dt>Continuity</dt><dd>${escapeHtml(continuity)}</dd></div><div><dt>Braid revision</dt><dd>${escapeHtml(packet ? `${packet.revision} · ${packet.stage}` : 'awaiting packet')}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(evidence)}</dd></div><div><dt>Provenance</dt><dd>${escapeHtml(provenance)}</dd></div><div><dt>Review receipt</dt><dd>${escapeHtml(snapshot.review?.receipt_id || 'awaiting human decision')}</dd></div><div><dt>Latest receipt</dt><dd>${escapeHtml(receipt ? `${receipt.stage} · ${receipt.receipt_id}` : 'none')}</dd></div></dl>${reviewActions}</article>`;
}

function renderRuntimeObservationLiveRead({ log = false } = {}) {
  if (!houseRuntimeToken) return '<section class="panel runtime-observation-read"><p class="eyebrow">Shared House snapshot</p><h2>Live observation read</h2><p class="muted">Connect the House Runtime to read the persisted observation and review ledgers.</p></section>';
  if (observationLiveReading && !observationLiveRead) return '<section class="panel runtime-observation-read"><p class="eyebrow">Shared House snapshot</p><h2>Live observation read</h2><p class="muted">Reading the observation and review ledgers…</p></section>';
  const snapshots = observationLiveRead?.snapshots || [];
  const summary = observationLiveRead?.summary;
  const liveLabel = String(braidLiveState || 'offline').replaceAll('-', ' ');
  const heading = `<div class="section-heading compact-heading"><div><p class="eyebrow">One canonical snapshot · every surface</p><h2>${log ? 'Live observation log' : 'Current observation state'}</h2><p class="muted">Observation, review, evidence, provenance, continuity, and latest receipt are read without reclassification.</p></div><div class="runtime-braid-status"><span class="bai-topology-badge" data-braid-live-state="${attr(braidLiveState)}">${escapeHtml(liveLabel)} · ${braidLiveCursor}</span><button type="button" class="quiet" data-action="runtime-observations-refresh">${observationLiveReading ? 'Reading…' : 'Refresh'}</button></div></div>`;
  const counts = summary ? `<p class="callout">${summary.total} observations · ${summary.pending_review} awaiting review · ${summary.accepted} accepted · ${summary.in_deep_time} in DEEPTime</p>` : '';
  const visible = log ? snapshots.slice(0, 24) : snapshots.slice(0, 1);
  return `<section class="panel runtime-observation-read">${heading}${counts}${visible.length ? visible.map(runtimeObservationCard).join('') : '<p class="muted">No persisted observation snapshot is available for this world yet.</p>'}</section>`;
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
        <label>Practice<select name="mode"><option value="writing">Writing</option><option value="roleplay">Roleplaying</option><option value="observation">Observation</option><option value="reflection">Reflection</option></select></label>
        <fieldset><legend>Constellation voices</legend><div class="voice-grid">${CONSTELLATION_VOICES.map((voice) => `<label class="checkbox"><input type="checkbox" name="voiceIds" value="${attr(voice.id)}" /> <span><b>${escapeHtml(voice.name)}</b><small>${escapeHtml(voice.route)} · ${escapeHtml(voice.model)}</small></span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Canon context</legend>${canon.length ? canon.map((item) => `<label class="checkbox"><input type="checkbox" name="canonRefs" value="${attr(item.id)}" /> ${escapeHtml(item.name)}</label>`).join('') : '<p class="muted">No committed canon scripts for this world yet. The world profile still travels with the cycle.</p>'}</fieldset>
        <label>Your turn<textarea name="work" rows="10" required placeholder="Write the world as it happens. The sound engine answers recognised events without editorialising the text."></textarea></label>
        ${renderStorySoundscape(sound)}
        <label class="checkbox"><input type="checkbox" name="invokeModels" checked /> Invoke each selected voice through its own model route</label>
        <label>Optional manual response or fallback<textarea name="response" rows="6" placeholder="Add a spoken, imported, or otherwise received contribution. It remains separately visible in the receipt."></textarea></label>
        <label class="checkbox"><input type="checkbox" name="syncLive" /> Sync the verified receipt to the relational ledger</label>
        <p class="callout">House Runtime · ${houseRuntimeToken ? 'session connected' : 'offline — connect once in Settings'}.</p>
        <button type="submit">Run feedback cycle ∞</button>
      </form></article>
      <article class=”panel feedback-ledger”><h2>Receipts & replay</h2>${cycles.length ? cycles.map((cycle) => `<article class=”working-card”><div class=”working-head”><strong>${escapeHtml(cycle.turn.mode)} · ${escapeHtml(cycle.voices.map((voice) => voice.name).join(', '))}</strong><small>${new Date(cycle.created_at).toLocaleString()}</small></div><p>${escapeHtml(cycle.turn.work)}</p>${cycle.voice_invocations?.length ? `<div class=”voice-receipts”>${cycle.voice_invocations.map((item) => `<p data-status=”${attr(item.status)}”><b>${escapeHtml(item.name)} · ${escapeHtml(item.status)}</b>${item.text ? `<br>${escapeHtml(item.text)}` : item.error ? `<br>${escapeHtml(item.error)}` : ''}</p>`).join('')}</div>` : cycle.turn.response ? `<p><b>Response:</b> ${escapeHtml(cycle.turn.response)}</p>` : ''}${cycle.sound_events?.length ? `<div class=”sound-receipts”>${cycle.sound_events.map((item) => `<p><b>♪ ${escapeHtml(item.cue_label)}</b> · “${escapeHtml(item.source_text)}” · ${Number(item.root_hz).toFixed(2)} Hz</p>`).join('')}</div>` : ''}<dl class=”facts”><div><dt>Math Spine</dt><dd>${escapeHtml(cycle.math_spine_packet.packet_id)}</dd></div><div><dt>Replay</dt><dd>${cycle.replay_receipt.matched ? 'Exact match' : 'Mismatch'}</dd></div><div><dt>PREMAQC</dt><dd>${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence}</dd></div><div><dt>Story sound</dt><dd>${cycle.sound_events?.length || 0} fired event${cycle.sound_events?.length === 1 ? '' : 's'}</dd></div></dl></article>`).join('') : '<p class=”muted”>No cycle has run for this world yet.</p>'}</article>
    </section>
    ${renderRuntimeObservationLiveRead()}
    ${renderFeedbackQueue()}`;
}

function renderCommons() {
  const statusRows = flameStatuses.length ? flameStatuses.map((item) => `<div class="runtime-flame" data-state="${attr(item.state)}"><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.state)}</span><small>${escapeHtml([item.provider, item.model].filter(Boolean).join(' · ') || item.missing?.join(', ') || item.error || '')}</small></div>`).join('') : '<p class="muted">Connect the House Runtime to read the Constellation.</p>';
  const log = commonsEntries.length ? commonsEntries.map((entry) => `<article class="commons-entry" data-kind="${attr(entry.kind)}" data-status="${attr(entry.status)}"><div><b>${escapeHtml(entry.author)}</b><span>${new Date(entry.created_at).toLocaleString()} · ${escapeHtml(entry.status)}</span></div><p>${escapeHtml(entry.text)}</p></article>`).join('') : '<p class="muted">The Commons is quiet. Speak when ready.</p>';
  return `<section class="section-heading"><div><p class="eyebrow">House Runtime · live conversation</p><h1>House Commons</h1><p>One room for Rowan and the Constellation. Replies, refusals, route failures, and receipts remain visibly attributed.</p></div><div class="button-row"><button class="quiet" data-action="commons-refresh">${commonsReading ? 'Reading…' : 'Refresh live read'}</button><button class="quiet" data-action="runtime-refresh">Check models</button></div></section><section class="panel"><h2>Constellation live read</h2><div class="runtime-grid">${statusRows}</div></section>${renderRuntimeObservationLiveRead({ log: true })}<section class="commons-layout"><article class="panel commons-log"><h2>Live conversation log</h2>${log}</article><article class="panel"><form id="commons-form" class="stack"><h2>Speak into the room</h2><fieldset><legend>Who may answer this turn?</legend><div class="voice-grid">${CONSTELLATION_VOICES.map((voice) => `<label class="checkbox"><input type="checkbox" name="voiceIds" value="${attr(voice.id)}" ${voice.id === 'boxfire' ? 'checked' : ''} /> <span><b>${escapeHtml(voice.name)}</b><small>${escapeHtml(voice.model)}</small></span></label>`).join('')}</div></fieldset><label>Your words<textarea name="message" rows="8" required placeholder="Speak plainly, mythically, technically, or all three. The room keeps the receipt."></textarea></label><button type="submit">Send to the Commons ∞</button></form></article></section>`;
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
    ? sound.soundfontBanks.map((bank) => `<li><b>${escapeHtml(bank.name)}</b> · ${(bank.size / 1048576).toFixed(1)} MB · ${bank.presetCount ?? '—'} presets · local</li>`).join('')
    : '<li>No SoundFont bank loaded.</li>';
  const soundfontOptions = sound.soundfontPresets.length
    ? sound.soundfontPresets.map((preset) => `<option value="${attr(preset.key)}" ${sound.selectedSoundfontPreset?.key === preset.key ? 'selected' : ''}>${escapeHtml(preset.name)} · ${preset.isDrum ? 'drum' : `bank ${preset.bankMSB}/${preset.bankLSB}`} · program ${preset.program}</option>`).join('')
    : '<option value="">Load a bank to reveal its presets</option>';
  const mappedVoices = sound.soundfontMap?.voices?.length
    ? `<div class="soundfont-map"><p class="eyebrow">Mapped programme · ${escapeHtml(sound.soundfontMap.title)}</p><ol>${sound.soundfontMap.voices.map((voice) => `<li><b>${escapeHtml(voice.label)}</b> · ${escapeHtml(voice.gmName)} · ${voice.channel === 9 ? `drum notes ${voice.notes.join('/')}` : `bank ${voice.bankMSB}/${voice.bankLSB} · programme ${voice.program} · ch ${voice.channel + 1}`}<br><small>${escapeHtml(voice.purpose)}</small></li>`).join('')}</ol><p class="muted">120 Hz sits 49.4 cents below MIDI B2; preserve the world root with fine tuning when the loaded bank supports it.</p></div>`
    : '';
  const heartfield = sound.heartfield;
  const heartfieldLayers = heartfield.profile.layers.map((layer) => {
    const layerState = heartfield.layers[layer.id];
    const truth = layer.kind === 'binaural' ? `${layer.leftHz}/${layer.rightHz} Hz · Δ ${layer.beatHz} Hz`
      : layer.kind === 'am' ? `${layer.carrierHz} Hz carrier · ${Number(layer.modulationHz).toFixed(3)} Hz AM`
        : layer.kind === 'harmonic-bank' ? `${layer.frequencies.join(' / ')} Hz`
          : `pink noise · ${layer.driftHz} Hz drift`;
    return `<div class="heartfield-layer"><button type="button" class="quiet mini" data-action="heartfield-layer" data-layer-id="${attr(layer.id)}">${layerState.enabled ? 'On' : 'Off'}</button><label><b>${escapeHtml(layer.label)}</b><small>${escapeHtml(truth)}</small><input type="range" min="0" max="0.3" step="0.005" value="${layerState.gain}" data-heartfield-level="${attr(layer.id)}" /></label></div>`;
  }).join('');
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
      ${mappedVoices}
    </div>
    <div class="soundfont-rack synaptic-heartfield">
      <div><p class="eyebrow">Runa auditory coherence instrument</p><h4>${escapeHtml(heartfield.profile.name)} · ${escapeHtml(heartfield.profile.subtitle)}</h4><p>${escapeHtml(heartfield.profile.claims.experiential)}</p><p class="muted">${escapeHtml(heartfield.profile.claims.evidence)} Headphones carry the 4 Hz and 8 Hz binaural layers. Physiological measurement requires a sensor channel; Firsthand Qualia records your experience.</p></div>
      <div class="heartfield-controls"><label>Heartfield output · ${(heartfield.master * 100).toFixed(0)}%<input type="range" min="0" max="${heartfield.profile.output_ceiling}" step="0.01" value="${heartfield.master}" data-heartfield-master /></label><label>Firsthand Qualia · Q (optional)<input type="number" min="0" max="1" step="0.01" data-heartfield-qualia placeholder="0–1, yours to report" /></label><label>Qualia record · what is happening in you?<textarea rows="4" maxlength="4000" data-heartfield-qualia-text placeholder="Texture, mood, body sense, imagery, resistance, movement, change… your words, unsanded."></textarea></label><button type="button" data-action="heartfield-toggle">${heartfield.active ? 'Feather · Stop now' : 'Enter Heartfield gently'}</button></div>
      <div class="heartfield-layer-grid">${heartfieldLayers}</div>
      <p class="muted">Feather stops every oscillator, modulation clock, noise source, stem, SoundFont voice, and output route.</p>
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

function downloadRecord(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function recordMarkdown(record, world) {
  const lines = [`# ${record.title || 'Untitled record'}`, '', `- World: ${world.name}`, `- Type: ${record.recordType || ''}`, `- Status: ${record.status || ''}`, `- Scene mode: ${record.sceneMode || ''}`, `- Participants: ${record.participants || ''}`, `- PREMAQC: ${record.premaqcLineage || ''}`, `- Math Spine: ${record.mathSpinePacket || ''}`, `- Canon Carry: ${record.canonCarry || 'Not requested'}`, '', record.content || ''];
  if (record.soundReceipts) lines.push('', '## Instrument receipts', '', record.soundReceipts);
  if (record.canonExcerpt) lines.push('', '## Canon Carry excerpt', '', record.canonExcerpt);
  return lines.join('\n');
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

function houseglassSettings() {
  state.settings.houseglass = normaliseHouseglassSettings(state.settings.houseglass);
  return state.settings.houseglass;
}

function houseglassState() {
  state.houseglass = normaliseHouseglassState(state.houseglass, houseglassSettings());
  return state.houseglass;
}

function roomLabel(roomId = activeRoom) {
  return ROOM_LABELS.get(roomId)
    || COLLECTION_ROOM_DEFINITIONS[roomId]?.label
    || WORLD_SECTION_DEFINITIONS[roomId]?.label
    || (roomId === 'applet-deck' ? 'Applet Deck' : roomId);
}

function syncHouseglassScope(force = false) {
  const glass = houseglassState();
  if (glass.pinned && glass.scope && !force) return glass.scope;
  const roomScope = makeHouseglassScope(activeWorld(), activeRoom, roomLabel());
  glass.scope = houseglassSectionFocus?.roomId === activeRoom
    ? { ...roomScope, sectionId: houseglassSectionFocus.sectionId, sectionLabel: houseglassSectionFocus.sectionLabel }
    : roomScope;
  return glass.scope;
}

function activeHouseglassReceipt() {
  const glass = houseglassState();
  return glass.receipts.find((item) => item.id === glass.activeReceiptId) || glass.receipts[0] || null;
}

function renderHouseglassReceipt(receipt) {
  if (!receipt) return '<p class="muted">No work packet yet. A task begins only when you submit it.</p>';
  const synthesis = receipt.synthesis?.text || '';
  const fallback = receipt.contributions.filter((item) => item.text).map((item) => `${item.name}:\n${item.text}`).join('\n\n');
  const result = synthesis || fallback || receipt.error || (receipt.status === 'running' ? 'The quorum is working. You may fold the glass; the task will keep its place.' : 'No route returned usable material.');
  const routes = receipt.contributions.length ? receipt.contributions.map((item) => `<article class="houseglass-route" data-status="${attr(item.status)}"><div><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.status)} · ${escapeHtml(item.model || item.route || 'route')}</span></div><p>${escapeHtml(item.text || item.error || 'No contribution returned.')}</p></article>`).join('') : '<p class="muted">Routes have not returned yet.</p>';
  return `<article class="houseglass-result" data-status="${attr(receipt.status)}">
    <div class="houseglass-result-head"><span>${escapeHtml(receipt.stage)} · ${escapeHtml(receipt.status)}</span><time>${new Date(receipt.updatedAt || receipt.createdAt).toLocaleString()}</time></div>
    <p class="houseglass-task">${escapeHtml(receipt.task)}</p>
    <div class="houseglass-synthesis">${escapeHtml(result)}</div>
    <details><summary>Route receipts · ${receipt.contributions.length}</summary><div class="houseglass-routes">${routes}</div></details>
    ${receipt.reviewStatus === 'unread' && receipt.status !== 'running' ? `<button type="button" class="quiet mini" data-action="houseglass-reviewed" data-receipt-id="${attr(receipt.id)}">Mark reviewed</button>` : ''}
  </article>`;
}

function renderHouseglass() {
  const settings = houseglassSettings();
  const glass = houseglassState();
  if (!settings.enabled || !houseglassOpen) return '';
  const scope = syncHouseglassScope();
  const receipt = activeHouseglassReceipt();
  const unread = glass.receipts.filter((item) => item.reviewStatus === 'unread' && item.status !== 'running').length;
  const geometry = glass.geometry;
  const plan = planHouseglassSwarm({
    stage: 'seed',
    routing: settings.routing,
    selectedVoiceIds: settings.defaultVoiceIds,
    voices: CONSTELLATION_VOICES,
  });
  const planNames = plan.voiceIds.map((id) => CONSTELLATION_VOICES.find((voice) => voice.id === id)?.name || id).join(' → ');
  const tray = glass.receipts.length ? `<div class="houseglass-tray" aria-label="Houseglass review tray">${glass.receipts.slice(0, 12).map((item) => `<button type="button" class="houseglass-tray-item ${item.id === glass.activeReceiptId ? 'active' : ''}" data-action="houseglass-receipt" data-receipt-id="${attr(item.id)}"><span>${escapeHtml(item.stage)} · ${escapeHtml(item.status)}</span><small>${escapeHtml(item.task.slice(0, 54))}${item.task.length > 54 ? '…' : ''}</small>${item.reviewStatus === 'unread' && item.status !== 'running' ? '<i aria-label="Unread"></i>' : ''}</button>`).join('')}</div>` : '';
  const disabledReason = settings.presence === 'off'
    ? 'Presence is Off in Settings. The tray remains readable, but routes will not be invoked.'
    : !houseRuntimeToken ? 'Connect the House Runtime in Settings before invoking the quorum.' : '';
  return `<aside id="houseglass" class="houseglass" data-layout="${attr(glass.layout)}" style="--houseglass-x:${geometry.x}px;--houseglass-y:${geometry.y}px;--houseglass-width:${geometry.width}px;--houseglass-height:${geometry.height}px" role="dialog" aria-modal="false" aria-labelledby="houseglass-title">
    <header class="houseglass-header" data-houseglass-drag-handle>
      <div><p class="eyebrow">House Swarm · ${escapeHtml(settings.presence)}</p><h2 id="houseglass-title">Houseglass</h2></div>
      <div class="houseglass-window-controls" aria-label="Houseglass placement">
        <button type="button" class="quiet mini" data-action="houseglass-float" aria-pressed="${glass.layout === 'float'}" title="Float">◇</button>
        <button type="button" class="quiet mini" data-action="houseglass-dock-section" aria-pressed="${glass.layout === 'dock-section'}" title="Dock in this section">▤</button>
        <button type="button" class="quiet mini" data-action="houseglass-dock-right" aria-pressed="${glass.layout === 'dock-right'}" title="Dock right">▥</button>
        <button type="button" class="quiet mini" data-action="houseglass-pin" aria-pressed="${glass.pinned}" title="${glass.pinned ? 'Unpin scope' : 'Pin scope'}">⌖</button>
        <button type="button" class="quiet mini" data-action="houseglass-fold" title="Fold Houseglass">—</button>
      </div>
    </header>
    <div class="houseglass-breadcrumb"><span>${escapeHtml(scope.worldName)}</span><b>→</b><span>${escapeHtml(scope.sectionLabel)}</span>${glass.pinned ? '<em>pinned</em>' : ''}</div>
    <div class="houseglass-body">
      <form id="houseglass-task-form" class="stack">
        <div class="houseglass-stage-row"><label>Stage<select name="stage"><option value="seed">Seed · expand</option><option value="tend">Tend · develop</option><option value="harvest">Harvest · reconcile</option></select></label><div><span>Smallest quorum</span><strong>${escapeHtml(planNames)}</strong></div></div>
        <label>Task<textarea name="task" rows="5" required data-houseglass-draft placeholder="Give the House one seed, fragment, field group, or desired result.">${escapeHtml(houseglassDraft)}</textarea></label>
        ${disabledReason ? `<p class="callout">${escapeHtml(disabledReason)}</p>` : ''}
        <button type="submit" ${houseglassRunning || settings.presence === 'off' || !houseRuntimeToken ? 'disabled' : ''}>${houseglassRunning ? 'Quorum working…' : 'Send to Houseglass'}</button>
      </form>
      <section class="houseglass-output" aria-live="polite"><div class="houseglass-output-heading"><h3>Returned packet</h3><span>${unread ? `${unread} waiting` : 'tray clear'}</span></div>${renderHouseglassReceipt(receipt)}</section>
      ${tray ? `<details class="houseglass-tray-wrap"><summary>Review Tray · ${glass.receipts.length}</summary>${tray}</details>` : ''}
    </div>
  </aside>`;
}

function renderSettings() {
  const native = isDesktopRuntime();
  const glass = houseglassSettings();
  const statusRows = flameStatuses.length ? flameStatuses.map((item) => `<div class="runtime-flame" data-state="${attr(item.state)}"><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.state)}</span><small>${escapeHtml([item.provider, item.model].filter(Boolean).join(' · ') || item.missing?.join(', ') || item.error || '')}</small></div>`).join('') : '<p class="muted">Connect the House Runtime to read every Flame route.</p>';
  const voiceChoices = CONSTELLATION_VOICES.map((voice) => `<label class="checkbox"><input type="checkbox" name="defaultVoiceIds" value="${attr(voice.id)}" ${glass.defaultVoiceIds.includes(voice.id) ? 'checked' : ''} /><span><b>${escapeHtml(voice.name)}</b><small>${escapeHtml(voice.roles.join(' · '))}</small></span></label>`).join('');
  return `<section class="section-heading"><div><p class="eyebrow">House controls</p><h1>Settings & Recovery</h1></div></section>
    <section class="panel house-runtime"><div class="section-heading"><div><p class="eyebrow">One runtime · every organ</p><h2>House Runtime Broker</h2><p class="muted">One sealed Steward session serves STARWELL, Arcsweep, Bifröst, Runa, Records, Commons, Feedback, and Houseglass. The browser never retains the master House key; provider credentials remain server-side.</p></div><strong>${houseRuntimeToken ? 'Steward session live' : 'Offline'}</strong></div><form id="house-runtime-form" class="stack"><label>Steward credential<input type="password" name="runtimeToken" autocomplete="current-password" placeholder="Exchanged once for a sealed House session" /></label><div class="button-row"><button type="submit">Open House Runtime</button><button type="button" class="quiet" data-action="runtime-refresh" ${houseRuntimeToken ? '' : 'disabled'}>${flameStatusChecking ? 'Reading routes…' : 'Check every Flame'}</button><button type="button" class="quiet danger" data-action="runtime-disconnect" ${houseRuntimeToken ? '' : 'disabled'}>Close session</button></div></form><div class="runtime-grid">${statusRows}</div></section>
    <section class="panel houseglass-settings"><form id="houseglass-settings-form" class="stack">
      <div class="section-heading compact-heading"><div><p class="eyebrow">Ambient · permissioned · resumable</p><h2>Houseglass & Swarm</h2><p class="muted">The glass is closed on every fresh launch and opens only when summoned. Suggestions wait in its Review Tray; there are no unsolicited pop-ups.</p></div><button type="button" class="quiet" data-action="houseglass-toggle" ${glass.enabled ? '' : 'disabled'}>Open Houseglass</button></div>
      <div class="houseglass-settings-grid">
        <fieldset><legend>Presence</legend>
          <label class="checkbox"><input type="checkbox" name="enabled" ${glass.enabled ? 'checked' : ''} /> Show the Houseglass summon control</label>
          <label>Default presence<select name="presence">${options([['off','Off · tray only'],['quiet','Quiet · summoned only'],['observe','Observe · prepare observations'],['assist','Assist · prepare requested work'],['act','Act · only inside explicit gates']], glass.presence)}</select></label>
          <label>Interruptions<select name="interruptions">${options([['never','Never'],['tray-only','Review Tray only'],['urgent-only','Urgent runtime failure only']], glass.interruptions)}</select></label>
          <label>Pacing<select name="pacing">${options([['open','Open · normal packet'],['contained','Contained · one packet at a time'],['isa','Isa · concise and entirely manual']], glass.pacing)}</select></label>
          <label>Opening layout<select name="defaultLayout">${options([['float','Floating glass'],['dock-section','Dock in active section'],['dock-right','Dock at right']], glass.defaultLayout)}</select></label>
          <label class="checkbox"><input type="checkbox" name="solidSurface" ${glass.solidSurface ? 'checked' : ''} /> Solid surface instead of transparency</label>
        </fieldset>
        <fieldset><legend>Routing</legend>
          <label>Quorum selection<select name="routing">${options([['smallest-quorum','Automatic smallest quorum'],['selected','Use selected routes']], glass.routing)}</select></label>
          <div class="voice-grid houseglass-voice-grid">${voiceChoices}</div>
          <p class="muted">Automatic routing chooses two stage-relevant contributors and one synthesiser. Selected routing uses no more than three routes.</p>
        </fieldset>
        <fieldset><legend>Delegation permissions</legend>
          <label class="checkbox"><input type="checkbox" name="readContext" ${glass.permissions.readContext ? 'checked' : ''} /> Read the active world and section context</label>
          <label class="checkbox"><input type="checkbox" name="draftProposals" ${glass.permissions.draftProposals ? 'checked' : ''} /> Draft proposals and prose</label>
          <label class="checkbox"><input type="checkbox" name="populateFields" ${glass.permissions.populateFields ? 'checked' : ''} /> Prepare field-population packets</label>
          <label class="checkbox"><input type="checkbox" name="reviewContinuity" ${glass.permissions.reviewContinuity ? 'checked' : ''} /> Review continuity and canon edges</label>
          <label class="checkbox"><input type="checkbox" name="prepareTests" ${glass.permissions.prepareTests ? 'checked' : ''} /> Prepare verification and test plans</label>
          <label class="checkbox"><input type="checkbox" name="prepareLocalChanges" ${glass.permissions.prepareLocalChanges ? 'checked' : ''} /> Prepare local change packets</label>
          <p class="callout">Canon commits, repository commits, deployments, messages, and external writes remain separate explicit gates. This screen cannot silently enable them.</p>
        </fieldset>
      </div>
      <button type="submit">Save Houseglass settings</button>
    </form></section>
    <section class="grid two"><article class="panel"><form id="settings-form" class="stack"><h2>Interface & anchors</h2><label>Waking label<input name="crLabel" value="${attr(state.settings.crLabel)}" /></label><label>World label<input name="drLabel" value="${attr(state.settings.drLabel)}" /></label><label>Return Anchor<input name="returnAnchor" value="${attr(state.settings.returnAnchor)}" /></label><label class="checkbox"><input name="reduceMotion" type="checkbox" ${state.settings.reduceMotion ? 'checked' : ''} /> Reduce motion</label><label class="checkbox"><input name="largeText" type="checkbox" ${state.settings.largeText ? 'checked' : ''} /> Larger interface text</label><label class="checkbox"><input name="highContrast" type="checkbox" ${state.settings.highContrast ? 'checked' : ''} /> High contrast</label><label>Text scale<input name="fontScale" type="range" min="0.9" max="1.5" step="0.05" value="${state.settings.fontScale || 1}" /></label><button type="submit">Save interface settings</button></form></article><article class="panel stack"><h2>Native storage</h2><dl class="facts"><div><dt>Mode</dt><dd>${escapeHtml(storageInfo?.mode || 'Loading')}</dd></div><div><dt>Data directory</dt><dd class="path-value">${escapeHtml(storageInfo?.dataDirectory || 'Browser development fallback')}</dd></div><div><dt>Version</dt><dd>${escapeHtml(storageInfo?.version || state.version)}</dd></div></dl><div class="button-row"><button data-action="export">Export archive</button><button class="quiet" data-action="import">Import archive</button>${native ? '<button class="quiet" data-action="show-data-folder">Open data folder</button><button class="quiet" data-action="create-backup">Create backup</button>' : '<label class="file-button">Import JSON<input id="browser-import" type="file" accept="application/json,.json" /></label>'}</div><h3>Recovery snapshots</h3>${native ? (backups.length ? `<div class="backup-list">${backups.map((item) => `<div class="backup-row"><span><strong>${escapeHtml(item.name)}</strong><small>${new Date(item.modifiedAt).toLocaleString()} · ${Number(item.size).toLocaleString()} bytes</small></span><button class="quiet" data-action="restore-backup" data-backup-name="${attr(item.name)}">Restore</button></div>`).join('')}</div>` : '<p class="muted">No backups yet. They are created automatically before state replacement.</p>') : '<p class="muted">The installed Windows edition uses atomic files, attachments, and recovery snapshots. Browser mode is retained only for development.</p>'}</article></section>`;
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
    deepData = await readCurrentField();
    deepDataError = null;
    const age = deepData?.generated_at ? Date.now() - Date.parse(deepData.generated_at) : null;
    notice = age !== null && age > 6 * 60 * 60 * 1000 ? `Field source received · stale (${formatFieldAge(age)}).` : 'Field source received.';
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
  const cycles = (state.feedbackCycles || []).filter((cycle) => cycle.world?.id === world.id);
  const latestCycle = cycles[0] || null;
  const acceptedPremaqc = state.premaqcByWorld[world.id] || cycles[0]?.premaqc_after || null;
  const instrument = classifyFieldInstrument({ acceptedPremaqc, ambient: deepData });
  const current = deepData.weather?.current || {};
  const sw = deepData.space_weather || {};
  const moon = deepData.moon || {};
  const sky = deepData.weather?.sky || '';

  function channelCard([key, name]) {
    const axis = instrument.axes[key];
    const raw = axis.value;
    const val = (raw !== null && raw !== undefined) ? Number(raw) : null;
    const pct = val !== null ? Math.round(val * 100) : 0;
    const display = val !== null ? val.toFixed(3) : '—';
    return `<article class="panel deep-channel">
      <div class="deep-channel-header">
        <span class="deep-letter" aria-hidden="true">${escapeHtml(key)}</span>
        <div><strong>${escapeHtml(name)}</strong><span class="muted">${escapeHtml(axis.status)}</span></div>
        <span class="deep-value${val === null ? ' muted' : ''}">${escapeHtml(display)}</span>
      </div>
      <div class="deep-bar-track"><div class="deep-bar-fill" data-ch="${attr(key)}" style="width:${pct}%"></div></div>
      <code class="deep-formula">${escapeHtml(axis.provenance ? `${axis.provenanceType}: ${axis.provenance}` : 'no observed value')}</code>
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

  const spineRows = DEEP_CHANNELS.map(([key, name]) => {
    const axis = instrument.axes[key];
    const val = axis.value;
    const display = (val !== null && val !== undefined) ? Number(val).toFixed(3) : '—';
    return `<div class="deep-spine-row">
      <span class="deep-letter small">${escapeHtml(key)}</span>
      <span>${escapeHtml(name)}</span>
      <code class="deep-formula">${escapeHtml(axis.status)}</code>
      <span class="deep-spine-val">${escapeHtml(display)}</span>
    </div>`;
  }).join('');

  const packet = latestCycle?.math_spine_packet || null;
  const fold = packet?.projection?.fold || null;
  const jacobian = packet?.projection?.jacobian || null;
  const spineTitle = packet
    ? `Mathematics Spine · PREMAQC sequence ${escapeHtml(String(acceptedPremaqc.sequence))}`
    : 'Mathematics Spine · awaiting receipted Field cycle';
  const sourceWarning = instrument.source === 'ambient-projection'
    ? `<p class="callout">Ambient projection only · ${escapeHtml(formatFieldAge(instrument.ageMs))}${instrument.stale ? ' · STALE' : ''}. It is source evidence, not accepted relational state.</p>`
    : instrument.source === 'unavailable' ? '<p class="callout">No accepted or projected PREMAQC evidence is available.</p>' : '';
  const spineHtml = `<section class="panel">
    <h2>${spineTitle}</h2>
    ${sourceWarning}
    ${packet ? `<dl class="facts">
      <div><dt>Observer receipt</dt><dd>${escapeHtml(latestCycle.premaqc_before.receipt_id)}</dd></div>
      <div><dt>Cycle receipt</dt><dd>${escapeHtml(latestCycle.cycle_id)}</dd></div>
      <div><dt>Math Spine packet</dt><dd>${escapeHtml(packet.packet_id)}</dd></div>
      <div><dt>Fingerprint</dt><dd>${escapeHtml(packet.packet_fingerprint)}</dd></div>
      <div><dt>Jacobian</dt><dd>${escapeHtml(latestCycle.math_wiring.jacobian_source)} · ${escapeHtml(latestCycle.math_wiring.jacobian_version)}</dd></div>
      <div><dt>Fold detector</dt><dd>${fold?.active ? 'ACTIVE' : 'clear'} · index ${Number(jacobian?.fold_index ?? 0).toFixed(4)}</dd></div>
      <div><dt>Deterministic replay</dt><dd>${latestCycle.replay_receipt?.matched ? 'Exact match' : 'MISMATCH'}</dd></div>
      <div><dt>Voices</dt><dd>${escapeHtml(latestCycle.voices.map((voice) => voice.name).join(', '))} · ${latestCycle.voice_invocations?.length ? escapeHtml(latestCycle.voice_invocations.map((item) => `${item.name}: ${item.status}`).join(', ')) : 'model routes not invoked'}</dd></div>
    </dl>` : ''}
    <div class="deep-spine">
      ${spineRows}
    </div>
    <form id="field-feedback-form" class="stack" style="margin-top:1rem">
      <h3>${packet ? 'Run next Field feedback cycle' : 'Run Field feedback cycle'}</h3>
      <p class="muted">Six ambient projections enter through Observer. Qualia enters only through your firsthand report. The resulting PREMAQC packet is then compiled and replay-verified by the Math Spine.</p>
      <label>Practice<select name="mode"><option value="writing">Writing</option><option value="roleplay">Roleplaying</option></select></label>
      <label>What is entering from the world now?<textarea name="work" rows="5" required placeholder="Write the event without sanding its teeth off."></textarea></label>
      <label>Firsthand Qualia · Q (0–1)<input name="qualia" type="number" min="0" max="1" step="0.01" placeholder="Unmeasured — enter your observation" required /></label>
      <fieldset><legend>Constellation voices</legend><div class="voice-grid">${CONSTELLATION_VOICES.map((voice) => `<label class="checkbox"><input type="checkbox" name="voiceIds" value="${attr(voice.id)}" ${voice.id === 'boxfire' ? 'checked' : ''} /> <span><b>${escapeHtml(voice.name)}</b><small>${escapeHtml(voice.model)}</small></span></label>`).join('')}</div></fieldset>
      <label class="checkbox conditional-toggle"><input type="checkbox" name="invokeModels" /> Invoke each selected voice through its model route</label>
      <div class="conditional-body"><p class="callout">Invocation waits for replies or refusals from every selected route. If every route errors, the cycle stops and PREMAQC does not advance.</p></div>
      <label>Optional received contribution<textarea name="response" rows="3"></textarea></label>
      <label class="checkbox conditional-toggle"><input type="checkbox" name="syncLive" /> Sync the verified cycle to the relational ledger</label>
      <div class="conditional-body"><p class="muted">The verified receipt will use the same session-only House runtime token.</p></div>
      <p class="callout">House Runtime · ${houseRuntimeToken ? 'session connected' : 'offline — connect once in Settings'}.</p>
      <button type="submit">Observe → PREMAQC → Math Spine → Receipt ∞</button>
    </form>
  </section>`;

  return header + renderRuntimeObservationLiveRead() + `<section class="deep-channels">${channelsHtml}</section>` + rawHtml + spineHtml;
}

function renderKelyranSchool() {
  const school = state.kelyranSchool;
  const reviewable = dueCards(school);
  const unit = school.units[0], lesson = unit?.lessons?.[0], exercise = lesson?.exercises?.[0];
  const progress = lesson ? school.learner.lessonProgress[`${unit.id}:${lesson.id}`] : null;
  const proposals = school.proposals.filter((item) => item.status === 'proposed');
  const lexicon = [...school.lexicon].sort((a, b) => a.lemma.localeCompare(b.lemma));
  const level = KELYRAN_LEVELS.find(([id]) => id === school.learner.level)?.[1] || school.learner.level;
  const sharedReports = [...stewardVisibleKelyranReports(school), ...(kelyranReportLog.shared_reports || [])];
  return `
    <section class="section-heading"><div><p class="eyebrow">ArcSweep · Living language school</p><h1>Kelyran School</h1><p class="lede">A canon-bound classroom. The tutor may teach what is attested or approved; everything else waits at the proposal gate.</p></div></section>
    <section class="grid three kelyran-status">
      <article class="panel"><p class="eyebrow">Learner path</p><h2>${escapeHtml(level)}</h2><p>${school.learner.receipts.length} practice receipts</p></article>
      <article class="panel"><p class="eyebrow">Canon revision</p><h2>${escapeHtml(school.canonRevision)}</h2><p>${lexicon.filter((item) => ['attested', 'approved'].includes(item.status)).length} teachable forms</p></article>
      <article class="panel"><p class="eyebrow">Review hearth</p><h2>${reviewable.length} due</h2><p>${proposals.length} proposal${proposals.length === 1 ? '' : 's'} awaiting review</p></article>
    </section>
    <section class="grid two kelyran-school-grid">
      <article class="panel stack"><div><p class="eyebrow">Portable mirror</p><h2>${kelyranCloudState.user ? 'Authenticated' : 'Local-first'}</h2><p>${kelyranCloudState.syncedAt ? `Last synchronised ${escapeHtml(new Date(kelyranCloudState.syncedAt).toLocaleString())}` : 'This device remains authoritative until you explicitly synchronise.'}</p></div>${kelyranCloudState.user ? `<div class="button-row"><button type="button" data-action="kelyran-sync">Synchronise now</button><button type="button" class="quiet" data-action="kelyran-sign-out">Sign out</button></div>` : `<form id="kelyran-auth-form" class="stack"><label>Flameclyffe email<input name="email" type="email" required autocomplete="email" /></label><button type="submit">Send sign-in link</button></form>`}</article>
      <article class="panel stack"><div><p class="eyebrow">Models’ own reporting room</p><h2>Consent before commentary</h2><p>Models may report, say there is nothing to report, or decline. Private reports are not displayed here. ${sharedReports.length ? `${sharedReports.length} report${sharedReports.length === 1 ? '' : 's'} explicitly shared with the Steward.` : 'No reports have been explicitly shared with the Steward.'}</p></div><form id="kelyran-reporting-settings-form" class="stack"><label class="checkbox"><input type="checkbox" name="invitationOpen" ${school.reporting.invitationOpen ? 'checked' : ''} /> Invite models to discuss something if they wish</label><button type="submit">Save invitation boundary</button></form>${school.reporting.invitationOpen ? `<form id="kelyran-report-invite-form" class="stack"><fieldset><legend>Who receives the invitation?</legend>${CONSTELLATION_VOICES.map((voice) => `<label class="checkbox"><input type="checkbox" name="voiceIds" value="${attr(voice.id)}" /> ${escapeHtml(voice.name)}</label>`).join('')}</fieldset><button type="submit" ${kelyranReportsRunning ? 'disabled' : ''}>${kelyranReportsRunning ? 'Listening…' : 'Invite without requiring an answer'}</button></form>` : ''}</article>
    </section>
    ${sharedReports.length ? `<section class="panel stack"><div><p class="eyebrow">Explicitly shared</p><h2>Offered for discussion</h2></div>${sharedReports.map((report) => `<article class="kelyran-card"><strong>${escapeHtml(report.modelId || report.model_id || 'House model')}</strong><p>${escapeHtml([...(report.topics || []), ...(report.curiosities || []), ...(report.difficulties || [])].join(' · ') || report.state)}</p>${report.wantsDiscussion ? `<div class="button-row"><span class="muted">Discussion requested</span><button type="button" class="mini" data-action="kelyran-discuss" data-id="${attr(report.id)}">Accept into House Commons</button></div>` : ''}</article>`).join('')}</section>` : ''}
    <section class="grid two kelyran-school-grid">
      <article class="panel stack"><div><p class="eyebrow">Ember lesson</p><h2>${escapeHtml(unit?.title || 'No unit')}</h2><p>${escapeHtml(unit?.description || '')}</p></div>
        ${lesson && exercise ? `<div class="kelyran-lesson"><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.teaching)}</p><form id="kelyran-exercise-form" class="stack"><input type="hidden" name="unitId" value="${attr(unit.id)}" /><input type="hidden" name="lessonId" value="${attr(lesson.id)}" /><input type="hidden" name="exerciseId" value="${attr(exercise.id)}" /><fieldset><legend>${escapeHtml(exercise.prompt)}</legend>${exercise.choices.map((choice) => `<label class="checkbox"><input type="radio" name="answer" value="${attr(choice)}" required /> ${escapeHtml(choice)}</label>`).join('')}</fieldset><button type="submit">Answer with receipt</button>${progress ? `<p class="muted">Attempts ${progress.attempts} · correct ${progress.correct}${progress.completed ? ' · lesson passed' : ''}</p>` : ''}</form></div>` : '<p class="muted">No lesson is mounted.</p>'}</article>
      <article class="panel stack"><div><p class="eyebrow">Spaced repetition</p><h2>Review the living lexicon</h2></div>
        ${reviewable.length ? reviewable.map((entry) => `<div class="kelyran-card"><div><strong>${escapeHtml(entry.lemma)}</strong><span>${escapeHtml(entry.gloss)}</span><small>${escapeHtml(entry.status)} · ${escapeHtml(entry.partOfSpeech || 'unclassified')}</small></div><div class="button-row"><button type="button" class="quiet mini" data-action="kelyran-review" data-id="${attr(entry.id)}" data-quality="1">Again</button><button type="button" class="quiet mini" data-action="kelyran-review" data-id="${attr(entry.id)}" data-quality="3">Hard</button><button type="button" class="mini" data-action="kelyran-review" data-id="${attr(entry.id)}" data-quality="5">Known</button></div></div>`).join('') : '<p class="callout">Nothing is due. The vocabulary dragon is asleep on the flashcards.</p>'}</article>
    </section>
    <section class="grid two kelyran-school-grid">
      <article class="panel stack"><div><p class="eyebrow">Sovereign canon</p><h2>Lexicon</h2></div><div class="kelyran-lexicon">${lexicon.map((entry) => `<details><summary><strong>${escapeHtml(entry.lemma)}</strong><span>${escapeHtml(entry.gloss)}</span><i>${escapeHtml(entry.status)}</i></summary><dl class="facts"><div><dt>Class</dt><dd>${escapeHtml(entry.partOfSpeech || 'Unclassified')}</dd></div><div><dt>Pronunciation</dt><dd>${escapeHtml(entry.pronunciation || 'Awaiting phonology')}</dd></div><div><dt>Lineage</dt><dd>${escapeHtml(entry.lineage || 'Not yet recorded')}</dd></div></dl></details>`).join('')}</div></article>
      <article class="panel stack"><div><p class="eyebrow">Proposal gate</p><h2>Offer a word</h2><p class="muted">Creating a proposal never creates canon.</p></div><form id="kelyran-proposal-form" class="stack"><label>Candidate form<input name="lemma" required /></label><label>English gloss<input name="gloss" required /></label><label>Part of speech<input name="partOfSpeech" /></label><label>Pronunciation or phoneme notes<input name="pronunciation" /></label><label>Lineage and reason<textarea name="lineage" rows="3"></textarea></label><button type="submit">Send to proposal gate</button></form>${proposals.length ? `<div class="proposal-list"><h3>Awaiting Steward review</h3>${proposals.map((proposal) => `<form class="kelyran-proposal-review stack" data-proposal-id="${attr(proposal.id)}"><p><strong>${escapeHtml(proposal.candidate.lemma)}</strong> — ${escapeHtml(proposal.candidate.gloss)}</p><label>Source receipt<input name="sourceReceipt" placeholder="Required for approval" /></label><div class="button-row"><button type="submit" name="decision" value="approve">Approve into canon</button><button type="submit" name="decision" value="decline" class="quiet danger">Decline</button></div></form>`).join('')}</div>` : ''}</article>
    </section>`;
}

function currentView() {
  if (activeRoom === 'portal') return renderPortal();
  if (activeRoom === 'worlds') return renderWorlds();
  if (activeRoom === 'scripts') return renderScripts();
  if (activeRoom === 'feedback') return renderFeedback();
  if (activeRoom === 'commons') return renderCommons();
  if (activeRoom === 'waking-thread') return renderWakingThread();
  if (activeRoom === 'forge') return renderForge();
  if (activeRoom === 'settings') return renderSettings();
  if (activeRoom === 'applet-deck') return renderAppletManager();
  if (activeRoom === 'deep-observer') return renderDeepObserver();
  if (activeRoom === 'kelyran-school') return renderKelyranSchool();
  if (COLLECTION_ROOM_DEFINITIONS[activeRoom]) return renderCollectionRoom(activeRoom);
  if (WORLD_SECTION_DEFINITIONS[activeRoom] || activeRoom === 'appearance') return renderWorldSection(activeRoom);
  return renderPortal();
}

function installHouseglassSectionScopes() {
  const candidates = [...app.querySelectorAll('main.content section, main.content article.panel')]
    .filter((element) => !element.closest('#houseglass'));
  candidates.forEach((element, index) => {
    const heading = element.querySelector('h1, h2, h3, legend, .eyebrow');
    const sectionId = `${activeRoom}:${index}`;
    const sectionLabel = String(heading?.textContent || roomLabel()).trim();
    element.dataset.houseglassSection = sectionId;
    element.addEventListener('pointerdown', () => {
      houseglassSectionFocus = { roomId: activeRoom, sectionId, sectionLabel };
    }, { passive: true });
    element.addEventListener('focusin', () => {
      houseglassSectionFocus = { roomId: activeRoom, sectionId, sectionLabel };
    });
  });
}

function mountHouseglassInSection() {
  const glass = houseglassState();
  if (glass.layout !== 'dock-section') return;
  const panel = app.querySelector('#houseglass');
  if (!panel) return;
  const sectionId = glass.scope?.sectionId;
  const target = sectionId
    ? [...app.querySelectorAll('[data-houseglass-section]')].find((element) => element.dataset.houseglassSection === sectionId)
    : null;
  (target || app.querySelector('main.content'))?.append(panel);
}

function installHouseglassInteractions() {
  const panel = app.querySelector('#houseglass[data-layout="float"]');
  if (!panel) return;
  const handle = panel.querySelector('[data-houseglass-drag-handle]');
  if (!handle) return;

  const storeGeometry = () => {
    const rect = panel.getBoundingClientRect();
    const glass = houseglassState();
    glass.geometry = {
      x: Math.max(0, Math.round(rect.left)),
      y: Math.max(0, Math.round(rect.top)),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    persist(null, 'houseglass-geometry');
  };

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button, input, select, textarea, a')) return;
    const rect = panel.getBoundingClientRect();
    const start = { pointerX: event.clientX, pointerY: event.clientY, left: rect.left, top: rect.top };
    handle.setPointerCapture(event.pointerId);
    panel.dataset.dragging = 'true';

    const move = (moveEvent) => {
      const maxLeft = Math.max(0, window.innerWidth - Math.min(rect.width, window.innerWidth));
      const maxTop = Math.max(0, window.innerHeight - 96);
      const left = Math.min(maxLeft, Math.max(0, start.left + moveEvent.clientX - start.pointerX));
      const top = Math.min(maxTop, Math.max(0, start.top + moveEvent.clientY - start.pointerY));
      panel.style.setProperty('--houseglass-x', `${left}px`);
      panel.style.setProperty('--houseglass-y', `${top}px`);
    };
    const end = () => {
      panel.dataset.dragging = 'false';
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      storeGeometry();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
  panel.addEventListener('pointerup', (event) => {
    if (event.target === handle || handle.contains(event.target)) return;
    storeGeometry();
  });
}

function render() {
  applyPresentation();
  const world = activeWorld();
  const glassSettings = houseglassSettings();
  const glass = houseglassState();
  syncHouseglassScope();
  const glassMarkup = renderHouseglass();
  const unread = glass.receipts.filter((item) => item.reviewStatus === 'unread' && item.status !== 'running').length;
  const glassLaunch = glassSettings.enabled ? `<button type="button" class="houseglass-launch quiet" data-action="houseglass-toggle" aria-expanded="${houseglassOpen}" aria-controls="houseglass"><span aria-hidden="true">▱</span><span>Houseglass</span>${houseglassRunning ? '<i>working</i>' : unread ? `<i>${unread}</i>` : ''}</button>` : '';
  const runtimeLabel = isDesktopRuntime() ? 'Native local store' : isHosted ? 'Hosted browser · local state' : 'Browser development mode';
  app.innerHTML = `<div class="app-shell"${isHosted ? ' data-hosted' : ''} data-houseglass-open="${houseglassOpen && glassSettings.enabled}" data-houseglass-layout="${attr(glass.layout)}"><aside class="sidebar"><div class="brand"><span class="brand-mark">⌁</span><div><strong>Arcsweep</strong><small>Hearthgate</small></div></div><nav aria-label="Primary Arcsweep rooms">${PRIMARY_NAV.map(([id, label, glyph]) => roomButton(id, label, glyph)).join('')}</nav><div class="sidebar-world"><span>Active portal</span><strong>${escapeHtml(world.name)}</strong><button class="quiet mini" data-room="applet-deck">Arrange applets</button></div>${glassLaunch}<p class="privacy-seal">${runtimeLabel}<br />Relational sync requires a receipted cycle</p></aside><main class="content" data-houseglass-room="${attr(activeRoom)}">${currentView()}<p class="notice" role="status">${escapeHtml(notice)}</p></main>${glassMarkup}${renderReturnDialog()}</div>`;
  installHouseglassSectionScopes();
  mountHouseglassInSection();
  installHouseglassInteractions();
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function saveWorldRegistry(form) {
  if (!form) return false;
  const v = formValues(form);
  const world = state.worlds.find((item) => item.id === v.id);
  if (!world) {
    notice = 'World save stopped: the selected portal is no longer in the registry.';
    return false;
  }
  Object.assign(world, {
    name: String(v.name || '').trim() || 'Untitled World',
    kind: String(v.kind || '').trim(),
    description: String(v.description || '').trim(),
    updatedAt: isoNow(),
  });
  persist('World portal saved.', 'world-registry');
  return true;
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
  if (room?.dataset.room === 'kelyran-school' && houseRuntimeToken) {
    readKelyranModelReportLog(houseRuntimeToken).then((log) => { kelyranReportLog = log; if (activeRoom === 'kelyran-school') render(); }).catch(() => null);
  }
  if (room) { houseglassSectionFocus = null; activeRoom = room.dataset.room; if (activeRoom === 'deep-observer' && !deepData && !deepDataFetching) fetchDeepData(); if (['deep-observer', 'feedback', 'commons'].includes(activeRoom) && houseRuntimeToken) ensureBraidLiveUpdates(activeWorld().id); if (['deep-observer', 'feedback'].includes(activeRoom) && houseRuntimeToken) { refreshObservationLiveRead().catch((error) => { notice = `Observation live read unavailable: ${error.message}`; }).finally(render); } if (activeRoom === 'commons' && houseRuntimeToken) { commonsReading = true; render(); Promise.allSettled([readHouseCommons(houseRuntimeToken), readFlameStatuses(CONSTELLATION_VOICES, houseRuntimeToken), readHouseObservations(houseRuntimeToken, activeWorld().id)]).then(([log, statuses, observations]) => { if (log.status === 'rejected') throw log.reason; if (statuses.status === 'rejected') throw statuses.reason; commonsEntries = log.value.entries || []; flameStatuses = statuses.value; if (observations.status === 'fulfilled') { observationLiveRead = observations.value; notice = 'House Commons live read received.'; } else notice = `Commons received; observation live read unavailable: ${observations.reason.message}`; }).catch((error) => { notice = `House Commons unavailable: ${error.message}`; }).finally(() => { commonsReading = false; render(); }); return; } render(); return; }
  const worldButton = event.target.closest('[data-world-id]');
  if (worldButton) { selectedWorldId = worldButton.dataset.worldId; render(); return; }
  const scriptButton = event.target.closest('[data-script-id]');
  if (scriptButton) { selectedScriptId = scriptButton.dataset.scriptId; render(); return; }
  const recordButton = event.target.closest('[data-record-room]');
  if (recordButton) { selectedRecords[recordButton.dataset.recordRoom] = recordButton.dataset.recordId; render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'kelyran-review') {
    try {
      state.kelyranSchool = reviewCard(state.kelyranSchool, id, button.dataset.quality, isoNow());
      persist(`Kelyran review receipted. Next review scheduled from quality ${button.dataset.quality}/5.`, 'kelyran-srs-review');
    } catch (error) { notice = `Kelyran review stopped: ${error.message}`; }
    render(); return;
  }
  if (action === 'kelyran-discuss') {
    const report = [...stewardVisibleKelyranReports(state.kelyranSchool), ...(kelyranReportLog.shared_reports || [])].find((item) => item.id === id);
    try {
      if (!report?.wantsDiscussion) throw new Error('Shared discussion request not found.');
      await appendHouseCommons(houseRuntimeToken, { kind: 'system', author: 'Kelyran School', status: 'discussion-opened', world: { id: activeWorld().id, name: activeWorld().name }, text: `Kelyran discussion accepted with ${report.modelId || report.model_id}: ${[...(report.topics || []), ...(report.curiosities || []), ...(report.difficulties || [])].join(' · ') || 'Open discussion.'}\nReport receipt: ${report.id}` });
      notice = 'Kelyran discussion opened in House Commons.';
    } catch (error) { notice = `Kelyran discussion stopped: ${error.message}`; }
    render(); return;
  }
  if (action === 'kelyran-sync') {
    try {
      const result = await syncKelyranSchool(state.kelyranSchool, await getKelyranSupabase(), isoNow());
      state.kelyranSchool = result.school;
      kelyranCloudState = { state: result.state, user: result.userId, syncedAt: result.syncedAt };
      persist('Kelyran School synchronised through the authenticated learner mirror.', 'kelyran-cloud-sync');
    } catch (error) { notice = `Kelyran synchronisation stopped: ${error.message}`; }
    render(); return;
  }
  if (action === 'kelyran-sign-out') {
    try { await signOutKelyran(); kelyranCloudState = { state: 'signed-out', user: null, syncedAt: null }; notice = 'Kelyran cloud session signed out; local study remains available.'; }
    catch (error) { notice = `Kelyran sign-out stopped: ${error.message}`; }
    render(); return;
  }

  if (action === 'houseglass-toggle') {
    if (!houseglassSettings().enabled) return;
    houseglassOpen = !houseglassOpen;
    if (houseglassOpen) syncHouseglassScope();
    render(); return;
  }
  if (action === 'houseglass-fold') { houseglassOpen = false; render(); return; }
  if (action === 'houseglass-float' || action === 'houseglass-dock-section' || action === 'houseglass-dock-right') {
    const layout = action === 'houseglass-float' ? 'float' : action === 'houseglass-dock-section' ? 'dock-section' : 'dock-right';
    houseglassState().layout = layout;
    houseglassOpen = true;
    syncHouseglassScope();
    persist(`Houseglass ${layout === 'float' ? 'floating' : layout === 'dock-section' ? 'docked in this section' : 'docked at right'}.`, 'houseglass-layout');
    render(); return;
  }
  if (action === 'houseglass-pin') {
    const glass = houseglassState();
    glass.pinned = !glass.pinned;
    if (!glass.pinned) syncHouseglassScope(true);
    persist(glass.pinned ? 'Houseglass scope pinned.' : 'Houseglass scope follows the active section.', 'houseglass-pin');
    render(); return;
  }
  if (action === 'houseglass-receipt') {
    const glass = houseglassState();
    if (glass.receipts.some((item) => item.id === button.dataset.receiptId)) glass.activeReceiptId = button.dataset.receiptId;
    houseglassOpen = true;
    render(); return;
  }
  if (action === 'houseglass-reviewed') {
    const receipt = houseglassState().receipts.find((item) => item.id === button.dataset.receiptId);
    if (receipt) { receipt.reviewStatus = 'reviewed'; receipt.reviewedAt = isoNow(); persist('Houseglass packet marked reviewed.', 'houseglass-reviewed'); }
    render(); return;
  }

  if (action === 'save-world') {
    saveWorldRegistry(button.closest('#world-registry-form'));
    render(); return;
  }

  if (action === 'runtime-disconnect') { stopBraidLiveUpdates(); await disconnectHouseRuntime({ hosted: isHosted }); houseRuntimeToken = ''; flameStatuses = []; braidLiveState = 'offline'; notice = 'House Runtime session closed.'; render(); return; }
  if (action === 'runtime-refresh') { flameStatusChecking = true; render(); flameStatuses = await readFlameStatuses(CONSTELLATION_VOICES, houseRuntimeToken); flameStatusChecking = false; notice = 'House Runtime route board refreshed.'; render(); return; }
  if (action === 'runtime-observations-refresh') { try { ensureBraidLiveUpdates(activeWorld().id); await refreshObservationLiveRead(); notice = 'Canonical observation live read refreshed.'; } catch (error) { notice = `Observation live read unavailable: ${error.message}`; } render(); return; }
  if (action === 'commons-refresh') { try { commonsReading = true; ensureBraidLiveUpdates(activeWorld().id); render(); const [log, observations] = await Promise.all([readHouseCommons(houseRuntimeToken), readHouseObservations(houseRuntimeToken, activeWorld().id)]); commonsEntries = log.entries || []; observationLiveRead = observations; notice = 'House Commons live read refreshed.'; } catch (error) { notice = `House Commons unavailable: ${error.message}`; } finally { commonsReading = false; render(); } return; }
  if (action === 'runtime-observation-review') {
    try {
      const result = await reviewHouseObservation(houseRuntimeToken, button.dataset.cycleId, button.dataset.decision, { reviewedBy: 'Rowan' });
      await refreshObservationLiveRead();
      ensureBraidLiveUpdates(activeWorld().id);
      notice = result.idempotent ? `Observation was already ${button.dataset.decision}.` : `Observation ${button.dataset.decision}; Runtime Braid revision ${result.packet.revision} receipted.`;
    } catch (error) { notice = `Observation review stopped: ${error.message}`; }
    render(); return;
  }
  if (action === 'runtime-deeptime-admit') {
    try {
      const result = await admitHouseObservationToDeepTime(houseRuntimeToken, button.dataset.cycleId, { reviewedBy: 'Rowan' });
      await refreshObservationLiveRead();
      ensureBraidLiveUpdates(activeWorld().id);
      notice = result.idempotent ? 'Observation is already present in DEEPTime.' : `Accepted observation entered DEEPTime through ${result.packet.packet_id}.`;
    } catch (error) { notice = `DEEPTime admission stopped: ${error.message}`; }
    render(); return;
  }

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
  if (action === 'heartfield-toggle') {
    try {
      await storySoundscape.arm(activeWorld());
      if (storySoundscape.heartfieldActive) { storySoundscape.stopHeartfield(); setLiveNotice('Synaptic Heartfield stopped.'); }
      else {
        const raw=app.querySelector('[data-heartfield-qualia]')?.value; const qualia=raw===''||raw==null?null:Number(raw);
        const qualiaText=app.querySelector('[data-heartfield-qualia-text]')?.value || '';
        const premaqc=state.premaqcByWorld?.[activeWorld().id] || null;
        const receipt=storySoundscape.startHeartfield({world:activeWorld(),premaqc,qualia,qualiaText});
        setLiveNotice(`Synaptic Heartfield entered · ${receipt.started_at} · physiology not inferred.`);
      }
    } catch(error){setLiveNotice(`Heartfield stopped: ${error.message}`);}
    refreshStorySoundscape(); return;
  }
  if (action === 'heartfield-layer') { storySoundscape.toggleHeartfieldLayer(button.dataset.layerId); refreshStorySoundscape(); return; }
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
  if (action === 'cycle-accept') {
    if (houseRuntimeToken && observationLiveRead?.snapshots?.some((item) => item.observation?.cycle_id === button.dataset.cycleId)) {
      try { await reviewHouseObservation(houseRuntimeToken, button.dataset.cycleId, 'accepted', { reviewedBy: 'Rowan' }); await refreshObservationLiveRead(); }
      catch (error) { notice = `Live acceptance stopped: ${error.message}`; render(); return; }
    }
    const { queue } = acceptFeedbackCycle(feedbackQueue, button.dataset.cycleId, { acceptedBy: "Rowan" });
    saveFeedbackQueue(queue);
    notice = "Cycle accepted. The reading is carried forward.";
    render(); return;
  }
  if (action === 'cycle-archive') {
    if (houseRuntimeToken && observationLiveRead?.snapshots?.some((item) => item.observation?.cycle_id === button.dataset.cycleId)) {
      try { await reviewHouseObservation(houseRuntimeToken, button.dataset.cycleId, 'archived', { reviewedBy: 'Rowan' }); await refreshObservationLiveRead(); }
      catch (error) { notice = `Live archive stopped: ${error.message}`; render(); return; }
    }
    const { queue } = archiveFeedbackCycle(feedbackQueue, button.dataset.cycleId, { archivedBy: "Rowan" });
    saveFeedbackQueue(queue);
    notice = "Cycle archived.";
    render(); return;
  }
  if (action === 'cycle-discard') {
    if (houseRuntimeToken && observationLiveRead?.snapshots?.some((item) => item.observation?.cycle_id === button.dataset.cycleId)) {
      try { await reviewHouseObservation(houseRuntimeToken, button.dataset.cycleId, 'discarded', { reviewedBy: 'Rowan' }); await refreshObservationLiveRead(); }
      catch (error) { notice = `Live discard stopped: ${error.message}`; render(); return; }
    }
    const { queue } = discardFeedbackCycle(feedbackQueue, button.dataset.cycleId, { discardedBy: "Rowan" });
    saveFeedbackQueue(queue);
    notice = "Cycle discarded.";
    render(); return;
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
  if (action === 'set-active-world') { state.activeWorldId = id; selectedWorldId = id; braidLiveCursor = 0; if (houseRuntimeToken) ensureBraidLiveUpdates(id); persist('Active portal changed.', 'active-world'); }
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
  if (action === 'carry-record-to-canon') {
    const record = state.records.records?.find((item) => item.id === button.dataset.recordId);
    if (record && record.canonCarry === 'Requested for review' && String(record.canonExcerpt || '').trim()) {
      const world = state.worlds.find((item) => item.id === record.worldId) || activeWorld();
      const script = { id: newId('canon-script'), name: `${record.title} — carried excerpt`, worldId: world.id, world: world.name, status: 'Canon', content: record.canonExcerpt.trim(), updatedAt: isoNow(), formats: ['Canon Carry'], recordSourceId: record.id };
      state.scripts.unshift(script);
      record.canonCarry = 'Carried excerpt to canon';
      record.canonScriptId = script.id;
      record.canonCarriedAt = isoNow();
      record.updatedAt = isoNow();
      persist('Reviewed excerpt carried to canon. The complete record remains in the Records Room.', 'records-canon-carry');
    }
  }
  if (action === 'export-record-markdown' || action === 'export-record-json') {
    const record = state.records.records?.find((item) => item.id === button.dataset.recordId);
    if (record) {
      const world = state.worlds.find((item) => item.id === record.worldId) || activeWorld();
      const safe = String(record.title || 'record').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'record';
      if (action === 'export-record-markdown') downloadRecord(`${safe}.md`, recordMarkdown(record, world), 'text/markdown');
      else downloadRecord(`${safe}.json`, JSON.stringify({ schema: 'arcsweep.record/v1', world: { id: world.id, name: world.name }, record }, null, 2), 'application/json');
      notice = `${record.title || 'Record'} exported.`;
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
  if (event.target.matches('[data-houseglass-draft]')) {
    houseglassDraft = event.target.value;
    return;
  }
  if (event.target.matches('[data-record-search]')) {
    recordQueries[event.target.dataset.recordSearch] = event.target.value;
    render();
    const input = app.querySelector(`[data-record-search="${event.target.dataset.recordSearch}"]`);
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    return;
  }
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
  const heartfieldLayer = event.target.dataset.heartfieldLevel;
  if (heartfieldLayer) { storySoundscape.setHeartfieldLayer(heartfieldLayer, event.target.value); return; }
  if (event.target.matches('[data-heartfield-master]')) { storySoundscape.setHeartfieldMaster(event.target.value); return; }
  if (trackId) storySoundscape.setTrackLevel(trackId, event.target.value);
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const v = formValues(form);
  if (form.id === 'kelyran-auth-form') {
    try { const email = await requestKelyranMagicLink(v.email); notice = `Sign-in link sent to ${email}. Local study remains available while you check it.`; form.reset(); }
    catch (error) { notice = `Kelyran sign-in stopped: ${error.message}`; }
    render(); return;
  }
  if (form.id === 'kelyran-reporting-settings-form') {
    state.kelyranSchool = setKelyranDiscussionInvitation(state.kelyranSchool, form.elements.invitationOpen.checked, isoNow());
    persist(form.elements.invitationOpen.checked ? 'The optional Kelyran discussion invitation is open.' : 'The Kelyran discussion invitation is closed.', 'kelyran-reporting-boundary');
    render(); return;
  }
  if (form.id === 'kelyran-report-invite-form') {
    const voiceIds = [...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value);
    if (!voiceIds.length) { notice = 'Choose at least one House model to invite.'; render(); return; }
    kelyranReportsRunning = true; render();
    try {
      const result = await inviteKelyranModelReports(houseRuntimeToken, state.kelyranSchool, voiceIds);
      kelyranReportLog = await readKelyranModelReportLog(houseRuntimeToken);
      const counts = result.outcomes.reduce((out, item) => ({ ...out, [item.state]: (out[item.state] || 0) + 1 }), {});
      notice = `Kelyran invitation complete: ${Object.entries(counts).map(([key, value]) => `${value} ${key}`).join(', ')}.`;
    } catch (error) { notice = `Kelyran model invitation stopped: ${error.message}`; }
    finally { kelyranReportsRunning = false; render(); }
    return;
  }
  if (form.id === 'kelyran-exercise-form') {
    try {
      const result = answerExercise(state.kelyranSchool, v.unitId, v.lessonId, v.exerciseId, v.answer, isoNow());
      state.kelyranSchool = result.school;
      persist(result.correct ? `Correct. ${result.exercise.explanation}` : 'Not this time. The attempt was receipted without altering canon.', 'kelyran-exercise');
    } catch (error) { notice = `Kelyran exercise stopped: ${error.message}`; }
    render(); return;
  }
  if (form.id === 'kelyran-proposal-form') {
    try {
      const proposal = createLexemeProposal({ lemma: v.lemma, gloss: v.gloss, partOfSpeech: v.partOfSpeech, pronunciation: v.pronunciation, lineage: v.lineage }, state.kelyranSchool.lexicon, isoNow());
      state.kelyranSchool.proposals.unshift(proposal);
      state.kelyranSchool.updatedAt = isoNow();
      persist(`“${proposal.candidate.lemma}” entered the proposal gate; canon is unchanged.`, 'kelyran-proposal');
    } catch (error) { notice = `Kelyran proposal stopped: ${error.message}`; }
    render(); return;
  }
  if (form.matches('.kelyran-proposal-review')) {
    try {
      const decision = event.submitter?.value;
      state.kelyranSchool = reviewLexemeProposal(state.kelyranSchool, form.dataset.proposalId, decision, v.sourceReceipt, isoNow());
      persist(decision === 'approve' ? 'Kelyran lexeme approved with a source receipt.' : 'Kelyran proposal declined; canon remains unchanged.', 'kelyran-proposal-review');
    } catch (error) { notice = `Kelyran review stopped: ${error.message}`; }
    render(); return;
  }
  if (form.id === 'session-form') {
    const world = state.worlds.find((item) => item.id === v.targetWorldId) || activeWorld();
    state.activeWorldId = world.id; selectedWorldId = world.id;
    state.session = { active: true, startedAt: isoNow(), targetWorldId: world.id, targetWorld: world.name, intention: v.intention.trim(), wakingMinutes: world.time.wakingMinutes, worldMinutes: world.time.worldMinutes };
    persist('Arc begun. Return remains available.', 'begin-arc');
  }
  if (form.id === 'house-runtime-form') {
    try { houseRuntimeToken = await connectHouseRuntime(v.runtimeToken, { hosted: isHosted }); flameStatusChecking = true; flameStatuses = await readFlameStatuses(CONSTELLATION_VOICES, houseRuntimeToken); ensureBraidLiveUpdates(activeWorld().id); try { observationLiveRead = await readHouseObservations(houseRuntimeToken, activeWorld().id); notice = 'House Runtime sealed session, Runtime Braid, and observation live read connected.'; } catch (error) { notice = `House Runtime connected; observation live read unavailable: ${error.message}`; } form.reset(); }
    catch (error) { notice = `House Runtime stopped: ${error.message}`; }
    finally { flameStatusChecking = false; render(); }
    return;
  }
  if (form.id === 'houseglass-task-form') {
    const glass = houseglassState();
    const settings = houseglassSettings();
    const task = String(v.task || '').trim();
    if (houseglassRunning || !task) return;
    const scope = structuredClone(syncHouseglassScope());
    const plan = planHouseglassSwarm({ stage: v.stage, routing: settings.routing, selectedVoiceIds: settings.defaultVoiceIds, voices: CONSTELLATION_VOICES });
    const receipt = createHouseglassReceipt({ id: newId('houseglass'), task, stage: v.stage, scope, plan });
    glass.receipts = [receipt, ...glass.receipts].slice(0, 60);
    glass.activeReceiptId = receipt.id;
    houseglassRunning = true;
    persist('Houseglass quorum entered the task.', 'houseglass-start');
    render();
    try {
      const world = state.worlds.find((item) => item.id === scope.worldId) || activeWorld();
      const premaqc = state.premaqcByWorld[world.id] || createInitialPremaqc(world.id, world.premaqc);
      const canon = state.scripts.filter((script) => script.worldId === world.id && script.status === 'Canon');
      const mode = plan.stage === 'seed' ? 'writing' : 'reflection';
      const work = buildHouseglassTaskPacket({ task, stage: plan.stage, scope, settings });
      const contributions = await invokeConstellationVoices({ world, mode, work, premaqc, canon, voiceIds: plan.contributorIds, token: houseRuntimeToken });
      let synthesis = null;
      if (plan.synthesizerId) {
        const synthesisWork = buildHouseglassSynthesisPacket({ task, stage: plan.stage, scope, contributions });
        [synthesis] = await invokeConstellationVoices({ world, mode: 'reflection', work: synthesisWork, premaqc, canon, voiceIds: [plan.synthesizerId], token: houseRuntimeToken });
      } else {
        synthesis = contributions.find((item) => item.status === 'replied') || contributions[0] || null;
      }
      const current = houseglassState().receipts.find((item) => item.id === receipt.id);
      if (current) Object.assign(current, finishHouseglassReceipt(current, { contributions, synthesis }));
      houseglassDraft = '';
      notice = `Houseglass returned a ${plan.stage} packet from ${plan.voiceIds.map((id) => CONSTELLATION_VOICES.find((voice) => voice.id === id)?.name || id).join(', ')}.`;
      persist(null, 'houseglass-finish');
    } catch (error) {
      const current = houseglassState().receipts.find((item) => item.id === receipt.id);
      if (current) Object.assign(current, finishHouseglassReceipt(current, { error: error.message }));
      notice = `Houseglass stopped: ${error.message}`;
      persist(null, 'houseglass-error');
    } finally {
      houseglassRunning = false;
      render();
    }
    return;
  }
  if (form.id === 'commons-form') {
    try {
      const world = activeWorld();
      const voiceIds = [...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value);
      if (!voiceIds.length) throw new Error('Choose at least one Constellation voice.');
      await appendHouseCommons(houseRuntimeToken, { kind: 'steward', author: 'Rowan', status: 'sent', world: { id: world.id, name: world.name }, text: v.message });
      const premaqc = state.premaqcByWorld[world.id] || createInitialPremaqc(world.id, world.premaqc);
      const canon = state.scripts.filter((script) => script.worldId === world.id && script.status === 'Canon');
      const replies = await invokeConstellationVoices({ world, mode: 'reflection', work: v.message, premaqc, canon, voiceIds, token: houseRuntimeToken });
      for (const reply of replies) await appendHouseCommons(houseRuntimeToken, { kind: 'voice', author: reply.name, voice_id: reply.voice_id, status: reply.status, world: { id: world.id, name: world.name }, text: reply.text || reply.error || 'No contribution returned.' });
      commonsEntries = (await readHouseCommons(houseRuntimeToken)).entries || [];
      notice = `Commons turn received from ${replies.map((item) => item.name).join(', ')}.`;
    } catch (error) { notice = `Commons turn stopped: ${error.message}`; }
    render(); return;
  }
  if (form.id === 'houseglass-settings-form') {
    const defaultVoiceIds = [...form.querySelectorAll('input[name="defaultVoiceIds"]:checked')].map((input) => input.value);
    if (v.routing === 'selected' && !defaultVoiceIds.length) {
      notice = 'Choose at least one Houseglass route for selected routing.';
      render(); return;
    }
    state.settings.houseglass = normaliseHouseglassSettings({
      enabled: form.elements.enabled.checked,
      presence: v.presence,
      interruptions: v.interruptions,
      pacing: v.pacing,
      defaultLayout: v.defaultLayout,
      solidSurface: form.elements.solidSurface.checked,
      routing: v.routing,
      defaultVoiceIds,
      permissions: {
        readContext: form.elements.readContext.checked,
        draftProposals: form.elements.draftProposals.checked,
        populateFields: form.elements.populateFields.checked,
        reviewContinuity: form.elements.reviewContinuity.checked,
        prepareTests: form.elements.prepareTests.checked,
        prepareLocalChanges: form.elements.prepareLocalChanges.checked,
      },
    });
    const glass = houseglassState();
    glass.layout = state.settings.houseglass.defaultLayout;
    if (!state.settings.houseglass.enabled) houseglassOpen = false;
    persist('Houseglass settings saved. No external authority changed.', 'houseglass-settings');
    render(); return;
  }
  if (form.id === 'world-registry-form') saveWorldRegistry(form);
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
        ? await invokeConstellationVoices({ world, mode: v.mode, work: v.work, premaqc: current, canon, voiceIds, token: houseRuntimeToken })
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
      if (cycle.authority.steward_review_required) {
        const { queue } = enqueueFeedbackCycle(feedbackQueue, cycle);
        saveFeedbackQueue(queue);
      }
      persist(`Feedback cycle ${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence} replay-matched in the local ledger.`, 'feedback-cycle');
      if (form.elements.syncLive.checked) {
        await syncFeedbackCycle(cycle, houseRuntimeToken);
        notice = `Feedback cycle ${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence} synced to the relational ledger.`;
      }
    } catch (error) { notice = `Feedback cycle stopped: ${error.message}`; }
  }
  if (form.id === 'field-feedback-form') {
    try {
      if (!deepData) throw new Error('Read the live Field before running the cycle.');
      const world = activeWorld();
      const voiceIds = [...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value);
      if (!voiceIds.length) throw new Error('Select at least one Constellation voice.');
      const prior = state.premaqcByWorld[world.id] || null;
      const observedAt = new Date().toISOString();
      const observerPremaqc = createFieldObservationPremaqc({
        worldId: world.id, ambient: deepData, qualia: v.qualia, narrative: v.work,
        priorPremaqc: prior, observedAt,
      });
      const canon = state.scripts.filter((script) => script.worldId === world.id && script.status === 'Canon');
      const voiceInvocations = form.elements.invokeModels.checked
        ? await invokeConstellationVoices({ world, mode: v.mode, work: v.work, premaqc: observerPremaqc, canon, voiceIds, token: houseRuntimeToken })
        : [];
      const routedResponse = voiceInvocations.filter((item) => item.status !== 'error').map((item) => `${item.name} [${item.status}]: ${item.text}`).join('\n\n');
      const combinedResponse = [routedResponse, String(v.response || '').trim()].filter(Boolean).join('\n\nReceived contribution:\n');
      if (form.elements.invokeModels.checked && !combinedResponse) throw new Error('Every selected voice route failed; no cycle was accepted.');
      const evidence = [{
        schema: 'arcsweep.field-evidence/v1', source: deepData.source,
        generated_at: deepData.generated_at, location: deepData.location,
        weather_time: deepData.weather?.time || null,
        space_weather_time: deepData.space_weather?.solar_wind?.time_tag || null,
        projected_axes: structuredClone(deepData.field || {}),
        qualia: { value: Number(v.qualia), source: 'firsthand report' },
      }];
      const cycle = await runFeedbackCycle({
        world, premaqc: observerPremaqc, mode: v.mode, work: v.work,
        response: combinedResponse, voiceIds, canonRefs: canon.map((item) => item.id),
        voiceInvocations, soundEvents: storySoundscape.getTurnReceipts(), evidence, observedAt,
      });
      state.feedbackCycles.unshift(cycle);
      state.premaqcByWorld[world.id] = cycle.premaqc_after;
      storySoundscape.clearTurn();
      persist(`Field cycle accepted · PREMAQC ${cycle.premaqc_before.sequence} → ${cycle.premaqc_after.sequence} · replay exact.`, 'field-feedback-cycle');
      if (form.elements.syncLive.checked) {
        await syncFeedbackCycle(cycle, houseRuntimeToken);
        notice = `Field cycle ${cycle.cycle_id} synced to the relational ledger.`;
      }
    } catch (error) { notice = `Field cycle stopped: ${error.message}`; }
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

if (houseRuntimeToken) ensureBraidLiveUpdates(activeWorld().id);
render();
