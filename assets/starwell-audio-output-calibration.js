'use strict';

/*
  Coupled output calibration v0.3

  The prior field materializer attenuated both master and every stem, then the
  mixer multiplied them again. This wrapper applies capacity at the master once,
  preserves a useful stem signal, and keeps hard somatic veto at true silence.
*/

(function installAudioOutputCalibration(global) {
  const base = global.StarwellAudioPatchContract;
  if (!base || base.__outputCalibrationV03) return;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function boostPreset(preset) {
    const patch = clone(preset);
    patch.masterGain = Math.max(Number(patch.masterGain || 0), 0.26);
    patch.outputCalibration = {
      profile: 'headphone-safe-audible',
      directSpeakerWitnessGain: 0.055,
      minimumRunningMaster: 0.055,
      maximumRunningMaster: 0.30
    };
    patch.stems = patch.stems.map((stem) => {
      const next = { ...stem };
      if (stem.tags?.includes('binaural-spine')) {
        const floors = { 'dream-floor-54': 0.070, 'dream-body-108': 0.058, 'dream-lantern-216': 0.046 };
        next.gain = Math.max(Number(stem.gain || 0), floors[stem.id] || 0.045);
      } else if (stem.tags?.includes('harmonic-chamber')) {
        const floors = {
          'harmonic-432': 0.030,
          'harmonic-864': 0.018,
          'harmonic-1296': 0.012,
          'harmonic-1728': 0.008,
          'harmonic-2160': 0.0055,
          'harmonic-2592': 0.0038
        };
        next.gain = Math.max(Number(stem.gain || 0), floors[stem.id] || 0.006);
      } else {
        next.gain = Math.max(Number(stem.gain || 0), 0.035);
      }
      return next;
    });
    return base.normalizePatch(patch);
  }

  function normalizePatch(input = {}) {
    const patch = base.normalizePatch(input);
    const raw = input?.outputCalibration || {};
    patch.outputCalibration = {
      profile: String(raw.profile || patch.outputCalibration?.profile || 'headphone-safe-audible'),
      directSpeakerWitnessGain: clamp(raw.directSpeakerWitnessGain ?? patch.outputCalibration?.directSpeakerWitnessGain ?? 0.055, 0.01, 0.12),
      minimumRunningMaster: clamp(raw.minimumRunningMaster ?? patch.outputCalibration?.minimumRunningMaster ?? 0.055, 0.01, 0.20),
      maximumRunningMaster: clamp(raw.maximumRunningMaster ?? patch.outputCalibration?.maximumRunningMaster ?? 0.30, 0.10, 0.32)
    };
    return patch;
  }

  function materializePatch(patchInput, snapshotInput) {
    const original = normalizePatch(patchInput);
    const result = base.materializePatch(original, snapshotInput);
    const snapshot = base.normalizeFieldSnapshot(snapshotInput);
    const runtime = result.runtime || {};
    const veto = Boolean(runtime.somaticVeto);

    if (veto) {
      result.masterGain = 0.0001;
      result.stems = result.stems.map((stem) => ({ ...stem, gain: 0 }));
      result.runtime = {
        ...runtime,
        outputCalibration: {
          status: 'muted-by-somatic-veto',
          masterGain: result.masterGain,
          signalFloorApplied: false
        }
      };
      return result;
    }

    const somaticScale = clamp(runtime.somaticScale ?? 1, 0, 1);
    const gentleScale = somaticScale < 0.45
      ? 0.62 + somaticScale * 0.55
      : 0.78 + somaticScale * 0.22;
    const agencyScale = 0.82 + snapshot.deep.A * 0.12;
    const batteryScale = clamp(runtime.groundwire?.batteryScale ?? 1, 0.25, 1);
    const calibratedMaster = original.masterGain * gentleScale * agencyScale * batteryScale;

    result.masterGain = clamp(
      calibratedMaster,
      original.outputCalibration.minimumRunningMaster,
      original.outputCalibration.maximumRunningMaster
    );

    result.stems = result.stems.map((stem, index) => {
      const source = original.stems[index] || stem;
      const fieldContour = 0.94 + snapshot.deep.P * 0.04 + snapshot.deep.C * 0.05;
      return {
        ...stem,
        gain: stem.enabled === false ? 0 : clamp(source.gain * fieldContour, 0, 0.25)
      };
    });

    result.outputCalibration = original.outputCalibration;
    result.runtime = {
      ...runtime,
      outputCalibration: {
        status: 'audible-safe-range',
        previousDoubleAttenuationRemoved: true,
        masterGain: result.masterGain,
        somaticScale,
        gentleScale,
        batteryScale,
        signalFloorApplied: true
      }
    };
    result.declarations = [
      ...(result.declarations || []),
      { type: 'output-calibration', status: 'engineering-gain-stage-v0.3' }
    ];
    return result;
  }

  const dreamSignal34 = boostPreset(base.presets.dreamSignal34);
  const experimentalBlank = boostPreset(base.presets.experimentalBlank);

  global.StarwellAudioPatchContract = Object.freeze({
    ...base,
    VERSION: '0.3.1',
    __outputCalibrationV03: true,
    normalizePatch,
    materializePatch,
    presets: {
      ...base.presets,
      dreamSignal34,
      experimentalBlank
    }
  });
})(window);
