import '../src/ancestral-reader-holography-sidecar.js';

import {
  ancestralCodexIndex,
  ancestralCodexSnapshot,
} from '../src/ancestral-codex-reader.js';
import { ANCESTRAL_PUBLIC_MANIFEST } from '../src/ancestral-corpus-seed.js';
import { buildNarrativeNodeAncestryPlan } from '../src/narrativenode-ancestry-adapter.js';

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
const projectionPane = document.getElementById('projection-pane');

let activeSelection = null;

function labelKind(kind) {
  if (kind === 'ancestral-root') return 'Root';
  if (kind === 'correspondence') return 'Correspondence';
  return 'Present system';
}

function dispatch(name, detail) {
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail }));
}

function renderIndex(activeId) {
  indexNode.innerHTML = ancestralCodexIndex().map((item) => (
    `<button type="button" data-ref="${esc(item.id)}" ${item.id === activeId ? 'aria-current="true"' : ''}>` +
      `<small>${esc(labelKind(item.kind))}</small><strong>${esc(item.label)}</strong></button>`
  )).join('');
}

function planScope(selected) {
  if (!selected) return { rootIds: [], correspondenceIds: [] };
  const correspondences = ANCESTRAL_PUBLIC_MANIFEST.correspondences || [];

  if (selected.kind === 'ancestral-root') {
    return {
      rootIds: [selected.id],
      correspondenceIds: correspondences
        .filter((entry) => (entry.source_root_ids || []).includes(selected.id))
        .map((entry) => entry.correspondence_id),
    };
  }

  if (selected.kind === 'correspondence') {
    const entry = correspondences.find((item) => item.correspondence_id === selected.id);
    return {
      rootIds: [...new Set(entry?.source_root_ids || [])],
      correspondenceIds: entry ? [entry.correspondence_id] : [],
    };
  }

  const linked = correspondences.filter((entry) => (entry.present_system_refs || []).includes(selected.id));
  return {
    rootIds: [...new Set(linked.flatMap((entry) => entry.source_root_ids || []))],
    correspondenceIds: linked.map((entry) => entry.correspondence_id),
  };
}

function renderProjection(selected) {
  if (!selected) {
    projectionPane.innerHTML = '<p class="kicker">Projection</p><p>No plan is available for an unknown node.</p>';
    return;
  }
  projectionPane.innerHTML = [
    '<p class="kicker">Projection</p>',
    '<h2>NarrativeNode bridge preview</h2>',
    '<p>Build a public-safe MCP plan for this ancestry selection. This previews the crossing only. It does not open a session or execute NarrativeNode tools.</p>',
    '<div class="ancestry-projection-actions">',
      '<button type="button" data-ancestry-plan-preview>Preview plan</button>',
      '<span><strong>External grant required:</strong> yes</span>',
    '</div>',
    '<div class="ancestry-plan-preview" data-ancestry-plan-output><p>No plan built yet.</p></div>',
  ].join('');
}

function render(startRef) {
  const snapshot = ancestralCodexSnapshot(startRef);
  const selected = snapshot.selected;
  activeSelection = selected || null;
  renderIndex(selected?.id || null);

  if (!selected) {
    sourcePane.innerHTML = '<p class="kicker">Source</p><h2>Unknown node</h2><p>No ancestry record exists for this reference.</p>';
    fingerprintPane.innerHTML = '<p class="kicker">Fingerprint</p><p>None.</p>';
    correspondencePane.innerHTML = '<p class="kicker">Correspondences</p><p>None.</p>';
    boundaryPane.innerHTML = `<p class="kicker">Boundary</p><p>${esc(snapshot.boundary)}</p>`;
    renderProjection(null);
    dispatch('arcsweep:ancestry-read', {
      schema: 'arcsweep.ancestry-read-event/v0.1',
      ref: String(startRef || ''),
      selected_kind: null,
      related_count: 0,
      manuscript_text_present: false,
    });
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

  renderProjection(selected);
  dispatch('arcsweep:ancestry-read', {
    schema: 'arcsweep.ancestry-read-event/v0.1',
    ref: selected.id,
    selected_kind: selected.kind,
    related_count: snapshot.related.length,
    manuscript_text_present: false,
  });
}

function previewPlan() {
  if (!activeSelection) return;
  const scope = planScope(activeSelection);
  const plan = buildNarrativeNodeAncestryPlan({
    manifest: ANCESTRAL_PUBLIC_MANIFEST,
    rootIds: scope.rootIds,
    correspondenceIds: scope.correspondenceIds,
  });
  const output = projectionPane.querySelector('[data-ancestry-plan-output]');
  if (output) {
    output.innerHTML = [
      '<p><strong>Plan only. Not executed.</strong></p>',
      '<dl>',
        `<div><dt>Steps</dt><dd>${esc(plan.steps.length)}</dd></div>`,
        `<div><dt>First</dt><dd><code>${esc(plan.steps[0]?.tool || 'none')}</code></dd></div>`,
        `<div><dt>Last</dt><dd><code>${esc(plan.steps.at(-1)?.tool || 'none')}</code></dd></div>`,
        `<div><dt>User grant</dt><dd>${plan.user_grant_required ? 'required' : 'not required'}</dd></div>`,
        '<div><dt>Private source refs</dt><dd>not transmitted</dd></div>',
        '<div><dt>Manuscript prose</dt><dd>not transmitted</dd></div>',
        '<div><dt>Canon promotion</dt><dd>none</dd></div>',
      '</dl>',
    ].join('');
  }

  dispatch('arcsweep:ancestry-plan', {
    schema: 'arcsweep.ancestry-plan-event/v0.1',
    plan_id: plan.plan_id,
    step_count: plan.steps.length,
    user_grant_required: plan.user_grant_required,
    manuscript_text_transmitted: false,
    private_source_ref_transmitted: false,
    canon_promoted: false,
    executed: false,
  });
}

document.addEventListener('click', (event) => {
  const planButton = event.target.closest?.('[data-ancestry-plan-preview]');
  if (planButton) {
    previewPlan();
    return;
  }
  const button = event.target.closest?.('[data-ref]');
  if (!button) return;
  render(button.dataset.ref);
});

const params = new URLSearchParams(location.search);
render(params.get('ref') || 'ancestral:amalthi-transition');
