import {
  ancestralCodexIndex,
  ancestralCodexSnapshot,
} from '../src/ancestral-codex-reader.js';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const indexNode = document.getElementById('ancestral-index');
const sourcePane = document.getElementById('source-pane');
const fingerprintPane = document.getElementById('fingerprint-pane');
const correspondencePane = document.getElementById('correspondence-pane');
const boundaryPane = document.getElementById('boundary-pane');

function labelKind(kind) {
  if (kind === 'ancestral-root') return 'Root';
  if (kind === 'correspondence') return 'Correspondence';
  return 'Present system';
}

function renderIndex(activeId) {
  indexNode.innerHTML = ancestralCodexIndex().map((item) => (
    `<button type="button" data-ref="${esc(item.id)}" ${item.id === activeId ? 'aria-current="true"' : ''}>` +
      `<small>${esc(labelKind(item.kind))}</small><strong>${esc(item.label)}</strong></button>`
  )).join('');
}

function render(startRef) {
  const snapshot = ancestralCodexSnapshot(startRef);
  const selected = snapshot.selected;
  renderIndex(selected?.id || null);

  if (!selected) {
    sourcePane.innerHTML = '<p class="kicker">Source</p><h2>Unknown node</h2><p>No ancestry record exists for this reference.</p>';
    fingerprintPane.innerHTML = '<p class="kicker">Fingerprint</p><p>None.</p>';
    correspondencePane.innerHTML = '<p class="kicker">Correspondences</p><p>None.</p>';
    boundaryPane.innerHTML = `<p class="kicker">Boundary</p><p>${esc(snapshot.boundary)}</p>`;
    return;
  }

  sourcePane.innerHTML = [
    '<p class="kicker">Source</p>',
    `<h2>${esc(selected.label)}</h2>`,
    `<dl><div><dt>Kind</dt><dd>${esc(labelKind(selected.kind))}</dd></div>`,
    `<div><dt>ID</dt><dd><code>${esc(selected.id)}</code></dd></div>`,
    selected.privacy_class ? `<div><dt>Privacy</dt><dd>${esc(selected.privacy_class)}</dd></div>` : '',
    '</dl>',
  ].join('');

  const fingerprints = Array.isArray(selected.fingerprints) ? selected.fingerprints : [];
  fingerprintPane.innerHTML = [
    '<p class="kicker">Fingerprint</p>',
    fingerprints.length
      ? `<div class="chips">${fingerprints.map((item) => `<span>${esc(item)}</span>`).join('')}</div>`
      : '<p>This node is not itself an ancestral-root fingerprint.</p>',
  ].join('');

  correspondencePane.innerHTML = [
    '<p class="kicker">Correspondences</p>',
    snapshot.related.length
      ? `<div class="related">${snapshot.related.map((item) => `<button type="button" data-ref="${esc(item.id)}"><small>${esc(labelKind(item.kind))}</small><strong>${esc(item.label)}</strong></button>`).join('')}</div>`
      : '<p>No directly adjacent lineage records.</p>',
  ].join('');

  boundaryPane.innerHTML = [
    '<p class="kicker">Boundary</p>',
    `<p>${esc(snapshot.boundary)}</p>`,
    '<p><strong>Public-source-text present:</strong> no · <strong>Canon merge authority:</strong> no</p>',
  ].join('');
}

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-ref]');
  if (!button) return;
  render(button.dataset.ref);
});

const params = new URLSearchParams(location.search);
render(params.get('ref') || 'ancestral:amalthi-transition');
