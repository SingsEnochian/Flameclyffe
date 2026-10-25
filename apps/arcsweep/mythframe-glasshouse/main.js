import {
  SYNTHETIC_GLASSHOUSE_EXAMPLE,
  analyseMythframeCollision,
  createMythframePacket,
  createSharedMythframeProposal,
} from '../src/mythframe-sandbox.js';

const $ = (selector) => document.querySelector(selector);
const leftInput = $('#left-packet');
const rightInput = $('#right-packet');
const status = $('#status');
const exportButton = $('#export');
let latest = null;

function pretty(value) { return JSON.stringify(value, null, 2); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function card(title, body, tone = '') {
  return `<div class="card ${tone}"><b>${escapeHtml(title)}</b><div>${escapeHtml(body)}</div></div>`;
}
function fill(id, cards) {
  const node = $(id);
  node.classList.toggle('empty', !cards.length);
  node.innerHTML = cards.length ? cards.join('') : 'None in this simulation.';
}
function metric(label, value) {
  return `<div class="metric"><b>${value}</b><span>${escapeHtml(label)}</span></div>`;
}
function reset() {
  leftInput.value = pretty(SYNTHETIC_GLASSHOUSE_EXAMPLE.left);
  rightInput.value = pretty(SYNTHETIC_GLASSHOUSE_EXAMPLE.right);
  $('#summary').innerHTML = '';
  for (const id of ['#shared','#distinct','#sigils','#routes']) {
    const node = $(id);
    node.textContent = 'No simulation yet.';
    node.classList.add('empty');
  }
  status.textContent = 'Synthetic examples loaded. Edit freely; nothing persists.';
  latest = null;
  exportButton.disabled = true;
}
function analyse() {
  try {
    const left = createMythframePacket(JSON.parse(leftInput.value));
    const right = createMythframePacket(JSON.parse(rightInput.value));
    const analysis = analyseMythframeCollision(left, right);
    const proposal = createSharedMythframeProposal({
      left, right, analysis,
      proposalId: `glasshouse-${left.packetId}-${right.packetId}`,
    });
    latest = { generatedAt: new Date().toISOString(), left, right, analysis, proposal };

    $('#summary').innerHTML = [
      metric('shared-term collisions', analysis.lexicalCollisions.length),
      metric('explicit tensions', analysis.claimCollisions.filter((x) => x.status === 'explicit-tension').length),
      metric('shared-boundary candidates', analysis.sharedBoundaryCandidates.length),
      metric('sigil rhymes', analysis.sigilRhymes.length),
    ].join('');

    fill('#shared', analysis.sharedBoundaryCandidates.map((item) =>
      card(item.bridgeKey, `${item.left.statement} ↔ ${item.right.statement}`, 'violet')));
    fill('#distinct', [
      ...analysis.lexicalCollisions.map((item) => card(item.label, `${item.left.definition} | ${item.right.definition}`, 'warning')),
      ...analysis.claimCollisions.map((item) => card(item.topic, `${pretty(item.left.value)} | ${pretty(item.right.value)}`, 'warning')),
      ...analysis.unresolvedBridgeAssertions.map((item) => card(item.bridgeKey, 'Source assertion remains unresolved.', 'warning')),
    ]);
    fill('#sigils', analysis.sigilRhymes.map((item) =>
      card(`${item.left.id} ↔ ${item.right.id}`, `Shared descriptors: ${item.sharedDescriptors.join(', ')}. Meaning remains source-owned.`)));
    fill('#routes', analysis.routes.map((route) => card(route.label, route.purpose)));

    status.textContent = 'Simulation complete. Candidate shared material is still proposal-only and cannot self-promote.';
    exportButton.disabled = false;
  } catch (error) {
    latest = null;
    exportButton.disabled = true;
    status.textContent = `Simulation stopped: ${error.message}`;
  }
}
function exportReceipt() {
  if (!latest) return;
  const blob = new Blob([pretty(latest)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'mythframe-glasshouse-proposal.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

$('#analyse').addEventListener('click', analyse);
$('#export').addEventListener('click', exportReceipt);
$('#reset').addEventListener('click', reset);
reset();
