import {
  buildSessionPromptEnvelope,
  readActiveSessionContext,
  sessionPromptEnvelopeToMarkdown,
} from './session-context-client.js';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function humanize(value) {
  return String(value ?? '').replaceAll('-', ' ');
}

function announceContext(context) {
  const snapshot = deepFreeze(structuredClone(context));
  Object.defineProperty(window, 'arcsweepSessionContext', {
    value: snapshot,
    configurable: true,
    enumerable: false,
    writable: false,
  });
  window.dispatchEvent(new CustomEvent('arcsweep:session-context-ready', {
    detail: {
      session_context_id: snapshot.session_context_id,
      world_slug: snapshot.world_slug,
      item_count: snapshot.items.length,
      authority_scope: snapshot.authority.scope,
      canon_commit: false,
    },
  }));
}

async function copyContext(context, status) {
  const envelope = buildSessionPromptEnvelope(context);
  const markdown = sessionPromptEnvelopeToMarkdown(envelope);
  try {
    await navigator.clipboard.writeText(markdown);
    status.textContent = 'Session packet copied';
  } catch {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `arcsweep-session-${context.world_slug}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    status.textContent = 'Clipboard blocked; packet downloaded';
  }
}

function installStyles() {
  if (document.getElementById('arcsweep-session-indicator-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-session-indicator-styles';
  style.textContent = `
    .arcsweep-session-indicator {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9998;
      width: min(390px, calc(100vw - 36px));
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 11px 13px;
      align-items: center;
      padding: 13px 14px;
      border: 1px solid rgba(169, 214, 176, 0.42);
      border-radius: 14px;
      color: #f4ead7;
      background: rgba(8, 18, 23, 0.95);
      box-shadow: 0 18px 58px rgba(0, 0, 0, 0.48);
      backdrop-filter: blur(16px);
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    }
    .arcsweep-session-indicator .mark {
      display: grid;
      place-items: center;
      width: 34px;
      aspect-ratio: 1;
      border: 1px solid rgba(126, 185, 177, 0.45);
      border-radius: 50%;
      color: #a9d6b0;
    }
    .arcsweep-session-indicator .copy { display: grid; gap: 2px; min-width: 0; }
    .arcsweep-session-indicator strong { font-family: Georgia, serif; font-weight: 500; }
    .arcsweep-session-indicator span { color: #b6a98f; font-size: 0.76rem; overflow-wrap: anywhere; }
    .arcsweep-session-indicator .actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .arcsweep-session-indicator button,
    .arcsweep-session-indicator a {
      border: 1px solid rgba(126, 185, 177, 0.32);
      border-radius: 8px;
      color: #f4ead7;
      background: rgba(126, 185, 177, 0.08);
      padding: 7px 9px;
      text-decoration: none;
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .arcsweep-session-indicator .status { margin-left: auto; color: #a9d6b0; }
    @media (max-width: 620px) {
      .arcsweep-session-indicator { right: 8px; bottom: 8px; width: calc(100vw - 16px); }
      .arcsweep-session-indicator .actions { flex-wrap: wrap; }
      .arcsweep-session-indicator .status { width: 100%; margin-left: 0; }
    }
  `;
  document.head.append(style);
}

function renderIndicator(context) {
  document.getElementById('arcsweep-session-indicator')?.remove();
  installStyles();

  const aside = document.createElement('aside');
  aside.id = 'arcsweep-session-indicator';
  aside.className = 'arcsweep-session-indicator';
  aside.setAttribute('aria-label', 'Active Arcsweep session continuity');

  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = '↦';

  const copy = document.createElement('div');
  copy.className = 'copy';
  const title = document.createElement('strong');
  title.textContent = `${humanize(context.world_slug)} continuity loaded`;
  const detail = document.createElement('span');
  detail.textContent = `${context.items.length} reviewed item${context.items.length === 1 ? '' : 's'} · session only · canon false`;
  copy.append(title, detail);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = 'Copy session packet';
  const gateLink = document.createElement('a');
  gateLink.href = './arcsweep-continuity/';
  gateLink.textContent = 'Open Continuity Gate';
  const status = document.createElement('span');
  status.className = 'status';
  status.textContent = context.session_context_id;
  copyButton.addEventListener('click', () => copyContext(context, status));
  actions.append(copyButton, gateLink, status);

  aside.append(mark, copy, actions);
  document.body.append(aside);
}

function boot() {
  const context = readActiveSessionContext();
  if (!context) return;
  announceContext(context);
  renderIndicator(context);
}

window.addEventListener('arcsweep:request-session-context', boot);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
