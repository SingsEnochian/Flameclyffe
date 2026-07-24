import './styles.css';
import { buildReturnRecord, calculateDrElapsed, calculateRatio, formatDuration } from './core.js';
import { downloadState, loadState, newId, readStateFile, saveState } from './storage.js';

let state = loadState();
let activeTab = 'portal';
let selectedScriptId = state.scripts[0]?.id || null;
let returnOpen = false;
let notice = 'Arcsweep ready. Local storage only.';

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

function ratioLabel() {
  const ratio = calculateRatio(state.settings.crMinutes, state.settings.drMinutes);
  return `1 ${state.settings.crLabel} minute = ${ratio.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} ${state.settings.drLabel} minutes`;
}

function sessionTimes(now = new Date()) {
  if (!state.session.active || !state.session.startedAt) return { cr: 0, dr: 0 };
  const cr = Math.max(0, now.getTime() - new Date(state.session.startedAt).getTime());
  const dr = calculateDrElapsed(
    state.session.startedAt,
    now,
    state.settings.crMinutes,
    state.settings.drMinutes,
  );
  return { cr, dr };
}

function navButton(id, label, glyph) {
  return `<button class="nav-button ${activeTab === id ? 'active' : ''}" data-tab="${id}">
    <span aria-hidden="true">${glyph}</span><span>${label}</span>
  </button>`;
}

function renderPortal() {
  const times = sessionTimes();
  const latestReturn = state.returnHistory[0];
  return `
    <section class="hero panel">
      <p class="eyebrow">Private local continuity instrument · v${escapeHtml(state.version)}</p>
      <h1>Hearthgate: Arcsweep</h1>
      <p class="lede">Sweep an arc between intention, world design, continuity, and return. Records remain in this browser unless you export them.</p>
    </section>

    <section class="grid three">
      <article class="panel clock-card">
        <p class="eyebrow">${escapeHtml(state.settings.crLabel)}</p>
        <strong id="cr-now">${new Date().toLocaleString()}</strong>
        <span>${escapeHtml(ratioLabel())}</span>
      </article>
      <article class="panel clock-card">
        <p class="eyebrow">Current arc</p>
        <strong id="cr-elapsed">${formatDuration(times.cr)}</strong>
        <span>Waking elapsed</span>
      </article>
      <article class="panel clock-card">
        <p class="eyebrow">Projected ${escapeHtml(state.settings.drLabel)}</p>
        <strong id="dr-elapsed">${formatDuration(times.dr)}</strong>
        <span>Ratio projection</span>
      </article>
    </section>

    <section class="grid two">
      <article class="panel">
        <h2>${state.session.active ? 'Arc active' : 'Begin an arc'}</h2>
        ${state.session.active ? `
          <dl class="facts">
            <div><dt>World</dt><dd>${escapeHtml(state.session.targetWorld || state.settings.drLabel)}</dd></div>
            <div><dt>Intention</dt><dd>${escapeHtml(state.session.intention || 'Open exploration')}</dd></div>
            <div><dt>Started</dt><dd>${new Date(state.session.startedAt).toLocaleString()}</dd></div>
          </dl>
          <button class="return-button" data-action="open-return">Return · ${escapeHtml(state.settings.returnAnchor)}</button>
        ` : `
          <form id="session-form" class="stack">
            <label>Target world<input name="targetWorld" placeholder="Terra Aeterna, Luna, Dreaming Grove…" /></label>
            <label>Intention<textarea name="intention" rows="4" placeholder="What is this arc for?"></textarea></label>
            <button type="submit">Begin arc</button>
          </form>
        `}
      </article>

      <article class="panel">
        <h2>Instrument contract</h2>
        <ul class="plain-list">
          <li>Scripts and records are editable local documents.</li>
          <li>Time ratios are calculations, not measurements of another reality.</li>
          <li>The Waking Thread contains entries you or a trusted source add.</li>
          <li>The Forge turns intentions into plans, assets, and evidence logs.</li>
          <li>The Return control performs an orientation sequence and closes the active arc.</li>
        </ul>
      </article>
    </section>

    <section class="panel">
      <h2>Latest return</h2>
      ${latestReturn ? `
        <dl class="facts horizontal">
          <div><dt>Returned</dt><dd>${new Date(latestReturn.returnedAt).toLocaleString()}</dd></div>
          <div><dt>World</dt><dd>${escapeHtml(latestReturn.targetWorld)}</dd></div>
          <div><dt>Waking elapsed</dt><dd>${formatDuration(latestReturn.elapsedCr)}</dd></div>
          <div><dt>DR projection</dt><dd>${formatDuration(latestReturn.elapsedDr)}</dd></div>
        </dl>
      ` : '<p class="muted">No completed arcs yet.</p>'}
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
              <label>World<input name="world" value="${escapeHtml(selected.world)}" /></label>
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
      <div><p class="eyebrow">Manifestation translated into craft</p><h1>Forge</h1></div>
    </section>
    <section class="grid two">
      <article class="panel">
        <h2>Forge an intention</h2>
        <form id="manifestation-form" class="stack">
          <label>Desired condition<input name="intention" required placeholder="A finished dress, travel funds, a calmer room…" /></label>
          <label>Why it matters<textarea name="meaning" rows="4"></textarea></label>
          <label>Next practical action<textarea name="action" rows="4" placeholder="Sketch, budget, search materials, ask, schedule…"></textarea></label>
          <label>Evidence or symbolic markers<textarea name="markers" rows="3" placeholder="What would count as progress without forcing interpretation?"></textarea></label>
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
        <h2>Form rule</h2>
        <p>Arcsweep stores the chosen design and can later connect it to art, avatars, wardrobe catalogues, and world scripts. It does not claim to alter a body merely because a field was saved.</p>
        <p class="callout">A form may be mythic and still deserve precise specifications: movement, fatigue, hearing, vision, pain, texture, temperature, clothing, transformation controls, privacy, and return.</p>
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
          <label>DR label<input name="drLabel" value="${escapeHtml(state.settings.drLabel)}" /></label>
          <div class="grid two compact-grid">
            <label>Waking minutes<input name="crMinutes" type="number" min="0.001" step="0.001" value="${state.settings.crMinutes}" /></label>
            <label>DR minutes<input name="drMinutes" type="number" min="0.001" step="0.001" value="${state.settings.drMinutes}" /></label>
          </div>
          <p class="callout">${escapeHtml(ratioLabel())}</p>
          <label>Return anchor<input name="returnAnchor" value="${escapeHtml(state.settings.returnAnchor)}" /></label>
          <label class="checkbox"><input name="reduceMotion" type="checkbox" ${state.settings.reduceMotion ? 'checked' : ''} /> Reduce motion</label>
          <button type="submit">Save settings</button>
        </form>
      </article>
      <article class="panel stack">
        <h2>Portability</h2>
        <p>Export creates a JSON backup you control. Import replaces the current local state after validation.</p>
        <button data-action="export">Export Arcsweep JSON</button>
        <label class="file-button">Import Arcsweep JSON<input id="import-file" type="file" accept="application/json,.json" /></label>
        <hr />
        <h2>Source lineage</h2>
        <p>Arcsweep was inspired by community LIFA concepts, then rebuilt as a Hearthgate instrument with explicit local storage, provenance, consent, continuity, and honest feature boundaries.</p>
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
        <h2 id="return-title">Return to the Waking World</h2>
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

  const scriptButton = event.target.closest('[data-script-id]');
  if (scriptButton) {
    selectedScriptId = scriptButton.dataset.scriptId;
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
    state.session = { active: false, startedAt: null, targetWorld: '', intention: '' };
    returnOpen = false;
    persist('Arc closed. Orientation restored.');
  } else if (action === 'new-script') {
    const script = {
      id: newId('script'),
      name: 'Untitled DR Script',
      world: 'Unassigned',
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
    state.session = {
      active: true,
      startedAt: new Date().toISOString(),
      targetWorld: values.targetWorld.trim(),
      intention: values.intention.trim(),
    };
    persist('Arc begun. Return remains available.');
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
      crMinutes: Number(values.crMinutes) || 60,
      drMinutes: Number(values.drMinutes) || 10080,
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
