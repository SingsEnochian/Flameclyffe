import { normaliseMaterialSignal } from './material-state.js';

export const FAEBERPUNK_SCHEMA = 'wayglass.faeberpunk-presentation/v1';
const SOUND_KINDS = Object.freeze({ handoff: 'route:pending', return: 'waygate:return', inscription: 'fold:compass', chamber: 'chamber:changed' });
const MODES = new Set(['wake', 'rest', 'inscription', 'handoff', 'return']);
const bounded = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// A presentation frame, not a cognition, provenance, consent or canon receipt.
// Legacy material signals contain no actor, model or source identity: never invent them.
export function faeberpunkFrame(detail = {}, { reducedMotion = false, stopped = false } = {}) {
  const material = normaliseMaterialSignal(detail);
  const mode = MODES.has(material.mode) ? material.mode : 'wake';
  const still = reducedMotion || stopped || mode === 'rest';
  return Object.freeze({
    schema: FAEBERPUNK_SCHEMA,
    mode,
    phase: stopped ? 'feather' : still ? 'still' : 'active',
    channel: material.channel,
    canon_state: material.canon_state,
    light: stopped ? 0 : bounded(0.12 + material.strength * 0.46 + material.intent * 0.18),
    pigment: bounded(material.ownership * 0.6 + material.handoff_progress * 0.4),
    transition_ms: still ? 0 : 260,
    observed_transport: false,
    model_inference: false,
  });
}

export function installFaeberpunkBridge({
  scope = globalThis,
  root = scope.document?.documentElement,
  inscriptionHost = null,
  soundscape = null,
} = {}) {
  if (!root?.style || !root?.dataset) return null;
  const preference = scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion = preference?.matches === true;
  let stopped = false;
  let disposed = false;
  let lastSignal = { mode: 'rest', strength: 0 };
  let frame = null;
  let inscription = null;
  let panel = null;
  if (inscriptionHost?.append && scope.document?.createElement) {
    panel = scope.document.createElement('div');
    panel.className = 'wg-fae-inscription';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Wyrdrune source and English reading');
    const glyphs = scope.document.createElement('code');
    glyphs.className = 'wg-fae-inscription-source';
    glyphs.setAttribute('aria-label', 'Wyrdrune source');
    const reading = scope.document.createElement('span');
    reading.className = 'wg-fae-inscription-reading';
    reading.setAttribute('aria-label', 'English reading');
    panel.append(glyphs, reading);
    inscriptionHost.append(panel);
  }
  function render() {
    if (disposed) return null;
    frame = faeberpunkFrame(lastSignal, { reducedMotion, stopped });
    root.dataset.wgFaePhase = frame.phase;
    root.dataset.wgFaeMode = frame.mode;
    root.dataset.wgFaeChannel = frame.channel;
    root.dataset.wgFaeCanon = frame.canon_state;
    root.style.setProperty('--wg-fae-light', frame.light.toFixed(3));
    root.style.setProperty('--wg-fae-pigment', frame.pigment.toFixed(3));
    root.style.setProperty('--wg-fae-transition', `${frame.transition_ms}ms`);
    return frame;
  }
  function onMaterial(event) {
    if (stopped || disposed) return;
    lastSignal = event?.detail || {};
    render();
  }
  function onFeather(event) {
    if (event?.detail?.stopped === true) { stopped = true; if (panel) panel.hidden = true; render(); }
    else if (event?.detail?.stopped === false && event.detail.confirmed === true) {
      // Release does not restore the previous active presentation or audio.
      stopped = false;
      lastSignal = { mode: 'rest', strength: 0 };
      render();
    }
  }
  function onPreference(event) { reducedMotion = event.matches === true; render(); }
  function onInscription(event) {
    if (disposed) return;
    const detail = event?.detail;
    if (detail?.clear === true) { inscription = null; if (panel) panel.hidden = true; lastSignal = { mode: 'rest', strength: 0 }; render(); return; }
    if (stopped || detail?.owner_presentation_consent !== true) return;
    // No transliteration, inferred English, or fabricated WTL source.
    if (typeof detail?.wyrdrune !== 'string' || !detail.wyrdrune.trim() ||
        typeof detail?.english !== 'string' || !detail.english.trim()) return;
    inscription = Object.freeze({ wyrdrune: detail.wyrdrune, english: detail.english });
    if (panel) {
      panel.children[0].textContent = inscription.wyrdrune;
      panel.children[1].textContent = inscription.english;
      panel.hidden = false;
    }
    lastSignal = { mode: 'inscription', strength: 0.58, intent: 0.6 };
    render();
  }
  function onCue(event) {
    if (disposed || stopped || !soundscape) return;
    const kind = event?.detail?.kind;
    if (!Object.hasOwn(SOUND_KINDS, kind)) return;
    // The existing soundscape independently enforces opt-in, mute and Feather.
    soundscape.play(SOUND_KINDS[kind]);
  }
  scope.addEventListener?.('wayglass:material-wake', onMaterial);
  scope.addEventListener?.('wayglass:feather', onFeather);
  scope.addEventListener?.('wayglass:wyrdrune-inscription', onInscription);
  scope.addEventListener?.('wayglass:faeberpunk-cue', onCue);
  preference?.addEventListener?.('change', onPreference);
  render();
  return Object.freeze({
    snapshot: () => Object.freeze({ ...frame, inscription, feather_stopped: stopped, reduced_motion: reducedMotion }),
    destroy() {
      if (disposed) return;
      disposed = true;
      scope.removeEventListener?.('wayglass:material-wake', onMaterial);
      scope.removeEventListener?.('wayglass:feather', onFeather);
      scope.removeEventListener?.('wayglass:wyrdrune-inscription', onInscription);
      scope.removeEventListener?.('wayglass:faeberpunk-cue', onCue);
      preference?.removeEventListener?.('change', onPreference);
      panel?.remove?.();
      for (const key of ['--wg-fae-light', '--wg-fae-pigment', '--wg-fae-transition']) root.style.removeProperty(key);
      for (const key of ['wgFaePhase', 'wgFaeMode', 'wgFaeChannel', 'wgFaeCanon']) delete root.dataset[key];
    },
  });
}
