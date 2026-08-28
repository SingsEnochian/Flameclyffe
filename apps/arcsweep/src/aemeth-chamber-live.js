import { AEMETH_DIAGRAM_ATLAS, AEMETH_RITUAL_PHASES } from './aemeth-lens.js';
import { invokeOxAlphaPortable } from './aemeth-oxalpha-transport.js';
import { renderSigillumDeiAemethSvg, SIGILLUM_DEI_AEMETH_WITNESS } from './aemeth-seal-vectors.js';
import { readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

export const AEMETH_LIVE_DECORATOR_VERSION = 'aemeth-chamber-live/v4';

export function aemethRecordFromForm(form) {
  if (!form) return {};
  const values = Object.fromEntries(new FormData(form).entries());
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? '')]));
}

export function aemethStageStateFromRecord(record = {}) {
  return Object.freeze({
    instrument: record.instrumentProfile || 'Aemeth Lens v1 · digital chamber',
    phase: record.phase || 'Preparation',
    diagram: record.activeDiagram || 'Sigillum Dei Aemeth',
    gaze: record.gazeMode || 'Soft focus through',
    ask: record.ask || 'No Ask entered yet.',
    observer: record.observerRole || 'Observer',
    orientation: record.orientation || 'eye → sphere → embedded sigillum → depth',
  });
}

export function formatAemethModelWitness(receipt) {
  const provenance = [receipt.provider, receipt.model, receipt.executionPath].filter(Boolean).join(' · ');
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
  const houseToken = await resolveHouseToken();
  const record = aemethRecordFromForm(form);
  const receipt = await invokeOxAlphaPortable({
    record,
    houseToken,
    houseFetchImpl: fetchImpl,
    edgeFetchImpl: fetchImpl,
  });
  const log = form.querySelector('[name="modelWitnessLog"]');
  if (!log) throw new Error('Aemeth model witness lane is unavailable.');
  log.value = appendAemethModelWitness(log.value, receipt);
  log.dispatchEvent(new Event('input', { bubbles: true }));
  log.dispatchEvent(new Event('change', { bubbles: true }));
  return receipt;
}

function fieldLabel(form, name) {
  return form.querySelector(`[name="${name}"]`)?.closest('label') || null;
}

function moveFields(form, names, target) {
  for (const name of names) {
    const label = fieldLabel(form, name);
    if (label) target.append(label);
  }
}

function chamberPanel(title, eyebrow, className = '') {
  const section = document.createElement('section');
  section.className = `panel aemeth-field-panel ${className}`.trim();
  section.innerHTML = `<div class="aemeth-panel-heading"><p class="eyebrow">${eyebrow}</p><h3>${title}</h3></div>`;
  return section;
}

function stageMarkup() {
  const atlas = AEMETH_DIAGRAM_ATLAS.map((diagram) => `
    <button type="button" class="aemeth-atlas-item" data-aemeth-diagram="${diagram.label}" title="${diagram.family} · ${diagram.versionPolicy}">
      <span>${diagram.label}</span><small>${diagram.family}</small>
    </button>`).join('');
  const phases = AEMETH_RITUAL_PHASES.map((phase) => `<button type="button" class="aemeth-phase" data-aemeth-phase="${phase}">${phase}</button>`).join('');
  return `
    <section class="aemeth-chamber-stage" data-aemeth-stage>
      <header class="aemeth-stage-heading">
        <div><p class="eyebrow">Observer instrument · Aemeth Chamber</p><h2 data-aemeth-stage-title>Aemeth Shewstone</h2></div>
        <button type="button" class="quiet" data-aemeth-focus>Soft-focus chamber</button>
      </header>
      <div class="aemeth-stage-grid">
        <div class="aemeth-optic-column">
          <div class="aemeth-optic-field" aria-label="Digital shewstone stage">
            <div class="aemeth-axis aemeth-axis-horizontal" aria-hidden="true"></div>
            <div class="aemeth-axis aemeth-axis-vertical" aria-hidden="true"></div>
            <div class="aemeth-shewstone" aria-hidden="true">
              <div class="aemeth-shewstone-glint"></div>
              <div class="aemeth-seal-plane" data-aemeth-seal-plane>${renderSigillumDeiAemethSvg()}</div>
            </div>
            <div class="aemeth-optic-caption">
              <strong data-aemeth-diagram-label>Sigillum Dei Aemeth</strong>
              <span data-aemeth-vector-state>${SIGILLUM_DEI_AEMETH_WITNESS.source} · ${SIGILLUM_DEI_AEMETH_WITNESS.geometryVersion} · lettering pending</span>
            </div>
          </div>
          <div class="aemeth-readout">
            <div><small>Instrument</small><strong data-aemeth-instrument></strong></div>
            <div><small>Gaze</small><strong data-aemeth-gaze></strong></div>
            <div><small>Observer</small><strong data-aemeth-observer></strong></div>
            <div class="aemeth-readout-wide"><small>Axis / orientation</small><strong data-aemeth-orientation></strong></div>
          </div>
          <div class="aemeth-ask"><small>Current Ask</small><p data-aemeth-ask></p></div>
          <div class="aemeth-phase-rail" aria-label="Ritual phase">${phases}</div>
        </div>
        <aside class="aemeth-atlas" aria-label="Enochian Seal Atlas">
          <div class="aemeth-panel-heading"><p class="eyebrow">Source-versioned geometry</p><h3>Seal Atlas</h3></div>
          <p class="muted">Selecting a diagram changes the chamber state. Historical variants remain separate witnesses; this rail does not flatten them into canon.</p>
          <div class="aemeth-atlas-list">${atlas}</div>
        </aside>
      </div>
    </section>`;
}

function syncStageFromForm(form, root = form.closest('[data-aemeth-chamber-root]') || document) {
  const state = aemethStageStateFromRecord(aemethRecordFromForm(form));
  const set = (selector, value) => { const node = root.querySelector(selector); if (node) node.textContent = value; };
  set('[data-aemeth-instrument]', state.instrument);
  set('[data-aemeth-gaze]', state.gaze);
  set('[data-aemeth-observer]', state.observer);
  set('[data-aemeth-orientation]', state.orientation);
  set('[data-aemeth-ask]', state.ask);
  set('[data-aemeth-diagram-label]', state.diagram);
  const sigillumActive = state.diagram === 'Sigillum Dei Aemeth';
  root.querySelector('[data-aemeth-seal-plane]')?.classList.toggle('aemeth-seal-inactive', !sigillumActive);
  set('[data-aemeth-vector-state]', sigillumActive
    ? `${SIGILLUM_DEI_AEMETH_WITNESS.source} · ${SIGILLUM_DEI_AEMETH_WITNESS.geometryVersion} · lettering pending`
    : 'vector witness not yet compiled for this diagram');
  root.querySelectorAll('[data-aemeth-phase]').forEach((node) => node.classList.toggle('active', node.dataset.aemethPhase === state.phase));
  root.querySelectorAll('[data-aemeth-diagram]').forEach((node) => node.classList.toggle('active', node.dataset.aemethDiagram === state.diagram));
  return state;
}

function installStageControls(form, root) {
  root.querySelectorAll('[data-aemeth-diagram]').forEach((button) => button.addEventListener('click', () => {
    const select = form.querySelector('[name="activeDiagram"]');
    if (!select) return;
    select.value = button.dataset.aemethDiagram;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }));
  root.querySelectorAll('[data-aemeth-phase]').forEach((button) => button.addEventListener('click', () => {
    const select = form.querySelector('[name="phase"]');
    if (!select) return;
    select.value = button.dataset.aemethPhase;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }));
  root.querySelector('[data-aemeth-focus]')?.addEventListener('click', () => {
    const select = form.querySelector('[name="gazeMode"]');
    if (select) {
      select.value = 'Soft focus through';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    root.classList.toggle('aemeth-soft-focus');
  });
  form.addEventListener('input', () => syncStageFromForm(form, root));
  form.addEventListener('change', () => syncStageFromForm(form, root));
}

function composeAemethFieldPanels(form) {
  if (form.querySelector('[data-aemeth-field-grid]')) return;
  const grid = document.createElement('div');
  grid.className = 'aemeth-field-grid';
  grid.dataset.aemethFieldGrid = 'true';

  const setup = chamberPanel('Orientation', 'Departure / configuration', 'aemeth-setup-panel');
  moveFields(form, ['title', 'status', 'instrumentProfile', 'phase', 'ask', 'observerRole', 'orientation', 'gazeMode'], setup);

  const transformation = chamberPanel('Transformation', 'Diagram / Call / state', 'aemeth-transformation-panel');
  moveFields(form, ['activeDiagram', 'activeCall', 'departurePremaqc', 'chamberConfiguration', 'transformationNotes', 'runaReceipt'], transformation);

  const witness = chamberPanel('Clean Witness', 'Firsthand lane · interpretation locked away', 'aemeth-witness-panel');
  moveFields(form, ['witnessRaw', 'witnessTimestampNotes'], witness);

  const model = chamberPanel('Model Witness', 'Separate invited participant lane', 'aemeth-model-panel');
  moveFields(form, ['modelParticipant', 'modelWitnessLog'], model);

  const interpretation = chamberPanel('Interpretation & Replay', 'After witness / provenance', 'aemeth-interpretation-panel');
  moveFields(form, ['interpretation', 'sourceRefs', 'replayFingerprint', 'canonBoundary', 'notes'], interpretation);

  grid.append(setup, transformation, witness, model, interpretation);
  const firstLabel = form.querySelector('label');
  if (firstLabel) firstLabel.before(grid); else form.prepend(grid);
}

function decorateAemethForm(form) {
  if (!form || form.dataset.aemethLiveDecorator === AEMETH_LIVE_DECORATOR_VERSION) return;
  form.dataset.aemethLiveDecorator = AEMETH_LIVE_DECORATOR_VERSION;
  const log = form.querySelector('[name="modelWitnessLog"]');
  if (!log) return;

  const article = form.closest('article.panel') || form.parentElement;
  const root = article?.closest('.split-layout') || article || form;
  root.dataset.aemethChamberRoot = 'true';
  root.classList.add('aemeth-chamber-root');
  article?.classList.add('aemeth-chamber-editor');
  form.classList.add('aemeth-chamber-form');

  if (!article?.querySelector('[data-aemeth-stage]')) article?.insertAdjacentHTML('afterbegin', stageMarkup());
  composeAemethFieldPanels(form);

  const panel = document.createElement('section');
  panel.className = 'panel aemeth-oa-panel';
  panel.dataset.aemethOaPanel = 'true';
  panel.innerHTML = `
    <div class="section-heading compact-heading">
      <div>
        <p class="eyebrow">Live model witness · separate lane</p>
        <h3>Ox Alpha · OA</h3>
      </div>
      <span class="muted">Hugging Face · GLM-5.3-Flash</span>
    </div>
    <p class="muted">OA receives the chamber configuration and Rowan-authored witness as a structured packet. OA's reply is stored as model interpretation; it never replaces firsthand witness or infers Qualia.</p>
    <div class="button-row">
      <button type="button" data-aemeth-invite-oa>Invite OA into this chamber state</button>
      <span class="muted" data-aemeth-oa-status data-state="idle">Uses the House route when present, with the signed-in Flameclyffe relay as a host-neutral fallback.</span>
    </div>`;
  const modelPanel = form.querySelector('.aemeth-model-panel');
  modelPanel?.insertAdjacentElement('afterbegin', panel);

  panel.querySelector('[data-aemeth-invite-oa]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    setStatus(panel, 'OA is reading the chamber packet…', 'working');
    try {
      const receipt = await inviteOxAlphaFromAemethForm(form);
      setStatus(panel, `${receipt.displayName} replied · ${receipt.provider} · ${receipt.model} · ${receipt.executionPath || receipt.route}. Saving receipt…`, 'success');
      const submitter = form.querySelector('button[type="submit"]');
      if (submitter) form.requestSubmit(submitter);
    } catch (error) {
      setStatus(panel, `OA invitation stopped: ${error.message}`, 'error');
      button.disabled = false;
    }
  });

  installStageControls(form, root);
  syncStageFromForm(form, root);
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
