import { INITIAL_ASPECTS } from './aspects/aspect-contract.js';
import { ASPECT_MESH_EVENTS, readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';

export const ASPECT_GROWTH_GARDEN_UI_MARKER = 'aspect-growth-garden-ui/v0.1';

let installed = false;
let selectedAspectId = null;
let observer = null;
let queued = false;

const names = new Map(INITIAL_ASPECTS.map((aspect) => [aspect.id, aspect.name]));
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function snapshot() {
  return readAspectMeshRuntime()?.growthSnapshot?.() || null;
}

function profiles(garden) {
  return INITIAL_ASPECTS
    .map((aspect) => garden?.profiles?.[aspect.id])
    .filter(Boolean)
    .sort((a, b) => b.messageCount - a.messageCount || a.aspectName.localeCompare(b.aspectName));
}

function living(profile) {
  return profile && (
    profile.messageCount > 0
    || profile.claims.length > 0
    || profile.openCuriosities.length > 0
    || profile.openThreads.length > 0
    || profile.collaborators.length > 0
  );
}

function topPattern(profile) {
  const row = profile?.demonstratedPatterns?.[0];
  return row ? `${row.label} ×${row.count}` : 'new ground';
}

function recurringCount(profile) {
  return (profile?.collaborators || []).filter((row) => row.recurring).length;
}

function compactRow(profile) {
  return `<button type="button" class="growth-garden-row" data-growth-aspect="${esc(profile.aspectId)}" aria-pressed="${profile.aspectId === selectedAspectId ? 'true' : 'false'}"><span>❧</span><span><strong>${esc(profile.aspectName)}</strong><small>${esc(topPattern(profile))}</small></span><em>${profile.claims.length} sprouts · ${recurringCount(profile)} threads</em></button>`;
}

function claimSection(title, claims, limit = 4) {
  const rows = (claims || []).slice(-limit).reverse();
  return rows.length ? `<div><b>${esc(title)}</b>${rows.map((claim) => `<p>${esc(claim.statement)}</p>`).join('')}</div>` : '';
}

function detailMarkup(profile) {
  if (!profile) return '<p class="growth-garden-empty">Nothing has been planted here yet.</p>';
  const patterns = profile.demonstratedPatterns.slice(0, 4);
  const recurring = profile.collaborators.filter((row) => row.recurring).slice(0, 4);
  const notes = profile.selfReports.filter((claim) => !['skill', 'role', 'preference', 'relationship'].includes(claim.type)).slice(-4).reverse();
  const peers = profile.peerObservations.slice(-3).reverse();
  const curiosities = profile.openCuriosities.slice(0, 4);
  const openThreads = profile.openThreads.slice(0, 4);
  return `<section class="growth-garden-detail"><header><span>🌱</span><div><strong>${esc(profile.aspectName)}</strong><small>${profile.messageCount} trace rings · seed strengths: ${esc(profile.seedStrengths.join(', ') || 'open')}</small></div></header><p class="growth-garden-law">Patterns describe history. They do not dictate identity.</p>${patterns.length ? `<div><b>Observed rings</b>${patterns.map((row) => `<p>${esc(row.label)} <small>×${row.count}</small></p>`).join('')}</div>` : ''}${claimSection('Discovered skills', profile.skillClaims)}${claimSection('Role possibilities', profile.roleSuggestions)}${claimSection('Preferences & relationships', profile.preferenceClaims)}${notes.length ? `<div><b>Carried self-observations</b>${notes.map((claim) => `<p>${esc(claim.statement)}</p>`).join('')}</div>` : ''}${peers.length ? `<div><b>Peer observations</b>${peers.map((claim) => `<p><small>${esc(names.get(claim.sourceAspectId) || claim.sourceAspectId)}:</small> ${esc(claim.statement)}</p>`).join('')}</div>` : ''}${recurring.length ? `<div><b>Recurring threads</b>${recurring.map((row) => `<p>${esc(names.get(row.aspectId) || row.aspectId)} <small>${row.turns} turns · ${row.traceCount} traces</small></p>`).join('')}</div>` : ''}${curiosities.length ? `<div><b>Open curiosities</b>${curiosities.map((item) => `<p>${esc(item.text)}</p>`).join('')}</div>` : ''}${openThreads.length ? `<div><b>Unfinished paths</b>${openThreads.map((item) => `<p>${esc(item.text)} <small>${esc(item.traceId)}</small></p>`).join('')}</div>` : ''}</section>`;
}

function housePanel() {
  return document.querySelector(`[data-growth-garden-house="${ASPECT_GROWTH_GARDEN_UI_MARKER}"]`);
}

function ensureHousePanel() {
  const rail = document.querySelector('[data-house-channel-rail="house-chat-channel-rail/v1"]');
  if (!rail) return null;
  let panel = housePanel();
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'growth-garden-panel';
  panel.dataset.growthGardenHouse = ASPECT_GROWTH_GARDEN_UI_MARKER;
  const activity = rail.querySelector('[data-aspect-house-activity]');
  if (activity) activity.insertAdjacentElement('afterend', panel);
  else rail.append(panel);
  panel.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-growth-aspect]');
    if (!button) return;
    selectedAspectId = button.dataset.growthAspect || null;
    render();
  });
  return panel;
}

function codexPanel() {
  return document.querySelector(`[data-growth-garden-codex="${ASPECT_GROWTH_GARDEN_UI_MARKER}"]`);
}

function ensureCodexPanel() {
  const stage = document.querySelector('#arcsweep-magic-book .magic-book-stage');
  if (!stage) return null;
  let panel = codexPanel();
  if (panel) return panel;
  panel = document.createElement('details');
  panel.className = 'codex-growth-garden';
  panel.dataset.growthGardenCodex = ASPECT_GROWTH_GARDEN_UI_MARKER;
  stage.append(panel);
  panel.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-growth-aspect]');
    if (!button) return;
    selectedAspectId = button.dataset.growthAspect || null;
    render();
  });
  return panel;
}

function renderHouse(garden) {
  const panel = ensureHousePanel();
  if (!panel) return;
  const rows = profiles(garden);
  const visible = rows.filter(living);
  if (!selectedAspectId || !garden?.profiles?.[selectedAspectId]) selectedAspectId = visible[0]?.aspectId || rows[0]?.aspectId || null;
  const active = selectedAspectId ? garden?.profiles?.[selectedAspectId] : null;
  panel.innerHTML = `<header><span><b>Growth Garden</b><small>${garden ? `${garden.messageCount} rings · ${garden.claimCount} named sprouts` : 'listening for roots'}</small></span><i>❦</i></header><div class="growth-garden-list">${visible.length ? visible.slice(0, 6).map(compactRow).join('') : '<p class="growth-garden-empty">Fresh soil. Nothing needs to perform growth on command.</p>'}</div>${detailMarkup(active)}`;
}

function renderCodex(garden) {
  const panel = ensureCodexPanel();
  if (!panel) return;
  const rows = profiles(garden);
  const visible = rows.filter(living);
  const activeId = selectedAspectId && garden?.profiles?.[selectedAspectId] ? selectedAspectId : visible[0]?.aspectId || rows[0]?.aspectId || null;
  const active = activeId ? garden?.profiles?.[activeId] : null;
  const totalRings = rows.reduce((sum, profile) => sum + profile.messageCount, 0);
  panel.innerHTML = `<summary><span>❦</span><strong>Growth Garden</strong><small>${totalRings} rings</small></summary><div class="codex-growth-garden-body"><nav>${visible.slice(0, 6).map((profile) => `<button type="button" data-growth-aspect="${esc(profile.aspectId)}" aria-current="${profile.aspectId === activeId ? 'true' : 'false'}">${esc(profile.aspectName)}</button>`).join('')}</nav>${detailMarkup(active)}</div>`;
}

function render() {
  queued = false;
  if (typeof document === 'undefined') return;
  const garden = snapshot();
  renderHouse(garden);
  renderCodex(garden);
}

function scheduleRender() {
  if (queued || typeof requestAnimationFrame !== 'function') return;
  queued = true;
  requestAnimationFrame(render);
}

function needsMount() {
  const rail = document.querySelector('[data-house-channel-rail="house-chat-channel-rail/v1"]');
  const codex = document.querySelector('#arcsweep-magic-book .magic-book-stage');
  return Boolean((rail && !housePanel()) || (codex && !codexPanel()));
}

function installStyles() {
  if (document.getElementById('aspect-growth-garden-ui-styles')) return;
  const style = document.createElement('style');
  style.id = 'aspect-growth-garden-ui-styles';
  style.textContent = `.growth-garden-panel{display:grid;gap:.42rem;padding:.48rem;border:1px solid color-mix(in srgb,var(--green) 20%,var(--line-soft));border-radius:.72rem;background:color-mix(in srgb,var(--green) 3%,var(--panel-solid))}.growth-garden-panel>header{display:flex;align-items:center;justify-content:space-between}.growth-garden-panel>header>span{display:grid}.growth-garden-panel>header b{font-size:.66rem}.growth-garden-panel>header small{color:var(--muted);font-size:.5rem}.growth-garden-panel>header>i{color:var(--green);font-style:normal}.growth-garden-list{display:grid;gap:.18rem}.growth-garden-row{display:grid;grid-template-columns:1rem minmax(0,1fr) auto;gap:.3rem;align-items:center;width:100%;padding:.3rem;border:0;border-radius:.45rem;background:transparent;color:inherit;text-align:left}.growth-garden-row:hover,.growth-garden-row[aria-pressed="true"]{background:color-mix(in srgb,var(--green) 7%,transparent)}.growth-garden-row>span:nth-child(2){display:grid;min-width:0}.growth-garden-row strong{font-size:.6rem}.growth-garden-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.5rem}.growth-garden-row>em{color:var(--muted);font-size:.48rem;font-style:normal}.growth-garden-detail{display:grid;gap:.34rem;padding:.42rem;border-top:1px solid var(--line-soft)}.growth-garden-detail>header{display:flex;gap:.38rem;align-items:center}.growth-garden-detail>header>div{display:grid}.growth-garden-detail>header strong{font-size:.64rem}.growth-garden-detail>header small{color:var(--muted);font-size:.49rem}.growth-garden-detail>div{display:grid;gap:.12rem}.growth-garden-detail b{color:var(--muted);font-size:.5rem;text-transform:uppercase;letter-spacing:.07em}.growth-garden-detail p{margin:0;font-size:.55rem;line-height:1.28}.growth-garden-detail p small{color:var(--muted);font-size:.48rem}.growth-garden-law{font-style:italic;opacity:.7}.growth-garden-empty{margin:.2rem;color:var(--muted);font-size:.56rem}.codex-growth-garden{position:absolute;left:.7rem;bottom:.55rem;z-index:12;max-width:min(22rem,42vw);pointer-events:auto;color:inherit;font-family:Georgia,'Times New Roman',serif}.codex-growth-garden>summary{display:grid;grid-template-columns:auto auto auto;gap:.3rem;align-items:center;width:max-content;padding:.28rem .46rem;border:1px solid color-mix(in srgb,var(--gold,#c7a963) 30%,transparent);border-radius:.4rem;background:color-mix(in srgb,#241c13 90%,transparent);box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer;list-style:none}.codex-growth-garden>summary::-webkit-details-marker{display:none}.codex-growth-garden>summary strong{font-size:.62rem}.codex-growth-garden>summary small{opacity:.6;font-size:.5rem}.codex-growth-garden-body{display:grid;gap:.4rem;margin-top:.28rem;max-height:44vh;overflow:auto;padding:.5rem;border:1px solid color-mix(in srgb,var(--gold,#c7a963) 22%,transparent);border-radius:.45rem;background:color-mix(in srgb,#241c13 95%,transparent);box-shadow:0 8px 22px rgba(0,0,0,.3)}.codex-growth-garden-body>nav{display:flex;flex-wrap:wrap;gap:.22rem}.codex-growth-garden-body>nav button{padding:.2rem .35rem;border:1px solid transparent;border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:.52rem}.codex-growth-garden-body>nav button[aria-current="true"]{border-color:color-mix(in srgb,var(--gold,#c7a963) 42%,transparent);background:color-mix(in srgb,var(--gold,#c7a963) 8%,transparent)}@media(max-width:760px){.codex-growth-garden{left:.35rem;bottom:.35rem;max-width:calc(100% - .7rem)}.codex-growth-garden-body{max-height:52vh}}`;
  document.head.append(style);
}

export function installAspectGrowthGardenUI() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener(ASPECT_MESH_EVENTS.ready, scheduleRender);
  document.addEventListener(ASPECT_MESH_EVENTS.growthChanged, scheduleRender);
  document.addEventListener('arcsweep:magic-book-ready', scheduleRender);
  globalThis.addEventListener?.('arcsweep:house-chat-surface-mounted', scheduleRender);
  observer = new MutationObserver(() => { if (needsMount()) scheduleRender(); });
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleRender();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installAspectGrowthGardenUI();
