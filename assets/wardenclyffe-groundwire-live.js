'use strict';

/* Apply live Groundwire updates to an already-running coupled patch. */

(function installWardenclyffeGroundwireLive(global) {
  const Coupler = global.WardenclyffeMobiusCoupler;
  if (!Coupler || Coupler.prototype.__groundwireLiveV03) return;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const proto = Coupler.prototype;
  const originalStart = proto.start;

  proto.start = async function startWithGroundwire(patchInput, options = {}) {
    const result = await originalStart.call(this, patchInput, options);
    this.__groundwireBase = this.patch ? {
      masterGain: this.patch.masterGain,
      returnLevel: this.patch.mobius.returnLevel,
      filterHz: this.patch.mobius.filterHz,
      feedback: this.patch.mobius.feedback
    } : null;
    return result;
  };

  proto.applyGroundwireSnapshot = function applyGroundwireSnapshot(groundwire) {
    if (!this.running || !this.patch || !this.ctx || !this.mobiusNetwork || !groundwire) return false;
    const bindings = this.patch.groundwireBindings;
    if (!bindings?.enabled) return false;

    const base = this.__groundwireBase || {
      masterGain: this.patch.masterGain,
      returnLevel: this.patch.mobius.returnLevel,
      filterHz: this.patch.mobius.filterHz,
      feedback: this.patch.mobius.feedback
    };
    const now = this.ctx.currentTime;
    const mic = groundwire.microphone || {};
    const battery = groundwire.battery || {};
    const responsive = bindings.microphoneResponsive && mic.active;
    const influence = responsive
      ? clamp((Number(mic.rms || 0) * 5.5 + Number(mic.peak || 0) * 1.4) * bindings.maxMicrophoneInfluence, 0, bindings.maxMicrophoneInfluence)
      : 0;

    let batteryScale = 1;
    if (bindings.batterySafety && Number.isFinite(Number(battery.levelPercent)) && !battery.charging) {
      const level = Number(battery.levelPercent);
      if (level <= 5) batteryScale = 1 - bindings.maxBatteryReduction;
      else if (level <= 10) batteryScale = 1 - bindings.maxBatteryReduction * 0.78;
      else if (level <= 20) batteryScale = 1 - bindings.maxBatteryReduction * 0.48;
    }

    this.bus.setMaster(clamp(base.masterGain * batteryScale, 0.0001, 0.32));
    this.mobiusNetwork.output.gain.setTargetAtTime(
      clamp(base.returnLevel * (1 + influence * 0.45), 0.0001, 0.5),
      now,
      0.08
    );
    this.mobiusNetwork.filter.frequency.setTargetAtTime(
      clamp(base.filterHz * (1 + influence * 1.8), 40, 18000),
      now,
      0.08
    );
    this.mobiusNetwork.feedback.gain.setTargetAtTime(
      clamp(base.feedback * (1 + influence * 0.25), 0, 0.45),
      now,
      0.08
    );

    this.patch.runtime = {
      ...(this.patch.runtime || {}),
      groundwireLive: {
        updatedAt: groundwire.updatedAt || new Date().toISOString(),
        batteryScale,
        microphoneInfluence: influence,
        locationAnchor: Boolean(bindings.locationAnchor && groundwire.location?.verified),
        network: groundwire.network?.effectiveType || groundwire.network?.status || 'unknown',
        boundary: 'Live telemetry only lowers capacity or applies declared microphone response.'
      }
    };
    return true;
  };

  proto.__groundwireLiveV03 = true;

  function attach() {
    const field = global.StarwellConcurrentFieldAudio;
    const coupler = global.wardenclyffeMobiusCoupler;
    if (!field?.subscribe || !coupler) return;
    let lastRendered = 0;
    field.subscribe(({ snapshot }) => {
      const applied = coupler.applyGroundwireSnapshot(snapshot?.groundwire);
      const now = performance.now();
      if (applied && now - lastRendered > 250) {
        lastRendered = now;
        coupler.emit('groundwire-live-update');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})(window);

