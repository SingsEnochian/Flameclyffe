import { buildSwarmFoldPrompt, saddleNodeSample } from './heimdall-foldwatch.js';
import { writeDevConsoleSwarmMode } from './devconsole-swarm-chat.js';

const ROOT = '[data-heimdall-foldwatch]';
const history = [];
let previousState = 'CLEAR';
let observer = null;

function n(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function editorForCommons() {
  const form = document.querySelector('#commons-form');
  if (!form) return null;
  return form.querySelector('[data-commons-native-editor]') || form.elements?.namedItem?.('message') || null;
}

function writeEditor(editor, text) {
  if (!editor) return false;
  if ('value' in editor) editor.value = text;
  else editor.innerText = text;
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.focus?.();
  return true;
}

function format(value, digits = 4) {
  if (value === Number.POSITIVE_INFINITY) return '∞';
  return Number(value).toFixed(digits);
}

function telemetryMarkup(sample) {
  return `<div class="heimdall-foldwatch-readout" data-fold-state="${sample.state}">
    <div><span>STATE</span><strong>${sample.state}</strong></div>
    <div><span>Φ fold</span><strong>${format(sample.fold_score)}</strong></div>
    <div><span>σ min</span><strong>${format(sample.sigma_min, 6)}</strong></div>
    <div><span>rank loss</span><strong>${format(sample.rank_loss_score)}</strong></div>
    <div><span>softening</span><strong>${format(sample.softening_score)}</strong></div>
    <div><span>persistence</span><strong>${format(sample.soft_persistence)}</strong></div>
    <div><span>curvature</span><strong>${format(sample.curvature)}</strong></div>
    <div><span>pU</span><strong>${format(sample.relational_participation)}</strong></div>
  </div>`;
}

function ensureStyle() {
  if (document.querySelector('[data-heimdall-foldwatch-style]')) return;
  const style = document.createElement('style');
  style.dataset.heimdallFoldwatchStyle = 'true';
  style.textContent = `
  .heimdall-foldwatch{margin-top:12px;padding:14px;border:1px solid color-mix(in srgb,var(--sea,#8bd7c5) 34%,transparent);border-radius:16px;background:color-mix(in srgb,var(--panel,#111827) 92%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
  .heimdall-foldwatch-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.heimdall-foldwatch-head h3{margin:.1rem 0}.heimdall-foldwatch-head p{margin:0}
  .heimdall-foldwatch-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.heimdall-foldwatch-controls label{display:grid;gap:5px;font-size:.78rem}.heimdall-foldwatch-controls output{font-variant-numeric:tabular-nums}
  .heimdall-foldwatch-readout{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.heimdall-foldwatch-readout>div{padding:8px;border-radius:10px;background:rgba(255,255,255,.035);display:grid;gap:2px}.heimdall-foldwatch-readout span{font-size:.66rem;opacity:.65;letter-spacing:.08em}.heimdall-foldwatch-readout strong{font-size:.86rem;font-variant-numeric:tabular-nums}
  .heimdall-foldwatch-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.heimdall-foldwatch-note{font-size:.75rem;opacity:.72;margin:.65rem 0 0}
  .heimdall-foldwatch[data-fold-state="FOLD"]{box-shadow:inset 0 0 34px rgba(255,196,92,.07)}
  @media(max-width:760px){.heimdall-foldwatch-readout{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.append(style);
}

function sampleFromPanel(panel) {
  const x = n(panel.querySelector('[data-fold-x]')?.value, 0.45);
  const mu = n(panel.querySelector('[data-fold-mu]')?.value, 0.2);
  const sample = saddleNodeSample({ x, mu, t: performance.now() / 1000, history, previousState });
  history.push(sample);
  while (history.length > 24) history.shift();
  previousState = sample.state;
  return sample;
}

function renderSample(panel, sample) {
  panel.dataset.foldState = sample.state;
  const xOut = panel.querySelector('[data-fold-x-out]');
  const muOut = panel.querySelector('[data-fold-mu-out]');
  if (xOut) xOut.textContent = format(sample.proving_chamber.x, 3);
  if (muOut) muOut.textContent = format(sample.proving_chamber.mu, 3);
  const readout = panel.querySelector('[data-fold-readout]');
  if (readout) readout.innerHTML = telemetryMarkup(sample);
  const residual = panel.querySelector('[data-fold-residual]');
  if (residual) residual.textContent = `equilibrium residual ${format(sample.proving_chamber.equilibrium_residual, 6)} · branch ${sample.branch_id}`;
}

function run(panel) {
  const sample = sampleFromPanel(panel);
  renderSample(panel, sample);
  panel.__foldwatchSample = sample;
  return sample;
}

function reset(panel) {
  history.splice(0);
  previousState = 'CLEAR';
  panel.querySelector('[data-fold-x]').value = '0.45';
  panel.querySelector('[data-fold-mu]').value = '0.20';
  run(panel);
}

async function sweepToFold(panel) {
  history.splice(0);
  previousState = 'CLEAR';
  const xControl = panel.querySelector('[data-fold-x]');
  const muControl = panel.querySelector('[data-fold-mu]');
  muControl.value = '0';
  for (const x of [0.8,0.55,0.34,0.2,0.11,0.055,0.02,0.006,0]) {
    xControl.value = String(x);
    run(panel);
    await new Promise((resolve) => setTimeout(resolve, 55));
  }
}

function askSwarm(panel) {
  const sample = panel.__foldwatchSample || run(panel);
  const editor = editorForCommons();
  if (!editor) {
    const note = panel.querySelector('[data-fold-status]');
    if (note) note.textContent = 'Open House Commons / DevConsole Swarm Chat first.';
    return;
  }
  writeDevConsoleSwarmMode('swarm');
  writeEditor(editor, buildSwarmFoldPrompt(sample));
  const note = panel.querySelector('[data-fold-status]');
  if (note) note.textContent = 'Telemetry loaded into Swarm Chat. Review, edit, then send.';
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:heimdall-foldwatch-swarm-ready', { detail: sample }));
}

function mount(afterNode) {
  if (document.querySelector(ROOT) || !afterNode) return null;
  ensureStyle();
  const panel = document.createElement('section');
  panel.className = 'heimdall-foldwatch';
  panel.dataset.heimdallFoldwatch = 'true';
  panel.innerHTML = `<div class="heimdall-foldwatch-head"><div><p class="eyebrow">HEIMDALL · Jacobian Foldwatch</p><h3>Fold Proving Chamber</h3></div><span class="muted" data-fold-status>local geometry · swarm-readable</span></div>
  <div class="heimdall-foldwatch-controls">
    <label>State x <input data-fold-x type="range" min="-1" max="1" value="0.45" step="0.005"><output data-fold-x-out>0.450</output></label>
    <label>Control μ <input data-fold-mu type="range" min="-0.25" max="1" value="0.20" step="0.005"><output data-fold-mu-out>0.200</output></label>
  </div>
  <div data-fold-readout></div>
  <p class="heimdall-foldwatch-note" data-fold-residual></p>
  <div class="heimdall-foldwatch-actions"><button type="button" class="quiet mini" data-fold-run>Sample</button><button type="button" class="quiet mini" data-fold-sweep>Sweep → fold</button><button type="button" class="quiet mini" data-fold-ask>Ask Swarm</button><button type="button" class="quiet mini" data-fold-reset>Reset</button></div>
  <p class="heimdall-foldwatch-note">Proving chamber: x′ = μ − x². Foldwatch computes Jacobian singular geometry locally. “Ask Swarm” transfers the measured packet into DevConsole Swarm mode without auto-sending it.</p>`;
  afterNode.insertAdjacentElement('afterend', panel);
  panel.querySelector('[data-fold-run]')?.addEventListener('click', () => run(panel));
  panel.querySelector('[data-fold-sweep]')?.addEventListener('click', () => void sweepToFold(panel));
  panel.querySelector('[data-fold-ask]')?.addEventListener('click', () => askSwarm(panel));
  panel.querySelector('[data-fold-reset]')?.addEventListener('click', () => reset(panel));
  panel.querySelectorAll('[data-fold-x],[data-fold-mu]').forEach((input) => input.addEventListener('input', () => run(panel)));
  run(panel);
  return panel;
}

function scan() {
  const swarm = document.querySelector('[data-devconsole-swarm-chat]');
  if (swarm) mount(swarm);
}

if (typeof document !== 'undefined') {
  scan();
  observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

export { mount as mountHeimdallFoldwatch, run as sampleHeimdallFoldwatch };
