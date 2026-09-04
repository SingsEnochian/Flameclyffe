const GLOBAL_SIDECARS = Object.freeze([
  './observer-bridge.js',
  './rich-text-core.js',
  './soundfont-runtime-repair.js',
  './active-input-continuity.js',
  './mobile-navigation-sidecar.js',
  './creative-organ-navigation.js',
  './sound-organ-navigation.js',
  './semantic-lab-sidecar.js',
  './semantic-lab-v2-sidecar.js',
  './sidecar-health-panel.js',
]);

const SIDECAR_PACKS = Object.freeze({
  worlds: Object.freeze(['./world-registry-persistence-sidecar.js','./possible-worlds-live-ui.js','./terra-prime-truth-sidecar.js','./instrument-console-sidecar.js']),
  feedback: Object.freeze(['./feedback-queue-bootstrap.js','./feedback-chamber-v2.js']),
  house: Object.freeze([
    './model-presence-bus.js','./runtime-presence-diagnostics.js','./runtime-integration-bootstrap.js','./constellation-runtime-adapter.js','./hosted-house-session-ui.js','./house-chat-authoritative-surface.js','./house-commons-chat-v5.js','./house-chat-runtime-roster-ui.js','./house-braid-receipt-ui.js','./house-browser-smoke.js','./house-roleplay-mode.js','./formatted-text-vestments.js','./house-commons-attachments.js','./house-chat-v5-compat.js','./house-chat-room-management-v5.js','./house-chat-room-social.js','./house-chat-tools-v5.js','./house-chat-vestments-v1.js','./house-chat-pretty-v2.js','./house-chat-pretty-v3.js','./runtime-envelope-live-ui.js','./model-presence-live-ui.js','./model-reply-proof.js','./house-lanternbridge-chat.js','./house-commons-command-room.js','./house-commons-thread-restoration.js','./house-commons-deep-link-router.js','./constellation-presence.js','./runtime-world-presence.js',
  ]),
  writing: Object.freeze(['./self-authorship-panel.js','./script-cortex-controls.js','./scene-cognition-ui.js','./story-mode-sidecar.js']),
  worldseed: Object.freeze(['./worldseed-live-ui.js','./possible-worlds-live-ui.js','./worldseed-package-live-ui.js','./worldseed-threshold-live-ui.js','./worldseed-braid-live-ui.js','./worldseed-seed-library-live-ui.js']),
  deep: Object.freeze(['./continuity-evidence-sidecar.js','./continuity-experiment-sidecar.js','./canon-intelligence-live-ui.js']),
  forge: Object.freeze(['./instrument-sidecars.js','./react-ion-helm-sidecar.js','./glyph-drift-observatory-sidecar.js']),
  canon: Object.freeze(['./canon-web-link-sidecar.js','./canon-intelligence-live-ui.js']),
  aemeth: Object.freeze(['./aemeth-chamber-live.js','./aemeth-oa-route-status.js']),
});

const SIDECARS = Object.freeze([...GLOBAL_SIDECARS,...new Set(Object.values(SIDECAR_PACKS).flat())]);

const SIDECAR_LOADERS = import.meta.glob([
  './observer-bridge.js','./feedback-queue-bootstrap.js','./rich-text-core.js','./soundfont-runtime-repair.js','./active-input-continuity.js','./mobile-navigation-sidecar.js','./creative-organ-navigation.js','./sound-organ-navigation.js','./semantic-lab-sidecar.js','./semantic-lab-v2-sidecar.js','./sidecar-health-panel.js','./world-registry-persistence-sidecar.js','./terra-prime-truth-sidecar.js','./instrument-console-sidecar.js','./instrument-sidecars.js','./react-ion-helm-sidecar.js','./glyph-drift-observatory-sidecar.js','./continuity-evidence-sidecar.js','./continuity-experiment-sidecar.js','./constellation-runtime-adapter.js','./model-presence-bus.js','./model-presence-live-ui.js','./model-reply-proof.js','./runtime-presence-diagnostics.js','./runtime-integration-bootstrap.js','./hosted-house-session-ui.js','./house-chat-authoritative-surface.js','./house-commons-chat-v5.js','./house-chat-runtime-roster-ui.js','./house-braid-receipt-ui.js','./house-browser-smoke.js','./house-roleplay-mode.js','./formatted-text-vestments.js','./house-lanternbridge-chat.js','./house-commons-command-room.js','./house-commons-thread-restoration.js','./house-commons-deep-link-router.js','./house-commons-attachments.js','./house-chat-v5-compat.js','./house-chat-room-management-v5.js','./house-chat-room-social.js','./house-chat-tools-v5.js','./house-chat-vestments-v1.js','./house-chat-pretty-v2.js','./house-chat-pretty-v3.js','./runtime-envelope-live-ui.js','./canon-intelligence-live-ui.js','./constellation-presence.js','./runtime-world-presence.js','./self-authorship-panel.js','./script-cortex-controls.js','./scene-cognition-ui.js','./worldseed-live-ui.js','./possible-worlds-live-ui.js','./worldseed-package-live-ui.js','./worldseed-threshold-live-ui.js','./worldseed-braid-live-ui.js','./worldseed-seed-library-live-ui.js','./canon-web-link-sidecar.js','./feedback-chamber-v2.js','./story-mode-sidecar.js','./aemeth-chamber-live.js','./aemeth-oa-route-status.js',
]);

const loadedSidecars = new Set();
const sidecarPromises = new Map();
const packPromises = new Map();
let schedulerObserver = null;
let scanQueued = false;

function diagnostics() {
  if (!globalThis.__arcsweepSidecarDiagnostics) globalThis.__arcsweepSidecarDiagnostics = { schema:'arcsweep.sidecar-scheduler/v1', loaded:[], failures:[], packs:[] };
  return globalThis.__arcsweepSidecarDiagnostics;
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') { requestIdleCallback(() => resolve(), { timeout:180 }); return; }
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

async function loadSidecar(specifier, pack = 'global') {
  if (loadedSidecars.has(specifier)) return null;
  if (sidecarPromises.has(specifier)) return sidecarPromises.get(specifier);
  const promise = (async () => {
    const load = SIDECAR_LOADERS[specifier];
    if (!load) throw new Error(`Sidecar is registered but absent from the build graph: ${specifier}`);
    const started = performance?.now?.() ?? Date.now();
    await load();
    const elapsedMs = Math.round((performance?.now?.() ?? Date.now()) - started);
    loadedSidecars.add(specifier);
    diagnostics().loaded.push({ specifier, pack, elapsedMs });
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:sidecar-loaded',{ detail:{ specifier, pack, elapsedMs } }));
    return { specifier, pack, elapsedMs };
  })().catch((error) => {
    const failure = { specifier, pack, message:error?.message || String(error) };
    diagnostics().failures.push(failure);
    console.error(`[Arcsweep] sidecar failed: ${specifier}`, error);
    return failure;
  }).finally(() => sidecarPromises.delete(specifier));
  sidecarPromises.set(specifier, promise);
  return promise;
}

export async function mountSidecarPack(name) {
  if (!SIDECAR_PACKS[name]) return [];
  if (packPromises.has(name)) return packPromises.get(name);
  const promise = (async () => {
    const results = [];
    for (const specifier of SIDECAR_PACKS[name]) { results.push(await loadSidecar(specifier, name)); await yieldToBrowser(); }
    diagnostics().packs.push({ name, completedAt:new Date().toISOString() });
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:sidecar-pack-ready',{ detail:{ name, failures:results.filter((item) => item?.message) } }));
    return results;
  })();
  packPromises.set(name, promise);
  return promise;
}

const ROOM_PACKS = Object.freeze({ worlds:['worlds'], scripts:['writing'], records:['writing'], feedback:['feedback'], commons:['house'], forge:['forge'], 'deep-observer':['deep'], seedhouse:['worldseed'], ingest:['canon'], timeline:['deep'], scenarios:['writing'], 'aemeth-lens':['aemeth'] });

function packNamesForTrigger(node) {
  if (!node) return [];
  const values = [node.dataset?.room,node.dataset?.roomId,node.dataset?.collectionRoom,node.dataset?.recordRoom].filter(Boolean);
  const names = new Set();
  for (const value of values) for (const name of ROOM_PACKS[value] || []) names.add(name);
  return [...names];
}

function triggerDetectedPacks() {
  const selectors = [['house','#commons-form'],['worlds','#world-registry-form'],['feedback','#feedback-form'],['aemeth','#record-form[data-room-id="aemeth-lens"]'],['worldseed','#record-form[data-room-id="seedhouse"]'],['canon','#record-form[data-room-id="ingest"]']];
  for (const [name, selector] of selectors) if (document.querySelector(selector)) void mountSidecarPack(name);
}

function schedulePackScan() {
  if (scanQueued) return;
  scanQueued = true;
  requestAnimationFrame(() => { scanQueued = false; triggerDetectedPacks(); });
}

function installPackScheduler() {
  if (schedulerObserver || typeof document === 'undefined') return;
  document.addEventListener('click',(event) => {
    const trigger = event.target?.closest?.('[data-room],[data-room-id],[data-collection-room],[data-record-room]');
    const packs = packNamesForTrigger(trigger);
    if (packs.length) setTimeout(() => packs.forEach((name) => void mountSidecarPack(name)), 0);
  }, true);
  schedulerObserver = new MutationObserver(schedulePackScan);
  schedulerObserver.observe(document.body,{ childList:true, subtree:true });
  schedulePackScan();
  globalThis.addEventListener?.('beforeunload',() => schedulerObserver?.disconnect(),{ once:true });
}

export async function mountArcsweepSidecars() {
  const results = [];
  for (const specifier of GLOBAL_SIDECARS) { results.push(await loadSidecar(specifier,'global')); await yieldToBrowser(); }
  installPackScheduler();
  const params = new URLSearchParams(globalThis.location?.search || '');
  if (params.get('sidecars') === 'full') for (const name of Object.keys(SIDECAR_PACKS)) await mountSidecarPack(name); else triggerDetectedPacks();
  const failures = results.filter((item) => item?.message);
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:sidecars-ready',{ detail:{ failures, scope:'global', lazyPacks:true } }));
  return failures;
}

export { GLOBAL_SIDECARS, SIDECARS, SIDECAR_LOADERS, SIDECAR_PACKS };
