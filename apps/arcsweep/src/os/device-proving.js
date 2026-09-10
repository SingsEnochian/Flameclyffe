function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function safeMatch(query) {
  try { return Boolean(globalThis.matchMedia?.(query)?.matches); } catch { return false; }
}

export function createDeviceProbe({ now = () => new Date() } = {}) {
  let lastInput = null;
  let installed = false;
  let handler = null;

  function status() {
    return Object.freeze(clone({
      schema: 'arcsweep.device-status/v1',
      touch_points: Number(globalThis.navigator?.maxTouchPoints || 0),
      coarse_pointer: safeMatch('(pointer: coarse)'),
      hover_available: safeMatch('(hover: hover)'),
      reduced_motion: safeMatch('(prefers-reduced-motion: reduce)'),
      web_audio_available: Boolean(globalThis.AudioContext || globalThis.webkitAudioContext),
      vibration_api_available: typeof globalThis.navigator?.vibrate === 'function',
      pointer_events_available: typeof globalThis.PointerEvent === 'function',
      passive_probe_installed: installed,
      observed_input: lastInput ? clone(lastInput) : null,
    }));
  }

  function observePointer(event = {}) {
    const pointerType = String(event.pointerType || 'unknown').slice(0, 32);
    lastInput = Object.freeze({
      schema: 'arcsweep.device-input-proof/v1',
      pointer_type: pointerType,
      pressure_observed: Number(event.pressure || 0) > 0,
      tilt_observed: Math.abs(Number(event.tiltX || 0)) > 0 || Math.abs(Number(event.tiltY || 0)) > 0,
      twist_observed: Number(event.twist || 0) !== 0,
      observed_at: now().toISOString(),
    });
    return clone(lastInput);
  }

  function install() {
    if (installed || typeof document === 'undefined' || !document.addEventListener) return false;
    handler = (event) => { observePointer(event); };
    document.addEventListener('pointerdown', handler, { capture: true, passive: true });
    installed = true;
    return true;
  }

  function destroy() {
    if (installed && handler && typeof document !== 'undefined') document.removeEventListener('pointerdown', handler, true);
    installed = false;
    handler = null;
  }

  return Object.freeze({ status, observePointer, install, destroy, inputProof: () => lastInput ? clone(lastInput) : null });
}

export function registerDeviceProvingService(registry, { probe = createDeviceProbe() } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Device proving service requires the ArcSweep capability registry.');
  probe.install();
  registry.registerService({
    service_id: 'device-proving',
    label: 'ArcSweep Device Proving Chamber',
    authority_boundary: {
      passive_pointer_metadata_only: true,
      coordinates_recorded: false,
      text_recorded: false,
      vibration_triggered: false,
      audio_triggered: false,
    },
    consumes: [],
    emits: [],
  });
  registry.registerCapability({
    capability_id: 'device.status',
    service_id: 'device-proving',
    description: 'Read device capability presence and passive input evidence without triggering hardware.',
    authority: 'read',
    execute: () => probe.status(),
  });
  registry.registerCapability({
    capability_id: 'device.input-proof',
    service_id: 'device-proving',
    description: 'Read the latest bounded pointer-type/pressure/tilt/twist observation, if one has occurred.',
    authority: 'read',
    execute: () => probe.inputProof(),
  });
  return Object.freeze({ service_id: 'device-proving', probe, capabilities: ['device.status', 'device.input-proof'] });
}
