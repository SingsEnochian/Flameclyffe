import { WorkletSynthesizer } from 'spessasynth_lib';
import SPESSASYNTH_WORKLET_ASSET_URL from '../../../node_modules/spessasynth_lib/dist/spessasynth_processor.min.js?url';
import { StorySoundscape } from './story-soundscape.js';
import { formatSoundfontBytes, soundfontBankStatusText } from './soundfont-status.js';

export { soundfontBankStatusText } from './soundfont-status.js';

export const SOUNDFONT_RUNTIME_REPAIR_VERSION = 'arcsweep.soundfont-worklet/v3';

const originalEnsure = StorySoundscape.prototype.ensureSoundfontSynth;
const originalLoadSoundfontFiles = StorySoundscape.prototype.loadSoundfontFiles;
const originalSelectSoundfontPreset = StorySoundscape.prototype.selectSoundfontPreset;
const originalPlaySoundfontNote = StorySoundscape.prototype.playSoundfontNote;

let runtimeDetail = { state: 'idle' };
let bankDetail = { state: 'idle' };
const bankAttempts = new Map();

function recordDetail(detail) {
  const runtimeState = detail.state === 'loading-runtime' || detail.state === 'runtime-ready' || (detail.state === 'error' && detail.phase === 'runtime');
  if (runtimeState) runtimeDetail = detail;
  else bankDetail = detail;
  if (detail.state === 'loading-bank') bankAttempts.clear();
  if (detail.fileName && detail.state.startsWith('bank-file-')) {
    bankAttempts.set(`${detail.fileName}:${detail.fileSize || 0}`, {
      name: detail.fileName,
      size: detail.fileSize || 0,
      state: detail.state === 'bank-file-loading' ? 'loading' : detail.state === 'bank-file-ready' ? 'ready' : 'error',
      presetCount: detail.presetCount,
      message: detail.message,
    });
  }
}

function emit(state, detail = {}) {
  const payload = { version: SOUNDFONT_RUNTIME_REPAIR_VERSION, state, workletUrl: SPESSASYNTH_WORKLET_ASSET_URL, ...detail };
  recordDetail(payload);
  renderDiagnostic();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:soundfont-runtime', { detail: payload }));
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
  if (!incoming.length) return [];
  const totalBytes = incoming.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  emit('loading-bank', { fileCount: incoming.length, totalBytes, fileNames: incoming.map((file) => file.name) });
  const loaded = [];
  const failures = [];
  for (const [index, file] of incoming.entries()) {
    emit('bank-file-loading', { fileCount: incoming.length, fileIndex: index + 1, fileName: file.name, fileSize: file.size, loadedCount: loaded.length });
    try {
      const ids = await originalLoadSoundfontFiles.call(this, [file]);
      loaded.push(...ids);
      const loadedBank = this.soundfontBanks.get(ids[0]);
      emit('bank-file-ready', {
        fileCount: incoming.length,
        fileIndex: index + 1,
        fileName: file.name,
        fileSize: file.size,
        loadedCount: loaded.length,
        presetCount: loadedBank?.presetCount ?? 0,
      });
    } catch (error) {
      const message = error?.message || String(error);
      failures.push({ name: file.name, message });
      emit('bank-file-error', { fileCount: incoming.length, fileIndex: index + 1, fileName: file.name, fileSize: file.size, loadedCount: loaded.length, message });
    }
  }
  if (loaded.length) {
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
      failureCount: failures.length,
      failures,
    });
    return loaded;
  }
  const message = failures.map((failure) => `${failure.name}: ${failure.message}`).join('; ') || 'No SoundFont banks could be loaded.';
  emit('error', { phase: 'bank', message, failureCount: failures.length, failures });
  throw new Error(message);
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

StorySoundscape.prototype.playSoundfontNote = function playSoundfontNoteWithState(frequency, duration, velocity) {
  const played = originalPlaySoundfontNote.call(this, frequency, duration, velocity);
  if (!played) return false;
  const seconds = Math.max(.03, Number(duration) || 1);
  const detail = {
    bankCount: this.soundfontBanks.size,
    presetCount: this.soundfontPresets.length,
    selectedPreset: this.selectedSoundfontPreset ? { ...this.selectedSoundfontPreset } : null,
    frequency: Number(frequency) || this.world?.rootHz || 0,
  };
  emit('audition-started', detail);
  globalThis.setTimeout(() => {
    if (bankDetail.state === 'audition-started') emit('audition-complete', detail);
  }, Math.ceil(seconds * 1000));
  return true;
};

StorySoundscape.prototype.ensureSoundfontSynth.__arcsweepRepair = SOUNDFONT_RUNTIME_REPAIR_VERSION;
StorySoundscape.prototype.ensureSoundfontSynth.__original = originalEnsure;
StorySoundscape.prototype.loadSoundfontFiles.__arcsweepState = SOUNDFONT_RUNTIME_REPAIR_VERSION;
StorySoundscape.prototype.selectSoundfontPreset.__arcsweepPreference = SOUNDFONT_RUNTIME_REPAIR_VERSION;
StorySoundscape.prototype.playSoundfontNote.__arcsweepAuditionState = SOUNDFONT_RUNTIME_REPAIR_VERSION;

function mountDiagnostic() {
  const rack = document.querySelector('.soundfont-rack:not(.synaptic-heartfield)');
  if (!rack) return;
  if (!rack.querySelector('[data-soundfont-load-status]')) {
    const status = document.createElement('section');
    status.className = 'soundfont-load-status';
    status.dataset.soundfontLoadStatus = SOUNDFONT_RUNTIME_REPAIR_VERSION;
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = '<p class="soundfont-runtime-diagnostic" data-soundfont-runtime-diagnostic></p><p class="soundfont-runtime-diagnostic" data-soundfont-bank-diagnostic></p><ul class="soundfont-load-progress" data-soundfont-load-progress></ul>';
    const controls = rack.querySelector('.soundfont-controls');
    if (controls) controls.insertAdjacentElement('afterend', status);
    else rack.append(status);
  }
  renderDiagnostic();
}

function renderDiagnostic() {
  const runtime = document.querySelector('[data-soundfont-runtime-diagnostic]');
  const bank = document.querySelector('[data-soundfont-bank-diagnostic]');
  const progress = document.querySelector('[data-soundfont-load-progress]');
  if (runtime) {
    const { state, message } = runtimeDetail;
    runtime.dataset.state = state === 'runtime-ready' ? 'ready' : state === 'error' ? 'error' : state === 'loading-runtime' ? 'loading' : 'idle';
    runtime.textContent = state === 'runtime-ready'
      ? 'SoundFont runtime · bundled worklet loaded'
      : state === 'loading-runtime'
        ? 'SoundFont runtime · loading bundled worklet…'
        : state === 'error'
          ? `SoundFont runtime · ${message || 'worklet failed to load'}`
          : 'SoundFont runtime · waiting for the first local bank';
  }
  if (bank) {
    const { state } = bankDetail;
    bank.dataset.state = ['bank-ready', 'bank-file-ready', 'preset-selected', 'audition-complete'].includes(state) ? 'ready'
      : state === 'error' || state === 'bank-file-error' ? 'error'
        : state === 'idle' ? 'idle' : 'loading';
    bank.textContent = soundfontBankStatusText(bankDetail);
  }
  if (progress) {
    progress.replaceChildren(...[...bankAttempts.values()].map((attempt) => {
      const item = document.createElement('li');
      item.dataset.state = attempt.state;
      const suffix = attempt.state === 'ready' ? `${attempt.presetCount ?? '?'} presets ready`
        : attempt.state === 'error' ? attempt.message || 'failed'
          : 'reading and parsing…';
      item.textContent = `${attempt.name} · ${formatSoundfontBytes(attempt.size)} · ${suffix}`;
      return item;
    }));
  }
}

function updateDiagnostic(detail = {}) {
  recordDetail(detail);
  mountDiagnostic();
  renderDiagnostic();
}

if (typeof document !== 'undefined') {
  mountDiagnostic();
  const observer = new MutationObserver(mountDiagnostic);
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener('arcsweep:soundfont-runtime', (event) => updateDiagnostic(event.detail || {}));
  globalThis.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}
