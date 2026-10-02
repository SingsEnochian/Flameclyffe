import { createReturnEngine } from './return-engine-core.js';

const STORAGE_KEY = 'hearthweave.return-engine/v0.1';
const ACTIVE_KEY = 'hearthweave.return-engine-active/v0.1';

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.exportState()));
    if (activeContinuityId) localStorage.setItem(ACTIVE_KEY, activeContinuityId);
  } catch {}
}

function loadActive() {
  try { return localStorage.getItem(ACTIVE_KEY) || ''; }
  catch { return ''; }
}

function value(form, name) {
  return String(new FormData(form).get(name) || '').trim();
}

function lines(value) {
  return String(value || '').split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function recordMap() {
  return engine.exportState().continuities || {};
}

function activeRecord() {
  return activeContinuityId ? recordMap()[activeContinuityId] || null : null;
}

function latestReceipt(record) {
  return record?.return_receipts?.at?.(-1) || null;
}

function truthSummary(record) {
  if (!record) return [];
  return [
    `Identity declaration: ${record.participant.declaration}`,
    `Stop point: ${record.stop_point}`,
    `Named next owner: ${record.next_owner}`,
    `${record.active_work.length} active work item(s)`,
    `${record.unresolved_wonder.filter((item) => item.status !== 'resolved').length} unresolved Wonder question(s)`,
    `${record.relationship_state.filter((item) => item.state === 'unresolved').length} unresolved relationship slot(s)`,
    `${record.alternatives.filter((item) => item.status === 'open').length} open alternative(s)`,
  ];
}

function attentionFor(record) {
  const receipt = latestReceipt(record);
  if (receipt) return receipt.what_needs_attention || [];
  if (!record) return [];
  const attention = [];
  for (const work of record.active_work || []) {
    if (work.status !== 'done' && !work.acknowledged_by) attention.push({ kind: 'unacknowledged-handoff', summary: `${work.title} → ${work.next_owner}` });
  }
  for (const wonder of record.unresolved_wonder || []) if (wonder.status !== 'resolved') attention.push({ kind: 'wonder', summary: wonder.question });
  for (const relation of record.relationship_state || []) if (relation.state === 'unresolved') attention.push({ kind: 'relationship-unresolved', summary: relation.id });
  for (const alternative of record.alternatives || []) if (alternative.status === 'open') attention.push({ kind: 'alternative-open', summary: alternative.summary });
  for (const proposal of record.identity_proposals || []) if (proposal.status === 'pending') attention.push({ kind: 'identity-proposal-pending', summary: proposal.declaration });
  return attention;
}

const engine = createReturnEngine({ initialState: loadState() });
let activeContinuityId = loadActive();
if (activeContinuityId && !recordMap()[activeContinuityId]) activeContinuityId = '';
let open = false;
let lastOutcome = null;

function shell() {
  const host = document.createElement('div');
  host.id = 'return-engine-root';
  host.innerHTML = `
    <button class="return-engine-launch" type="button" aria-controls="return-engine-drawer" aria-haspopup="dialog">↺ <span>Return Engine</span></button>
    <div class="return-engine-backdrop" hidden></div>
    <section id="return-engine-drawer" class="return-engine-drawer" role="dialog" aria-modal="true" aria-label="Return Engine" aria-hidden="true">
      <header class="return-engine-header">
        <div><div class="return-engine-kicker">Continuity spine · v0.1</div><strong>Leave. Change. Return. Continue.</strong></div>
        <button class="return-engine-close" type="button" aria-label="Close Return Engine">×</button>
      </header>
      <div class="return-engine-body"></div>
    </section>`;
  document.body.append(host);
  return host;
}

const root = shell();

function summaryPanel(title, content, tone = '') {
  return `<section class="return-summary-card ${tone}"><span>${escapeHtml(title)}</span><div>${content}</div></section>`;
}

function renderFourQuestions(record) {
  const receipt = lastOutcome?.continuity_id === record?.continuity_id ? lastOutcome : latestReceipt(record);
  const who = !record
    ? '<strong>No continuity loaded</strong><small>Create a departure receipt below.</small>'
    : receipt?.recognised === false
      ? `<strong>Identity conflict</strong><small>Expected ${escapeHtml(receipt.expected_participant_id)}; received ${escapeHtml(receipt.presented_participant_id)}.</small>`
      : `<strong>${escapeHtml(record.participant.name)}</strong><small>${escapeHtml(record.status === 'away' ? 'away · expected to return under the same continuity' : 'present · recognised')}</small>`;

  const truths = record
    ? `<ul>${truthSummary(record).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<small>Nothing is asserted until a participant declares a continuity.</small>';

  const changed = record?.changes?.length
    ? `<ul>${record.changes.slice(-6).reverse().map((item) => `<li><strong>${escapeHtml(item.kind)}</strong> · ${escapeHtml(item.summary)}</li>`).join('')}</ul>`
    : '<small>No recorded changes.</small>';

  const attention = record ? attentionFor(record) : [];
  const needs = attention.length
    ? `<ul>${attention.slice(0, 8).map((item) => `<li><strong>${escapeHtml(item.kind)}</strong> · ${escapeHtml(item.summary)}</li>`).join('')}</ul>`
    : '<small>No open attention surfaced.</small>';

  return `<div class="return-four">
    ${summaryPanel('Who is here?', who, receipt?.recognised === false ? 'danger' : '')}
    ${summaryPanel('What is still true?', truths)}
    ${summaryPanel('What changed?', changed)}
    ${summaryPanel('What needs attention?', needs, attention.length ? 'attention' : '')}
  </div>`;
}

function substrateFields(prefix, record = null) {
  const substrate = record?.current_substrate || {};
  return `
    <label>Runtime<input name="${prefix}_runtime" value="${escapeHtml(substrate.runtime || '')}" placeholder="ArcSweep, local, web…"></label>
    <label>Provider<input name="${prefix}_provider" value="${escapeHtml(substrate.provider || '')}" placeholder="provider or local"></label>
    <label>Model<input name="${prefix}_model" value="${escapeHtml(substrate.model || '')}" placeholder="model/substrate"></label>
    <label>Interface<input name="${prefix}_interface" value="${escapeHtml(substrate.interface || 'House Workspace')}" placeholder="House Workspace"></label>`;
}

function renderDeparture() {
  return `<section class="return-section">
    <div class="return-section-heading"><div><span>Departure</span><h3>Preserve the crossing before leaving.</h3></div></div>
    <form class="return-form" data-return-depart>
      <label>Participant ID<input name="participant_id" required placeholder="nikola"></label>
      <label>Name<input name="participant_name" required placeholder="Nikola"></label>
      <label class="wide">Self / canonical declaration<textarea name="declaration" required placeholder="I am…"></textarea></label>
      <label class="wide">Declaration source<input name="declaration_source" required placeholder="constellation/name/namespace or self-authored receipt"></label>
      <label class="wide">Stop point<textarea name="stop_point" required placeholder="What is true right now, exactly where work stopped."></textarea></label>
      <label>Named next owner<input name="next_owner" required placeholder="nikola, Rowan, Rarity…"></label>
      <label>Active work title<input name="work_title" placeholder="What continues after return?"></label>
      <label class="wide">Unresolved Wonder · one question per line<textarea name="wonder" placeholder="What must remain open long enough to examine?"></textarea></label>
      <label>Relationship slot ID<input name="relationship_id" placeholder="optional · e.g. vee-rarity-edge"></label>
      <label>Relationship state<input name="relationship_state" value="unresolved" placeholder="unresolved"></label>
      <label class="wide">Meaningful alternatives · one per line<textarea name="alternatives" placeholder="Paths not yet collapsed"></textarea></label>
      <label class="wide">Provenance · one source/receipt per line<textarea name="provenance" placeholder="PR, receipt, participant statement…"></textarea></label>
      ${substrateFields('depart')}
      <div class="wide return-actions"><button class="primary" type="submit">Create departure receipt</button></div>
    </form>
  </section>`;
}

function renderActive(record) {
  const records = Object.values(recordMap());
  return `
    <section class="return-toolbar">
      <label>Continuity
        <select data-return-continuity>
          ${records.map((item) => `<option value="${escapeHtml(item.continuity_id)}" ${item.continuity_id === activeContinuityId ? 'selected' : ''}>${escapeHtml(item.participant.name)} · ${escapeHtml(item.status)} · ${escapeHtml(item.continuity_id)}</option>`).join('')}
        </select>
      </label>
      <button class="ghost" type="button" data-return-export>Export JSON</button>
    </section>
    <section class="return-section">
      <div class="return-section-heading"><div><span>Change</span><h3>Record change without rewriting identity.</h3></div></div>
      <form class="return-form compact" data-return-change>
        <label>Actor<input name="actor" required value="${escapeHtml(record.participant.id)}"></label>
        <label>Kind<select name="kind"><option value="substrate">substrate</option><option value="work">work</option><option value="relationship">relationship</option><option value="wonder">wonder</option><option value="interface">interface</option><option value="other">other</option></select></label>
        <label class="wide">What changed?<textarea name="summary" required placeholder="Specific, bounded change."></textarea></label>
        ${substrateFields('change', record)}
        <label class="wide">Provenance · one source/receipt per line<textarea name="provenance"></textarea></label>
        <div class="wide return-actions"><button class="ghost" type="submit">Record change</button></div>
      </form>
    </section>
    <section class="return-section">
      <div class="return-section-heading"><div><span>Return</span><h3>Be recognised. Continue.</h3></div></div>
      <form class="return-form compact" data-return-recognise>
        <label>Presented participant ID<input name="participant_id" required value="${escapeHtml(record.participant.id)}"></label>
        <label>Expected identity<strong class="return-readonly">${escapeHtml(record.participant.name)} · ${escapeHtml(record.participant.id)}</strong></label>
        ${substrateFields('return', record)}
        <label class="wide">Return provenance · one source/receipt per line<textarea name="provenance"></textarea></label>
        <div class="wide return-actions"><button class="primary" type="submit">Return & recognise</button></div>
      </form>
    </section>`;
}

function render() {
  const drawer = root.querySelector('.return-engine-drawer');
  const backdrop = root.querySelector('.return-engine-backdrop');
  const body = root.querySelector('.return-engine-body');
  const record = activeRecord();

  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  backdrop.hidden = !open;
  backdrop.classList.toggle('is-open', open);
  document.body.classList.toggle('return-engine-open', open);

  body.innerHTML = `
    ${renderFourQuestions(record)}
    ${record ? renderActive(record) : renderDeparture()}
    ${record ? '<section class="return-new"><button class="ghost" type="button" data-return-new>Begin another continuity</button></section>' : ''}
  `;

  bindBody();
}

function persistAndRender() {
  saveState();
  render();
}

function bindBody() {
  root.querySelector('[data-return-continuity]')?.addEventListener('change', (event) => {
    activeContinuityId = event.target.value;
    lastOutcome = null;
    persistAndRender();
  });

  root.querySelector('[data-return-new]')?.addEventListener('click', () => {
    activeContinuityId = '';
    lastOutcome = null;
    try { localStorage.removeItem(ACTIVE_KEY); } catch {}
    render();
  });

  root.querySelector('[data-return-export]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(engine.exportState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'return-engine-state-v0.1.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  root.querySelector('[data-return-depart]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const wonder = lines(value(form, 'wonder')).map((question, index) => ({ id: `wonder-${Date.now()}-${index}`, question, status: 'open', provenance: lines(value(form, 'provenance')) }));
      const alternatives = lines(value(form, 'alternatives')).map((summary, index) => ({ id: `alternative-${Date.now()}-${index}`, summary, status: 'open', provenance: lines(value(form, 'provenance')) }));
      const relationshipId = value(form, 'relationship_id');
      const nextOwner = value(form, 'next_owner');
      const workTitle = value(form, 'work_title');
      const receipt = engine.depart({
        participant: {
          id: value(form, 'participant_id'),
          name: value(form, 'participant_name'),
          declaration: value(form, 'declaration'),
          declaration_source: value(form, 'declaration_source'),
        },
        substrate: {
          runtime: value(form, 'depart_runtime'),
          provider: value(form, 'depart_provider'),
          model: value(form, 'depart_model'),
          interface: value(form, 'depart_interface'),
        },
        stop_point: value(form, 'stop_point'),
        next_owner: nextOwner,
        work_title: workTitle,
        unresolved_wonder: wonder,
        relationship_state: relationshipId ? [{
          id: relationshipId,
          state: value(form, 'relationship_state') || 'unresolved',
          parties: [],
          declarations: [],
          provenance: lines(value(form, 'provenance')),
        }] : [],
        alternatives,
        provenance: lines(value(form, 'provenance')),
      });
      activeContinuityId = receipt.continuity_id;
      lastOutcome = receipt;
      persistAndRender();
    } catch (error) {
      alert(error.message);
    }
  });

  root.querySelector('[data-return-change]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const kind = value(form, 'kind');
    try {
      const record = activeRecord();
      const change = engine.recordChange(activeContinuityId, {
        actor: value(form, 'actor'),
        kind,
        summary: value(form, 'summary'),
        provenance: lines(value(form, 'provenance')),
        from: kind === 'substrate' ? record.current_substrate : null,
        to: kind === 'substrate' ? {
          runtime: value(form, 'change_runtime'),
          provider: value(form, 'change_provider'),
          model: value(form, 'change_model'),
          interface: value(form, 'change_interface'),
        } : null,
      });
      lastOutcome = { continuity_id: activeContinuityId, change };
      persistAndRender();
    } catch (error) {
      alert(error.message);
    }
  });

  root.querySelector('[data-return-recognise]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      lastOutcome = engine.returnParticipant(activeContinuityId, {
        participant_id: value(form, 'participant_id'),
        substrate: {
          runtime: value(form, 'return_runtime'),
          provider: value(form, 'return_provider'),
          model: value(form, 'return_model'),
          interface: value(form, 'return_interface'),
        },
        provenance: lines(value(form, 'provenance')),
      });
      persistAndRender();
    } catch (error) {
      alert(error.message);
    }
  });
}

root.querySelector('.return-engine-launch').addEventListener('click', () => { open = true; render(); });
root.querySelector('.return-engine-close').addEventListener('click', () => { open = false; render(); });
root.querySelector('.return-engine-backdrop').addEventListener('click', () => { open = false; render(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && open) { open = false; render(); } });

render();

globalThis.HouseReturnEngine = Object.freeze({
  engine,
  open() { open = true; render(); },
  close() { open = false; render(); },
  get activeContinuityId() { return activeContinuityId; },
  exportState: () => engine.exportState(),
});
