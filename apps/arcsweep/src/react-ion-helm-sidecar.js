import { loadState } from './storage.js';
import {
  appendReactionHelmReceipt,
  ensureReactionState,
  migrateLegacyReactionSidecars,
  persistReactionState,
  setReactionRegistry,
} from './react-ion-state.js';
import {
  compileReactionRegistry,
  createCorridorRegistration,
  createDestinationRegistration,
} from './react-ion-registry.js';
import { compileHelmReceipt } from './react-ion-helm.js';
import { buildReactionRouteMap } from './react-ion-route-map.js';

let mounting = false;
let submitting = false;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function activeSurface() {
  const active = document.querySelector('.nav-button.active[data-room]');
  const room = active?.dataset.room || null;
  return ['feedback', 'deep-observer'].includes(room) ? room : null;
}

function activeWorld(state) {
  return state.worlds?.find((world) => world.id === state.activeWorldId) || state.worlds?.[0] || null;
}

async function context() {
  const state = await loadState();
  const reaction = ensureReactionState(state);
  const migration = migrateLegacyReactionSidecars(state);
  if (migration.receipt) {
    await persistReactionState(reaction, {
      reason: 'react-ion-legacy-sidecar-migration',
      migration_receipt: migration.receipt,
    });
  }
  const world = activeWorld(state);
  const premaqc = world ? state.premaqcByWorld?.[world.id] || null : null;
  return { state, reaction, world, premaqc };
}

function runtimeFor(reaction) {
  return compileReactionRegistry(reaction?.registry);
}

function upsertBy(list, key, value) {
  const next = Array.isArray(list) ? structuredClone(list) : [];
  const index = next.findIndex((item) => item?.[key] === value?.[key]);
  if (index >= 0) next[index] = structuredClone(value);
  else next.push(structuredClone(value));
  return next;
}

function routeSummary(route) {
  if (!route) return 'No admitted route';
  return `${route.hop_count} hop${route.hop_count === 1 ? '' : 's'} · cost ${Number(route.total_cost).toFixed(3)}`;
}

function renderMap(model) {
  if (!model?.nodes?.length) return '';
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const edges = model.edges.map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return '';
    const classes = ['reaction-map-edge'];
    if (edge.active) classes.push('active');
    else if (edge.candidate_rank != null) classes.push('candidate');
    if (edge.blocked) classes.push('blocked');
    const title = `${edge.from} → ${edge.to}; Jacobian risk ${edge.jacobian_risk.toFixed(3)}; harmonic mismatch ${edge.harmonic_mismatch.toFixed(3)}; continuity risk ${edge.continuity_risk.toFixed(3)}`;
    return `<line class="${classes.join(' ')}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"><title>${esc(title)}</title></line>`;
  }).join('');
  const nodes = model.nodes.map((node) => {
    const classes = ['reaction-map-node'];
    if (node.active) classes.push('active');
    if (node.source) classes.push('source');
    if (node.target) classes.push('target');
    const label = node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label;
    return `<g class="${classes.join(' ')}" transform="translate(${node.x} ${node.y})"><circle r="10"><title>${esc(node.label)} · ${esc(node.address)}</title></circle><text y="-16" text-anchor="middle">${esc(label)}</text></g>`;
  }).join('');
  return `<section class="reaction-route-map">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Instrument Bay · projection topology</p><h3>Route Map</h3></div></div>
    <svg viewBox="0 0 ${model.width} ${model.height}" role="img" aria-label="React-ion projection route map">${edges}${nodes}</svg>
    <p class="muted">Selected route · retained alternates · approved corridors · continuity-vetoed corridors. Interface geometry only, not physical spacetime cartography.</p>
  </section>`;
}

function renderTransport(transport) {
  if (!transport) return '<p class="muted">No transport trace exists because no route was compiled.</p>';
  const hops = transport.hops?.map((hop) => `<li><code>${esc(hop.address)}</code> · ${esc(hop.code)} · TTL ${esc(hop.ttl_before)} → ${esc(hop.ttl_after)}</li>`).join('') || '';
  return `<details><summary>Flight recorder · ${transport.delivered ? 'endpoint received packet' : 'packet expired'}</summary>
    <ol>${hops}</ol>
    <p class="muted"><b>${esc(transport.final_code)}</b> · transport delivery is not fulfilment.</p>
  </details>`;
}

function renderReceipt(receipt, runtime) {
  if (!receipt) return '<p class="muted">No Helm compilation has been receipted yet.</p>';
  let map = null;
  try {
    map = buildReactionRouteMap({
      runtime,
      route: receipt.route,
      inspection: receipt.route_inspection,
      directEdge: receipt.direct_edge,
    });
  } catch {}
  const alternatives = receipt.route_inspection?.alternatives || receipt.route_inspection?.candidates?.slice(1) || [];
  return `<div class="reaction-helm-receipt">
    <div class="reaction-status"><b>${esc(receipt.projection_state?.state || 'UNCLASSIFIED')}</b><span>${esc(receipt.diagnostic?.code || 'ACK')}</span></div>
    <p>${esc(receipt.ask?.intention || '')}</p>
    <dl class="facts">
      <div><dt>From</dt><dd>${esc(receipt.source?.name)}<br><span class="muted">${esc(receipt.source?.address)}</span></dd></div>
      <div><dt>To</dt><dd>${esc(receipt.target?.name)}<br><span class="muted">${esc(receipt.target?.address)}</span></dd></div>
      <div><dt>Route</dt><dd>${esc(routeSummary(receipt.route))}</dd></div>
      <div><dt>Cusp</dt><dd>${Number(receipt.projection_state?.cusp_score ?? 1).toFixed(3)}</dd></div>
      <div><dt>Continuity</dt><dd>${Number(receipt.projection_state?.continuity ?? 0).toFixed(3)}</dd></div>
      <div><dt>Harmonic mismatch</dt><dd>${Number(receipt.projection_state?.harmonic_mismatch ?? 1).toFixed(3)}</dd></div>
    </dl>
    ${receipt.graph_snapshot ? `<p class="muted"><b>Graph snapshot:</b> ${esc(receipt.graph_snapshot.snapshot_id)} · ${esc(receipt.graph_snapshot.node_count)} nodes · ${esc(receipt.graph_snapshot.edge_count)} edges</p>` : ''}
    ${receipt.deep_time ? `<p class="muted"><b>DEEPTime:</b> ${esc(receipt.deep_time.receipt_id)} · λ ${esc(receipt.deep_time.lambda)}</p>` : '<p class="muted">No DEEPTime extension was emitted for this compilation.</p>'}
    ${alternatives.length ? `<details><summary>Retained alternates · ${alternatives.length}</summary><ol>${alternatives.map((candidate) => `<li>${esc((candidate.path || []).join(' → '))} · cost ${Number(candidate.total_cost || 0).toFixed(3)}</li>`).join('')}</ol></details>` : ''}
    ${renderTransport(receipt.transport)}
    ${renderMap(map)}
    <details><summary>Full Helm receipt</summary><pre>${esc(JSON.stringify(receipt, null, 2))}</pre></details>
    <p class="muted"><b>Authority:</b> ACK means received, not fulfilled. Ask acceptance is not observed transformation. No physical travel is claimed by this instrument.</p>
  </div>`;
}

function renderRegistry(reaction, runtime, world) {
  const store = reaction.registry;
  const destinations = store.destinations || [];
  const corridors = store.corridors || [];
  return `<details class="reaction-registry" open>
    <summary><b>Registry & corridors</b> · ${runtime.destinations.length} approved destinations · ${runtime.corridors.length} compiled directed corridors</summary>
    ${runtime.diagnostics.length ? `<div class="callout"><b>Registry diagnostics</b><ul>${runtime.diagnostics.map((item) => `<li>${esc(item.message)}</li>`).join('')}</ul></div>` : ''}
    <div class="grid two reaction-registry-grid">
      <form data-reaction-destination-form class="stack panel inset-panel">
        <h3>Destination</h3>
        <label>Registration ID<input name="id" placeholder="terra-aeterna" required /></label>
        <label>DNS name<input name="name" placeholder="templehouse.hearthweave.terra" required /></label>
        <label>Aliases<input name="aliases" placeholder="terra.templehouse, home.terra" /></label>
        <div class="grid two compact-grid"><label>Kind<select name="kind"><option>world</option><option>place</option><option>anchor</option><option>gate</option><option>manual</option></select></label><label>State<select name="state"><option>draft</option><option>approved</option><option>deprecated</option></select></label></div>
        <div class="grid two compact-grid"><label>World ID<input name="worldId" value="${esc(world.id)}" required /></label><label>World name<input name="worldName" value="${esc(world.name)}" required /></label></div>
        <label>Dimensional address<input name="address" placeholder="137.42.219.88@220:φ=1.724" required /></label>
        <div class="grid two compact-grid"><label>Runa root Hz<input name="rootHz" type="number" min="0.001" step="0.001" /></label><label>Phase φ<input name="phase" type="number" step="0.001" /></label></div>
        <label>Notes<textarea name="notes" rows="2"></textarea></label>
        <button type="submit">Save destination</button>
      </form>
      <form data-reaction-corridor-form class="stack panel inset-panel">
        <h3>Corridor</h3>
        <label>Corridor ID<input name="id" placeholder="terra-to-templehouse" required /></label>
        <div class="grid two compact-grid"><label>From DNS<input name="from" required /></label><label>To DNS<input name="to" required /></label></div>
        <label>Jacobian<textarea name="jacobian" rows="2">1,0;0,1</textarea></label>
        <div class="grid four compact-grid"><label>Identity<input name="identity" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Continuity<input name="continuity" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Agency<input name="agency" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Floor<input name="floor" type="number" min="0" max="1" step="0.01" value="0.8" /></label></div>
        <div class="grid two compact-grid"><label>State<select name="state"><option>draft</option><option>approved</option><option>deprecated</option></select></label><label class="checkbox"><input name="bidirectional" type="checkbox" /> Bidirectional</label></div>
        <label>Vetoes<input name="vetoes" placeholder="optional, comma-separated" /></label>
        <button type="submit">Save corridor</button>
      </form>
    </div>
    <details><summary>Stored registrations · ${destinations.length} destinations · ${corridors.length} corridors</summary>
      <div class="reaction-registration-list">
        ${destinations.map((item) => `<article><b>${esc(item.name)}</b> · ${esc(item.state)}<br><code>${esc(item.address)}</code><br><small>${esc(item.registration_id)}</small></article>`).join('') || '<p class="muted">No destinations stored.</p>'}
        ${corridors.map((item) => `<article><b>${esc(item.from)} → ${esc(item.to)}</b> · ${esc(item.state)}${item.bidirectional ? ' · ↔' : ''}<br><small>${esc(item.corridor_id)}</small></article>`).join('') || ''}
      </div>
    </details>
  </details>`;
}

function renderHelm(reaction, runtime, world) {
  const latest = [...(reaction.helm?.receipts || [])].reverse().find((item) => item.world_id === world.id) || reaction.helm?.receipts?.at(-1) || null;
  const names = runtime.registry.names();
  const sourceDefault = runtime.destinations.find((endpoint) => endpoint.world.id === world.id)?.name || `${world.name} · present frame`;
  return `<section class="panel reaction-helm-panel" data-reaction-helm>
    <div class="section-heading compact-heading"><div><p class="eyebrow">React-ion Engine · Hearthfire</p><h2>Helm</h2><p class="muted">Ask, route, observe, receipt. Registry truth, continuity vetoes, graph snapshots and transport traces share one Hearthfire state.</p></div></div>
    <datalist id="reaction-dns-names">${names.map((name) => `<option value="${esc(name)}"></option>`).join('')}</datalist>
    <form data-reaction-helm-form class="stack">
      <div class="grid two compact-grid"><label>Where are we?<input name="sourceName" list="reaction-dns-names" value="${esc(sourceDefault)}" required /></label><label>Where are we going?<input name="targetName" list="reaction-dns-names" required /></label></div>
      <label>What do you notice?<textarea name="notice" rows="2" placeholder="Observation only. What is present before the Ask?"></textarea></label>
      <label>What are you asking?<textarea name="ask" rows="2" required></textarea></label>
      <label>What transformation do you intend?<textarea name="transformation" rows="2" required></textarea></label>
      <label>What must remain unchanged?<input name="preserve" value="identity, continuity, agency, causal-history" /></label>
      <details class="reaction-instrument-bay"><summary>Instrument Bay</summary>
        <p class="muted">Approved DNS registrations win when they resolve. These fields are the manual fallback and direct-route candidate.</p>
        <div class="grid two compact-grid"><label>Source address<input name="sourceAddress" value="1.1.1.1@220" /></label><label>Target address<input name="targetAddress" placeholder="137.42.219.88@220:φ=1.724" /></label></div>
        <div class="grid two compact-grid"><label>Target world ID<input name="targetWorldId" value="${esc(world.id)}" /></label><label>Target world name<input name="targetWorldName" value="${esc(world.name)}" /></label></div>
        <div class="grid four compact-grid"><label>Source Runa Hz<input name="sourceHz" type="number" min="0.001" step="0.001" /></label><label>Source phase φ<input name="sourcePhase" type="number" step="0.001" /></label><label>Target Runa Hz<input name="targetHz" type="number" min="0.001" step="0.001" /></label><label>Target phase φ<input name="targetPhase" type="number" step="0.001" /></label></div>
        <div class="grid three compact-grid"><label>Identity continuity<input name="identityScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Thread continuity<input name="continuityScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Agency continuity<input name="agencyScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label></div>
        <label>Direct-route Jacobian<textarea name="jacobian" rows="2">1,0;0,1</textarea></label>
        <label class="checkbox"><input name="allowDirect" type="checkbox" checked /> Allow a direct candidate alongside approved corridors.</label>
      </details>
      <div class="grid two compact-grid"><label>Sender<input name="sender" value="Rowan" required /></label><label>TTL<input name="ttl" type="number" min="1" max="64" value="8" /></label></div>
      <label class="checkbox"><input name="authorised" type="checkbox" /> Authorise this Ask packet and route compilation. Unauthorised Asks may be receipted, but no route is compiled.</label>
      <button type="submit">Compile Helm receipt</button>
    </form>
    ${renderReceipt(latest, runtime)}
    ${renderRegistry(reaction, runtime, world)}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-hearthfire-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-hearthfire-style';
  style.textContent = `
    .reaction-helm-panel{margin-top:1rem}.reaction-instrument-bay,.reaction-registry{padding:.8rem;border:1px solid color-mix(in srgb,var(--gold) 26%,transparent);border-radius:12px}.reaction-instrument-bay>summary,.reaction-registry>summary{cursor:pointer}.reaction-helm-receipt{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 34%,transparent);border-radius:14px}.reaction-status{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap}.reaction-helm-receipt pre{max-height:32rem;overflow:auto;white-space:pre-wrap;word-break:break-word}.reaction-route-map{margin-top:1rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 20%,transparent)}.reaction-route-map svg{width:100%;min-height:240px;max-height:420px;overflow:visible}.reaction-map-edge{stroke:color-mix(in srgb,var(--green) 52%,transparent);stroke-width:2}.reaction-map-edge.candidate{stroke:color-mix(in srgb,var(--gold) 55%,transparent);stroke-width:2.5}.reaction-map-edge.active{stroke:var(--gold);stroke-width:4}.reaction-map-edge.blocked{stroke:color-mix(in srgb,var(--text) 35%,transparent);stroke-dasharray:8 7}.reaction-map-node circle{fill:var(--panel-solid);stroke:var(--green);stroke-width:2}.reaction-map-node.active circle{stroke:var(--gold);stroke-width:3}.reaction-map-node.source circle,.reaction-map-node.target circle{stroke-width:4}.reaction-map-node text{fill:var(--text);font-size:12px;paint-order:stroke;stroke:var(--panel-solid);stroke-width:3px;stroke-linejoin:round}.reaction-registry{margin-top:1rem}.reaction-registry-grid{margin-top:.8rem}.inset-panel{padding:.8rem;background:color-mix(in srgb,var(--panel-solid) 82%,transparent)}.reaction-registration-list{display:grid;gap:.55rem;margin-top:.6rem}.reaction-registration-list article{padding:.65rem;border:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-radius:10px}
  `;
  document.head.appendChild(style);
}

async function replacePanel(message = '') {
  const surface = activeSurface();
  const main = document.querySelector('main.content');
  if (!surface || !main) return;
  const { reaction, world } = await context();
  if (!world) return;
  const runtime = runtimeFor(reaction);
  const html = renderHelm(reaction, runtime, world);
  const existing = document.querySelector('[data-reaction-helm]');
  if (existing) existing.outerHTML = html;
  else main.insertAdjacentHTML('beforeend', html);
  if (message) {
    const panel = document.querySelector('[data-reaction-helm]');
    panel?.insertAdjacentHTML('afterbegin', `<p class="callout">${esc(message)}</p>`);
  }
}

async function mount() {
  if (mounting || !activeSurface() || document.querySelector('[data-reaction-helm]')) return;
  const main = document.querySelector('main.content');
  if (!main) return;
  mounting = true;
  try {
    injectStyle();
    await replacePanel();
  } catch (error) {
    console.warn('React-ion Helm could not mount:', error);
  } finally {
    mounting = false;
  }
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || submitting) return;
  const kind = form.matches('[data-reaction-helm-form]') ? 'helm'
    : form.matches('[data-reaction-destination-form]') ? 'destination'
      : form.matches('[data-reaction-corridor-form]') ? 'corridor'
        : null;
  if (!kind) return;
  event.preventDefault();
  submitting = true;
  try {
    const { reaction, world, premaqc } = await context();
    if (!world) throw new Error('No active world is available.');
    const values = formDataObject(form);

    if (kind === 'destination') {
      const registration = await createDestinationRegistration({
        ...values,
        aliases: values.aliases,
        rootHz: values.rootHz || null,
        phase: values.phase || null,
        updatedAt: new Date().toISOString(),
      });
      const registry = structuredClone(reaction.registry);
      registry.destinations = upsertBy(registry.destinations, 'registration_id', registration);
      setReactionRegistry({ reaction }, registry);
      reaction.registry = registry;
      await persistReactionState(reaction, { reason: 'react-ion-destination-registration' });
      await replacePanel(`Destination ${registration.name} saved as ${registration.state}.`);
      return;
    }

    if (kind === 'corridor') {
      const registration = await createCorridorRegistration({
        ...values,
        bidirectional: form.elements.bidirectional.checked,
        vetoes: values.vetoes,
        updatedAt: new Date().toISOString(),
      });
      const registry = structuredClone(reaction.registry);
      registry.corridors = upsertBy(registry.corridors, 'corridor_id', registration);
      reaction.registry = registry;
      await persistReactionState(reaction, { reason: 'react-ion-corridor-registration' });
      await replacePanel(`Corridor ${registration.corridor_id} saved as ${registration.state}.`);
      return;
    }

    const receipt = await compileHelmReceipt({
      reaction,
      world,
      premaqc,
      input: {
        ...values,
        authorised: form.elements.authorised.checked,
        allowDirect: form.elements.allowDirect.checked,
      },
      now: new Date(),
    });
    appendReactionHelmReceipt({ reaction }, receipt);
    reaction.helm.receipts = reaction.helm.receipts.slice(-40);
    await persistReactionState(reaction, { reason: 'react-ion-helm-receipt', receipt_id: receipt.navigation?.request_id || null });
    await replacePanel(receipt.route ? `Helm compiled ${receipt.route.route_id}. ACK means received, not fulfilled.` : `Ask receipted; no route compiled: ${receipt.route_error || 'gate closed'}.`);
  } catch (error) {
    await replacePanel(`Helm stopped: ${error.message}`);
  } finally {
    submitting = false;
  }
}, true);

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('arcsweep:reaction-state-updated', () => { if (activeSurface()) void replacePanel(); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
