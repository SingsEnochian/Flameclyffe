'use strict';

/*
  Möbius Audio Bus v0.1
  Purpose: controlled stereo/mono audio test architecture for STARWELL experiments.
  Claim boundary:
  - Web Audio routing, panning, channel merging, phase inversion: established audio engineering.
  - Body/perception reports: subjective experimental data.
  - Cosmological interpretation: speculative theory until separately evidenced.
*/

(function () {
  const STORAGE_KEY = 'starwell.mobiusAudioBus.v0.1.notes';
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

  function safeDisconnect(node) {
    try { node?.disconnect?.(); } catch (error) {}
  }

  class MobiusAudioBus {
    constructor(options = {}) {
      this.options = options;
      this.ctx = null;
      this.ready = false;
      this.activeSources = [];
      this.monitorFrame = null;
      this.phaseInverted = true;
      this.monoSafe = false;
      this.returnSide = 'right';
      this.masterLevel = 0.12;
      this.testSeconds = 2;
      this.loopEnabled = false;
      this.loopHeld = false;
      this.loopRamp = 0.5;
      this.lastMode = 'mobius-return';
      this.loopIteration = 0;
      this.nodes = {};
      this.onMeter = null;
      this.onState = null;
    }

    async ensure() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio API is not available in this browser.');
      if (!this.ctx) this.build(new AudioContext({ latencyHint: 'interactive' }));
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.ready = true;
      this.emitState('ready');
      return this.ctx;
    }

    build(ctx) {
      this.ctx = ctx;
      const n = this.nodes;

      n.leftBus = ctx.createGain();
      n.rightBus = ctx.createGain();
      n.centreBus = ctx.createGain();
      n.returnBus = ctx.createGain();
      n.leftMix = ctx.createGain();
      n.rightMix = ctx.createGain();
      n.centreLeft = ctx.createGain();
      n.centreRight = ctx.createGain();
      n.returnPhase = ctx.createGain();
      n.returnLeft = ctx.createGain();
      n.returnRight = ctx.createGain();
      n.monoSum = ctx.createGain();
      n.monoLeft = ctx.createGain();
      n.monoRight = ctx.createGain();
      n.merger = ctx.createChannelMerger(2);
      n.splitter = ctx.createChannelSplitter(2);
      n.leftAnalyser = ctx.createAnalyser();
      n.rightAnalyser = ctx.createAnalyser();
      n.master = ctx.createGain();
      n.limiter = ctx.createDynamicsCompressor();

      n.leftBus.gain.value = 1;
      n.rightBus.gain.value = 1;
      n.centreBus.gain.value = 1;
      n.returnBus.gain.value = 1;
      n.leftMix.gain.value = 1;
      n.rightMix.gain.value = 1;
      n.centreLeft.gain.value = Math.SQRT1_2;
      n.centreRight.gain.value = Math.SQRT1_2;
      n.returnPhase.gain.value = this.phaseInverted ? -1 : 1;
      n.monoSum.gain.value = Math.SQRT1_2;
      n.monoLeft.gain.value = Math.SQRT1_2;
      n.monoRight.gain.value = Math.SQRT1_2;
      n.master.gain.value = 0.0001;

      n.leftAnalyser.fftSize = 512;
      n.rightAnalyser.fftSize = 512;
      n.limiter.threshold.value = -24;
      n.limiter.knee.value = 18;
      n.limiter.ratio.value = 9;
      n.limiter.attack.value = 0.006;
      n.limiter.release.value = 0.20;

      n.merger.connect(n.splitter);
      n.splitter.connect(n.leftAnalyser, 0);
      n.splitter.connect(n.rightAnalyser, 1);
      n.merger.connect(n.master);
      n.master.connect(n.limiter);
      n.limiter.connect(ctx.destination);

      this.connectGraph();
      this.startMeters();
    }

    connectGraph() {
      const n = this.nodes;
      [
        n.leftBus, n.rightBus, n.centreBus, n.returnBus, n.leftMix, n.rightMix,
        n.centreLeft, n.centreRight, n.returnPhase, n.returnLeft, n.returnRight,
        n.monoSum, n.monoLeft, n.monoRight
      ].forEach(safeDisconnect);

      if (this.monoSafe) {
        n.leftBus.connect(n.monoSum);
        n.rightBus.connect(n.monoSum);
        n.centreBus.connect(n.monoSum);
        n.returnBus.connect(n.returnPhase);
        n.returnPhase.connect(n.monoSum);
        n.monoSum.connect(n.monoLeft);
        n.monoSum.connect(n.monoRight);
        n.monoLeft.connect(n.leftMix);
        n.monoRight.connect(n.rightMix);
      } else {
        n.leftBus.connect(n.leftMix);
        n.rightBus.connect(n.rightMix);
        n.centreBus.connect(n.centreLeft);
        n.centreBus.connect(n.centreRight);
        n.centreLeft.connect(n.leftMix);
        n.centreRight.connect(n.rightMix);
        n.returnBus.connect(n.returnPhase);
        n.returnPhase.connect(n.returnLeft);
        n.returnPhase.connect(n.returnRight);
        this.applyReturnSide();
      }

      n.leftMix.connect(n.merger, 0, 0);
      n.rightMix.connect(n.merger, 0, 1);
      this.emitState('graph-updated');
    }

    applyReturnSide() {
      const { returnLeft, returnRight } = this.nodes;
      if (!returnLeft || !returnRight) return;
      returnLeft.gain.value = this.returnSide === 'left' || this.returnSide === 'both' ? 1 : 0;
      returnRight.gain.value = this.returnSide === 'right' || this.returnSide === 'both' ? 1 : 0;
    }

    setMonoSafe(value) {
      this.monoSafe = Boolean(value);
      if (this.ctx) this.connectGraph();
      this.emitState('mono-safe');
    }

    setPhaseInverted(value) {
      this.phaseInverted = Boolean(value);
      if (this.nodes.returnPhase) this.nodes.returnPhase.gain.value = this.phaseInverted ? -1 : 1;
      this.emitState('phase');
    }

    setReturnSide(value) {
      this.returnSide = ['left', 'right', 'both'].includes(value) ? value : 'right';
      this.applyReturnSide();
      this.emitState('return-side');
    }

    setMaster(value) {
      this.masterLevel = clamp(value, 0.01, 0.32);
      if (this.nodes.master && this.ctx) {
        this.nodes.master.gain.setTargetAtTime(this.masterLevel, this.ctx.currentTime, 0.04);
      }
      this.emitState('master');
    }

    setDuration(value) {
      this.testSeconds = clamp(value, 0.25, 30);
      this.emitState('duration');
    }

    setLoopEnabled(value) {
      this.loopEnabled = Boolean(value);
      if (!this.loopEnabled && this.loopHeld) this.feather();
      else this.emitState(this.loopEnabled ? 'loop-armed' : 'loop-disarmed');
    }

    setLoopRamp(value) {
      this.loopRamp = clamp(value, 0, 8);
      this.emitState('loop-ramp');
    }

    routeFor(name) {
      const n = this.nodes;
      if (name === 'left') return n.leftBus;
      if (name === 'right') return n.rightBus;
      if (name === 'centre') return n.centreBus;
      if (name === 'return') return n.returnBus;
      return n.centreBus;
    }

    makeEnvelope(destination, peak = 0.06, duration = this.testSeconds) {
      const g = this.ctx.createGain();
      const now = this.ctx.currentTime;
      const end = now + Math.max(0.12, duration);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.035);
      g.gain.setTargetAtTime(0.0001, Math.max(now + 0.10, end - 0.18), 0.055);
      g.connect(destination);
      return { gain: g, end };
    }

    makeHeldGain(destination, peak = 0.04) {
      const g = this.ctx.createGain();
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.setTargetAtTime(Math.max(0.0002, peak), now, Math.max(0.02, this.loopRamp));
      g.connect(destination);
      return g;
    }

    tone({ frequency = 440, route = 'centre', gain = 0.06, type = 'sine', duration = this.testSeconds, detune = 0 }) {
      const osc = this.ctx.createOscillator();
      const env = this.makeEnvelope(this.routeFor(route), gain, duration);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.detune.value = detune;
      osc.connect(env.gain);
      osc.start();
      osc.stop(env.end + 0.08);
      this.activeSources.push(osc, env.gain);
      return osc;
    }

    heldTone({ frequency = 440, route = 'centre', gain = 0.035, type = 'sine', detune = 0 }) {
      const osc = this.ctx.createOscillator();
      const env = this.makeHeldGain(this.routeFor(route), gain);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.detune.value = detune;
      osc.connect(env);
      osc.start();
      this.activeSources.push(osc, env);
      return osc;
    }

    splitTone({ frequency = 369, primary = 'left', secondary = 'return', primaryGain = 0.045, secondaryGain = 0.045, type = 'sine', duration = this.testSeconds }) {
      const osc = this.ctx.createOscillator();
      const now = this.ctx.currentTime;
      const end = now + Math.max(0.12, duration);
      const p = this.makeEnvelope(this.routeFor(primary), primaryGain, duration).gain;
      const s = this.makeEnvelope(this.routeFor(secondary), secondaryGain, duration).gain;
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      osc.connect(p);
      osc.connect(s);
      osc.start();
      osc.stop(end + 0.08);
      this.activeSources.push(osc, p, s);
      return osc;
    }

    heldSplitTone({ frequency = 369, primary = 'left', secondary = 'return', primaryGain = 0.035, secondaryGain = 0.035, type = 'sine' }) {
      const osc = this.ctx.createOscillator();
      const p = this.makeHeldGain(this.routeFor(primary), primaryGain);
      const s = this.makeHeldGain(this.routeFor(secondary), secondaryGain);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.connect(p);
      osc.connect(s);
      osc.start();
      this.activeSources.push(osc, p, s);
      return osc;
    }

    noise({ route = 'centre', gain = 0.018, duration = this.testSeconds, filter = 700, q = 0.75, loop = false }) {
      const frames = Math.max(1, Math.floor(this.ctx.sampleRate * Math.max(0.2, loop ? 2 : duration)));
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let pink = 0;
      for (let i = 0; i < frames; i += 1) {
        const white = Math.random() * 2 - 1;
        pink = (pink + 0.025 * white) / 1.025;
        data[i] = pink * 2.7;
      }
      const src = this.ctx.createBufferSource();
      const band = this.ctx.createBiquadFilter();
      const env = loop ? this.makeHeldGain(this.routeFor(route), gain) : this.makeEnvelope(this.routeFor(route), gain, duration).gain;
      band.type = 'bandpass';
      band.frequency.value = filter;
      band.Q.value = q;
      src.buffer = buffer;
      src.loop = Boolean(loop);
      src.connect(band);
      band.connect(env);
      src.start();
      if (!loop) src.stop(this.ctx.currentTime + Math.max(0.2, duration) + 0.05);
      this.activeSources.push(src, band, env);
    }

    async runTest(mode = 'mobius-return') {
      await this.ensure();
      this.loopHeld = false;
      this.loopIteration = 0;
      this.lastMode = mode;
      this.stopSourcesOnly();
      const now = this.ctx.currentTime;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.setTargetAtTime(this.masterLevel, now, 0.05);

      if (mode === 'left-only') {
        this.tone({ frequency: 440, route: 'left', gain: 0.055 });
      } else if (mode === 'right-only') {
        this.tone({ frequency: 440, route: 'right', gain: 0.055 });
      } else if (mode === 'centre') {
        this.tone({ frequency: 432, route: 'centre', gain: 0.055, type: 'triangle' });
      } else if (mode === 'return-only') {
        this.tone({ frequency: 369, route: 'return', gain: 0.055 });
      } else if (mode === 'gateway-offset') {
        this.tone({ frequency: 369, route: 'left', gain: 0.042 });
        this.tone({ frequency: 363.5, route: 'right', gain: 0.042 });
        this.tone({ frequency: 108, route: 'centre', gain: 0.025 });
      } else if (mode === 'full-twist') {
        this.tone({ frequency: 108, route: 'centre', gain: 0.022 });
        this.tone({ frequency: 369, route: 'left', gain: 0.035 });
        this.tone({ frequency: 363.5, route: 'right', gain: 0.035 });
        this.splitTone({ frequency: 369, primary: 'left', secondary: 'return', primaryGain: 0.020, secondaryGain: 0.032 });
        this.noise({ route: 'centre', gain: 0.006, filter: 520, q: 0.5 });
      } else {
        this.splitTone({ frequency: 369, primary: 'left', secondary: 'return', primaryGain: 0.044, secondaryGain: 0.044 });
      }

      this.emitState(mode);
      return true;
    }

    async startLoop(mode = 'mobius-return') {
      await this.ensure();
      this.loopEnabled = true;
      this.loopHeld = true;
      this.loopIteration += 1;
      this.lastMode = mode;
      this.stopSourcesOnly();
      const now = this.ctx.currentTime;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.setTargetAtTime(this.masterLevel, now, 0.05);

      if (mode === 'left-only') {
        this.heldTone({ frequency: 440, route: 'left', gain: 0.040 });
      } else if (mode === 'right-only') {
        this.heldTone({ frequency: 440, route: 'right', gain: 0.040 });
      } else if (mode === 'centre') {
        this.heldTone({ frequency: 432, route: 'centre', gain: 0.040, type: 'triangle' });
      } else if (mode === 'return-only') {
        this.heldTone({ frequency: 369, route: 'return', gain: 0.040 });
      } else if (mode === 'gateway-offset') {
        this.heldTone({ frequency: 369, route: 'left', gain: 0.031 });
        this.heldTone({ frequency: 363.5, route: 'right', gain: 0.031 });
        this.heldTone({ frequency: 108, route: 'centre', gain: 0.018 });
      } else if (mode === 'full-twist') {
        this.heldTone({ frequency: 108, route: 'centre', gain: 0.016 });
        this.heldTone({ frequency: 369, route: 'left', gain: 0.025 });
        this.heldTone({ frequency: 363.5, route: 'right', gain: 0.025 });
        this.heldSplitTone({ frequency: 369, primary: 'left', secondary: 'return', primaryGain: 0.014, secondaryGain: 0.024 });
        this.noise({ route: 'centre', gain: 0.004, filter: 520, q: 0.5, loop: true });
      } else {
        this.heldSplitTone({ frequency: 369, primary: 'left', secondary: 'return', primaryGain: 0.032, secondaryGain: 0.032 });
      }

      this.emitState('loop-holding');
      return true;
    }

    stopSourcesOnly() {
      const now = this.ctx?.currentTime || 0;
      this.activeSources.forEach((node) => {
        try {
          if (typeof node.stop === 'function') node.stop(now + 0.02);
        } catch (error) {}
        safeDisconnect(node);
      });
      this.activeSources = [];
    }

    feather(fade = 0.12) {
      this.loopEnabled = false;
      this.loopHeld = false;
      if (!this.ctx) {
        this.emitState('feather-stop');
        return;
      }
      const now = this.ctx.currentTime;
      this.stopSourcesOnly();
      this.nodes.master?.gain?.cancelScheduledValues(now);
      this.nodes.master?.gain?.setTargetAtTime(0.0001, now, fade);
      this.emitState('feather-stop');
    }

    startMeters() {
      if (this.monitorFrame) cancelAnimationFrame(this.monitorFrame);
      const leftData = new Float32Array(this.nodes.leftAnalyser.fftSize);
      const rightData = new Float32Array(this.nodes.rightAnalyser.fftSize);
      const tick = () => {
        if (!this.ctx) return;
        this.nodes.leftAnalyser.getFloatTimeDomainData(leftData);
        this.nodes.rightAnalyser.getFloatTimeDomainData(rightData);
        const left = this.rms(leftData);
        const right = this.rms(rightData);
        const diff = Math.abs(left - right);
        if (typeof this.onMeter === 'function') this.onMeter({ left, right, diff });
        this.monitorFrame = requestAnimationFrame(tick);
      };
      tick();
    }

    rms(data) {
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
      return Math.sqrt(sum / data.length);
    }

    getState(reason = 'state') {
      return {
        reason,
        ready: this.ready,
        monoSafe: this.monoSafe,
        phaseInverted: this.phaseInverted,
        returnSide: this.returnSide,
        masterLevel: this.masterLevel,
        testSeconds: this.testSeconds,
        loopEnabled: this.loopEnabled,
        loopHeld: this.loopHeld,
        loopRamp: this.loopRamp,
        lastMode: this.lastMode,
        loopIteration: this.loopIteration,
        sampleRate: this.ctx?.sampleRate || null,
        currentTime: this.ctx?.currentTime || null
      };
    }

    emitState(reason) {
      const state = this.getState(reason);
      try { window.dispatchEvent(new CustomEvent('mobius-audio-bus:state', { detail: state })); } catch (error) {}
      if (typeof this.onState === 'function') this.onState(state);
    }
  }

  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (error) { return []; }
  }

  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, 60)));
  }

  function setupLab() {
    const root = document.querySelector('[data-mobius-lab]');
    if (!root) return;
    const bus = new MobiusAudioBus();
    window.mobiusAudioBus = bus;

    const $ = (selector) => root.querySelector(selector);
    const status = $('#mobius-status');
    const leftMeter = $('#left-meter');
    const rightMeter = $('#right-meter');
    const diffMeter = $('#diff-meter');
    const stateOut = $('#mobius-state');
    const noteBody = $('#note-body');
    const noteList = $('#note-list');

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    function syncControls(state) {
      const loopMode = $('#loop-mode');
      const loopRamp = $('#loop-ramp');
      const phase = $('#phase-inverted');
      const mono = $('#mono-safe');
      const returnSide = $('#return-side');
      const master = $('#master-level');
      const duration = $('#duration');
      if (loopMode && loopMode.checked !== state.loopEnabled) loopMode.checked = state.loopEnabled;
      if (loopRamp && Number(loopRamp.value) !== state.loopRamp) loopRamp.value = String(state.loopRamp);
      if (phase && phase.checked !== state.phaseInverted) phase.checked = state.phaseInverted;
      if (mono && mono.checked !== state.monoSafe) mono.checked = state.monoSafe;
      if (returnSide && returnSide.value !== state.returnSide) returnSide.value = state.returnSide;
      if (master && Number(master.value) !== state.masterLevel) master.value = String(state.masterLevel);
      if (duration && Number(duration.value) !== state.testSeconds) duration.value = String(state.testSeconds);
    }

    function renderState(state) {
      syncControls(state);
      if (stateOut) stateOut.textContent = JSON.stringify(state, null, 2);
      if (state.reason === 'feather-stop') {
        setStatus('Feather stop: loop disarmed, audio faded, and sources released.');
      } else if (state.loopHeld) {
        setStatus(`Holding ${state.lastMode} continuously. Feather stops the loop.`);
      } else if (state.loopEnabled) {
        setStatus(`Loop armed for the next selected test.`);
      } else {
        setStatus(`State: ${state.reason}`);
      }
    }

    function renderNotes() {
      const notes = loadNotes();
      if (!noteList) return;
      noteList.replaceChildren();
      if (!notes.length) {
        const empty = document.createElement('p');
        empty.className = 'tiny';
        empty.textContent = 'No observations logged yet. The first goblin footstep awaits.';
        noteList.appendChild(empty);
        return;
      }
      notes.forEach((entry) => {
        const item = document.createElement('article');
        item.className = 'note-entry';
        const title = document.createElement('strong');
        const body = document.createElement('p');
        title.textContent = `${entry.createdAt} | ${entry.label}`;
        body.textContent = entry.body;
        item.append(title, body);
        noteList.appendChild(item);
      });
    }

    bus.onState = renderState;
    bus.onMeter = ({ left, right, diff }) => {
      const leftPct = Math.min(100, Math.round(left * 1800));
      const rightPct = Math.min(100, Math.round(right * 1800));
      const diffPct = Math.min(100, Math.round(diff * 2400));
      if (leftMeter) leftMeter.style.width = `${leftPct}%`;
      if (rightMeter) rightMeter.style.width = `${rightPct}%`;
      if (diffMeter) diffMeter.style.width = `${diffPct}%`;
    };

    root.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      try {
        if (action === 'wake') {
          await bus.ensure();
          bus.setMaster($('#master-level')?.value || bus.masterLevel);
          setStatus('Bus awake. Feather is armed.');
        } else if (action === 'feather') {
          bus.feather();
        } else if (action === 'run') {
          bus.setMaster($('#master-level')?.value || bus.masterLevel);
          bus.setDuration($('#duration')?.value || bus.testSeconds);
          bus.setLoopRamp($('#loop-ramp')?.value || bus.loopRamp);
          if ($('#loop-mode')?.checked) {
            await bus.startLoop(button.dataset.mode || 'mobius-return');
          } else {
            bus.setLoopEnabled(false);
            await bus.runTest(button.dataset.mode || 'mobius-return');
          }
        } else if (action === 'save-note') {
          const body = (noteBody?.value || '').trim();
          if (!body) {
            setStatus('Note not saved: the field is empty. Tiny clipboard goblin refused paperwork.');
            return;
          }
          const notes = loadNotes();
          const label = $('#claim-label')?.value || 'subjective-experiment';
          notes.unshift({ createdAt: new Date().toISOString(), label, body, state: bus.getState('note') });
          saveNotes(notes);
          noteBody.value = '';
          renderNotes();
          setStatus('Observation saved locally.');
        } else if (action === 'clear-notes') {
          saveNotes([]);
          renderNotes();
          setStatus('Local observation log cleared.');
        }
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      }
    });

    root.addEventListener('input', (event) => {
      const target = event.target;
      if (target?.id === 'mono-safe') bus.setMonoSafe(target.checked);
      if (target?.id === 'phase-inverted') bus.setPhaseInverted(target.checked);
      if (target?.id === 'return-side') bus.setReturnSide(target.value);
      if (target?.id === 'master-level') bus.setMaster(target.value);
      if (target?.id === 'duration') bus.setDuration(target.value);
      if (target?.id === 'loop-mode') bus.setLoopEnabled(target.checked);
      if (target?.id === 'loop-ramp') bus.setLoopRamp(target.value);
    });

    renderNotes();
    renderState(bus.getState('loaded'));
  }

  window.MobiusAudioBus = MobiusAudioBus;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupLab);
  else setupLab();
})();
