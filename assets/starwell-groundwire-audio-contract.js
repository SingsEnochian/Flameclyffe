'use strict';

/*
  Groundwire extension for STARWELL Audio Patch Contract v0.3

  Groundwire telemetry is treated as device/environment context.
  Battery and hardware may constrain capacity. Network may constrain external
  transport. Microphone response is opt-in. Location is provenance only.
*/

(function installGroundwireAudioContract(global) {
  const base = global.StarwellAudioPatchContract;
  if (!base || base.__groundwireV03) return;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const finite = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function normalizeBindings(raw = {}) {
    const profile = ['safe', 'responsive', 'experimental'].includes(raw.profile) ? raw.profile : 'safe';
    return {
      enabled: raw.enabled !== false,
      profile,
      batterySafety: raw.batterySafety !== false,
      hardwareBudget: raw.hardwareBudget !== false,
      networkAdaptive: raw.networkAdaptive !== false,
      microphoneResponsive: raw.microphoneResponsive === true || profile === 'responsive' || profile === 'experimental',
      locationAnchor: raw.locationAnchor !== false,
      maxMicrophoneInfluence: clamp(raw.maxMicrophoneInfluence ?? 0.08, 0, 0.25),
      maxBatteryReduction: clamp(raw.maxBatteryReduction ?? 0.45, 0, 0.8),
      allowNetworkToToneMap: raw.allowNetworkToToneMap === true && profile === 'experimental',
      allowLocationToToneMap: false
    };
  }

  function normalizeGroundwire(input = {}) {
    const raw = input?.groundwire || input?.snapshot || input?.detail || input || {};
    const location = raw.location || {};
    const network = raw.network || {};
    const hardware = raw.hardware || {};
    const microphone = raw.microphone || {};
    const battery = raw.battery || {};

    return {
      status: raw.status || 'observed',
      version: String(raw.version || 'unknown'),
      updatedAt: raw.updatedAt || null,
      location: {
        status: String(location.status || 'not requested'),
        verified: location.status === 'verified',
        mode: location.mode || null,
        accuracyM: finite(location.accuracyM),
        altitudeAvailable: finite(location.altitudeM) !== null,
        altitudeM: finite(location.altitudeM),
        timestamp: location.timestamp || null
      },
      network: {
        status: String(network.status || 'unknown'),
        effectiveType: network.effectiveType || null,
        downlinkMbps: finite(network.downlinkMbps),
        rttMs: finite(network.rttMs),
        saveData: Boolean(network.saveData)
      },
      hardware: {
        status: String(hardware.status || 'unknown'),
        hardwareConcurrency: finite(hardware.hardwareConcurrency),
        deviceMemoryGb: finite(hardware.deviceMemoryGb),
        maxTouchPoints: finite(hardware.maxTouchPoints),
        timezone: hardware.timezone || null,
        platform: hardware.platform || null
      },
      microphone: {
        status: String(microphone.status || 'stopped'),
        active: microphone.status === 'active',
        rms: clamp(microphone.rms ?? 0, 0, 1),
        peak: clamp(microphone.peak ?? 0, 0, 1),
        streamAvailable: Boolean(microphone.streamAvailable)
      },
      battery: {
        status: String(battery.status || 'unknown'),
        charging: Boolean(battery.charging),
        levelPercent: finite(battery.levelPercent),
        chargingTimeSec: finite(battery.chargingTimeSec),
        dischargingTimeSec: finite(battery.dischargingTimeSec)
      },
      boundary: raw.boundary || 'Groundwire telemetry remains permission-gated and does not start audio.',
      raw
    };
  }

  function hardwareBudget(groundwire) {
    const cores = groundwire.hardware.hardwareConcurrency;
    const memory = groundwire.hardware.deviceMemoryGb;
    if ((cores !== null && cores <= 2) || (memory !== null && memory <= 2)) return 0.58;
    if ((cores !== null && cores <= 4) || (memory !== null && memory <= 4)) return 0.78;
    return 1;
  }

  function networkBudget(groundwire) {
    const type = String(groundwire.network.effectiveType || '').toLowerCase();
    if (groundwire.network.saveData || type === 'slow-2g') return 0.58;
    if (type === '2g') return 0.70;
    if (type === '3g') return 0.88;
    return 1;
  }

  function batteryBudget(groundwire, bindings) {
    const level = groundwire.battery.levelPercent;
    if (!bindings.batterySafety || level === null || groundwire.battery.charging) return 1;
    if (level <= 5) return 1 - bindings.maxBatteryReduction;
    if (level <= 10) return 1 - bindings.maxBatteryReduction * 0.78;
    if (level <= 20) return 1 - bindings.maxBatteryReduction * 0.48;
    return 1;
  }

  function sanitizeGroundwire(groundwire) {
    const copy = clone(groundwire);
    delete copy.raw;
    return copy;
  }

  function normalizePatch(input = {}) {
    const patch = base.normalizePatch(input);
    patch.schemaVersion = '0.3.0';
    patch.groundwireBindings = normalizeBindings(input?.groundwireBindings || input?.metadata?.groundwireBindings || {});
    return patch;
  }

  function normalizeFieldSnapshot(input = {}) {
    const snapshot = base.normalizeFieldSnapshot(input);
    const raw = input?.fieldSnapshot || input?.snapshot || input?.detail || input || {};
    snapshot.groundwire = normalizeGroundwire(raw.groundwire || {});
    return snapshot;
  }

  function materializePatch(patchInput, snapshotInput) {
    const patch = base.materializePatch(patchInput, snapshotInput);
    const normalizedPatch = normalizePatch(patchInput);
    const snapshot = normalizeFieldSnapshot(snapshotInput);
    const bindings = normalizedPatch.groundwireBindings;
    const groundwire = snapshot.groundwire;

    patch.schemaVersion = '0.3.0';
    patch.groundwireBindings = bindings;

    if (!bindings.enabled) {
      patch.runtime = {
        ...(patch.runtime || {}),
        groundwire: { enabled: false, reason: 'patch-disabled' }
      };
      return patch;
    }

    const batteryScale = batteryBudget(groundwire, bindings);
    const deviceScale = bindings.hardwareBudget ? hardwareBudget(groundwire) : 1;
    const transportScale = bindings.networkAdaptive && patch.transport === 'media-stream' ? networkBudget(groundwire) : 1;
    const mic = groundwire.microphone;
    const micInfluence = bindings.microphoneResponsive && mic.active
      ? clamp((mic.rms * 5.5 + mic.peak * 1.4) * bindings.maxMicrophoneInfluence, 0, bindings.maxMicrophoneInfluence)
      : 0;

    const capacityScale = Math.min(batteryScale, deviceScale);
    patch.masterGain = clamp(patch.masterGain * batteryScale, 0.0001, 0.32);
    patch.mobius.sendLevel = clamp(patch.mobius.sendLevel * transportScale, 0, 1);
    patch.mobius.returnLevel = clamp(patch.mobius.returnLevel * (1 + micInfluence * 0.45), 0, 0.5);
    patch.mobius.filterHz = clamp(patch.mobius.filterHz * (1 + micInfluence * 1.8), 40, 18000);

    if (bindings.hardwareBudget && deviceScale < 1) {
      const enabled = patch.stems.filter((stem) => stem.enabled);
      const maxActive = Math.max(3, Math.floor(enabled.length * deviceScale));
      let kept = 0;
      patch.stems = patch.stems.map((stem) => {
        if (!stem.enabled) return stem;
        const essential = stem.tags?.includes('binaural-spine') || !stem.tags?.includes('harmonic-chamber');
        if (essential || kept < maxActive) {
          kept += 1;
          return stem;
        }
        return { ...stem, enabled: false, disabledReason: 'groundwire-hardware-budget' };
      });
    }

    patch.runtime = {
      ...(patch.runtime || {}),
      groundwire: {
        enabled: true,
        profile: bindings.profile,
        batteryScale,
        deviceScale,
        transportScale,
        microphoneInfluence: micInfluence,
        microphoneResponsive: bindings.microphoneResponsive,
        locationAnchor: bindings.locationAnchor && groundwire.location.verified,
        locationAccuracyM: bindings.locationAnchor ? groundwire.location.accuracyM : null,
        locationToneMapping: false,
        networkToneMapping: bindings.allowNetworkToToneMap,
        capacityScale,
        boundary: 'Groundwire constrains capacity and optional response. It does not supply hidden causal claims.'
      }
    };

    patch.declarations = [
      ...(patch.declarations || []),
      { type: 'groundwire-telemetry', status: 'browser-device-observation' },
      { type: 'groundwire-battery-safety', status: bindings.batterySafety ? 'enabled' : 'disabled' },
      { type: 'groundwire-microphone-response', status: bindings.microphoneResponsive ? 'user-enabled' : 'off' },
      { type: 'groundwire-location', status: 'provenance-only' }
    ];

    patch.metadata = {
      ...(patch.metadata || {}),
      groundwire: sanitizeGroundwire(groundwire)
    };
    return patch;
  }

  function validatePatch(input) {
    const result = base.validatePatch(input);
    result.patch = normalizePatch(input);
    if (result.patch.groundwireBindings.allowLocationToToneMap) {
      result.errors.push('Location-to-tone mapping is not permitted by the Groundwire contract.');
      result.valid = false;
    }
    return result;
  }

  const dream = normalizePatch({
    ...base.presets.dreamSignal34,
    groundwireBindings: {
      profile: 'safe',
      batterySafety: true,
      hardwareBudget: true,
      networkAdaptive: true,
      microphoneResponsive: false,
      locationAnchor: true
    }
  });

  const experimental = normalizePatch({
    ...base.presets.experimentalBlank,
    groundwireBindings: {
      profile: 'responsive',
      batterySafety: true,
      hardwareBudget: true,
      networkAdaptive: true,
      microphoneResponsive: true,
      locationAnchor: true,
      maxMicrophoneInfluence: 0.12
    }
  });

  global.StarwellAudioPatchContract = Object.freeze({
    ...base,
    VERSION: '0.3.0',
    __groundwireV03: true,
    normalizeGroundwireBindings: normalizeBindings,
    normalizeGroundwire,
    normalizePatch,
    normalizeFieldSnapshot,
    materializePatch,
    validatePatch,
    presets: {
      ...base.presets,
      dreamSignal34: dream,
      experimentalBlank: experimental
    }
  });
})(window);

