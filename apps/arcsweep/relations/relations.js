import {
  relationalCodexIndex,
  relationalCodexProjectionPreview,
  relationalCodexSnapshot,
} from '../src/relational-codex-reader.js';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const indexNode = document.getElementById('relation-index');
const countNode = document.getElementById('relation-count');
const identityPane = document.getElementById('identity-pane');
const statePane = document.getElementById('state-pane');
const historyPane = document.getElementById('history-pane');
const projectionPane = document.getElementById('projection-pane');
const boundaryPane = document.getElementById('boundary-pane');

let activeRelationId = null;
let currentIndex = [];

function renderValue(value) {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function dispatchPreview(preview) {
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:relational-codex-preview', {
    detail: Object.freeze({
      schema: 'arcsweep.relational-codex-preview-event/v0.1',
      relation_id: preview.relation_id,
      revision: preview.revision,
      target: preview.target,
      persisted: false,
      relation_mutated: false,
      canon_promoted: false,
    }),
  }));
}

function renderIndex() {
  countNode.textContent = String(currentIndex.length);
  if (!currentIndex.length) {
    indexNode.innerHTML = '<p class="empty">No persisted relational fields yet.</p>';
    return;
  }
  indexNode.innerHTML = currentIndex.map((item) => [
    `<button type="button" data-relation-id="${esc(item.relation_id)}" ${item.relation_id === activeRelationId ? 'aria-current="true"' : ''}>`,
      `<small>rev ${esc(item.revision)} · ${esc(item.kind)}</small>`,
      `<strong>${esc(item.relation_id)}</strong>`,
    '</button>',
  ].join('')).join('');
}

function renderEmpty(status = null) {
  identityPane.innerHTML = '<p class="kicker">Identity</p><h2>No selected relation</h2><p>Create or receive a Relational Field through ArcSweep first. This reader intentionally has no create or edit controls.</p>';
  statePane.innerHTML = '<p class="kicker">State(R)</p><p class="empty">No relation state to inspect.</p>';
  historyPane.innerHTML = '<p class="kicker">History</p><p class="empty">No relation history to inspect.</p>';
  projectionPane.innerHTML = '<p class="kicker">Projection</p><p class="empty">Observer, PREMAQC, and Runa previews appear here after a relation is selected.</p>';
  boundaryPane.innerHTML = [
    '<p class="kicker">Boundary</p>',
    '<p><strong>A ≠ B ≠ R.</strong> The reader does not create, edit, delete, score, or canonise relationships.</p>',
    status ? `<p>Store: ${esc(status.persistence)} · Relations: ${esc(status.relation_count)}</p>` : '',
  ].join('');
}

function renderProjectionControls() {
  projectionPane.innerHTML = [
    '<p class="kicker">Projection</p>',
    '<h2>Read-only lenses</h2>',
    '<p>These previews derive bounded views of the selected relation. They are not persisted and never mutate State(R).</p>',
    '<div class="actions">',
      '<button type="button" data-relation-projection="observer">Observer witness</button>',
      '<button type="button" data-relation-projection="premaqc">PREMAQC, no supplied evidence</button>',
      '<button type="button" data-relation-projection="runa">Runa semantic plan</button>',
    '</div>',
    '<div class="preview" data-relation-preview><p class="empty">Choose a lens.</p></div>',
  ].join('');
}

async function renderRelation(relationId) {
  const snapshot = await relationalCodexSnapshot(relationId);
  const field = snapshot.field;
  activeRelationId = field?.relation_id || null;
  renderIndex();

  if (!field) {
    renderEmpty(snapshot.status);
    return;
  }

  identityPane.innerHTML = [
    '<p class="kicker">Identity</p>',
    `<h2>${esc(field.relation_id)}</h2>`,
    '<dl>',
      `<div><dt>Kind</dt><dd>${esc(field.kind || 'relationship')}</dd></div>`,
      `<div><dt>Participants</dt><dd>${(field.participant_ids || []).map((id) => `<code>${esc(id)}</code>`).join(' · ')}</dd></div>`,
      `<div><dt>Environment</dt><dd>${esc(field.environment_id || '—')}</dd></div>`,
      `<div><dt>Revision</dt><dd>${esc(field.revision ?? 0)}</dd></div>`,
      `<div><dt>Created</dt><dd>${esc(field.created_at || '—')}</dd></div>`,
      `<div><dt>Updated</dt><dd>${esc(field.updated_at || '—')}</dd></div>`,
    '</dl>',
  ].join('');

  const stateEntries = Object.entries(field.state || {});
  statePane.innerHTML = [
    '<p class="kicker">State(R)</p>',
    '<h2>Relationship state</h2>',
    stateEntries.length
      ? `<div class="state-grid">${stateEntries.map(([key, value]) => `<div class="state-cell"><small>${esc(key)}</small><strong>${esc(renderValue(value))}</strong></div>`).join('')}</div>`
      : '<p class="empty">The relation currently has an empty state object.</p>',
  ].join('');

  const history = Array.isArray(field.history_refs) ? field.history_refs : [];
  historyPane.innerHTML = [
    '<p class="kicker">History</p>',
    '<h2>Lineage and last event</h2>',
    `<p><strong>History refs:</strong> ${history.length ? history.map((item) => `<code>${esc(item)}</code>`).join(' · ') : 'none'}</p>`,
    field.last_event
      ? `<pre>${esc(JSON.stringify(field.last_event, null, 2))}</pre>`
      : '<p class="empty">No relation event has been applied yet.</p>',
  ].join('');

  renderProjectionControls();

  boundaryPane.innerHTML = [
    '<p class="kicker">Boundary</p>',
    '<p><strong>A ≠ B ≠ R.</strong> Participants remain independently addressable. A projection is not a participant, not the relationship itself, and not a canon mutation.</p>',
    '<p><strong>PREMAQC:</strong> no evidence is inferred from relationship prose. Unsupported axes remain unknown, and Q remains firsthand-only.</p>',
    '<p><strong>Runa:</strong> preview is semantic-only and makes no physical audio or haptic output claim.</p>',
    '<p><strong>Reader authority:</strong> read-only. No mutation controls are present.</p>',
  ].join('');
}

async function previewProjection(target) {
  if (!activeRelationId) return;
  const preview = await relationalCodexProjectionPreview(activeRelationId, target);
  const output = projectionPane.querySelector('[data-relation-preview]');
  if (!output) return;

  let summary = '';
  if (target === 'observer') {
    summary = `Witness packet, revision ${preview.revision}. Mutation authority: ${preview.projection.authority.mutates_relation ? 'yes' : 'no'}.`;
  } else if (target === 'premaqc') {
    const asserted = Object.values(preview.projection.axes || {}).filter((axis) => axis.asserted).length;
    summary = `PREMAQC projection with ${asserted} asserted axes because this reader supplied no evidence. Q firsthand-only: ${preview.projection.authority.qualia_firsthand_only ? 'yes' : 'no'}.`;
  } else {
    summary = `Runa semantic plan with ${preview.projection.active_channels.length} active channels. Physical output claimed: ${preview.projection.authority.physical_output_claim ? 'yes' : 'no'}.`;
  }

  output.innerHTML = [
    `<p><strong>${esc(target.toUpperCase())}</strong> · ${esc(summary)}</p>`,
    '<p><strong>Persisted:</strong> no · <strong>Relation mutated:</strong> no · <strong>Canon promoted:</strong> no</p>',
    `<pre>${esc(JSON.stringify(preview.projection, null, 2))}</pre>`,
  ].join('');
  dispatchPreview(preview);
}

document.addEventListener('click', (event) => {
  const relationButton = event.target.closest?.('[data-relation-id]');
  if (relationButton) {
    void renderRelation(relationButton.dataset.relationId);
    return;
  }
  const projectionButton = event.target.closest?.('[data-relation-projection]');
  if (projectionButton) void previewProjection(projectionButton.dataset.relationProjection);
});

async function boot() {
  currentIndex = await relationalCodexIndex();
  const params = new URLSearchParams(location.search);
  const requested = params.get('relation');
  const selected = requested && currentIndex.some((item) => item.relation_id === requested)
    ? requested
    : currentIndex[0]?.relation_id || null;
  if (selected) await renderRelation(selected);
  else {
    const snapshot = await relationalCodexSnapshot(null);
    renderIndex();
    renderEmpty(snapshot.status);
  }
}

void boot();
