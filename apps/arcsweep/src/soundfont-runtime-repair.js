import { WorkletSynthesizer } from 'spessasynth_lib';
import SPESSASYNTH_WORKLET_ASSET_URL from '../../../node_modules/spessasynth_lib/dist/spessasynth_processor.min.js?url';
import { StorySoundscape } from './story-soundscape.js';

export const SOUNDFONT_RUNTIME_REPAIR_VERSION = 'arcsweep.soundfont-worklet/v2';

const originalEnsure = StorySoundscape.prototype.ensureSoundfontSynth;
const originalLoadSoundfontFiles = StorySoundscape.prototype.loadSoundfontFiles;
const originalSelectSoundfontPreset = StorySoundscape.prototype.selectSoundfontPreset;

function emit(state, detail = {}) {
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:soundfont-runtime', {
    detail: { version: SOUNDFONT_RUNTIME_REPAIR_VERSION, state, workletUrl: SPESSASYNTH_WORKLET_ASSET_URL, ...detail },
  }));
}

function preferenceKey(soundscape) {
  return `arcsweep.soundfont.preference/v1:${soundscape?.world?.worldId || 'default'}`;
}

function readPreference(soundscape) {
  try { return globalThis.localStorage?.getItem(preferenceKey(soundscape)) || null; } catch { return null; }
}

function writePreference(soundscape, key) {
  try { if (key) globalThis.localStorage?.setItem(preferenceKey(soundscape), key); } catch {}
}

StorySoundscape.prototype.ensureSoundfontSynth = async function ensureBundledSoundfontSynth() {
  if (this.soundfontSynth) return this.soundfontSynth;
  if (!this.context?.audioWorklet) throw new Error('AudioWorklet is required for SoundFont playback in this browser.');
  emit('loading-runtime');
  try {
    await this.context.audioWorklet.addModule(SPESSASYNTH_WORKLET_ASSET_URL);
    const synth = new WorkletSynthesizer(this.context);
    synth.connect(this.buses.tones);
    this.soundfontSynth = synth;
    emit('runtime-ready');
    return synth;
  } catch (error) {
    emit('error', { phase: 'runtime', message: error?.message || String(error) });
    throw new Error(`SoundFont runtime could not load its bundled AudioWorklet: ${error?.message || error}`);
  }
};

StorySoundscape.prototype.loadSoundfontFiles = async function loadSoundfontFilesWithState(files) {
  const incoming = [...(files || [])];
  emit('loading-bank', { fileCount: incoming.length, fileNames: incoming.map((file) => file.name) });
  try {
    const loaded = await originalLoadSoundfontFiles.call(this, incoming);
    const preferred = readPreference(this);
    if (preferred && this.soundfontPresets.some((preset) => this.presetKey(preset) === preferred)) {
      originalSelectSoundfontPreset.call(this, preferred);
    }
    if (this.selectedSoundfontPreset?.key) writePreference(this, this.selectedSoundfontPreset.key);
    emit('bank-ready', {
      bankCount: this.soundfontBanks.size,
      banks: [...this.soundfontBanks.values()].map((bank) => ({ name: bank.name, presetCount: bank.presetCount })),
      presetCount: this.soundfontPresets.length,
      selectedPreset: this.selectedSoundfontPreset ? { ...this.selectedSoundfontPreset } : null,
    });
    return loaded;
  } catch (error) {
    emit('error', { phase: 'bank', message: error?.message || String(error) });
    throw error;
  }
};

StorySoundscape.prototype.selectSoundfontPreset = function selectSoundfontPresetWithPreference(key) {
  const selected = originalSelectSoundfontPreset.call(this, key);
  if (selected) {
    writePreference(this, key);
    emit('preset-selected', {
      bankCount: this.soundfontBanks.size,
      presetCount: this.soundfontPresets.length,
      selectedPreset: this.selectedSoundfontPreset ? { ...this.selectedSoundfontPreset } : null,
    });
  }
  return selected;
};

StorySoundscape.prototype.ensureSoundfontSynth.__arcsweepRepair = SOUNDFONT_RUNTIME_REPAIR_VERSION;
StorySoundscape.prototype.ensureSoundfontSynth.__original = originalEnsure;
StorySoundscape.prototype.loadSoundfontFiles.__arcsweepState = SOUNDFONT_RUNTIME_REPAIR_VERSION;
StorySoundscape.prototype.selectSoundfontPreset.__arcsweepPreference = SOUNDFONT_RUNTIME_REPAIR_VERSION;

function mountDiagnostic() {
  const rack = document.querySelector('.soundfont-rack:not(.synaptic-heartfield)');
  if (!rack) return;
  if (!rack.querySelector('[data-soundfont-runtime-diagnostic]')) {
    const chip = document.createElement('p');
    chip.className = 'muted soundfont-runtime-diagnostic';
    chip.dataset.soundfontRuntimeDiagnostic = SOUNDFONT_RUNTIME_REPAIR_VERSION;
    chip.dataset.state = 'idle';
    chip.textContent = 'SoundFont runtime · ready';
    rack.append(chip);
  }
  if (!rack.querySelector('[data-soundfont-bank-diagnostic]')) {
    const bank = document.createElement('p');
    bank.className = 'muted soundfont-runtime-diagnostic';
    bank.dataset.soundfontBankDiagnostic = SOUNDFONT_RUNTIME_REPAIR_VERSION;
    bank.dataset.state = 'idle';
    bank.textContent = 'Sound Bank · no bank loaded · choose an SF2, SF3, SFOGG, or DLS file';
    rack.append(bank);
  }
}

function updateDiagnostic(detail = {}) {
  mountDiagnostic();
  const runtime = document.querySelector('[data-soundfont-runtime-diagnostic]');
  const bank = document.querySelector('[data-soundfont-bank-diagnostic]');
  const { state, message, phase, bankCount, presetCount, selectedPreset } = detail;
  if (runtime && (state === 'loading-runtime' || state === 'runtime-ready' || (state === 'error' && phase === 'runtime'))) {
    runtime.dataset.state = state === 'runtime-ready' ? 'ready' : state === 'error' ? 'error' : 'loading';
    runtime.textContent = state === 'runtime-ready'
      ? 'SoundFont runtime · bundled worklet loaded'
      : state === 'loading-runtime'
        ? 'SoundFont runtime · loading bundled worklet…'
        : `SoundFont runtime · ${message || 'worklet failed to load'}`;
  }
  if (!bank) return;
  if (state === 'loading-bank') {
    bank.dataset.state = 'loading';
    bank.textContent = 'Sound Bank · loading and parsing bank…';
  } else if (state === 'bank-ready' || state === 'preset-selected') {
    bank.dataset.state = 'ready';
    const presetName = selectedPreset?.name || selectedPreset?.presetName || selectedPreset?.key || 'preset selected';
    bank.textContent = `Sound Bank · ${bankCount ?? '?'} bank${bankCount === 1 ? '' : 's'} · ${presetCount ?? '?'} presets · ${presetName}`;
  } else if (state === 'error' && phase === 'bank') {
    bank.dataset.state = 'error';
    bank.textContent = `Sound Bank · ${message || 'bank failed to load'}`;
  }
}

if (typeof document !== 'undefined') {
  mountDiagnostic();
  const observer = new MutationObserver(mountDiagnostic);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener('arcsweep:soundfont-runtime', (event) => updateDiagnostic(event.detail || {}));
  globalThis.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}
