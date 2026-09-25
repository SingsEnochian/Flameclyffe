import { INITIAL_ASPECTS } from './aspects/aspect-contract.js';
import { ASPECT_MESH_EVENTS, readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';
import { installCodexDesignTokens } from './codex/codex-design-tokens.js';
import { applyCodexMaterial } from './codex/codex-material-system.js';
import { projectUniversalCodex } from './codex/codex-semantic-projector.js';
import { readCodexPageContext } from './codex/codex-page-context.js';
import { selectCodexAttention } from './codex/codex-attention-engine.js';
import { computeCodexSemanticWear, wearCssVariables } from './codex/codex-semantic-wear.js';
import { codexRelationshipResidue } from './codex/codex-relationship-residue.js';
import { codexAspectSignature } from './codex/codex-aspect-signatures.js';
import { applyCodexQuietState, codexQuietState } from './codex/codex-quiet-state.js';

export const CODEX_ALIVE_SCHEMA = 'hearthweave.universal-codex-alive/v0.1';
export const CODEX_ALIVE_EVENT = 'arcsweep:universal-codex-alive-changed';

const ROOT_ID = 'arcsweep-magic-book';
const aspectNames = new Map(INITIAL_ASPECTS.map((aspect) => [aspect.id, aspect.name]));
const aspectIdsByName = new Map(INITIAL_ASPECTS.map((aspect) => [aspect.name, aspect.id]));

let installed = false;
let observer = null;
let queued = false;
let coalition = null;
let latest = null;

function root() {
  return globalThis.document?.getElementById?.(ROOT_ID) || null;
}

function setCssVariables(node, variables = {}) {
  if (!node?.style) return;
  for (const [name, value] of Object.entries(variables)) node.style.setProperty(name, value);
}

function decorateAspectNode(node) {
  const labels = [...(node?.querySelectorAll?.('strong, span') || [])]
    .map((item) => item.textContent?.trim() || '')
    .filter(Boolean);
  const namedLabel = labels.find((label) => aspectIdsByName.has(label));
  const aspectId = node?.dataset?.codexAspect || aspectIdsByName.get(namedLabel) || null;
  if (!aspectId) return;
  const runtime = readAspectMeshRuntime();
  const signature = codexAspectSignature(aspectId, runtime?.growthFor?.(aspectId));
  node.dataset.codexAspect = aspectId;
  node.dataset.codexGlyph = signature.glyph;
  node.dataset.codexLine = signature.line;
  node.dataset.codexSpacing = signature.spacing;
  node.dataset.codexCadence = signature.cadence;
  node.dataset.codexTraceDensity = signature.traceDensity;
  node.dataset.codexCollaborationTexture = signature.collaborationTexture;
}

function decorateExistingSurfaces(book) {
  for (const node of book.querySelectorAll('.codex-margin-note')) {
    applyCodexMaterial(node, 'living', { active: true });
    decorateAspectNode(node);
  }
  for (const node of book.querySelectorAll('.codex-proposal-fold')) {
    applyCodexMaterial(node, 'possible');
    decorateAspectNode(node);
  }
  for (const node of book.querySelectorAll('.codex-branch-leaf')) {
    applyCodexMaterial(node, 'liminal');
    decorateAspectNode(node);
  }
  for (const node of book.querySelectorAll('.codex-trace-bookmark')) applyCodexMaterial(node, 'continuity');
  for (const node of book.querySelectorAll('.codex-coalition-whisper')) applyCodexMaterial(node, 'living', { active: true });
  for (const node of book.querySelectorAll('.codex-growth-garden')) applyCodexMaterial(node, 'organic');
  for (const node of book.querySelectorAll('.codex-experiment-bed')) {
    const running = node.textContent?.toLowerCase().includes('trying');
    applyCodexMaterial(node, running ? 'living' : 'possible', { active: running });
  }
}

function runtimeSnapshot() {
  const runtime = readAspectMeshRuntime();
  const book = root();
  if (!runtime || !book) return null;
  const pageContext = readCodexPageContext(book);
  const projection = projectUniversalCodex({
    messages: runtime.bus?.all?.() || [],
    growthSnapshot: runtime.growthSnapshot?.() || null,
    experimentSnapshot: runtime.experimentSnapshot?.() || null,
    coalition,
  });
  const attention = selectCodexAttention(projection.manifestations, pageContext, { minimumScore: 2, limit: 8, includeLive: true });
  const wear = computeCodexSemanticWear(projection.manifestations, pageContext);
  const relationships = codexRelationshipResidue(runtime.growthSnapshot?.() || {});
  const quiet = codexQuietState({ manifestations: projection.manifestations, attention });
  return Object.freeze({
    schema: CODEX_ALIVE_SCHEMA,
    pageContext,
    projection,
    attention,
    wear,
    relationships,
    quiet,
  });
}

function dispatch(snapshot) {
  const target = globalThis.document;
  if (!target?.dispatchEvent || typeof CustomEvent === 'undefined') return;
  target.dispatchEvent(new CustomEvent(CODEX_ALIVE_EVENT, { detail: snapshot }));
}

export function refreshUniversalCodexAlive() {
  queued = false;
  const book = root();
  const snapshot = runtimeSnapshot();
  if (!book || !snapshot) return null;
  latest = snapshot;
  book.dataset.codexAlive = CODEX_ALIVE_SCHEMA;
  book.dataset.codexWear = snapshot.wear.band;
  book.dataset.codexAttentionCount = String(snapshot.attention.length);
  book.dataset.codexRelationshipCount = String(snapshot.relationships.length);
  setCssVariables(book, wearCssVariables(snapshot.wear));
  applyCodexQuietState(book, snapshot.quiet);
  decorateExistingSurfaces(book);
  dispatch(snapshot);
  return snapshot;
}

function scheduleRefresh() {
  if (queued) return;
  queued = true;
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refreshUniversalCodexAlive);
  else queueMicrotask(refreshUniversalCodexAlive);
}

function onCoalitionStarted(event) {
  const item = event.detail?.coalition || {};
  coalition = {
    id: item.id || event.detail?.traceId || null,
    traceId: event.detail?.traceId || item.id || null,
    purpose: item.purpose || '',
    members: [...(item.members || [])],
    state: 'working',
    createdAt: item.createdAt || new Date().toISOString(),
  };
  scheduleRefresh();
}

function onCoalitionComplete(event) {
  const item = event.detail?.coalition || {};
  coalition = {
    id: item.id || event.detail?.traceId || null,
    traceId: event.detail?.traceId || item.id || null,
    purpose: item.purpose || '',
    members: [...(item.members || [])],
    state: 'returned',
    createdAt: item.createdAt || '',
  };
  scheduleRefresh();
  setTimeout(() => {
    if (coalition?.state === 'returned') coalition = null;
    scheduleRefresh();
  }, 900);
}

function installStyles() {
  const doc = globalThis.document;
  if (!doc?.head || doc.getElementById('universal-codex-alive-styles')) return;
  const style = doc.createElement('style');
  style.id = 'universal-codex-alive-styles';
  style.textContent = `
#${ROOT_ID}[data-codex-alive]{--codex-live-shadow:0 0 14px color-mix(in srgb,var(--codex-teal-500) 18%,transparent);--codex-hairline:color-mix(in srgb,var(--codex-crystal-edge) 14%,transparent)}
#${ROOT_ID}[data-codex-alive] .magic-book-stage{isolation:isolate}
#${ROOT_ID}[data-codex-alive] [data-codex-material]{transition:border-color 220ms ease,background-color 220ms ease,box-shadow 220ms ease,opacity 220ms ease,transform 220ms ease}
#${ROOT_ID}[data-codex-alive] [data-codex-material-family="glass"]{border-color:color-mix(in srgb,var(--codex-crystal-edge) 18%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--codex-glass-smoke) 66%,transparent),color-mix(in srgb,var(--codex-glass-teal) 30%,transparent))!important;box-shadow:var(--codex-shadow-glass),var(--codex-shadow-inset);backdrop-filter:blur(12px) saturate(112%)}
#${ROOT_ID}[data-codex-alive] [data-codex-material="liminal"]{border-color:color-mix(in srgb,var(--codex-lilac-300) 32%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--codex-indigo-600) 32%,transparent),color-mix(in srgb,var(--codex-glass-smoke) 72%,transparent))!important}
#${ROOT_ID}[data-codex-alive] [data-codex-material="organic"]{border-color:color-mix(in srgb,var(--codex-moss-600) 38%,transparent)!important}
#${ROOT_ID}[data-codex-alive] [data-codex-material="enduring"]{border-color:color-mix(in srgb,var(--codex-old-gold) 45%,transparent)!important}
#${ROOT_ID}[data-codex-alive] [data-codex-active="true"]{border-color:color-mix(in srgb,var(--codex-teal-500) 46%,transparent)!important;box-shadow:var(--codex-live-shadow)}
#${ROOT_ID}[data-codex-alive] .codex-margin-note{background:linear-gradient(90deg,color-mix(in srgb,var(--codex-teal-800) 13%,transparent),transparent 72%)!important;border-inline-start:1px solid color-mix(in srgb,var(--codex-teal-500) 42%,transparent)!important;box-shadow:none!important}
#${ROOT_ID}[data-codex-alive] .codex-margin-note[data-codex-line="cross"]{border-inline-start-style:dashed!important}
#${ROOT_ID}[data-codex-alive] .codex-margin-note[data-codex-line="return"]{border-inline-start-color:color-mix(in srgb,var(--codex-old-gold) 42%,transparent)!important}
#${ROOT_ID}[data-codex-alive] .codex-margin-note[data-codex-spacing="compact"]{letter-spacing:-.01em}
#${ROOT_ID}[data-codex-alive] .codex-trace-bookmark{background:color-mix(in srgb,var(--codex-glass-smoke) 72%,transparent)!important;border-color:color-mix(in srgb,var(--codex-old-gold) 22%,transparent)!important}
#${ROOT_ID}[data-codex-alive] .codex-growth-garden{--green:var(--codex-moss-600);--gold:var(--codex-old-gold)}
#${ROOT_ID}[data-codex-alive] .codex-experiment-bed{--gold:var(--codex-champagne);--green:var(--codex-teal-500)}
#${ROOT_ID}[data-codex-wear="touched"] .magic-book-stage{filter:saturate(.995)}
#${ROOT_ID}[data-codex-wear="familiar"] .magic-book-stage{filter:saturate(.99) contrast(1.005)}
#${ROOT_ID}[data-codex-wear="deep"] .magic-book-stage{filter:saturate(.985) contrast(1.008)}
#${ROOT_ID}[data-codex-quiet="true"] [data-codex-active="true"]{box-shadow:none}
#${ROOT_ID}[data-codex-quiet="true"] .codex-wonder-listening{opacity:.58}
@media (prefers-reduced-motion: reduce){#${ROOT_ID}[data-codex-alive] [data-codex-material]{transition:none!important;animation:none!important}}
`;
  doc.head.append(style);
}

export function installUniversalCodexAlive() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installCodexDesignTokens(document);
  installStyles();
  const events = [
    ASPECT_MESH_EVENTS.ready,
    ASPECT_MESH_EVENTS.message,
    ASPECT_MESH_EVENTS.growthChanged,
    ASPECT_MESH_EVENTS.experimentChanged,
    ASPECT_MESH_EVENTS.experimentStarted,
    ASPECT_MESH_EVENTS.experimentComplete,
    ASPECT_MESH_EVENTS.experimentReflected,
    'arcsweep:magic-book-ready',
    'arcsweep:magic-book-receipt',
  ];
  for (const name of events) document.addEventListener(name, scheduleRefresh);
  document.addEventListener(ASPECT_MESH_EVENTS.coalitionStarted, onCoalitionStarted);
  document.addEventListener(ASPECT_MESH_EVENTS.coalitionComplete, onCoalitionComplete);
  observer = new MutationObserver(() => {
    const book = root();
    if (book && !book.hidden) scheduleRefresh();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.__universalCodexAlive = Object.freeze({
    schema: CODEX_ALIVE_SCHEMA,
    snapshot: () => latest || runtimeSnapshot(),
    refresh: refreshUniversalCodexAlive,
    aspectName: (id) => aspectNames.get(id) || id,
  });
  scheduleRefresh();
}

if (typeof document !== 'undefined') installUniversalCodexAlive();
