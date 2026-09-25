import { CODEX_ALIVE_EVENT } from './codex-alive-sidecar.js';
import { renderCodexNarrative } from './codex/codex-narrative-renderer.js';

export const CODEX_ATTENTION_NOTES_SCHEMA = 'hearthweave.codex-attention-notes/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const ALLOWED = new Set([
  'growth-claim',
  'growth-revision',
  'growth-contradiction',
  'growth-retired',
  'experiment-reflection',
  'unfinished-thread',
  'recurring-collaboration',
  'question',
]);

let installed = false;
let lastKey = '';

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function root() {
  return globalThis.document?.getElementById?.(ROOT_ID) || null;
}

function ensureNode() {
  const stage = root()?.querySelector?.('.magic-book-stage');
  if (!stage) return null;
  let node = stage.querySelector('[data-codex-attention-notes]');
  if (node) return node;
  node = document.createElement('aside');
  node.className = 'codex-attention-notes';
  node.dataset.codexAttentionNotes = CODEX_ATTENTION_NOTES_SCHEMA;
  node.setAttribute('aria-label', 'Remembered connections');
  stage.append(node);
  return node;
}

function aspectNames(manifestation) {
  const resolver = globalThis.__universalCodexAlive?.aspectName;
  return Object.fromEntries((manifestation?.aspectIds || []).map((id) => [id, resolver?.(id) || id]));
}

function selectedRows(snapshot) {
  return (snapshot?.attention || [])
    .filter(({ manifestation, score }) => manifestation && !manifestation.material?.live && score >= 4 && ALLOWED.has(manifestation.kind))
    .slice(0, 2);
}

function render(snapshot) {
  const node = ensureNode();
  if (!node) return;
  const rows = selectedRows(snapshot);
  const key = rows.map(({ manifestation }) => manifestation.id).join('|');
  if (!rows.length) {
    node.hidden = true;
    node.replaceChildren();
    lastKey = '';
    return;
  }

  node.hidden = false;
  if (key === lastKey) return;
  lastKey = key;
  node.innerHTML = rows.map(({ manifestation, score }, index) => {
    const text = renderCodexNarrative(manifestation, { aspectNames: aspectNames(manifestation) });
    return `<article class="codex-attention-note" data-source-id="${esc(manifestation.id)}" data-material="${esc(manifestation.material?.id || 'continuity')}" data-strength="${score >= 8 ? 'strong' : 'clear'}" style="--attention-note-index:${index}"><span>⌁</span><p>${esc(text)}</p></article>`;
  }).join('');
}

function installStyles() {
  if (document.getElementById('universal-codex-attention-note-styles')) return;
  const style = document.createElement('style');
  style.id = 'universal-codex-attention-note-styles';
  style.textContent = `
#${ROOT_ID} .codex-attention-notes{position:absolute;left:1.1%;top:22%;z-index:9;display:grid;gap:.42rem;width:min(15.5rem,24%);pointer-events:none}
#${ROOT_ID} .codex-attention-notes[hidden]{display:none}
#${ROOT_ID} .codex-attention-note{display:grid;grid-template-columns:auto 1fr;gap:.34rem;align-items:start;padding:.36rem .42rem;border-inline-start:1px solid color-mix(in srgb,var(--codex-old-gold) 26%,var(--codex-teal-500));background:linear-gradient(90deg,color-mix(in srgb,var(--codex-ocean-900) 16%,transparent),transparent 86%);opacity:.68;font-family:Georgia,'Times New Roman',serif;animation:codex-attention-arrive 420ms cubic-bezier(.2,.75,.2,1) 1 both}
#${ROOT_ID} .codex-attention-note[data-strength="strong"]{opacity:.82;border-inline-start-color:color-mix(in srgb,var(--codex-old-gold) 52%,var(--codex-seafoam-300))}
#${ROOT_ID} .codex-attention-note>span{color:color-mix(in srgb,var(--codex-old-gold) 64%,var(--codex-seafoam-300));font-size:.66rem;line-height:1.3}
#${ROOT_ID} .codex-attention-note>p{margin:0;color:color-mix(in srgb,var(--codex-foam-100) 78%,var(--codex-champagne));font-size:.55rem;line-height:1.42}
@keyframes codex-attention-arrive{from{opacity:0;transform:translateX(-3px)}to{transform:translateX(0)}}
@media(max-width:760px){#${ROOT_ID} .codex-attention-notes{left:.55rem;top:17%;width:min(12rem,38%)}}
@media(prefers-reduced-motion:reduce){#${ROOT_ID} .codex-attention-note{animation:none!important}}
`;
  document.head.append(style);
}

export function installCodexAttentionNotes() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener(CODEX_ALIVE_EVENT, (event) => render(event.detail || null));
}

if (typeof document !== 'undefined') installCodexAttentionNotes();
