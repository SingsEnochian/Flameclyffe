import { arcsweepOS } from './os/bootstrap.js';
import { registerSomaticService } from './os/somatic-service.js';
import { createSomaticProfileStore, detectSomaticChannels } from './somatic-profile.js';
import { installSomaticCalibrationSurface } from './somatic-calibration-surface.js';
import { createSomaticEventBridge } from './somatic-event-bridge.js';

const GLOBAL_KEY = '__arcsweepSomatic';

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const service = registerSomaticService(arcsweepOS.capabilities, { bus: arcsweepOS.bus });
  const profileStore = createSomaticProfileStore();
  arcsweepOS.health?.set?.({
    service_id: 'somatic-interface',
    status: 'healthy',
    version: arcsweepOS.manifest?.version || 'unknown',
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel'],
    recoverable: true,
  });
  let calibration = null;
  let bridge = null;
  const api = {
    service_id: service.service_id,
    capabilities: [...service.capabilities],
    status: () => arcsweepOS.capabilities.invoke('somatic.status', {}, { authority: 'read', actor_id: 'human-ui', source: 'somatic-sidecar' }),
    cues: () => arcsweepOS.capabilities.invoke('somatic.list-cues', {}, { authority: 'read', actor_id: 'human-ui', source: 'somatic-sidecar' }),
    profile: () => profileStore.load(),
    saveProfile: (patch) => profileStore.save(patch),
    channels: () => detectSomaticChannels(globalThis),
    emit: (cue_id, options = {}) => {
      const profile = profileStore.load();
      if (!profile.enabled || profile.quiet_mode) {
        return Promise.resolve({ status: 'suppressed', reason: profile.enabled ? 'quiet-mode' : 'somatic-disabled', output: null });
      }
      return arcsweepOS.capabilities.invoke('somatic.emit-cue', {
        cue_id,
        channels: options.channels || profile.channels,
        gain_ceiling: options.gain_ceiling ?? profile.gain_ceiling,
        ...options,
      }, { authority: 'operate', actor_id: 'human-ui', source: 'somatic-sidecar', confirmed: true });
    },
    stop: () => arcsweepOS.capabilities.invoke('somatic.stop', {}, { authority: 'operate', actor_id: 'human-ui', source: 'somatic-sidecar' }),
    openCalibration: async () => {
      if (!calibration && typeof document !== 'undefined' && document.body) calibration = installSomaticCalibrationSurface({ somatic: api });
      return calibration?.open?.() || profileStore.load();
    },
    enableNavigationCue: (enabled = true) => {
      const current = profileStore.load();
      return profileStore.save({ bindings: { ...current.bindings, navigation: Boolean(enabled) } });
    },
  };
  const frozen = Object.freeze(api);
  globalThis[GLOBAL_KEY] = frozen;
  bridge = createSomaticEventBridge({ bus: arcsweepOS.bus, somatic: frozen, profile: profileStore });

  if (typeof document !== 'undefined') {
    const mount = () => { if (!calibration && document.body) calibration = installSomaticCalibrationSurface({ somatic: frozen }); };
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  globalThis.addEventListener?.('beforeunload', () => bridge?.destroy?.(), { once: true });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:somatic-ready', {
    detail: { service_id: service.service_id, capabilities: service.capabilities, channels: detectSomaticChannels(globalThis) },
  }));
  return frozen;
}

export const arcsweepSomatic = install();
