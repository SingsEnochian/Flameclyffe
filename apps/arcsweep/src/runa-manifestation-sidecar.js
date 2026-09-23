import './runa-manifestation.css';
import { contextualOrganLaunchHref } from './organ-launch-route.js';
import { soundOrgan } from './sound-organ-registry.js';

export const RUNA_MANIFESTATION_SURFACE_VERSION = 'arcsweep.runa-manifestation-surface/v1';

const CONTROL_SELECTOR = '[data-runa-manifestation-controls]';
let observer = null;
let refreshQueued = false;
let lastStatus = null;

function os() {
  return globalThis.__arcsweepOS || null;
}

function context() {
  const session = os()?.session?.() || {};
  return {
    worldId: session.active_world_id || null,
    worldName: session.active_world_name || null,
    from: 'universal-codex',
  };
}

function toneLabHref() {
  return contextualOrganLaunchHref(soundOrgan('tone-lab'), context(), globalThis.location);
}

function button(action, label, pressed = null) {
  const pressedAttr = pressed == null ? '' : ` aria-pressed="${pressed ? 'true' : 'false'}"`;
  return `<button type="button" data-runa-action="${action}"${pressedAttr}>${label}</button>`;
}

function panelMarkup(surface) {
  const status = lastStatus || {};
  const humActive = Boolean(status.story_soundscape?.hum_active);
  const gatewayActive = Boolean(status.safe_gateway_active);
  const glyphActive = Boolean(status.glyph_sonification_enabled);
  const haptics = Boolean(status.native_haptics_available);
  return [
    `<section class="runa-manifestation-controls runa-manifestation-${surface}" data-runa-manifestation-controls="${surface}" aria-label="Runa manifestation controls">`,
      '<div class="runa-manifestation-heading">',
        '<span class="runa-manifestation-glyph" aria-hidden="true">ᚱ</span>',
        '<div><strong>Runa · Manifestation Bus</strong><small>World Hum · Safe Gateway · Glyph Voice · Haptics</small></div>',
      '</div>',
      '<div class="runa-manifestation-actions">',
        button('world-hum', humActive ? 'Stop World Hum' : 'World Hum', humActive),
        button('safe-gateway', gatewayActive ? 'Feather Gateway' : 'Safe Gateway', gatewayActive),
        button('glyph-voice', glyphActive ? 'Mute Glyph Voice' : 'Glyph Voice', glyphActive),
        button('haptic-pulse', haptics ? 'Haptic Tap' : 'Haptic unavailable', false),
        button('feather', 'Feather'),
        `<a data-runa-tone-lab href="${toneLabHref()}">Tone Lab ↗</a>`,
      '</div>',
      '<p class="runa-manifestation-status" data-runa-status aria-live="polite">Runa ready. Sound starts only from an explicit control.</p>',
    '</section>',
  ].join('');
}

function mountCodex() {
  const root = document.querySelector('#arcsweep-magic-book');
  if (!root || root.querySelector(`${CONTROL_SELECTOR}[data-runa-manifestation-controls="codex"]`)) return;
  const stage = root.querySelector('.magic-book-stage');
  if (!stage) return;
  stage.insertAdjacentHTML('beforebegin', panelMarkup('codex'));
  root.dataset.runaManifestationMounted = 'true';
}

function mountSoundRoom() {
  const host = document.querySelector('[data-story-soundscape]');
  if (!host || host.querySelector(`${CONTROL_SELECTOR}[data-runa-manifestation-controls="sound-room"]`)) return;
  host.insertAdjacentHTML('afterbegin', panelMarkup('sound-room'));
}

function mounts() {
  mountCodex();
  mountSoundRoom();
}

function setPanelStatus(message) {
  document.querySelectorAll(`${CONTROL_SELECTOR} [data-runa-status]`).forEach((node) => { node.textContent = message; });
}

function renderStatus() {
  document.querySelectorAll(CONTROL_SELECTOR).forEach((panel) => {
    const surface = panel.dataset.runaManifestationControls || 'surface';
    const replacement = document.createElement('template');
    replacement.innerHTML = panelMarkup(surface);
    panel.replaceWith(replacement.content.firstElementChild);
  });
}

async function readStatus() {
  const runtime = os();
  if (!runtime?.capabilities?.invoke) return null;
  const receipt = await runtime.capabilities.invoke('runa.manifestation.status', {}, {
    actor_id: 'human-ui',
    source: 'runa-manifestation-surface',
    authority: 'read',
  });
  if (receipt?.status !== 'applied') return null;
  lastStatus = receipt.output || null;
  renderStatus();
  return lastStatus;
}

async function invoke(capability, input, surface) {
  const runtime = os();
  if (!runtime?.capabilities?.invoke) throw new Error('ArcSweep OS capability registry is not ready.');
  const receipt = await runtime.capabilities.invoke(capability, input || {}, {
    actor_id: 'human-ui',
    source: `runa-manifestation-surface:${surface || 'unknown'}`,
    authority: 'operate',
    confirmed: true,
  });
  if (receipt?.status !== 'applied') throw new Error(receipt?.error || receipt?.reason || `${capability} was not applied.`);
  await readStatus();
  return receipt.output;
}

async function handleAction(buttonNode, panel) {
  const action = buttonNode.dataset.runaAction;
  const surface = panel?.dataset.runaManifestationControls || 'surface';
  const active = context();
  if (action === 'world-hum') {
    if (lastStatus?.story_soundscape?.hum_active) await invoke('runa.world-hum.stop', { reason: `toggle:${surface}` }, surface);
    else await invoke('runa.world-hum.start', { world_id: active.worldId, world_name: active.worldName }, surface);
    return;
  }
  if (action === 'safe-gateway') {
    if (lastStatus?.safe_gateway_active) await invoke('runa.safe-gateway.stop', { reason: `toggle:${surface}` }, surface);
    else await invoke('runa.safe-gateway.start', { hold: true, mode: 'gateway-offset', master: 0.12, mono_safe: false, phase_inverted: true, return_side: 'right' }, surface);
    return;
  }
  if (action === 'glyph-voice') {
    await invoke('runa.glyph-sonification.set', {
      enabled: !lastStatus?.glyph_sonification_enabled,
      haptics: false,
      world_id: active.worldId,
      world_name: active.worldName,
    }, surface);
    return;
  }
  if (action === 'haptic-pulse') {
    await invoke('runa.haptic.pulse', { pattern: [18, 24, 34] }, surface);
    return;
  }
  if (action === 'feather') {
    await invoke('runa.feather', { reason: `Universal Codex Feather:${surface}` }, surface);
  }
}

function installEvents() {
  document.addEventListener('click', (event) => {
    const buttonNode = event.target.closest?.('[data-runa-action]');
    if (!buttonNode) return;
    const panel = buttonNode.closest(CONTROL_SELECTOR);
    setPanelStatus('Runa is applying the requested manifestation…');
    void handleAction(buttonNode, panel)
      .then((output) => {
        const kind = output?.kind || 'manifestation';
        setPanelStatus(`Runa receipt: ${kind}.`);
      })
      .catch((error) => setPanelStatus(`Runa stopped: ${error.message}`));
  }, true);

  globalThis.addEventListener?.('arcsweep:runa-manifestation', (event) => {
    const detail = event?.detail;
    if (detail?.kind) setPanelStatus(`Runa receipt: ${detail.kind}.`);
    void readStatus().catch(() => {});
  });

  globalThis.addEventListener?.('arcsweep:story-soundscape-ready', () => { void readStatus().catch(() => {}); });
}

function scheduleMount() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    mounts();
  });
}

function boot() {
  mounts();
  installEvents();
  observer = new MutationObserver(scheduleMount);
  observer.observe(document.body, { childList: true, subtree: true });
  void readStatus().catch(() => {});
  globalThis.__arcsweepRunaManifestationSurface = Object.freeze({
    version: RUNA_MANIFESTATION_SURFACE_VERSION,
    refresh: readStatus,
    mount: mounts,
    destroy: () => observer?.disconnect(),
  });
}

if (document.body) boot();
else document.addEventListener('DOMContentLoaded', boot, { once: true });
