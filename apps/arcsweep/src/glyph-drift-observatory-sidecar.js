import { loadState } from './storage.js';
import {
  classifyGlyphDrift,
  compareBlindedNarratives,
  createGlyphHeartbeat,
  sealNarrative,
} from './glyph-continuity.js';
import { createBlindReturnContext } from './glyph-blind-context.js';
import {
  appendGlyphBlindPair,
  appendGlyphHeartbeat,
  ensureGlyphContinuityLedger,
  persistGlyphContinuityLedger,
} from './glyph-continuity-state.js';

let mounting = false;
let mutating = false;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isDeepObserverActive() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"]'));
}

function activeContext(state) {
  const world = state.worlds?.find((item) => item.id === state.activeWorldId) || state.worlds?.[0] || null;
  const premaqc = world ? state.premaqcByWorld?.[world.id] || null : null;
  return { world, premaqc };
}

function relationshipTopology(state, world) {
  const records = Array.isArray(state.records?.relationships) ? state.records.relationships : [];
  return records
    .filter((record) => !record.worldId || record.worldId === world.id)
    .map((record, index) => ({
      id: String(record.id || `relationship-${index + 1}`),
      from: String(record.from || world.id),
      to: String(record.to || record.title || `relationship-${index + 1}`),
      type: String(record.relationship || record.type || 'relationship'),
      weight: 1,
    }));
}

function worldHistory(ledger, worldId) {
  return ledger.heartbeats.filter((entry) => entry?.world_id === worldId && entry?.heartbeat?.signature);
}

function latestWorldEntry(ledger, worldId) {
  return [...worldHistory(ledger, worldId)].reverse()[0] || null;
}

function activeBlindPair(ledger, worldId) {
  return [...ledger.blindPairs].reverse().find((pair) => pair?.world_id === worldId && !pair?.comparison) || null;
}

function latestCompletedPair(ledger, worldId) {
  return [...ledger.blindPairs].reverse().find((pair) => pair?.world_id === worldId && pair?.comparison) || null;
}

function glyphSvg(signature) {
  if (!signature?.render?.points?.length) return '<div class="glyph-empty">No glyph heartbeat yet.</div>';
  const points = signature.render.points;
  const spokes = points.map((point) => `<line x1="128" y1="128" x2="${point.x}" y2="${point.y}" />`).join('');
  const nodes = points.map((point) => `<g><circle cx="${point.x}" cy="${point.y}" r="4" /><text x="${point.x}" y="${point.y - 9}" text-anchor="middle">${esc(point.axis)}</text></g>`).join('');
  const phase = signature.render.phase_marker
    ? `<line class="phase" x1="128" y1="128" x2="${signature.render.phase_marker.x}" y2="${signature.render.phase_marker.y}" /><circle class="phase" cx="${signature.render.phase_marker.x}" cy="${signature.render.phase_marker.y}" r="5" />`
    : '';
  return `<svg class="glyph-continuity-svg" viewBox="0 0 256 256" role="img" aria-label="Deterministic Glyph Continuity signature">
    <circle class="ring" cx="128" cy="128" r="112" />
    <circle class="ring inner" cx="128" cy="128" r="56" />
    <g class="spokes">${spokes}</g>
    <polygon points="${esc(signature.render.polygon)}" />
    <g class="nodes">${nodes}</g>
    ${phase}
  </svg>`;
}

function driftFacts(drift) {
  if (!drift) return '<p class="muted">No drift receipt yet.</p>';
  if (!drift.metrics) {
    return `<p class="muted">${drift.history_count}/${drift.settings.minimum_history} prior heartbeats available. The first continuity envelope is still forming.</p>`;
  }
  const metrics = drift.metrics;
  return `<dl class="facts glyph-drift-facts">
    <div><dt>Structural Δ</dt><dd>${Number(metrics.structural_distance).toFixed(4)}</dd></div>
    <div><dt>Semantic Δ</dt><dd>${Number(metrics.semantic_distance).toFixed(4)}</dd></div>
    <div><dt>Envelope</dt><dd>${Number(metrics.robust_envelope).toFixed(4)}</dd></div>
    <div><dt>Trend slope</dt><dd>${Number(metrics.trend_slope).toFixed(4)}</dd></div>
    <div><dt>Reference Δ</dt><dd>${Number(metrics.reference_distance).toFixed(4)}</dd></div>
    <div><dt>Topology Δ</dt><dd>${Number(metrics.topology_distance).toFixed(4)}</dd></div>
  </dl>`;
}

function heartbeatHistory(ledger, worldId) {
  const entries = worldHistory(ledger, worldId).slice(-12).reverse();
  if (!entries.length) return '<p class="muted">No glyph heartbeats receipted for this world yet.</p>';
  return `<ol class="glyph-heartbeat-history">${entries.map((entry) => `<li><b>${esc(entry.drift?.classification || 'UNCLASSIFIED')}</b> · ${esc(entry.heartbeat.observed_at)} · <code>${esc(entry.heartbeat.signature.signature_id)}</code></li>`).join('')}</ol>`;
}

function comparisonSummary(pair) {
  const comparison = pair?.comparison;
  if (!comparison) return '';
  return `<div class="glyph-blind-result">
    <p><b>Blind comparison receipted.</b> Both narrative hashes were sealed before reveal.</p>
    <dl class="facts">
      <div><dt>Lexical overlap</dt><dd>${Number(comparison.metrics.lexical_jaccard).toFixed(3)}</dd></div>
      <div><dt>Length ratio</dt><dd>${Number(comparison.metrics.length_ratio).toFixed(3)}</dd></div>
      <div><dt>Earth tokens</dt><dd>${comparison.metrics.earth_token_count}</dd></div>
      <div><dt>Return tokens</dt><dd>${comparison.metrics.return_token_count}</dd></div>
    </dl>
    <div class="grid two compact-grid">
      <article><p class="eyebrow">Earth narrative · revealed</p><p>${esc(pair.earth.text)}</p></article>
      <article><p class="eyebrow">Return narrative · revealed</p><p>${esc(pair.return.text)}</p></article>
    </div>
    <details><summary>Comparison receipt</summary><pre>${esc(JSON.stringify(comparison, null, 2))}</pre></details>
  </div>`;
}

function blindPanel(ledger, worldId) {
  const pair = activeBlindPair(ledger, worldId);
  const completed = latestCompletedPair(ledger, worldId);
  if (!pair) {
    return `<div class="glyph-blind-stage">
      <p class="muted">Seal the Earth-side narrative first. The return stage receives only the seal metadata and hash, never the Earth prose.</p>
      <form data-glyph-earth-seal class="stack compact-stack">
        <label>Earth-side observation narrative<textarea name="earthText" rows="5" required placeholder="Record the first side exactly as observed."></textarea></label>
        <button type="submit">Seal Earth narrative</button>
      </form>
      ${comparisonSummary(completed)}
    </div>`;
  }

  if (!pair.return?.seal) {
    return `<div class="glyph-blind-stage">
      <p class="callout"><b>Earth side sealed.</b> <code>${esc(pair.earth.seal.content_hash)}</code></p>
      <p class="muted">Return-side context contains only: ${esc(pair.return_context.allowed_context_fields.join(', '))}. Earth prose remains withheld.</p>
      <form data-glyph-return-seal class="stack compact-stack">
        <label>Independent return narrative<textarea name="returnText" rows="5" required placeholder="Record the return before reveal."></textarea></label>
        <button type="submit">Seal return narrative</button>
      </form>
    </div>`;
  }

  return `<div class="glyph-blind-stage">
    <p class="callout"><b>Both sides sealed.</b> Reveal gate is open.</p>
    <dl class="facts">
      <div><dt>Earth hash</dt><dd><code>${esc(pair.earth.seal.content_hash)}</code></dd></div>
      <div><dt>Return hash</dt><dd><code>${esc(pair.return.seal.content_hash)}</code></dd></div>
    </dl>
    <p class="muted">Reveal verifies both hashes before comparing the sealed texts.</p>
    <button type="button" data-glyph-reveal>Reveal and compare sealed narratives</button>
  </div>`;
}

async function renderPanel(message = '') {
  const state = await loadState();
  const ledger = ensureGlyphContinuityLedger(state);
  const { world, premaqc } = activeContext(state);
  if (!world) return '';
  const latest = latestWorldEntry(ledger, world.id);
  const signature = latest?.heartbeat?.signature || null;
  const drift = latest?.drift || null;
  const classification = drift?.classification || 'NO_HEARTBEAT';
  const review = drift?.review_required ? ' · REVIEW REQUIRED' : drift?.review_recommended ? ' · REVIEW RECOMMENDED' : '';
  const sourceLabel = premaqc?.receipt_id || premaqc?.id || null;

  return `<section class="panel glyph-drift-observatory" data-glyph-drift-observatory>
    <div class="section-heading compact-heading"><div>
      <p class="eyebrow">Observer heartbeat · Living Glyph</p>
      <h2>Glyph Drift Observatory</h2>
      <p class="muted">PREMAQC becomes a deterministic glyph signature. Heartbeats establish a continuity envelope; structural, semantic, topology and directional movement remain separately receipted.</p>
    </div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="grid two glyph-observatory-grid">
      <article class="glyph-stage">
        ${glyphSvg(signature)}
        <p class="glyph-classification"><b>${esc(classification)}</b>${esc(review)}</p>
        ${signature ? `<p class="muted"><code>${esc(signature.signature_id)}</code></p>` : ''}
        ${driftFacts(drift)}
        <button type="button" data-glyph-heartbeat ${premaqc?.state ? '' : 'disabled'}>Receipt glyph heartbeat</button>
        <p class="muted">${sourceLabel ? `Current PREMAQC source: ${esc(sourceLabel)}` : 'No receipted PREMAQC state is available for this world yet.'}</p>
      </article>
      <article>
        <p class="eyebrow">Continuity wake</p><h3>Recent heartbeats</h3>
        ${heartbeatHistory(ledger, world.id)}
      </article>
    </div>
    <details class="glyph-blind-comparison" open>
      <summary>Blinded paired narrative comparison</summary>
      ${blindPanel(ledger, world.id)}
    </details>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#glyph-drift-observatory-style')) return;
  const style = document.createElement('style');
  style.id = 'glyph-drift-observatory-style';
  style.textContent = `
    .glyph-drift-observatory{margin-top:1rem}.glyph-observatory-grid{align-items:start}.glyph-stage{text-align:center}.glyph-continuity-svg{width:min(100%,360px);aspect-ratio:1;margin:0 auto;overflow:visible}.glyph-continuity-svg .ring{fill:none;stroke:color-mix(in srgb,var(--green) 22%,transparent);stroke-width:1.5}.glyph-continuity-svg .ring.inner{stroke-dasharray:4 7}.glyph-continuity-svg .spokes line{stroke:color-mix(in srgb,var(--green) 34%,transparent);stroke-width:1}.glyph-continuity-svg polygon{fill:color-mix(in srgb,var(--gold) 14%,transparent);stroke:var(--gold);stroke-width:3;stroke-linejoin:round}.glyph-continuity-svg .nodes circle{fill:var(--panel-solid);stroke:var(--green);stroke-width:2}.glyph-continuity-svg text{fill:var(--text);font-size:11px;font-weight:700}.glyph-continuity-svg .phase{stroke:var(--green);fill:var(--green);stroke-width:2}.glyph-classification{font-size:1.05rem;letter-spacing:.04em}.glyph-drift-facts{text-align:left}.glyph-heartbeat-history{max-height:26rem;overflow:auto;padding-left:1.4rem}.glyph-heartbeat-history li{margin:.45rem 0;word-break:break-word}.glyph-empty{min-height:220px;display:grid;place-items:center;border:1px dashed color-mix(in srgb,var(--green) 32%,transparent);border-radius:16px}.glyph-blind-comparison{margin-top:1rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 24%,transparent)}.glyph-blind-comparison>summary{cursor:pointer;font-weight:700;font-size:1.05rem}.glyph-blind-stage{margin-top:1rem}.glyph-blind-stage code{word-break:break-all}.glyph-blind-result{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--green) 28%,transparent);border-radius:12px}.glyph-blind-result pre{max-height:24rem;overflow:auto;white-space:pre-wrap}
  `;
  document.head.appendChild(style);
}

async function replacePanel(message = '') {
  if (!isDeepObserverActive()) return;
  const main = document.querySelector('main.content');
  if (!main) return;
  const html = await renderPanel(message);
  const existing = document.querySelector('[data-glyph-drift-observatory]');
  if (existing) existing.outerHTML = html;
  else main.insertAdjacentHTML('beforeend', html);
}

async function mount() {
  if (mounting || !isDeepObserverActive() || document.querySelector('[data-glyph-drift-observatory]')) return;
  const main = document.querySelector('main.content');
  if (!main) return;
  mounting = true;
  try {
    injectStyle();
    await replacePanel();
  } catch (error) {
    console.warn('Glyph Drift Observatory could not mount:', error);
  } finally {
    mounting = false;
  }
}

document.addEventListener('click', async (event) => {
  if (mutating) return;
  const heartbeatButton = event.target.closest('[data-glyph-heartbeat]');
  if (heartbeatButton) {
    mutating = true;
    heartbeatButton.disabled = true;
    try {
      const state = await loadState();
      const ledger = ensureGlyphContinuityLedger(state);
      const { world, premaqc } = activeContext(state);
      if (!world || !premaqc?.state) throw new Error('A receipted PREMAQC state is required for a glyph heartbeat.');
      const priorEntries = worldHistory(ledger, world.id);
      const heartbeat = await createGlyphHeartbeat({
        world,
        premaqc,
        relationships: relationshipTopology(state, world),
        confidence: premaqc.confidence ?? 1,
        phase: premaqc.phase ?? null,
      });
      const drift = await classifyGlyphDrift({ history: priorEntries.map((entry) => entry.heartbeat), current: heartbeat });
      appendGlyphHeartbeat(ledger, { schema: 'glyph.continuity-entry/v1', world_id: world.id, heartbeat, drift });
      await persistGlyphContinuityLedger(ledger, { reason: 'glyph-continuity-heartbeat', heartbeat_id: heartbeat.heartbeat_id });
      await replacePanel(`${drift.classification} · ${heartbeat.signature.signature_id}`);
    } catch (error) {
      await replacePanel(`Glyph heartbeat stopped: ${error.message}`);
    } finally {
      mutating = false;
    }
    return;
  }

  const revealButton = event.target.closest('[data-glyph-reveal]');
  if (revealButton) {
    mutating = true;
    revealButton.disabled = true;
    try {
      const state = await loadState();
      const ledger = ensureGlyphContinuityLedger(state);
      const { world } = activeContext(state);
      const pair = activeBlindPair(ledger, world?.id);
      if (!pair?.earth?.seal || !pair?.return?.seal) throw new Error('Both narrative seals are required before reveal.');
      pair.comparison = await compareBlindedNarratives({
        earthSeal: pair.earth.seal,
        earthText: pair.earth.text,
        returnSeal: pair.return.seal,
        returnText: pair.return.text,
      });
      pair.revealed_at = pair.comparison.compared_at;
      await persistGlyphContinuityLedger(ledger, { reason: 'glyph-blind-comparison-reveal', comparison_id: pair.comparison.comparison_id });
      await replacePanel(`Blind comparison receipted: ${pair.comparison.comparison_id}`);
    } catch (error) {
      await replacePanel(`Blind comparison stopped: ${error.message}`);
    } finally {
      mutating = false;
    }
  }
}, true);

document.addEventListener('submit', async (event) => {
  if (mutating) return;
  const earthForm = event.target.closest('[data-glyph-earth-seal]');
  const returnForm = event.target.closest('[data-glyph-return-seal]');
  if (!earthForm && !returnForm) return;
  event.preventDefault();
  mutating = true;
  try {
    const state = await loadState();
    const ledger = ensureGlyphContinuityLedger(state);
    const { world } = activeContext(state);
    if (!world) throw new Error('An active world is required.');

    if (earthForm) {
      const text = String(new FormData(earthForm).get('earthText') || '');
      const seal = await sealNarrative({ side: 'earth', text, source: 'observer-earth' });
      const pairId = `glyph-blind-pair-${seal.fingerprint.slice(0, 24)}`;
      const returnContext = createBlindReturnContext({ earthSeal: seal, pairId });
      appendGlyphBlindPair(ledger, {
        schema: 'glyph.blind-pair/v1',
        pair_id: pairId,
        world_id: world.id,
        created_at: seal.sealed_at,
        earth: { seal, text },
        return: null,
        return_context: returnContext,
        comparison: null,
      });
      await persistGlyphContinuityLedger(ledger, { reason: 'glyph-blind-earth-seal', pair_id: pairId });
      await replacePanel(`Earth narrative sealed: ${seal.seal_id}`);
      return;
    }

    const pair = activeBlindPair(ledger, world.id);
    if (!pair?.earth?.seal) throw new Error('Seal the Earth narrative first.');
    const text = String(new FormData(returnForm).get('returnText') || '');
    const seal = await sealNarrative({ side: 'return', text, source: 'observer-return' });
    pair.return = { seal, text };
    await persistGlyphContinuityLedger(ledger, { reason: 'glyph-blind-return-seal', pair_id: pair.pair_id });
    await replacePanel(`Return narrative sealed: ${seal.seal_id}. Reveal gate open.`);
  } catch (error) {
    await replacePanel(`Blind pair stopped: ${error.message}`);
  } finally {
    mutating = false;
  }
}, true);

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('arcsweep:glyph-continuity-updated', () => { if (isDeepObserverActive()) void replacePanel(); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
