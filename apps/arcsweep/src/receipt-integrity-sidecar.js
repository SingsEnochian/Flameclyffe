import { loadState, persistObservatoryStore } from './storage.js';
import { buildExtendedArcsweepProvenanceGraph } from './receipt-provenance-extension.js';
import { verifyProvenanceGraph } from './receipt-integrity.js';

const TRANSFORMATION_KEY = 'hearthgate.arcsweep.transformation-requests.v1';
const MAX_REPORTS = 24;
let mounting = false;
let report = null;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readTransformations(state) {
  if (state.transformationRequests?.byWorld) return state.transformationRequests;
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(TRANSFORMATION_KEY) || 'null');
    return parsed?.byWorld ? parsed : { version: 1, byWorld: {} };
  } catch { return { version: 1, byWorld: {} }; }
}

async function graphContext() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  if (!world) return null;
  const graph = buildExtendedArcsweepProvenanceGraph({
    worldId: world.id,
    transformations: readTransformations(state),
    feedbackCycles: state.feedbackCycles || [],
    feedbackQueue: state.feedbackQueue || null,
    observatory: state.observatory || null,
  });
  const storedReports = (state.observatory?.integrity_reports || []).filter((item) => item.world_id === world.id);
  return { state, world, graph, storedReports };
}

function statusForGraph(graph) {
  if (report) return report.status;
  if (graph.summary.collision_count) return 'CONFLICT';
  if (graph.summary.unresolved_edge_count) return 'INCOMPLETE';
  return 'READY';
}

function checkMarkup(value) {
  if (!value) return '';
  const checks = value.checks || [];
  return `<details class="integrity-checks"><summary>${checks.length} receipt checks · ${value.counts.verified} verified · ${value.counts.unverifiable} structurally linked but not hash-verifiable · ${value.counts.mismatch} mismatch</summary><div class="integrity-grid">${checks.map((item) => `<article data-status="${esc(item.status)}"><span>${esc(item.status)}</span><strong>${esc(item.kind)} · ${esc(item.id)}</strong><small>${esc(item.reason)}</small>${item.expected_fingerprint ? `<code>expected ${esc(item.expected_fingerprint.slice(0, 16))}…</code>` : ''}${item.actual_fingerprint ? `<code>actual ${esc(item.actual_fingerprint.slice(0, 16))}…</code>` : ''}</article>`).join('')}</div></details>`;
}

function unresolvedMarkup(graph) {
  if (!graph.unresolved_edges?.length && !graph.collisions?.length) return '<p class="muted">No unresolved receipt references or identifier collisions are visible in the current structural graph.</p>';
  return `<details class="integrity-structure"><summary>Structural findings · ${graph.unresolved_edges?.length || 0} unresolved · ${graph.collisions?.length || 0} collisions</summary>${(graph.unresolved_edges || []).map((item) => `<p><b>Unresolved:</b> ${esc(item.from)} → ${esc(item.to)} · ${esc(item.relation)} · missing ${esc(item.missing.join(', '))}</p>`).join('')}${(graph.collisions || []).map((item) => `<p><b>Collision:</b> ${esc(item.id)} · ${esc(item.existing_kind)} / ${esc(item.incoming_kind)}</p>`).join('')}</details>`;
}

function render(context, message = '') {
  const status = statusForGraph(context.graph);
  const current = report || context.storedReports.at(-1) || null;
  const key = `${context.world.id}:${context.graph.summary.node_count}:${context.graph.summary.edge_count}:${context.graph.summary.unresolved_edge_count}:${context.graph.summary.collision_count}:${current?.report_id || 'none'}:${context.storedReports.length}`;
  return `<section class="panel receipt-integrity" data-receipt-integrity data-integrity-key="${esc(key)}"><div class="section-heading compact-heading"><div><p class="eyebrow">The receipts should survive being questioned</p><h2>Receipt Integrity Gate</h2><p class="muted">Recompute deterministic hashes across the extended Ask → Runa renderer chain where each receipt contract permits it, and report unresolved joins or collisions without repairing history behind your back. Verification runs are themselves fingerprinted receipts.</p></div><span class="bai-topology-badge" data-state="${esc(status)}">${esc(status)}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}<dl class="facts"><div><dt>Nodes</dt><dd>${context.graph.summary.node_count}</dd></div><div><dt>Links</dt><dd>${context.graph.summary.edge_count}</dd></div><div><dt>Unresolved</dt><dd>${context.graph.summary.unresolved_edge_count}</dd></div><div><dt>Collisions</dt><dd>${context.graph.summary.collision_count}</dd></div><div><dt>Verification receipts</dt><dd>${context.storedReports.length}</dd></div><div><dt>Hash replay</dt><dd>${current ? `${current.counts.verified} verified / ${current.counts.mismatch} mismatch` : 'not run'}</dd></div><div><dt>External truth</dt><dd>not claimed</dd></div>${current ? `<div><dt>Report</dt><dd>${esc(current.report_id)}</dd></div>` : ''}</dl><div class="button-row"><button type="button" data-integrity-action="verify">Verify & receipt current chain</button><button type="button" class="quiet" data-integrity-action="clear" ${current ? '' : 'disabled'}>Hide verification detail</button></div>${unresolvedMarkup(context.graph)}${checkMarkup(current)}</section>`;
}

function injectStyle() {
  if (document.querySelector('#receipt-integrity-style')) return;
  const style = document.createElement('style');
  style.id = 'receipt-integrity-style';
  style.textContent = `.receipt-integrity{margin-top:1rem}.integrity-checks,.integrity-structure{margin-top:.8rem;padding:.65rem .75rem;border:1px solid color-mix(in srgb,var(--gold) 18%,transparent);border-radius:10px}.integrity-checks summary,.integrity-structure summary{cursor:pointer;font-weight:700}.integrity-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.45rem;margin-top:.65rem}.integrity-grid article{display:flex;flex-direction:column;gap:.2rem;padding:.65rem .7rem;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);border-radius:9px}.integrity-grid article>span{font-size:.7rem;letter-spacing:.07em}.integrity-grid article[data-status="MISMATCH"]{border-color:currentColor}.integrity-grid code{font-size:.68rem;overflow:hidden;text-overflow:ellipsis}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-receipt-integrity]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const context = await graphContext();
    if (!context) return;
    const existing = document.querySelector('[data-receipt-integrity]');
    const html = render(context, message);
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

document.addEventListener('click', async (event) => {
  const verify = event.target.closest('[data-integrity-action="verify"]');
  if (verify) {
    try {
      const context = await graphContext();
      if (!context) throw new Error('No active world is available.');
      report = await verifyProvenanceGraph(context.graph);
      const observatory = structuredClone(context.state.observatory || {});
      const reports = (observatory.integrity_reports || []).filter((item) => item.report_id !== report.report_id);
      observatory.integrity_reports = [...reports, structuredClone(report)].slice(-MAX_REPORTS);
      await persistObservatoryStore(observatory, {
        reason: 'receipt-integrity-verification',
        reportId: report.report_id,
        reportFingerprint: report.report_fingerprint,
      });
      await mount(`Integrity replay receipted as ${report.report_id} · ${report.status}. A hash match verifies receipt integrity, not external truth.`);
    } catch (error) { await mount(`Integrity replay stopped: ${error.message}`); }
    return;
  }
  const clear = event.target.closest('[data-integrity-action="clear"]');
  if (!clear) return;
  report = null;
  const context = await graphContext();
  if (context?.storedReports.length) {
    const panel = document.querySelector('[data-receipt-integrity]');
    if (panel) panel.outerHTML = render({ ...context, storedReports: [] });
    return;
  }
  await mount();
});

globalThis.addEventListener?.('arcsweep:receipts-updated', () => {
  report = null;
  void mount();
});

const observer = new MutationObserver(() => { if (!document.querySelector('[data-receipt-integrity]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
