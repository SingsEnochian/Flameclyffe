import './observer-bridge.js';
import { ARCSWEEP_LOCAL_STATE_KEY } from './durable-workspace-state.js';
import {
  buildObserverEpistemicLedger,
  buildObserverNarrativeState,
  buildObserverSemanticStatus,
} from './os/observer-epistemic.js';
import { createScientificSkillRouter } from './os/scientific-skill-service.js';
import {
  createObserverWitnessPacket,
  observerWitnessHostStatus,
  publishObserverWitness,
  readObserverWitnessHistory,
  subscribeObserverWitness,
} from './observer-witness.js';

const NOTES_KEY = 'hearthgate.arcsweep.observer-workbench.notes.v1';
const OBSERVER_SNAPSHOT_KEY = 'hearthgate.observer.premaq.v1';
const app = document.querySelector('#observer-workbench');
const desktop = globalThis.arcsweepDesktop ?? globalThis.arcsweep ?? null;
const skillRouter = createScientificSkillRouter();

let workspace = null;
let selectedWorldId = null;
let current = {
  snapshot: null,
  deep: null,
  semantic: null,
  narrative: null,
  ledger: null,
  witnessStatus: null,
  witnessHistory: [],
};
let notice = '';
let stopWitnessSubscription = null;

function clone(value) {
  if (value == null) return value;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseJson(raw, fallback = null) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function readObserverSnapshot() {
  const bridge = globalThis.__arcsweepObserverBridge;
  if (bridge?.getSnapshot) return bridge.getSnapshot();
  try { return parseJson(localStorage.getItem(OBSERVER_SNAPSHOT_KEY), null); }
  catch { return null; }
}

async function loadWorkspace() {
  if (typeof desktop?.loadState === 'function') {
    try {
      const result = await desktop.loadState();
      const candidate = result?.state || result;
      if (candidate?.worlds) return candidate;
    } catch {}
  }
  try {
    return parseJson(localStorage.getItem(ARCSWEEP_LOCAL_STATE_KEY), null);
  } catch {
    return null;
  }
}

function queryWorldId() {
  try {
    const params = new URLSearchParams(location.search);
    return params.get('world_id') || params.get('worldId') || null;
  } catch {
    return null;
  }
}

function activeWorld() {
  const worlds = workspace?.worlds || [];
  return worlds.find((world) => world.id === selectedWorldId)
    || worlds.find((world) => world.id === workspace?.activeWorldId)
    || worlds[0]
    || null;
}

function workspaceSummary() {
  const world = activeWorld();
  const worldId = world?.id || null;
  const cycles = (workspace?.feedbackCycles || []).filter((cycle) => cycle?.world?.id === worldId);
  const deepTime = (workspace?.observatory?.deep_time_records || []).filter((record) => record?.world_id === worldId);
  const premaqc = workspace?.premaqcByWorld?.[worldId] || cycles[0]?.premaqc_after || null;
  return {
    activeWorldId: worldId,
    worldName: world?.name || 'No active world',
    feedbackCycleCount: cycles.length,
    deepTimeRecordCount: deepTime.length,
    latestDeepTime: deepTime.sort((a, b) => Number(a.lambda) - Number(b.lambda)).at(-1) || null,
    premaqc,
  };
}

async function readDeepPayload(snapshot) {
  const bridge = globalThis.__arcsweepObserverBridge;
  if (snapshot && bridge?.getDeepPayload) {
    try { return await bridge.getDeepPayload(); } catch {}
  }
  try {
    const response = await fetch('/data/deep-current.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return null;
  }
}

function currentSemantic(snapshot) {
  const bridge = globalThis.__arcsweepObserverBridge;
  if (bridge?.getStatus) {
    try { return bridge.getStatus(); } catch {}
  }
  return buildObserverSemanticStatus({
    snapshot,
    bridgePresent: Boolean(bridge),
    schema: bridge?.schema || null,
    storageKey: bridge?.storageKey || OBSERVER_SNAPSHOT_KEY,
  });
}

async function refresh() {
  notice = 'Reading Observer, ArcSweep workspace, DEEP projection, and local witness lane…';
  render();
  workspace = await loadWorkspace();
  const requested = queryWorldId();
  const worlds = workspace?.worlds || [];
  if (!selectedWorldId || !worlds.some((world) => world.id === selectedWorldId)) {
    selectedWorldId = worlds.some((world) => world.id === requested)
      ? requested
      : workspace?.activeWorldId || worlds[0]?.id || null;
  }
  const snapshot = readObserverSnapshot();
  const deep = await readDeepPayload(snapshot);
  const semantic = currentSemantic(snapshot);
  const narrative = buildObserverNarrativeState(snapshot);
  const ledger = buildObserverEpistemicLedger({ snapshot, deepPayload: deep, narrativeState: narrative });
  const witnessStatus = await observerWitnessHostStatus();
  const witnessHistory = await readObserverWitnessHistory({ limit: 18 });
  current = { snapshot, deep, semantic, narrative, ledger, witnessStatus, witnessHistory };
  notice = '';
  render();
}

function stateClass(state) {
  const value = String(state || 'unknown').toLowerCase();
  if (['available', 'healthy', 'present', 'connected', 'verified-live'].includes(value)) return 'good';
  if (['degraded', 'requested', 'partial'].includes(value)) return 'warn';
  if (['unavailable', 'missing', 'offline', 'error'].includes(value)) return 'bad';
  return 'unknown';
}

function truthCard(label, value, detail = '') {
  const state = typeof value === 'object' ? value?.state : value;
  const text = typeof value === 'object' ? (value?.state || 'unknown') : (value || 'unknown');
  return `<article class="truth-card ${stateClass(state)}"><span>${esc(label)}</span><strong>${esc(text)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</article>`;
}

function formatNumber(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '—';
}

function renderAxes() {
  const field = current.deep?.field || {};
  const labels = {
    P: 'Possibility', C: 'Coherence', R: 'Resonance', E: 'Energy', M: 'Meaning', A: 'Agency', Q: 'Qualia',
  };
  return Object.entries(labels).map(([axis, label]) => {
    const raw = field?.[axis];
    const number = Number(raw);
    const bounded = Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
    return `<div class="axis-row"><div><b>${axis}</b><span>${esc(label)}</span></div><div class="axis-track" aria-hidden="true"><i style="width:${bounded * 100}%"></i></div><output>${formatNumber(raw)}</output></div>`;
  }).join('');
}

function renderMechanisms() {
  const edges = current.ledger?.mechanism_edges || [];
  if (!edges.length) return '<p class="quiet">No mechanism edges are declared in the current narrative snapshot. That is an explicit empty state, not a failure.</p>';
  return `<div class="mechanism-list">${edges.map((edge) => `<article><span class="edge-status ${stateClass(edge.epistemic_status)}">${esc(edge.epistemic_status)}</span><b>${esc(edge.from || '?')} → ${esc(edge.to || '?')}</b><small>${esc(edge.relation || 'untyped relation')}</small></article>`).join('')}</div>`;
}

function readNotes() {
  try { return parseJson(localStorage.getItem(NOTES_KEY), {}) || {}; } catch { return {}; }
}

function noteForWorld() {
  const worldId = selectedWorldId || 'unassigned';
  return readNotes()[worldId] || { html: '', updated_at: null };
}

function sanitizeEditorHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const allowed = new Set(['P', 'BR', 'DIV', 'H1', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE', 'A', 'MARK', 'SPAN']);
  for (const element of [...template.content.querySelectorAll('*')]) {
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      const allowedAttr = name === 'href' || name === 'title' || name === 'data-observer-mark';
      if (!allowedAttr) element.removeAttribute(attr.name);
    }
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      if (!/^(https?:|mailto:|#)/i.test(href)) element.removeAttribute('href');
      element.setAttribute('rel', 'noreferrer');
    }
  }
  return template.innerHTML;
}

function saveNote() {
  const editor = document.querySelector('[data-observer-editor]');
  if (!editor) return;
  const worldId = selectedWorldId || 'unassigned';
  const notes = readNotes();
  notes[worldId] = {
    schema: 'arcsweep.observer-rich-note/v1',
    html: sanitizeEditorHtml(editor.innerHTML),
    updated_at: new Date().toISOString(),
    authority: 'working-note-non-canon',
  };
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  notice = `Working leaf saved for ${activeWorld()?.name || 'unassigned world'}. It remains non-canon.`;
  render();
}

function applyEditorCommand(command, value = null) {
  const editor = document.querySelector('[data-observer-editor]');
  if (!editor) return;
  editor.focus();
  document.execCommand(command, false, value);
}

function markSelection(kind) {
  const selection = globalThis.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!document.querySelector('[data-observer-editor]')?.contains(range.commonAncestorContainer)) return;
  const mark = document.createElement('mark');
  mark.dataset.observerMark = kind;
  try { range.surroundContents(mark); }
  catch {
    const fragment = range.extractContents();
    mark.append(fragment);
    range.insertNode(mark);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

async function publishWitness(kind = 'manual') {
  const summary = workspaceSummary();
  const editor = document.querySelector('[data-observer-editor]');
  const noteText = editor?.innerText?.trim().slice(0, 1200) || null;
  const parentReceiptId = current.witnessHistory.at(-1)?.receipt_id || null;
  const packet = createObserverWitnessPacket({
    kind,
    worldId: summary.activeWorldId,
    semanticStatus: current.semantic,
    deepPayload: current.deep,
    narrativeState: current.narrative,
    epistemicLedger: current.ledger,
    workspace: summary,
    note: noteText,
    parentReceiptId,
  });
  const result = await publishObserverWitness(packet);
  notice = result.ok
    ? `Witness receipted ${packet.receipt_id}. Boxfire can read the shared browser lane${result.desktop?.ok ? ' and the desktop witness files' : ''}.`
    : 'Witness packet was created but no writable witness lane accepted it.';
  current.witnessHistory = await readObserverWitnessHistory({ limit: 18 });
  current.witnessStatus = await observerWitnessHostStatus();
  render();
}

function renderWitnesses() {
  const history = current.witnessHistory || [];
  if (!history.length) return '<p class="quiet">No witness receipts yet. Publish one to establish the local Boxfire trail.</p>';
  return `<div class="witness-list">${[...history].reverse().map((item) => `<article><div><b>${esc(item.kind)}</b><span>${esc(item.world_id || 'no world')}</span></div><code>${esc(item.receipt_id)}</code><small>${esc(item.created_at || '')}</small></article>`).join('')}</div>`;
}

function renderSkills() {
  const selection = skillRouter.select({
    topics: ['observer', 'evidence', 'semantics', 'narrative', 'acceptance'],
    capabilities: ['observer.status', 'observer.epistemic-ledger', 'observer.narrative-state'],
    limit: 6,
  });
  return selection.selected.map((skill) => `<article class="skill-card"><b>${esc(skill.label)}</b><span>${esc(skill.skill_id)}@${esc(skill.version)}</span><p>${esc(skill.notes || '')}</p></article>`).join('');
}

function renderEditor() {
  const note = noteForWorld();
  return `<section class="panel editor-panel">
    <div class="panel-head"><div><p class="eyebrow">Magic Book leaf</p><h2>Observer Notes</h2></div><span class="boundary">working note · non-canon</span></div>
    <div class="editor-toolbar" role="toolbar" aria-label="Rich text controls">
      <button type="button" data-editor-command="bold"><b>B</b></button>
      <button type="button" data-editor-command="italic"><i>I</i></button>
      <button type="button" data-editor-command="underline"><u>U</u></button>
      <button type="button" data-editor-command="strikeThrough"><s>S</s></button>
      <button type="button" data-editor-command="formatBlock" data-editor-value="H2">H2</button>
      <button type="button" data-editor-command="insertUnorderedList">• list</button>
      <button type="button" data-editor-command="formatBlock" data-editor-value="BLOCKQUOTE">❝</button>
      <span class="toolbar-divider"></span>
      <button type="button" data-editor-mark="evidence">Evidence</button>
      <button type="button" data-editor-mark="claim">Claim</button>
      <button type="button" data-editor-mark="hypothesis">Hypothesis</button>
      <button type="button" data-editor-mark="canon">Canon ref</button>
    </div>
    <div class="observer-editor" contenteditable="true" spellcheck="true" data-observer-editor aria-label="Observer rich text notes">${sanitizeEditorHtml(note.html || '')}</div>
    <div class="editor-foot"><small>${note.updated_at ? `Saved ${esc(note.updated_at)}` : 'Not yet saved'}</small><div><button type="button" class="secondary" data-save-note>Save leaf</button><button type="button" data-publish-witness>Save + witness</button></div></div>
  </section>`;
}

function render() {
  if (!app) return;
  const summary = workspaceSummary();
  const semantic = current.semantic || buildObserverSemanticStatus({ snapshot: null, bridgePresent: Boolean(globalThis.__arcsweepObserverBridge) });
  const dataHealth = semantic.data_health || {};
  const host = current.witnessStatus || {};
  const counts = current.ledger?.counts || {};
  const worlds = workspace?.worlds || [];
  const worldOptions = worlds.map((world) => `<option value="${esc(world.id)}" ${world.id === selectedWorldId ? 'selected' : ''}>${esc(world.name || world.id)}</option>`).join('');
  const desktopWitness = host.desktop || {};

  app.innerHTML = `<main class="observer-shell">
    <header class="observer-topbar">
      <div><p class="eyebrow">ArcSweep · Observer / DEEP / PREMAQC</p><h1>Observer Workbench</h1><p class="lede">One instrument surface for current Observer state, Project Zero-derived health semantics, ArcSweep evidence lineage, rich working notes, and Boxfire-visible local receipts.</p></div>
      <div class="topbar-actions"><label>World<select data-world-select>${worldOptions || '<option>No workspace state</option>'}</select></label><button type="button" data-refresh>Refresh</button><a class="button secondary" href="../">Back to ArcSweep</a></div>
    </header>

    ${notice ? `<div class="notice">${esc(notice)}</div>` : ''}

    <section class="truth-grid" aria-label="Observer semantic status">
      ${truthCard('Availability', semantic.availability, semantic.availability?.basis)}
      ${truthCard('Integration', semantic.integration_health, semantic.integration_health?.basis)}
      ${truthCard('Runtime', semantic.runtime_state, semantic.runtime_state?.reason)}
      ${truthCard('Data', semantic.data_health, dataHealth.generated_at || '')}
      ${truthCard('Attention capture', semantic.domain_status?.attention_capture)}
      ${truthCard('Math inspector', semantic.domain_status?.mathematics_inspector)}
    </section>

    <section class="workbench-grid">
      <section class="panel axis-panel">
        <div class="panel-head"><div><p class="eyebrow">Current projection</p><h2>PREMAQC</h2></div><span class="stamp">${esc(current.deep?.generated_at || 'no current projection')}</span></div>
        <div class="axis-stack">${renderAxes()}</div>
        <div class="mini-stats"><span><b>${summary.feedbackCycleCount}</b> feedback cycles</span><span><b>${summary.deepTimeRecordCount}</b> DEEPTime records</span><span><b>${esc(current.deep?.schema || current.deep?.version || '—')}</b> projection schema</span></div>
      </section>

      <section class="panel ledger-panel">
        <div class="panel-head"><div><p class="eyebrow">Scientific spine</p><h2>Epistemic Ledger</h2></div><span class="boundary">unknown stays unknown</span></div>
        <div class="ledger-counts"><span><b>${counts.entries || 0}</b> entries</span><span><b>${counts.evidence || 0}</b> evidence</span><span><b>${counts.claims || 0}</b> claims</span><span><b>${counts.transformations || 0}</b> transforms</span><span><b>${counts.mechanism_edges || 0}</b> mechanism edges</span></div>
        ${renderMechanisms()}
      </section>

      ${renderEditor()}

      <section class="panel witness-panel">
        <div class="panel-head"><div><p class="eyebrow">Local QA lane</p><h2>Boxfire Witness</h2></div><span class="host-pill ${desktop?.runtime?.desktop ? 'desktop' : 'web'}">${desktop?.runtime?.desktop ? 'desktop + browser' : 'browser'}</span></div>
        <p class="quiet">Every published packet is witness-only. It carries status, current projection, ledger counts, world context, and a receipt lineage. It does not grant authority or commit canon.</p>
        <div class="witness-status">
          <span><b>Broadcast</b>${host.broadcast_channel_available ? 'available' : 'unavailable'}</span>
          <span><b>Browser mirror</b>${host.local_storage_available ? 'available' : 'unavailable'}</span>
          <span><b>Desktop file</b>${desktopWitness.ok ? 'available' : 'not attached'}</span>
        </div>
        ${desktopWitness.latestFile ? `<details><summary>Desktop witness paths</summary><code>${esc(desktopWitness.latestFile)}</code><code>${esc(desktopWitness.logFile)}</code></details>` : ''}
        <div class="panel-actions"><button type="button" data-publish-witness>Publish current witness</button></div>
        ${renderWitnesses()}
      </section>

      <section class="panel narrative-panel">
        <div class="panel-head"><div><p class="eyebrow">Narrative state</p><h2>Claims ≠ Evidence</h2></div><span class="boundary">${esc(current.narrative?.status || 'absent')}</span></div>
        <div class="ledger-counts"><span><b>${current.narrative?.claims?.length || 0}</b> claims</span><span><b>${current.narrative?.evidence?.length || 0}</b> evidence</span><span><b>${current.narrative?.objections?.length || 0}</b> objections</span><span><b>${current.narrative?.risks?.length || 0}</b> risks</span><span><b>${current.narrative?.research_gaps?.length || 0}</b> gaps</span></div>
        <p class="quiet">Narrative interpretation remains downstream of sourced observation. Visualisation and prose do not become evidence merely by appearing here.</p>
      </section>

      <section class="panel skill-panel">
        <div class="panel-head"><div><p class="eyebrow">Selective procedural context</p><h2>Loaded Skill Candidates</h2></div><span class="boundary">bounded selection</span></div>
        <div class="skill-list">${renderSkills()}</div>
      </section>

      <section class="panel raw-panel">
        <div class="panel-head"><div><p class="eyebrow">Inspection hatch</p><h2>Source & Provenance</h2></div><span class="stamp">${esc(summary.worldName)}</span></div>
        <details><summary>Observer semantic status</summary><pre>${esc(JSON.stringify(current.semantic, null, 2))}</pre></details>
        <details><summary>DEEP projection</summary><pre>${esc(JSON.stringify(current.deep, null, 2))}</pre></details>
        <details><summary>Epistemic ledger</summary><pre>${esc(JSON.stringify(current.ledger, null, 2))}</pre></details>
      </section>
    </section>
  </main>`;

  wireUi();
}

function wireUi() {
  document.querySelector('[data-refresh]')?.addEventListener('click', () => void refresh());
  document.querySelector('[data-world-select]')?.addEventListener('change', (event) => {
    selectedWorldId = event.target.value;
    render();
  });
  document.querySelectorAll('[data-publish-witness]').forEach((button) => button.addEventListener('click', () => void publishWitness('manual')));
  document.querySelector('[data-save-note]')?.addEventListener('click', saveNote);
  document.querySelectorAll('[data-editor-command]').forEach((button) => button.addEventListener('click', () => applyEditorCommand(button.dataset.editorCommand, button.dataset.editorValue || null)));
  document.querySelectorAll('[data-editor-mark]').forEach((button) => button.addEventListener('click', () => markSelection(button.dataset.editorMark)));
}

function installWorkbenchApi() {
  globalThis.__arcsweepObserverWorkbench = Object.freeze({
    schema: 'arcsweep.observer-workbench/v1',
    refresh,
    snapshot: () => clone({
      world: workspaceSummary(),
      observer: current.semantic,
      deep: current.deep,
      narrative: current.narrative,
      epistemic: current.ledger,
      witness: current.witnessStatus,
    }),
    publishWitness: (kind = 'external-request') => publishWitness(kind),
    witnessHistory: () => readObserverWitnessHistory({ limit: 96 }),
  });
}

stopWitnessSubscription = subscribeObserverWitness((packet) => {
  if (!packet?.receipt_id || current.witnessHistory.some((item) => item.receipt_id === packet.receipt_id)) return;
  current.witnessHistory = [...current.witnessHistory, packet].slice(-18);
  render();
});

window.addEventListener('beforeunload', () => stopWitnessSubscription?.(), { once: true });
installWorkbenchApi();
void refresh();
