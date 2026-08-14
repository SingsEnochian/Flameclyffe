import { loadState } from './storage.js';

const STORE_KEY = 'hearthgate.arcsweep.domain-control-bench.v1';
const AXIS_KEY = 'hearthgate.arcsweep.deep-time-axis.v1';
const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
let mounting = false;

function esc(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function fixed(value, digits = 4) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }
function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1) return parsed;
  } catch {}
  return { version: 1, deep_time_records: [] };
}
function selectedAxis() {
  try {
    const axis = globalThis.localStorage?.getItem(AXIS_KEY);
    return AXES.includes(axis) ? axis : 'R';
  } catch { return 'R'; }
}
function writeAxis(axis) { try { globalThis.localStorage?.setItem(AXIS_KEY, axis); } catch {} }

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  return { world };
}

function trajectorySvg(records, axis) {
  if (records.length < 2) return '<p class="muted">Two accepted temporal records are required to draw a trajectory.</p>';
  const width = 680;
  const height = 220;
  const padX = 28;
  const padY = 20;
  const lambdas = records.map((record) => Number(record.lambda));
  const values = records.map((record) => Number(record.premaqc.state[axis].value));
  const minLambda = Math.min(...lambdas);
  const maxLambda = Math.max(...lambdas);
  const xSpan = Math.max(1e-9, maxLambda - minLambda);
  const x = (value) => padX + ((value - minLambda) / xSpan) * (width - padX * 2);
  const y = (value) => height - padY - Math.min(1, Math.max(0, value)) * (height - padY * 2);
  const points = records.map((record) => `${x(Number(record.lambda)).toFixed(2)},${y(Number(record.premaqc.state[axis].value)).toFixed(2)}`).join(' ');
  const dots = records.map((record) => `<circle cx="${x(Number(record.lambda)).toFixed(2)}" cy="${y(Number(record.premaqc.state[axis].value)).toFixed(2)}" r="3"><title>λ ${record.lambda} · ${axis} ${fixed(record.premaqc.state[axis].value, 3)} · ${esc(record.time.utc)}</title></circle>`).join('');
  return `<svg class="deep-time-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="DEEPTime ${esc(axis)} trajectory"><line x1="${padX}" y1="${y(1)}" x2="${padX}" y2="${y(0)}" class="deep-time-axis-line"/><line x1="${padX}" y1="${y(0)}" x2="${width - padX}" y2="${y(0)}" class="deep-time-axis-line"/><polyline points="${points}" class="deep-time-path"/>${dots}</svg>`;
}

function render(records, world, axis) {
  const sorted = [...records].sort((a, b) => Number(a.lambda) - Number(b.lambda));
  const latest = sorted.at(-1) || null;
  const first = sorted[0] || null;
  const delta = latest && first ? Number(latest.premaqc.state[axis].value) - Number(first.premaqc.state[axis].value) : null;
  const velocity = latest?.derivatives?.axis_velocity?.[axis] ?? null;
  const key = `${world?.id || 'none'}:${axis}:${latest?.id || 'none'}:${sorted.length}`;
  return `<section class="panel deep-time-trajectory" data-deep-time-trajectory data-deep-time-key="${esc(key)}"><div class="section-heading compact-heading"><div><p class="eyebrow">Time preserves the path</p><h2>DEEPTime Trajectory</h2><p class="muted">${esc(world?.name || 'Active world')} · accepted feedback only · λ is replay order, not a new physical time dimension.</p></div><label class="deep-time-axis-picker">Axis<select data-deep-time-axis>${AXES.map((item) => `<option value="${item}" ${item === axis ? 'selected' : ''}>${item}</option>`).join('')}</select></label></div>${sorted.length ? `${trajectorySvg(sorted, axis)}<dl class="facts"><div><dt>Records</dt><dd>${sorted.length}</dd></div><div><dt>λ range</dt><dd>${first.lambda} → ${latest.lambda}</dd></div><div><dt>${axis} start</dt><dd>${fixed(first.premaqc.state[axis].value)}</dd></div><div><dt>${axis} latest</dt><dd>${fixed(latest.premaqc.state[axis].value)}</dd></div><div><dt>Δ${axis}</dt><dd>${fixed(delta)}</dd></div><div><dt>Latest velocity</dt><dd>${fixed(velocity, 7)} /s</dd></div><div><dt>Data quality</dt><dd>${fixed(latest.quality?.data_quality, 3)}</dd></div><div><dt>Latest record</dt><dd>${esc(latest.id)}</dd></div></dl>` : '<p class="muted">Build DEEPTime from human-accepted Feedback cycles in the Theory Review panel to begin the trajectory.</p>'}<p class="muted">Raw accepted snapshots remain immutable. This chart is a derived view; changing the selected axis does not change the records.</p></section>`;
}

function injectStyle() {
  if (document.querySelector('#deep-time-trajectory-style')) return;
  const style = document.createElement('style');
  style.id = 'deep-time-trajectory-style';
  style.textContent = `.deep-time-trajectory{margin-top:1rem}.deep-time-axis-picker{display:flex;align-items:center;gap:.4rem}.deep-time-chart{width:100%;min-height:210px;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px;background:color-mix(in srgb,var(--panel-solid) 88%,transparent)}.deep-time-path{fill:none;stroke:var(--gold);stroke-width:2.4}.deep-time-chart circle{fill:var(--text)}.deep-time-axis-line{stroke:color-mix(in srgb,var(--text) 22%,transparent);stroke-width:1}`;
  document.head.appendChild(style);
}

async function mount() {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) { document.querySelector('[data-deep-time-trajectory]')?.remove(); return; }
  mounting = true;
  try {
    injectStyle();
    const { world } = await context();
    if (!world) return;
    const store = readStore();
    const records = (store.deep_time_records || []).filter((record) => record.world_id === world.id);
    const axis = selectedAxis();
    const latest = records.slice().sort((a, b) => Number(a.lambda) - Number(b.lambda)).at(-1) || null;
    const key = `${world.id}:${axis}:${latest?.id || 'none'}:${records.length}`;
    const existing = document.querySelector('[data-deep-time-trajectory]');
    if (existing?.dataset.deepTimeKey === key) return;
    if (existing) existing.outerHTML = render(records, world, axis);
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', render(records, world, axis));
  } finally { mounting = false; }
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-deep-time-axis]');
  if (!select || !AXES.includes(select.value)) return;
  writeAxis(select.value);
  document.querySelector('[data-deep-time-trajectory]')?.remove();
  void mount();
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
