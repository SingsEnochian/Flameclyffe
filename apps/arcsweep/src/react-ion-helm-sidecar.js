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
  createReactionEndpoint,
  createRunaHarmonicSignature,
  evaluateContinuityGate,
} from './react-ion-bridge.js';

const STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
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

async function activeWorld() {
  const state = await loadState();
  return state.worlds?.find((item) => item.id === state.activeWorldId) || state.worlds?.[0] || null;
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

function renderReceipt(receipt) {
  if (!receipt) return '<p class="muted">No Helm compilation has been receipted for this world yet.</p>';
  const route = receipt.route;
  const state = receipt.projection_state;
  const diagnostic = receipt.diagnostic?.code === 'ACK-THPPPT'
    ? '<span class="reaction-cat" aria-label="Bill the Cat diagnostic">🐈 ACK-THPPPT</span>'
    : `<span>${esc(receipt.diagnostic?.code || 'ACK')}</span>`;
  return `<div class="reaction-helm-receipt">
    <div class="reaction-status"><b>${esc(state.state)}</b> · ${diagnostic}</div>
    <p>${esc(receipt.ask.intention)}</p>
    <dl class="facts"><div><dt>From</dt><dd>${esc(receipt.source.name)}<br><span class="muted">${esc(receipt.source.address)}</span></dd></div><div><dt>To</dt><dd>${esc(receipt.target.name)}<br><span class="muted">${esc(receipt.target.address)}</span></dd></div><div><dt>Cusp</dt><dd>${Number(state.cusp_score).toFixed(3)}</dd></div><div><dt>Continuity</dt><dd>${Number(state.continuity).toFixed(3)}</dd></div><div><dt>Harmonic mismatch</dt><dd>${Number(state.harmonic_mismatch).toFixed(3)}</dd></div><div><dt>Route</dt><dd>${route ? `${route.hop_count} hop · cost ${Number(route.total_cost).toFixed(3)}` : 'vetoed'}</dd></div></dl>
    <details><summary>Receipt / Instrument Bay output</summary><pre>${esc(JSON.stringify(receipt, null, 2))}</pre></details>
  </div>`;
}

function render(world, store, message = '') {
  const latest = latestReceipt(store, world.id);
  return `<section class="panel reaction-helm-panel" data-reaction-helm>
    <div class="section-heading compact-heading"><div><p class="eyebrow">React-ion Engine · Living Interface</p><h2>Helm</h2><p class="muted">Ask simply. The geometry, provenance, routing cost, continuity veto and harmonic comparison stay under the floorboards until you open the Instrument Bay.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <form data-reaction-helm-form class="stack">
      <div class="grid two compact-grid"><label>Where are we?<input name="sourceName" value="${esc(world.name)} · present frame" required /></label><label>Where are we going?<input name="targetName" placeholder="Templehouse, Hearthweave, Terra Aeterna" required /></label></div>
      <label>What do you notice?<textarea name="notice" rows="2" placeholder="Observation only. What is present before the Ask?"></textarea></label>
      <label>What are you asking?<textarea name="ask" rows="2" required placeholder="State the Ask without declaring the answer."></textarea></label>
      <label>What transformation do you intend?<textarea name="transformation" rows="2" required placeholder="Describe the requested change."></textarea></label>
      <label>What must remain unchanged?<input name="preserve" value="identity, continuity, agency, causal-history" /></label>
      <details class="reaction-instrument-bay"><summary>Instrument Bay</summary>
        <div class="grid two compact-grid"><label>Source address<input name="sourceAddress" value="1.1.1.1" required /></label><label>Target address<input name="targetAddress" placeholder="137.42.219.88@220:φ=1.724" required /></label></div>
        <div class="grid two compact-grid"><label>Target world ID<input name="targetWorldId" value="${esc(world.id)}" /></label><label>Target world name<input name="targetWorldName" value="${esc(world.name)}" /></label></div>
        <div class="grid four compact-grid"><label>Source Runa Hz<input name="sourceHz" type="number" min="0.001" step="0.001" /></label><label>Source phase φ<input name="sourcePhase" type="number" step="0.001" /></label><label>Target Runa Hz<input name="targetHz" type="number" min="0.001" step="0.001" /></label><label>Target phase φ<input name="targetPhase" type="number" step="0.001" /></label></div>
        <div class="grid three compact-grid"><label>Identity continuity<input name="identityScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Thread continuity<input name="continuityScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label><label>Agency continuity<input name="agencyScore" type="number" min="0" max="1" step="0.01" value="0.95" /></label></div>
        <label>Navigation Jacobian<textarea name="jacobian" rows="2">1,0;0,1</textarea></label>
      </details>
      <div class="grid two compact-grid"><label>Sender<input name="sender" value="Rowan" required /></label><label>TTL<input name="ttl" type="number" min="1" max="64" value="8" /></label></div>
      <label class="checkbox"><input name="authorised" type="checkbox" /> Authorise this Ask packet and route compilation. Unauthorised packets may be drafted, but the Continuity Gate vetoes travel.</label>
      <button type="submit">Compile Helm Receipt</button>
    </form>
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
    const world = await activeWorld();
    const main = document.querySelector('main.content');
    if (!world || !main || document.querySelector('[data-reaction-helm]')) return;
    injectStyle();
    main.insertAdjacentHTML('beforeend', render(world, readStore()));
  } finally { mounting = false; }
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-reaction-helm-form]');
  if (!form) return;
  event.preventDefault();
  const panel = form.closest('[data-reaction-helm]');
  try {
    const world = await activeWorld();
    if (!world) throw new Error('No active world is available.');
    const data = new FormData(form);
    const authorised = form.elements.authorised.checked;
    const sourceHz = numberOrNull(data.get('sourceHz'));
    const targetHz = numberOrNull(data.get('targetHz'));
    const sourcePhase = numberOrNull(data.get('sourcePhase'));
    const targetPhase = numberOrNull(data.get('targetPhase'));
    const targetWorld = {
      id: String(data.get('targetWorldId') || world.id).trim(),
      name: String(data.get('targetWorldName') || world.name).trim(),
    };
    const source = createReactionEndpoint({
      name: data.get('sourceName'),
      world: { id: world.id, name: world.name },
      address: data.get('sourceAddress'),
      harmonic: signature(world.id, sourceHz, sourcePhase, 'source'),
      provenance: { source: 'react-ion-helm', notice: String(data.get('notice') || '').trim() || null },
    });
    const target = createReactionEndpoint({
      name: data.get('targetName'),
      world: targetWorld,
      address: data.get('targetAddress'),
      harmonic: signature(targetWorld.id, targetHz, targetPhase, 'target'),
      provenance: { source: 'react-ion-helm' },
    });
    const preserve = String(data.get('preserve') || '').split(',').map((item) => item.trim()).filter(Boolean);
    const continuity = evaluateContinuityGate({
      required: ['identity', 'continuity', 'agency'],
      scores: {
        identity: Number(data.get('identityScore')),
        continuity: Number(data.get('continuityScore')),
        agency: Number(data.get('agencyScore')),
      },
      vetoes: authorised ? [] : ['ask-not-authorised'],
    });
    const edge = buildProjectionEdge({
      from: source,
      to: target,
      jacobian: parseJacobian(data.get('jacobian')),
      continuity,
    });
    const navigation = await compileNavigationRequest({
      source: source.address,
      target: target.address,
      intention: data.get('ask'),
      preserve,
    });
    const route = edge.blocked ? null : await chooseProjectionRoute({
      request: navigation,
      graph: { [navigation.source]: [edge] },
    });
    const packet = await createAskPacket({
      sender: data.get('sender'),
      target: data.get('targetName'),
      world: targetWorld.name,
      intention: data.get('ask'),
      transformation: data.get('transformation'),
      constraints: { preserve },
      consent: { required: true, granted: authorised, revocable: true, scope: 'this Helm compilation' },
      evidence: String(data.get('notice') || '').trim() ? [{ class: 'observed', source: 'operator-notice', value: String(data.get('notice')).trim(), confidence: 1 }] : [],
      ttl: Number(data.get('ttl')),
    });
    const audit = edge.diagnostics.jacobian;
    const projectionState = classifyProjectionState({
      sigmaMin: audit.sigma_min,
      sigmaMax: audit.sigma_max,
      continuity: continuity.minimum_score,
      harmonicMismatch: edge.harmonic_mismatch,
    });
    const diagnostic = diagnosticAcknowledgement({
      reason: edge.blocked ? continuity.blocked_by.join(', ') : 'helm compilation received',
      recoverable: !edge.blocked && source.address_text === target.address_text,
      loopback: !edge.blocked && source.address_text === target.address_text,
    });
    const receipt = {
      schema: 'reaction.helm-receipt/v1',
      created_at: new Date().toISOString(),
      world_id: world.id,
      source: { name: source.name, address: source.address_text },
      target: { name: target.name, address: target.address_text },
      notice: String(data.get('notice') || '').trim() || null,
      ask: packet,
      navigation,
      edge,
      route,
      projection_state: projectionState,
      diagnostic,
      authority: {
        route_compiled: Boolean(route),
        continuity_gate_admitted: continuity.admitted,
        physical_travel_claimed: false,
      },
    };
    const store = readStore();
    store.receipts.push(structuredClone(receipt));
    if (store.receipts.length > 40) store.receipts.splice(0, store.receipts.length - 40);
    writeStore(store);
    panel.outerHTML = render(world, store, edge.blocked
      ? `Continuity Gate vetoed the route: ${continuity.blocked_by.join(', ')}.`
      : `Helm compiled ${route.route_id}. ACK means received, not fulfilled.`);
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
