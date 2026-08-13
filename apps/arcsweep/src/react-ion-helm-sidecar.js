import { loadState } from './storage.js';
import {
  createAskPacket,
  diagnosticAcknowledgement,
} from './bifrost-protocol-stack.js';
import {
  chooseProjectionRoute,
  classifyProjectionState,
  compileNavigationRequest,
} from './react-ion-engine.js';
import {
  buildProjectionEdge,
  createReactionDeepTimeReceipt,
  createReactionEndpoint,
  createRunaHarmonicSignature,
  evaluateContinuityGate,
} from './react-ion-bridge.js';
import {
  compileReactionRegistry,
  findApprovedWorldDestination,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';
import { inspectProjectionRoutes } from './react-ion-route-inspector.js';

const STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
const REGISTRY_STORE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
let mounting = false;
let fallback = { version: 1, receipts: [] };

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && Array.isArray(parsed.receipts)) return parsed;
  } catch {}
  return structuredClone(fallback);
}

function writeStore(store) {
  fallback = structuredClone(store);
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function readRegistryRuntime() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(REGISTRY_STORE_KEY) || 'null');
    return compileReactionRegistry(normaliseReactionRegistryStore(parsed));
  } catch {
    return compileReactionRegistry(normaliseReactionRegistryStore(null));
  }
}

async function activeContext() {
  const state = await loadState();
  const world = state.worlds?.find((item) => item.id === state.activeWorldId) || state.worlds?.[0] || null;
  const premaqc = world ? state.premaqcByWorld?.[world.id] || null : null;
  return { state, world, premaqc };
}

function numberOrNull(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) throw new Error(`Expected a finite number, received ${trimmed}.`);
  return number;
}

function parseJacobian(value) {
  const rows = String(value ?? '').trim().split(';').map((row) => row.trim()).filter(Boolean);
  if (!rows.length) throw new Error('Instrument Bay Jacobian is required.');
  const matrix = rows.map((row) => row.split(',').map((part) => Number(part.trim())));
  if (!matrix.every((row) => row.length === matrix[0].length && row.every(Number.isFinite))) {
    throw new Error('Jacobian must be a rectangular matrix such as 1,0;0,1.');
  }
  return matrix;
}

function signature(worldId, rootHz, phase, label) {
  if (rootHz == null) return null;
  return createRunaHarmonicSignature({
    worldId,
    rootHz,
    phase,
    sourceRef: `react-ion-helm:${label}`,
    profileVersion: 'helm-v0.1',
    evidenceClass: 'symbolic',
  });
}

function latestReceipt(store, worldId) {
  return [...store.receipts].reverse().find((item) => item.world_id === worldId) || null;
}

function routeSummary(route) {
  if (!route) return 'vetoed / unreachable';
  return `${route.hop_count} hop${route.hop_count === 1 ? '' : 's'} · cost ${Number(route.total_cost).toFixed(3)}`;
}

function renderReceipt(receipt) {
  if (!receipt) return '<p class="muted">No Helm compilation has been receipted for this world yet.</p>';
  const route = receipt.route;
  const state = receipt.projection_state;
  const diagnostic = receipt.diagnostic?.code === 'ACK-THPPPT'
    ? '<span class="reaction-cat" aria-label="Bill the Cat diagnostic">🐈 ACK-THPPPT</span>'
    : `<span>${esc(receipt.diagnostic?.code || 'ACK')}</span>`;
  const alternatives = receipt.route_inspection?.alternatives || [];
  const path = route?.path?.join(' → ') || 'No admitted path';
  return `<div class="reaction-helm-receipt">
    <div class="reaction-status"><b>${esc(state.state)}</b> · ${diagnostic}</div>
    <p>${esc(receipt.ask.intention)}</p>
    <dl class="facts"><div><dt>From</dt><dd>${esc(receipt.source.name)}<br><span class="muted">${esc(receipt.source.address)}</span></dd></div><div><dt>To</dt><dd>${esc(receipt.target.name)}<br><span class="muted">${esc(receipt.target.address)}</span></dd></div><div><dt>Cusp</dt><dd>${Number(state.cusp_score).toFixed(3)}</dd></div><div><dt>Continuity</dt><dd>${Number(state.continuity).toFixed(3)}</dd></div><div><dt>Harmonic mismatch</dt><dd>${Number(state.harmonic_mismatch).toFixed(3)}</dd></div><div><dt>Route</dt><dd>${esc(routeSummary(route))}</dd></div></dl>
    <p class="muted"><b>Path:</b> ${esc(path)}${alternatives.length ? ` · ${alternatives.length} alternate${alternatives.length === 1 ? '' : 's'} retained` : ''}</p>
    ${receipt.deep_time ? `<p class="muted"><b>DEEPTime:</b> ${esc(receipt.deep_time.receipt_id)} · λ ${esc(receipt.deep_time.lambda)}</p>` : '<p class="muted">No receipted PREMAQC state was available, so this Helm receipt did not emit a DEEPTime extension.</p>'}
    ${alternatives.length ? `<details><summary>Alternate routes</summary><ol>${alternatives.map((candidate) => `<li>${esc(candidate.path.join(' → '))} · cost ${Number(candidate.total_cost).toFixed(3)}</li>`).join('')}</ol></details>` : ''}
    <details><summary>Receipt / Instrument Bay output</summary><pre>${esc(JSON.stringify(receipt, null, 2))}</pre></details>
  </div>`;
}

function render(world, store, message = '') {
  const latest = latestReceipt(store, world.id);
  const runtime = readRegistryRuntime();
  const worldDestination = findApprovedWorldDestination(runtime, world.id);
  const dnsNames = runtime.registry.names();
  const sourceDefault = worldDestination?.name || `${world.name} · present frame`;
  return `<section class="panel reaction-helm-panel" data-reaction-helm>
    <div class="section-heading compact-heading"><div><p class="eyebrow">React-ion Engine · Living Interface</p><h2>Helm</h2><p class="muted">Ask simply. Approved DNS names, route corridors, provenance, continuity vetoes and harmonic comparisons stay under the floorboards until you open the Instrument Bay.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <datalist id="reaction-dns-names">${dnsNames.map((name) => `<option value="${esc(name)}"></option>`).join('')}</datalist>
    <form data-reaction-helm-form class="stack">
      <div class="grid two compact-grid"><label>Where are we?<input name="sourceName" list="reaction-dns-names" value="${esc(sourceDefault)}" required /></label><label>Where are we going?<input name="targetName" list="reaction-dns-names" placeholder="templehouse.hearthweave.terra" required /></label></div>
      <label>What do you notice?<textarea name="notice" rows="2" placeholder="Observation only. What is present before the Ask?"></textarea></label>
      <label>What are you asking?<textarea name="ask" rows="2" required placeholder="State the Ask without declaring the answer."></textarea></label>
      <label>What transformation do you intend?<textarea name="transformation" rows="2" required placeholder="Describe the requested change."></textarea></label>
      <label>What must remain unchanged?<input name="preserve" value="identity, continuity, agency, causal-history" /></label>
      <details class="reaction-instrument-bay"><summary>Instrument Bay</summary>
        <p class="muted">When an approved DNS name resolves, its registered address and Runa signature win. These fields remain the manual fallback and direct-route candidate.</p>
        <div class="grid two compact-grid"><label>Source address<input name="sourceAddress" value="1.1.1.1" required /></label><label>Target address<input name="targetAddress" placeholder="137.42.219.88@220:φ=1.724" required /></label></div>
        <div class="grid two compact-grid"><label>Target world ID<input name="targetWorldId" value="${esc(world.id)}" /></label><label>Target world name<input name="targetWorldName" value="${esc(world.name)}" /></label></div>
        <div class="grid four compact-grid"><label>Source Runa Hz<input name="sourceHz" type="number" min="0.001" step="0.001" /></label><label>Source phase φ<input name="sourcePhase" type="number" step="0.001" /></label><label>Target Runa Hz<input name="targetHz" type="number" min="0.001" step="0.001" /></label><label>Target phase φ<input name="targetPhase" type="number" step="0.001" /></label></div>
        <div class="grid three compact-grid"><label>Identity continuity<input name="identityScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Thread continuity<input name="continuityScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Agency continuity<input name="agencyScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label></div>
        <label>Direct-route Jacobian<textarea name="jacobian" rows="2">1,0;0,1</textarea></label>
        <label class="checkbox"><input name="allowDirect" type="checkbox" checked /> Allow a direct candidate in addition to approved registry corridors.</label>
      </details>
      <div class="grid two compact-grid"><label>Sender<input name="sender" value="Rowan" required /></label><label>TTL<input name="ttl" type="number" min="1" max="64" value="8" /></label></div>
      <label class="checkbox"><input name="authorised" type="checkbox" /> Authorise this Ask packet and route compilation. Unauthorised packets may be drafted, but no route is compiled.</label>
      <button type="submit">Compile Helm Receipt</button>
    </form>
    ${dnsNames.length ? `<p class="muted">DNS online · ${runtime.destinations.length} approved destination${runtime.destinations.length === 1 ? '' : 's'} · ${runtime.corridors.length} directed corridor${runtime.corridors.length === 1 ? '' : 's'}.</p>` : '<p class="muted">DNS has no approved destinations yet. Manual Instrument Bay addressing remains available.</p>'}
    ${renderReceipt(latest)}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-helm-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-helm-style';
  style.textContent = `.reaction-helm-panel{margin-top:1rem}.reaction-instrument-bay{padding:.8rem;border:1px solid color-mix(in srgb,var(--gold) 26%,transparent);border-radius:12px}.reaction-instrument-bay>summary{cursor:pointer;font-weight:700}.reaction-helm-receipt{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 34%,transparent);border-radius:14px}.reaction-status{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap}.reaction-cat{display:inline-flex;gap:.3rem;align-items:center}.reaction-helm-receipt pre{max-height:32rem;overflow:auto;white-space:pre-wrap;word-break:break-word}`;
  document.head.appendChild(style);
}

async function mount() {
  if (mounting || document.querySelector('[data-reaction-helm]')) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) return;
  mounting = true;
  try {
    const { world } = await activeContext();
    const main = document.querySelector('main.content');
    if (!world || !main || document.querySelector('[data-reaction-helm]')) return;
    injectStyle();
    main.insertAdjacentHTML('beforeend', render(world, readStore()));
  } finally { mounting = false; }
}

function addEdge(graph, from, edge) {
  graph[from] ||= [];
  graph[from].push(edge);
}

function worstRouteState(route, fallbackEdge) {
  const edges = route?.edges?.length ? route.edges : fallbackEdge ? [fallbackEdge] : [];
  if (!edges.length) {
    return Object.freeze({
      schema: 'reaction.projection-state/v1',
      state: 'CONTINUITY_UNSAFE',
      cusp_score: 1,
      continuity: 0,
      harmonic_mismatch: 1,
      thresholds: Object.freeze({ cusp: 0.85, continuity: 0.8, harmonic: 0.35 }),
    });
  }
  const cuspEdge = [...edges].sort((left, right) => Number(right.jacobian_risk) - Number(left.jacobian_risk))[0];
  const audit = cuspEdge.diagnostics?.jacobian;
  const continuity = Math.min(...edges.map((edge) => Number(edge.diagnostics?.continuity?.minimum_score ?? (1 - Number(edge.continuity_risk || 0)))));
  const harmonic = Math.max(...edges.map((edge) => Number(edge.harmonic_mismatch || 0)));
  return classifyProjectionState({
    sigmaMin: Number(audit?.sigma_min ?? Math.max(0, 1 - Number(cuspEdge.jacobian_risk || 0))),
    sigmaMax: Number(audit?.sigma_max ?? 1),
    continuity,
    harmonicMismatch: harmonic,
  });
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-reaction-helm-form]');
  if (!form) return;
  event.preventDefault();
  const panel = form.closest('[data-reaction-helm]');
  try {
    const { world, premaqc } = await activeContext();
    if (!world) throw new Error('No active world is available.');
    const data = new FormData(form);
    const authorised = form.elements.authorised.checked;
    const runtime = readRegistryRuntime();
    const sourceName = String(data.get('sourceName') || '').trim();
    const targetName = String(data.get('targetName') || '').trim();
    const registeredSource = runtime.registry.resolve(sourceName)?.endpoint || findApprovedWorldDestination(runtime, world.id);
    const registeredTarget = runtime.registry.resolve(targetName)?.endpoint || null;

    const sourceHz = numberOrNull(data.get('sourceHz'));
    const targetHz = numberOrNull(data.get('targetHz'));
    const sourcePhase = numberOrNull(data.get('sourcePhase'));
    const targetPhase = numberOrNull(data.get('targetPhase'));
    const targetWorld = registeredTarget?.world || {
      id: String(data.get('targetWorldId') || world.id).trim(),
      name: String(data.get('targetWorldName') || world.name).trim(),
    };
    const source = registeredSource || createReactionEndpoint({
      name: sourceName,
      world: { id: world.id, name: world.name },
      address: data.get('sourceAddress'),
      harmonic: signature(world.id, sourceHz, sourcePhase, 'source'),
      provenance: { source: 'react-ion-helm', notice: String(data.get('notice') || '').trim() || null },
    });
    const target = registeredTarget || createReactionEndpoint({
      name: targetName,
      world: targetWorld,
      address: data.get('targetAddress'),
      harmonic: signature(targetWorld.id, targetHz, targetPhase, 'target'),
      provenance: { source: 'react-ion-helm' },
    });

    const preserve = String(data.get('preserve') || '').split(',').map((item) => item.trim()).filter(Boolean);
    const operatorGate = evaluateContinuityGate({
      required: ['identity', 'continuity', 'agency'],
      scores: {
        identity: Number(data.get('identityScore')),
        continuity: Number(data.get('continuityScore')),
        agency: Number(data.get('agencyScore')),
      },
      vetoes: authorised ? [] : ['ask-not-authorised'],
    });
    const directEdge = buildProjectionEdge({
      from: source,
      to: target,
      jacobian: parseJacobian(data.get('jacobian')),
      continuity: operatorGate,
    });
    const navigation = await compileNavigationRequest({
      source: source.address,
      target: target.address,
      intention: data.get('ask'),
      preserve,
    });

    const graph = Object.fromEntries(Object.entries(runtime.graph).map(([key, edges]) => [key, [...edges]]));
    if (authorised && form.elements.allowDirect.checked && !directEdge.blocked) addEdge(graph, navigation.source, directEdge);

    let route = null;
    let inspection = null;
    let routeError = null;
    if (authorised) {
      try {
        inspection = await inspectProjectionRoutes({ request: navigation, graph, limit: 5, maximumHops: 8 });
        route = await chooseProjectionRoute({ request: navigation, graph, maximumHops: 32 });
      } catch (error) {
        routeError = error.message;
      }
    } else {
      routeError = 'ask-not-authorised';
    }

    const packet = await createAskPacket({
      sender: data.get('sender'),
      target: targetName,
      world: targetWorld.name,
      intention: data.get('ask'),
      transformation: data.get('transformation'),
      constraints: { preserve },
      consent: { required: true, granted: authorised, revocable: true, scope: 'this Helm compilation' },
      evidence: String(data.get('notice') || '').trim() ? [{ class: 'observed', source: 'operator-notice', value: String(data.get('notice')).trim(), confidence: 1 }] : [],
      ttl: Number(data.get('ttl')),
    });

    const projectionState = worstRouteState(route, directEdge);
    const diagnostic = diagnosticAcknowledgement({
      reason: route ? 'helm route received' : routeError || operatorGate.blocked_by.join(', '),
      recoverable: Boolean(route && source.address_text === target.address_text),
      loopback: Boolean(route && source.address_text === target.address_text),
    });

    let deepTime = null;
    if (route && premaqc) {
      const now = new Date();
      deepTime = await createReactionDeepTimeReceipt({
        sequenceId: `reaction-${navigation.request_id}`,
        sequenceRevision: 1,
        lambda: 0,
        utc: now.toISOString(),
        julianDate: now.getTime() / 86_400_000 + 2_440_587.5,
        julianTimeScale: 'UTC',
        premaqc,
        observationRunId: premaqc.receipt_id,
        acceptanceMaskId: 'reaction.continuity-gate/v1',
        acceptanceMaskVersion: '1',
        navigationRequest: navigation,
        route,
        askPacket: packet,
        dataQuality: 1,
        missing: [!source.harmonic ? 'source-harmonic-profile' : null, !target.harmonic ? 'target-harmonic-profile' : null].filter(Boolean),
      });
    }

    const receipt = {
      schema: 'reaction.helm-receipt/v1',
      created_at: new Date().toISOString(),
      world_id: world.id,
      source: { name: source.name, address: source.address_text, registration_id: source.provenance?.registration_id || null },
      target: { name: target.name, address: target.address_text, registration_id: target.provenance?.registration_id || null },
      notice: String(data.get('notice') || '').trim() || null,
      ask: packet,
      navigation,
      direct_edge: directEdge,
      registry: {
        source_resolved: Boolean(registeredSource),
        target_resolved: Boolean(registeredTarget),
        approved_destinations: runtime.destinations.length,
        compiled_corridors: runtime.corridors.length,
        diagnostics: structuredClone(runtime.diagnostics),
      },
      route,
      route_error: routeError,
      route_inspection: inspection,
      projection_state: projectionState,
      deep_time: deepTime,
      diagnostic,
      authority: {
        route_compiled: Boolean(route),
        ask_authorised: authorised,
        operator_continuity_gate_admitted: operatorGate.admitted,
        physical_travel_claimed: false,
      },
    };
    const store = readStore();
    store.receipts.push(structuredClone(receipt));
    if (store.receipts.length > 40) store.receipts.splice(0, store.receipts.length - 40);
    writeStore(store);
    panel.outerHTML = render(world, store, route
      ? `Helm compiled ${route.route_id}. ${inspection?.alternatives?.length || 0} alternate route${inspection?.alternatives?.length === 1 ? '' : 's'} retained. ACK means received, not fulfilled.`
      : `No route compiled: ${routeError || operatorGate.blocked_by.join(', ')}.`);
  } catch (error) {
    const output = panel.querySelector('.callout') || document.createElement('p');
    output.className = 'callout';
    output.textContent = `Helm stopped: ${error.message}`;
    if (!output.parentElement) panel.prepend(output);
  }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
