import { CODEX_ALIVE_EVENT } from './codex-alive-sidecar.js';

export const CODEX_RESIDUE_UI_SCHEMA = 'hearthweave.codex-residue-ui/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
let installed = false;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function root() {
  return globalThis.document?.getElementById?.(ROOT_ID) || null;
}

function ensureLayer() {
  const stage = root()?.querySelector?.('.magic-book-stage');
  if (!stage) return null;
  let layer = stage.querySelector('[data-codex-residue-layer]');
  if (layer) return layer;
  layer = document.createElement('div');
  layer.className = 'codex-residue-layer';
  layer.dataset.codexResidueLayer = CODEX_RESIDUE_UI_SCHEMA;
  layer.setAttribute('aria-hidden', 'true');
  stage.append(layer);
  return layer;
}

function braids(snapshot) {
  return (snapshot?.relationships || []).slice(0, 5).map((row, index) => {
    const pair = row.aspectIds.join(' + ');
    return `<span class="codex-residue-braid" data-weight="${esc(row.braidWeight)}" style="--braid-index:${index};--braid-weight:${Number(row.lineWeight || 1)}" title="${esc(`${pair}: repeated collaboration across ${row.traceCount} traces`)}"></span>`;
  }).join('');
}

function ribbons(snapshot) {
  const open = (snapshot?.projection?.manifestations || [])
    .filter((row) => row.kind === 'unfinished-thread')
    .slice(-5)
    .reverse();
  return open.map((row, index) => `<span class="codex-residue-ribbon" data-trace="${esc(row.traceId || '')}" style="--ribbon-index:${index}" title="${esc(row.text || 'unfinished thread')}"></span>`).join('');
}

function attentionMarks(snapshot) {
  return (snapshot?.attention || []).slice(0, 4).map(({ manifestation, score }, index) => {
    if (!manifestation || manifestation.material?.live) return '';
    return `<span class="codex-attention-mark" data-kind="${esc(manifestation.kind)}" data-score-band="${score >= 8 ? 'strong' : score >= 4 ? 'clear' : 'faint'}" style="--attention-index:${index}" title="${esc(manifestation.text || manifestation.kind)}"></span>`;
  }).join('');
}

function render(snapshot) {
  const layer = ensureLayer();
  if (!layer) return;
  const markup = `${braids(snapshot)}${ribbons(snapshot)}${attentionMarks(snapshot)}`;
  if (layer.innerHTML !== markup) layer.innerHTML = markup;
  const book = root();
  if (book) {
    book.dataset.codexBraidCount = String((snapshot?.relationships || []).length);
    book.dataset.codexOpenRibbonCount = String((snapshot?.projection?.manifestations || []).filter((row) => row.kind === 'unfinished-thread').length);
  }
}

function installStyles() {
  if (document.getElementById('universal-codex-residue-styles')) return;
  const style = document.createElement('style');
  style.id = 'universal-codex-residue-styles';
  style.textContent = `
#${ROOT_ID} .codex-residue-layer{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:visible}
#${ROOT_ID} .codex-residue-braid{position:absolute;top:calc(9% + var(--braid-index)*1.05rem);left:.32rem;width:clamp(1.6rem,4.6vw,4.5rem);height:2px;opacity:.46;background:linear-gradient(90deg,color-mix(in srgb,var(--codex-moss-600) 24%,transparent),color-mix(in srgb,var(--codex-old-gold) 52%,transparent),color-mix(in srgb,var(--codex-teal-500) 18%,transparent));transform:rotate(calc(-1deg + var(--braid-index)*.22deg));transform-origin:left center;border-radius:999px;box-shadow:0 0 calc(var(--braid-weight)*1px) color-mix(in srgb,var(--codex-old-gold) 18%,transparent)}
#${ROOT_ID} .codex-residue-braid[data-weight="established"]{opacity:.62;height:2.4px}
#${ROOT_ID} .codex-residue-braid[data-weight="deep"]{opacity:.76;height:2.8px}
#${ROOT_ID} .codex-residue-braid::after{content:'';position:absolute;inset:-2px 0;background:repeating-linear-gradient(90deg,transparent 0 6px,color-mix(in srgb,var(--codex-seafoam-300) 22%,transparent) 6px 7px,transparent 7px 12px);opacity:.5}
#${ROOT_ID} .codex-residue-ribbon{position:absolute;right:calc(.4rem + var(--ribbon-index)*.38rem);top:-.28rem;width:.22rem;height:clamp(2.4rem,8vh,5.2rem);border-radius:0 0 .22rem .22rem;background:linear-gradient(180deg,color-mix(in srgb,var(--codex-old-gold) 72%,transparent),color-mix(in srgb,var(--codex-copper) 38%,transparent));opacity:.52;box-shadow:0 2px 6px rgba(0,0,0,.24)}
#${ROOT_ID} .codex-attention-mark{position:absolute;right:calc(1rem + var(--attention-index)*.58rem);top:calc(48% + var(--attention-index)*.85rem);width:.34rem;height:.34rem;border:1px solid color-mix(in srgb,var(--codex-seafoam-300) 48%,transparent);transform:rotate(45deg);opacity:.32}
#${ROOT_ID} .codex-attention-mark[data-score-band="clear"]{opacity:.52}
#${ROOT_ID} .codex-attention-mark[data-score-band="strong"]{opacity:.72;border-color:color-mix(in srgb,var(--codex-old-gold) 56%,var(--codex-seafoam-300))}
#${ROOT_ID}[data-codex-quiet="true"] .codex-attention-mark{opacity:.22}
@media(max-width:760px){#${ROOT_ID} .codex-residue-braid{left:.16rem;width:2.1rem}#${ROOT_ID} .codex-residue-ribbon{right:calc(.2rem + var(--ribbon-index)*.32rem)}}
@media(prefers-reduced-motion:reduce){#${ROOT_ID} .codex-residue-layer *{animation:none!important;transition:none!important}}
`;
  document.head.append(style);
}

export function installCodexResidueUI() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener(CODEX_ALIVE_EVENT, (event) => render(event.detail || null));
  document.addEventListener('arcsweep:magic-book-ready', () => ensureLayer());
}

if (typeof document !== 'undefined') installCodexResidueUI();
