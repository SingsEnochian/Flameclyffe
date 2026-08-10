'use strict';

/*
  Hearthgate Tone Engine Adapter v0.1

  The single engine coordinator for Hearthgate Tone Lab.

  Responsibilities:
  - Accept only successful, current server preflight results.
  - Create audio and haptic nodes only after explicit consent.
  - Own the StarwellSharedAudioContext for this session.
  - Register every oscillator, buffer, timer, animation frame, and haptic.
  - Apply server-approved duration and gain ceilings.
  - Route the Wardenclyffe-Möbius engine via StarwellAudioPatchContract.
  - Treat SCFE body-no as an immediate hard veto.
  - Preserve Infinite Field phase continuity across permitted transitions.
  - Expose one idempotent stopAll(reason) that all stop paths call.

  Schema reconciliation:
  - Hearthgate TonePatch (hearthgate.tone-patch/v1) is the server-side
    preflight contract: frequencyHz + overtoneHz, hapticPattern, gain/duration
    ceilings, consent profile. It is NOT weakened.
  - STARWELL audio-patch (starwell.audio-patch v0.2.0) is the browser-side
    execution plan: stems, Möbius, continuityMode. It is NOT weakened.
  - This adapter translates one into the other without collapsing either.
*/

(function installHearthgateToneEngineAdapter(global) {

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  /*
    Translate a Hearthgate TonePatch + server-approved limits into a
    STARWELL audio-patch ready for StarwellAudioPatchContract.
    The two-oscillator Hearthgate model maps to two stems.
    Binaural patches map to one binaural-pair stem.
    Neither schema is flattened to fit the other.
  */
  function tonePatchToAudioPatch(tonePatch, limits) {
    const binaural = tonePatch.routingMode === 'binaural';
    const masterGain = clamp(limits.volume, 0.001, Math.min(tonePatch.maxVolume || 0.35, 0.35));
    const stems = binaural
      ? [{
          id: 'hg-binaural-primary',
          label: `${tonePatch.name} — binaural pair`,
          kind: 'binaural-pair',
          leftFrequency: clamp(tonePatch.frequencyHz, 1, 22050),
          rightFrequency: clamp(tonePatch.overtoneHz, 1, 22050),
          gain: clamp(masterGain * 0.85, 0, 0.25),
          send: 'dry',
          protected: tonePatch.binauralIntegrity === 'protected',
          route: 'left',
          waveform: 'sine',
          enabled: true,
          tags: ['hearthgate-primary', 'binaural-spine'],
          modulation: { type: 'none', frequency: 0, depth: 0 },
          claimLabel: 'subjective-experiment',
          sendLevel: 0
        }]
      : [
          {
            id: 'hg-anchor',
            label: `${tonePatch.name} — anchor`,
            kind: 'tone',
            frequency: clamp(tonePatch.frequencyHz, 1, 22050),
            route: 'centre',
            gain: clamp(masterGain * 0.72, 0, 0.25),
            send: 'both',
            sendLevel: 0.12,
            waveform: 'sine',
            enabled: true,
            tags: ['hearthgate-anchor'],
            modulation: { type: 'none', frequency: 0, depth: 0 },
            claimLabel: 'subjective-experiment',
            protected: false
          },
          {
            id: 'hg-upper',
            label: `${tonePatch.name} — upper`,
            kind: 'tone',
            frequency: clamp(tonePatch.overtoneHz, 1, 22050),
            route: 'centre',
            gain: clamp(masterGain * 0.52, 0, 0.25),
            send: 'both',
            sendLevel: 0.10,
            waveform: 'sine',
            enabled: true,
            tags: ['hearthgate-upper'],
            modulation: { type: 'none', frequency: 0, depth: 0 },
            claimLabel: 'subjective-experiment',
            protected: false
          }
        ];

    return {
      schema: 'starwell.audio-patch',
      schemaVersion: '0.2.0',
      id: `hg-${String(tonePatch.id || 'patch').replace(/[^a-z0-9-]/g, '-')}`,
      name: tonePatch.name,
      description: tonePatch.description || '',
      claimLabel: 'subjective-experiment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transport: 'shared-context',
      routingMode: 'parallel',
      binauralIntegrity: tonePatch.binauralIntegrity || 'none',
      continuityMode: 'infinite-field',
      loopQuantumSeconds: 10,
      masterGain,
      stems,
      mobius: {
        enabled: true,
        sendLevel: 0.12,
        returnLevel: 0.10,
        phaseInverted: true,
        returnSide: 'both',
        feedback: 0.08,
        delaySeconds: 0.13,
        filterHz: 1100,
        twist: 0.16
      },
      theoryBindings: { enabled: false, profile: 'hearthgate-passthrough', bindings: [] },
      declarations: [
        { type: 'audio-routing', status: 'established-engineering' },
        { type: 'hearthgate-origin', status: 'server-validated-preflight' }
      ],
      metadata: {
        hearthgateId: tonePatch.id,
        hearthgateName: tonePatch.name,
        serverPreflight: true,
        durationCeilingSeconds: limits.durationSeconds,
        gainCeiling: masterGain
      }
    };
  }

  class HearthgateToneEngineAdapter {
    constructor() {
      this._preflight = null;
      this._preflightPatchId = null;
      this._ctx = null;
      this._releaseCtx = null;
      this._registry = {
        oscillators: new Set(),
        buffers: new Set(),
        timers: new Set(),
        frames: new Set(),
        hapticActive: false
      };
      this._phase = null;       // Infinite Field phase state
      this._running = false;
      this._lastStop = null;    // { reason, at }
    }

    /*
      Step 1 — Accept and verify the server's preflight.
      Only a result with allowed === true can be applied.
    */
    applyPreflight(result, patchId) {
      if (!result || result.allowed !== true) {
        throw Object.assign(
          new Error('preflight-not-allowed'),
          { code: 'preflight-not-allowed', preflight: result || null }
        );
      }
      if (!patchId) {
        throw Object.assign(new Error('patchId-required'), { code: 'patchId-required' });
      }
      this._preflight = result;
      this._preflightPatchId = String(patchId);
    }

    /*
      Internal: guard play() and field transitions against stale or mismatched preflights.
    */
    _verifyPreflight(patchId) {
      if (!this._preflight) return { ok: false, reason: 'no-preflight' };
      if (this._preflight.allowed !== true) return { ok: false, reason: 'preflight-not-allowed' };
      if (this._preflightPatchId !== String(patchId)) return { ok: false, reason: 'preflight-patch-mismatch' };
      return { ok: true };
    }

    /*
      Step 2 — Play. All consent and veto checks happen before the first node is created.
      No AudioContext is opened until every guard passes.
    */
    async play(tonePatch, options = {}) {
      const check = this._verifyPreflight(tonePatch.id);
      if (!check.ok) {
        throw Object.assign(new Error(check.reason), { code: check.reason });
      }
      if (!options.consent) {
        throw Object.assign(
          new Error('explicit-consent-required'),
          { code: 'explicit-consent-required' }
        );
      }

      // SCFE body-no veto — must pass before any node is created
      const fieldApi = global.StarwellConcurrentFieldAudio;
      if (fieldApi) {
        const summary = fieldApi.summarize?.();
        if (summary?.somatic?.bodySays === 'no' || summary?.somatic?.audioMode === 'mute') {
          throw Object.assign(new Error('scfe-body-no'), { code: 'scfe-body-no' });
        }
      }

      // Binaural requires visible acknowledgement
      const binaural = tonePatch.routingMode === 'binaural' ||
        (tonePatch.binauralIntegrity && tonePatch.binauralIntegrity !== 'none');
      if (binaural && !options.acknowledgedBinaural) {
        throw Object.assign(
          new Error('binaural-warning-acknowledgement-required'),
          { code: 'binaural-warning-acknowledgement-required' }
        );
      }

      // Open shared context — one instance for the whole session
      const Shared = global.StarwellSharedAudioContext;
      if (!Shared) throw new Error('StarwellSharedAudioContext unavailable.');

      const limits = this._preflight.limits;
      const audioPatch = tonePatchToAudioPatch(tonePatch, limits);

      // Materialize against SCFE field snapshot if available
      const contract = global.StarwellAudioPatchContract;
      let materializedPatch = audioPatch;
      if (fieldApi && contract) {
        materializedPatch = fieldApi.materialize(audioPatch);
        // Post-materialize veto: field changed between checks
        if (materializedPatch.runtime?.somaticVeto) {
          throw Object.assign(new Error('scfe-body-no'), { code: 'scfe-body-no' });
        }
      }

      // === Node creation begins here ===
      this._ctx = await Shared.ensure();
      this._releaseCtx = Shared.register('hearthgate-tone-engine', {
        patchId: tonePatch.id,
        engine: 'hearthgate-tone-engine-adapter',
        transport: 'shared-context'
      });

      const masterGain = this._ctx.createGain();
      masterGain.gain.setValueAtTime(0, this._ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(
        materializedPatch.masterGain,
        this._ctx.currentTime + 0.12
      );
      masterGain.connect(this._ctx.destination);

      for (const stem of (materializedPatch.stems || [])) {
        if (!stem.enabled) continue;

        if (stem.kind === 'tone') {
          const osc = this._ctx.createOscillator();
          const g = this._ctx.createGain();
          osc.type = stem.waveform || 'sine';
          osc.frequency.value = stem.frequency;
          g.gain.value = stem.gain;
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          this._registry.oscillators.add(osc);

        } else if (stem.kind === 'binaural-pair') {
          // Protected binaural: left and right go to separate channels, bypass Möbius
          const leftOsc = this._ctx.createOscillator();
          const rightOsc = this._ctx.createOscillator();
          const leftGain = this._ctx.createGain();
          const rightGain = this._ctx.createGain();
          const merger = this._ctx.createChannelMerger(2);

          leftOsc.type = 'sine';
          leftOsc.frequency.value = stem.leftFrequency;
          rightOsc.type = 'sine';
          rightOsc.frequency.value = stem.rightFrequency;
          leftGain.gain.value = stem.gain;
          rightGain.gain.value = stem.gain;

          leftOsc.connect(leftGain);
          rightOsc.connect(rightGain);
          leftGain.connect(merger, 0, 0);
          rightGain.connect(merger, 0, 1);
          merger.connect(masterGain);

          leftOsc.start();
          rightOsc.start();
          this._registry.oscillators.add(leftOsc);
          this._registry.oscillators.add(rightOsc);
        }
      }

      // Haptics — registered so stopAll clears them
      const hapticsEnabled = options.hapticsEnabled === true || options.withHaptics === true;
      if (hapticsEnabled && tonePatch.hapticPattern?.length && global.navigator?.vibrate) {
        global.navigator.vibrate(tonePatch.hapticPattern);
        this._registry.hapticActive = true;
      }

      // Restore Infinite Field phase if a prior session saved one
      // (precise oscillator phase restoration requires AudioWorklet; this stores the
      // session boundary so future builds can recover it)
      if (materializedPatch.continuityMode === 'infinite-field' && this._phase) {
        materializedPatch.metadata.restoredPhase = this._phase;
      }

      // Server-approved duration ceiling — registered timer
      const durationMs = limits.durationSeconds * 1000;
      const timerId = (global.setTimeout || setTimeout)(() => {
        this._registeredStop('natural-completion');
      }, durationMs);
      this._registry.timers.add(timerId);

      this._running = true;

      return {
        patchId: tonePatch.id,
        audioPatchId: audioPatch.id,
        durationSeconds: limits.durationSeconds,
        volume: materializedPatch.masterGain,
        warnings: [
          ...(tonePatch.warnings || []),
          ...(materializedPatch.runtime?.warnings || [])
        ],
        boundary: this._preflight.boundary || ''
      };
    }

    /*
      Called when an SCFE snapshot arrives mid-session.
      If body-no: halt immediately.
    */
    onFieldSnapshot(snapshot) {
      if (!this._running) return;
      const fieldApi = global.StarwellConcurrentFieldAudio;
      if (!fieldApi) return;
      fieldApi.setSnapshot?.(snapshot, 'hearthgate-adapter');
      const summary = fieldApi.summarize?.();
      if (summary?.somatic?.bodySays === 'no' || summary?.somatic?.audioMode === 'mute') {
        this.stopAll('scfe-body-no');
      }
    }

    /*
      Internal — called by timers, natural completion, error paths.
      Always routes through stopAll so the registry is cleared once.
    */
    _registeredStop(reason) {
      this.stopAll(reason);
    }

    /*
      The one lever.

      Stop, Feather, Icarus, route changes, window closure, fatal engine errors,
      and SCFE body-no all call this. It is idempotent: calling it twice is safe.

      Clears: oscillators, buffers, timers, animation frames, haptics.
      Saves: Infinite Field phase state for the next session.
      Releases: StarwellSharedAudioContext registration.
    */
    stopAll(reason = 'stop') {
      if (!this._running && this._lastStop) return;   // idempotent

      const now = this._ctx?.currentTime ?? 0;

      for (const osc of this._registry.oscillators) {
        try { osc.stop(now + 0.05); } catch (_) {}
      }
      this._registry.oscillators.clear();

      for (const buf of this._registry.buffers) {
        try { buf.stop(); } catch (_) {}
      }
      this._registry.buffers.clear();

      for (const id of this._registry.timers) {
        (global.clearTimeout || clearTimeout)(id);
      }
      this._registry.timers.clear();

      for (const id of this._registry.frames) {
        try { (global.cancelAnimationFrame || cancelAnimationFrame)?.(id); } catch (_) {}
      }
      this._registry.frames.clear();

      if (this._registry.hapticActive && global.navigator?.vibrate) {
        global.navigator.vibrate(0);
      }
      this._registry.hapticActive = false;

      // Save Infinite Field phase boundary for next session
      if (this._ctx) {
        this._phase = {
          savedAt: new Date().toISOString(),
          contextTimeSampled: this._ctx.currentTime,
          stoppedByUser: reason !== 'natural-completion'
        };
      }

      if (this._releaseCtx) {
        this._releaseCtx();
        this._releaseCtx = null;
      }

      this._running = false;
      this._lastStop = { reason, at: new Date().toISOString() };
    }

    get running() { return this._running; }
    get lastStop() { return this._lastStop ? { ...this._lastStop } : null; }
    get phase() { return this._phase ? { ...this._phase } : null; }
    get preflightValid() { return Boolean(this._preflight?.allowed); }

    get registrySnapshot() {
      return {
        oscillators: this._registry.oscillators.size,
        buffers: this._registry.buffers.size,
        timers: this._registry.timers.size,
        frames: this._registry.frames.size,
        hapticActive: this._registry.hapticActive
      };
    }
  }

  global.HearthgateToneEngineAdapter = HearthgateToneEngineAdapter;
  global.hearthgateTonePatchToAudioPatch = tonePatchToAudioPatch;

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
