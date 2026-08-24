import { loadState } from './storage.js';

const STORE_KEY = 'hearthgate.arcsweep.transformation-requests.v1';
let mounting = false;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fixed(value, digits = 3) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
}

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && parsed.byWorld) return parsed;
  } catch {}
  return { version: 1, byWorld: {} };
}

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  const circuit = world ? readStore().byWorld?.[world.id]?.circuits?.at(-1) || null : null;
  return { world, circuit };
}

function topologyCopy(state) {
  if (state === 'HYSTERETIC') return 'History is materially part of the present response.';
  if (state === 'CUSP_NEAR') return 'First- and second-order geometry are converging near a cusp.';
  if (state === 'BRANCH') return 'Multiple locally valid continuations are resolved.';
  if (state === 'FOLD_NEAR') return 'The local map is approaching loss of invertibility.';
  return 'The current local geometry is open.';
}

function render(world, circuit) {
  const receiptKey = circuit?.bai?.receipt_id || 'none';
  if (!circuit?.bai) {
    return `<section class="panel bai-topology-panel" data-bai-topology-sidecar data-bai-receipt="${receiptKey}">
      <div class="section-heading compact-heading">
        <div>
          <p class="eyebrow">Bone · Ash · Intention</p>
          <h2>Cusp Observatory</h2>
          <p class="muted">${esc(world?.name || 'Active world')} · Close a Requested Transformation through a later feedback receipt to seed the topology read.</p>
        </div>
        <span class="bai-topology-badge">OPEN</span>
      </div>
      <p class="muted">BAI is the Requested Transformation projection of a domain-general cusp engine. Bone carries structure, Ash accumulates receipted trajectory, and Intention comes only from the declared Ask. Natural-system control B may instead be density, forcing, accretion, or another explicit domain variable. Qualia remains its own reported channel.</p>
    </section>`;
  }

  const state = circuit.bai.state;
  const topology = circuit.bai.topology;
  const d = state.branch_discriminant;
  const ash = state.ash;
  const derivatives = topology.derivatives || {};
  const semantics = circuit.control?.cusp_control_semantics || {};
  const aLabel = semantics.a?.label || 'Structure';
  const bLabel = semantics.b?.label || 'Intention';

  return `<section class="panel bai-topology-panel" data-bai-topology-sidecar data-bai-receipt="${esc(receiptKey)}">
    <div class="section-heading compact-heading">
      <div>
        <p class="eyebrow">Bone · Ash · Intention · receipted topology</p>
        <h2>Cusp Observatory</h2>
        <p class="muted">${esc(world?.name || circuit.world?.name || 'Active world')} · ${esc(topologyCopy(topology.state))}</p>
      </div>
      <span class="bai-topology-badge" data-state="${esc(topology.state)}">${esc(topology.state)}</span>
    </div>
    <div class="bai-triad">
      <article><span>🦴 Bone</span><strong>${fixed(state.bone.value)}</strong><small>${esc(state.bone.source)}</small></article>
      <article><span>🔥 Ash</span><strong>${fixed(ash.magnitude)}</strong><small>${ash.receipt_count} history receipt${ash.receipt_count === 1 ? '' : 's'} · raw ${fixed(ash.raw_accumulation)}</small></article>
      <article><span>⌁ Intention</span><strong>${fixed(state.intention.value)}</strong><small>declared control · not PREMAQC Agency</small></article>
    </div>
    <div class="grid two compact-grid bai-math-grid">
      <article class="bai-equation">
        <p class="eyebrow">BAI branch diagnostic</p>
        <strong>H² − 4BI = ${fixed(d.signed, 6)}</strong>
        <small>${esc(d.signed_class)} · magnitude-controlled ${fixed(d.magnitude_controlled, 6)}</small>
      </article>
      <article class="bai-equation">
        <p class="eyebrow">Domain-semantic cusp controls</p>
        <strong>a ${fixed(circuit.bai.model?.cusp_structure)} · b ${fixed(circuit.bai.model?.cusp_intention)}</strong>
        <small>${esc(aLabel)} (a) · ${esc(bLabel)} (b) · ${esc(circuit.bai.model?.structure_projection || 'explicit-structure')}</small>
      </article>
    </div>
    <dl class="facts">
      <div><dt>Topology</dt><dd>${esc(topology.state)}</dd></div>
      <div><dt>Jacobian fold index</dt><dd>${fixed(topology.fold_index)}</dd></div>
      <div><dt>Resolved branches</dt><dd>${topology.branch_count}</dd></div>
      <div><dt>Cusp distance</dt><dd>${fixed(topology.cusp_distance)}</dd></div>
      <div><dt>Fₓ</dt><dd>${fixed(derivatives.first, 6)}</dd></div>
      <div><dt>Fₓₓ</dt><dd>${fixed(derivatives.second, 6)}</dd></div>
      <div><dt>Hysteresis</dt><dd>${topology.hysteresis_witnessed ? 'WITNESSED' : 'not yet witnessed'}</dd></div>
      <div><dt>Receipt</dt><dd>${esc(circuit.bai.receipt_id)}</dd></div>
    </dl>
    <p class="muted bai-authority">Topology is derived from receipted cusp and Jacobian evidence. BAI is one projection of the generic cusp controls, not a claim that every system has Intention. The BAI discriminant remains a reduced diagnostic; Ash preserves path, and Intention and Qualia are never manufactured here.</p>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#bai-topology-style')) return;
  const style = document.createElement('style');
  style.id = 'bai-topology-style';
  style.textContent = `.bai-topology-panel{margin-top:1rem}.bai-topology-badge{display:inline-flex;align-items:center;justify-content:center;min-width:7.6rem;padding:.55rem .8rem;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);border-radius:999px;font-weight:800;letter-spacing:.08em}.bai-triad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin:1rem 0}.bai-triad article,.bai-equation{display:flex;flex-direction:column;gap:.25rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 26%,transparent);border-radius:12px;background:color-mix(in srgb,var(--panel-solid) 86%,transparent)}.bai-triad strong,.bai-equation strong{font-size:1.3rem;font-variant-numeric:tabular-nums}.bai-triad small,.bai-equation small,.bai-authority{opacity:.72}.bai-math-grid{margin-bottom:1rem}@media(max-width:760px){.bai-triad{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

async function mount() {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-bai-topology-sidecar]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const { world, circuit } = await context();
    if (!world) return;
    const receiptKey = circuit?.bai?.receipt_id || 'none';
    const existing = document.querySelector('[data-bai-topology-sidecar]');
    if (existing?.dataset.baiReceipt === receiptKey) return;
    const html = render(world, circuit);
    if (existing) {
      existing.outerHTML = html;
      return;
    }
    document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally {
    mounting = false;
  }
}

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
} else {
  void mount();
}
