import { WorkletSynthesizer } from 'spessasynth_lib';
import SPESSASYNTH_WORKLET_ASSET_URL from '../../../node_modules/spessasynth_lib/dist/spessasynth_processor.min.js?url';
import { StorySoundscape } from './story-soundscape.js';

export const SOUNDFONT_RUNTIME_REPAIR_VERSION = 'arcsweep.soundfont-worklet/v1';

const originalEnsure = StorySoundscape.prototype.ensureSoundfontSynth;

function emit(state, detail = {}) {
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:soundfont-runtime', {
    detail: { version: SOUNDFONT_RUNTIME_REPAIR_VERSION, state, workletUrl: SPESSASYNTH_WORKLET_ASSET_URL, ...detail },
  }));
}

StorySoundscape.prototype.ensureSoundfontSynth = async function ensureBundledSoundfontSynth() {
  if (this.soundfontSynth) return this.soundfontSynth;
  if (!this.context?.audioWorklet) throw new Error('AudioWorklet is required for SoundFont playback in this browser.');
  emit('loading');
  try {
    await this.context.audioWorklet.addModule(SPESSASYNTH_WORKLET_ASSET_URL);
    const synth = new WorkletSynthesizer(this.context);
    synth.connect(this.buses.tones);
    this.soundfontSynth = synth;
    emit('ready');
    return synth;
  } catch (error) {
    emit('error', { message: error?.message || String(error) });
    throw new Error(`SoundFont runtime could not load its bundled AudioWorklet: ${error?.message || error}`);
  }
};

StorySoundscape.prototype.ensureSoundfontSynth.__arcsweepRepair = SOUNDFONT_RUNTIME_REPAIR_VERSION;
StorySoundscape.prototype.ensureSoundfontSynth.__original = originalEnsure;

function mountDiagnostic() {
  const rack = document.querySelector('.soundfont-rack:not(.synaptic-heartfield)');
  if (!rack || rack.querySelector('[data-soundfont-runtime-diagnostic]')) return;
  const chip = document.createElement('p');
  chip.className = 'muted soundfont-runtime-diagnostic';
  chip.dataset.soundfontRuntimeDiagnostic = SOUNDFONT_RUNTIME_REPAIR_VERSION;
  chip.textContent = 'SoundFont runtime · bundled worklet ready to load';
  rack.append(chip);
}

if (typeof document !== 'undefined') {
  mountDiagnostic();
  const observer = new MutationObserver(mountDiagnostic);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener('arcsweep:soundfont-runtime', (event) => {
    mountDiagnostic();
    const chip = document.querySelector('[data-soundfont-runtime-diagnostic]');
    if (!chip) return;
    const { state, message } = event.detail || {};
    chip.dataset.state = state || 'unknown';
    chip.textContent = state === 'ready'
      ? 'SoundFont runtime · worklet loaded'
      : state === 'loading'
        ? 'SoundFont runtime · loading bundled worklet…'
        : state === 'error'
          ? `SoundFont runtime · ${message || 'worklet failed to load'}`
          : 'SoundFont runtime · bundled worklet ready to load';
  });
}
