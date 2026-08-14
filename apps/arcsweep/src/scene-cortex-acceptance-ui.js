import { inspectSceneCortexControl } from './scene-cortex-acceptance.js';

const PANEL_CLASS = 'scene-cortex-acceptance';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderReport(root, report) {
  const status = report.passed ? 'PASS' : 'NEEDS ATTENTION';
  const rows = report.checks.map((item) => `
    <li class="${item.passed ? 'pass' : 'fail'}">
      <span aria-hidden="true">${item.passed ? '✓' : '△'}</span>
      <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || '')}</small></div>
    </li>
  `).join('');
  const cellSummary = Object.entries(report.summary.subjectCellCounts || {})
    .map(([key, count]) => `${escapeHtml(key)}: ${Number(count)}`)
    .join(' · ');

  root.innerHTML = `
    <div class="scene-cortex-acceptance-head">
      <strong>Scene cortex dry run · ${status}</strong>
      <small>${escapeHtml(report.summary.worldId || 'world unset')} · story order ${report.summary.storyOrder ?? 'unset'}</small>
    </div>
    <ul>${rows}</ul>
    <p class="muted">${cellSummary || 'No subject cells resolved.'}</p>
    <p class="muted">Context inspection only. No model invocation, prose mutation, or canon promotion occurs in this check.</p>
  `;
}

async function run(form, button, root) {
  const field = form.querySelector('textarea[name="content"], [contenteditable="true"]');
  if (!field) {
    root.innerHTML = '<p class="muted">Scene prose field not found.</p>';
    return;
  }
  button.disabled = true;
  button.textContent = 'Inspecting cortex…';
  root.innerHTML = '<p class="muted">Resolving POV, narrator, style, chronology, and active cells…</p>';
  try {
    const report = await inspectSceneCortexControl(field);
    renderReport(root, report);
  } catch (error) {
    root.innerHTML = `<p class="muted">Cortex inspection stopped: ${escapeHtml(error?.message || String(error))}</p>`;
  } finally {
    button.disabled = false;
    button.textContent = 'Dry-run scene cortex';
  }
}

function attach(form) {
  if (!form?.isConnected || form.querySelector(`.${PANEL_CLASS}`)) return;
  const cortex = form.querySelector('.script-cortex-controls');
  if (!cortex) return;

  const wrap = document.createElement('section');
  wrap.className = PANEL_CLASS;
  wrap.setAttribute('data-constellation-lens-ignore', 'true');
  wrap.innerHTML = `
    <div class="button-row">
      <button type="button" class="quiet" data-scene-cortex-acceptance>Dry-run scene cortex</button>
    </div>
    <div class="scene-cortex-acceptance-report" aria-live="polite">
      <p class="muted">Inspect the assembled cortex before invoking any model.</p>
    </div>
  `;
  cortex.append(wrap);
  const button = wrap.querySelector('[data-scene-cortex-acceptance]');
  const report = wrap.querySelector('.scene-cortex-acceptance-report');
  button.addEventListener('click', () => void run(form, button, report));
}

function scan(root = document) {
  root.querySelectorAll?.('form#script-form').forEach(attach);
}

function injectStyles() {
  if (document.querySelector('#scene-cortex-acceptance-styles')) return;
  const style = document.createElement('style');
  style.id = 'scene-cortex-acceptance-styles';
  style.textContent = `
    .${PANEL_CLASS} { margin-top:.7rem; padding-top:.65rem; border-top:1px solid color-mix(in srgb,var(--green) 16%,transparent); }
    .scene-cortex-acceptance-report { margin-top:.45rem; }
    .scene-cortex-acceptance-head { display:flex; align-items:baseline; justify-content:space-between; gap:.7rem; flex-wrap:wrap; }
    .scene-cortex-acceptance-head small { opacity:.65; }
    .scene-cortex-acceptance-report ul { list-style:none; padding:0; margin:.55rem 0; display:grid; gap:.3rem; }
    .scene-cortex-acceptance-report li { display:grid; grid-template-columns:auto 1fr; gap:.45rem; align-items:start; padding:.35rem .4rem; border-radius:.45rem; }
    .scene-cortex-acceptance-report li.pass { background:color-mix(in srgb,var(--green) 8%,transparent); }
    .scene-cortex-acceptance-report li.fail { background:color-mix(in srgb,var(--gold) 10%,transparent); }
    .scene-cortex-acceptance-report li div { display:grid; gap:.1rem; }
    .scene-cortex-acceptance-report li small { opacity:.65; }
  `;
  document.head.append(style);
}

export function installSceneCortexAcceptanceUi() {
  if (typeof document === 'undefined') return;
  injectStyles();
  scan();
  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => scan(app)).observe(app, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') installSceneCortexAcceptanceUi();
