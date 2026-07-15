'use strict';

/*
  Wardenclyffe <-> Möbius Coupler v0.2

  Native transport: one shared AudioContext and direct AudioNode routing.
  Optional transport: MediaStream ingress/egress for independent tools.

  The coupler adds:
  - dry / Möbius / both routing per stem
  - protected or unlocked binaural integrity
  - persistent Möbius delay/filter/feedback state
  - exact-loop reporting, sealed live continuity, and infinite fields
  - named patch import/export
  - Concurrent Field materialization after explicit user invocation
*/

(function installWardenclyffeMobiusCoupler(global) {
  const STORAGE_KEY = 'starwell.wardenclyffeMobius.v0.2.patch';
  const contract = () => global.StarwellAudioPatchContract;
  const shared = () => global.StarwellSharedAudioContext;
  const field = () => global.StarwellConcurrentFieldAudio;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

  function safeStop(node, at = 0) {
    try { node?.stop?.(at); } catch (error) {}
  }

  function safeDisconnect(node) {
    try { node?.disconnect?.(); } catch (error) {}
  }

  class WardenclyffeMobiusCoupler {
    constructor(bus, options = {}) {
      this.bus = bus;
      this.options = options;
      this.ctx = null;
      this.sources = [];
      this.nodes = [];
      this.patch = null;
      this.running = false;
      this.externalSources = [];
      this.releaseSharedClient = null;
      this.mobiusNetwork = null;
      this.bridgeDestination = null;
      this.bridgeMix = null;
      this.onState = null;
    }

    async ensure() {
      const Shared = shared();
      if (!Shared) throw new Error('StarwellSharedAudioContext is unavailable.');
      if (!global.MobiusAudioBus) throw new Error('MobiusAudioBus is unavailable.');
      Shared.installMobiusSharedContext(global.MobiusAudioBus);
      await this.bus.ensure();
      this.ctx = this.bus.ctx;
      if (!this.releaseSharedClient) {
        this.releaseSharedClient = Shared.register('wardenclyffe-engine', {
          engine: 'wardenclyffe',
          transport: 'shared-context'
        });
      }
      this.ensureMobiusNetwork();
      this.ensureBridgeOutput();
      return this.ctx;
    }

    ensureMobiusNetwork() {
      if (this.mobiusNetwork || !this.ctx) return this.mobiusNetwork;
      const ctx = this.ctx;
      const input = ctx.createGain();
      const delay = ctx.createDelay(2);
      const filter = ctx.createBiquadFilter();
      const feedback = ctx.createGain();
      const output = ctx.createGain();

      input.gain.value = 1;
      delay.delayTime.value = 0.13;
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.7;
      feedback.gain.value = 0.08;
      output.gain.value = 0.10;

      input.connect(delay);
      delay.connect(filter);
      filter.connect(output);
      filter.connect(feedback);
      feedback.connect(delay);
      output.connect(this.bus.routeFor('return'));

      this.mobiusNetwork = { input, delay, filter, feedback, output };
      this.nodes.push(input, delay, filter, feedback, output);
      return this.mobiusNetwork;
    }

    ensureBridgeOutput() {
      if (this.bridgeDestination || !this.ctx) return this.bridgeDestination;
      this.bridgeMix = this.ctx.createGain();
      this.bridgeMix.gain.value = 0.9;
      this.bridgeDestination = this.ctx.createMediaStreamDestination();
      this.bridgeMix.connect(this.bridgeDestination);
      this.nodes.push(this.bridgeMix, this.bridgeDestination);
      return this.bridgeDestination;
    }

    configureMobius(patch) {
      const now = this.ctx.currentTime;
      const network = this.ensureMobiusNetwork();
      this.bus.setPhaseInverted(patch.mobius.phaseInverted);
      this.bus.setReturnSide(patch.mobius.returnSide);
      this.bus.setMonoSafe(false);
      this.bus.setMaster(patch.masterGain);
      network.delay.delayTime.setTargetAtTime(patch.mobius.delaySeconds, now, 0.04);
      network.filter.frequency.setTargetAtTime(patch.mobius.filterHz, now, 0.04);
      network.feedback.gain.setTargetAtTime(patch.mobius.feedback, now, 0.04);
      network.output.gain.setTargetAtTime(patch.mobius.enabled ? patch.mobius.returnLevel : 0.0001, now, 0.04);
    }

    makeGain(destination, value) {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0001, value), this.ctx.currentTime);
      gain.connect(destination);
      this.nodes.push(gain);
      return gain;
    }

    connectStemOutput(source, stem, dryRoute, gainScale = 1) {
      const dryEnabled = stem.send === 'dry' || stem.send === 'both';
      const sendEnabled = stem.send === 'mobius' || stem.send === 'both';
      const dryGain = stem.gain * gainScale;
      const sendGain = stem.gain * stem.sendLevel * (this.patch?.mobius?.sendLevel ?? 1) * gainScale;

      if (dryEnabled && dryRoute) source.connect(this.makeGain(dryRoute, dryGain));
      if (sendEnabled) source.connect(this.makeGain(this.mobiusNetwork.input, sendGain));
      if (this.bridgeMix) source.connect(this.makeGain(this.bridgeMix, stem.gain * 0.82 * gainScale));
    }

    createOscillator(frequency, stem) {
      const osc = this.ctx.createOscillator();
      osc.type = stem.waveform || 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      if (stem.modulation?.type === 'am' && stem.modulation.frequency > 0 && stem.modulation.depth > 0) {
        const amp = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const depth = clamp(stem.modulation.depth, 0, 0.85);
        amp.gain.value = 1 - depth * 0.5;
        lfo.frequency.value = stem.modulation.frequency;
        lfoGain.gain.value = depth * 0.5;
        lfo.connect(lfoGain);
        lfoGain.connect(amp.gain);
        osc.connect(amp);
        lfo.start();
        this.sources.push(lfo);
        this.nodes.push(amp, lfoGain);
        return { oscillator: osc, output: amp };
      }
      return { oscillator: osc, output: osc };
    }

    startToneStem(stem) {
      const { oscillator, output } = this.createOscillator(stem.frequency, stem);
      this.connectStemOutput(output, stem, this.bus.routeFor(stem.route || 'centre'));
      oscillator.start();
      this.sources.push(oscillator);
    }

    startBinauralStem(stem) {
      const protectedCarrier = this.patch.binauralIntegrity === 'protected' && stem.protected !== false;
      const leftStem = { ...stem, send: protectedCarrier ? 'dry' : stem.send };
      const rightStem = { ...stem, send: protectedCarrier ? 'dry' : stem.send };
      const left = this.createOscillator(stem.leftFrequency, leftStem);
      const right = this.createOscillator(stem.rightFrequency, rightStem);
      this.connectStemOutput(left.output, leftStem, this.bus.routeFor('left'), Math.SQRT1_2);
      this.connectStemOutput(right.output, rightStem, this.bus.routeFor('right'), Math.SQRT1_2);
      left.oscillator.start();
      right.oscillator.start();
      this.sources.push(left.oscillator, right.oscillator);
    }

    startNoiseStem(stem) {
      const seconds = Math.max(2, this.patch.loopQuantumSeconds || 10);
      const frames = Math.floor(this.ctx.sampleRate * seconds);
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let pink = 0;
      for (let i = 0; i < frames; i += 1) {
        const white = Math.random() * 2 - 1;
        pink = stem.noise.type === 'white' ? white : (pink + 0.025 * white) / 1.025;
        data[i] = pink * (stem.noise.type === 'white' ? 0.42 : 2.2);
      }
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = stem.noise.filterHz;
      filter.Q.value = stem.noise.q;
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter);
      this.connectStemOutput(filter, stem, this.bus.routeFor(stem.route || 'centre'));
      source.start();
      this.sources.push(source);
      this.nodes.push(filter);
    }

    async start(patchInput, options = {}) {
      await this.ensure();
      this.stopSourcesOnly();
      const Contract = contract();
      if (!Contract) throw new Error('StarwellAudioPatchContract is unavailable.');
      const selected = Contract.normalizePatch(patchInput);
      this.patch = options.useFieldSnapshot === false ? selected : field()?.materialize(selected) || selected;
      if (this.patch.runtime?.somaticVeto) {
        this.emit('somatic-veto');
        throw new Error('Somatic layer says no or mute. Patch was not started.');
      }

      this.configureMobius(this.patch);
      this.patch.stems.filter((stem) => stem.enabled).forEach((stem) => {
        if (stem.kind === 'binaural-pair') this.startBinauralStem(stem);
        else if (stem.kind === 'noise') this.startNoiseStem(stem);
        else if (stem.kind === 'tone') this.startToneStem(stem);
      });
      this.running = true;
      this.emit('running');
      return this.getState('running');
    }

    stopSourcesOnly() {
      const at = this.ctx?.currentTime || 0;
      this.sources.forEach((source) => safeStop(source, at + 0.02));
      this.sources = [];
      this.running = false;
    }

    feather(fade = 0.12) {
      this.stopSourcesOnly();
      if (this.ctx && this.mobiusNetwork) {
        const now = this.ctx.currentTime;
        this.mobiusNetwork.output.gain.cancelScheduledValues(now);
        this.mobiusNetwork.output.gain.setTargetAtTime(0.0001, now, fade);
      }
      this.bus.feather(fade);
      this.emit('feather-stop');
    }

    async connectMediaStream(stream, options = {}) {
      await this.ensure();
      if (!(stream instanceof MediaStream)) throw new Error('Expected a MediaStream.');
      const source = this.ctx.createMediaStreamSource(stream);
      const send = ['dry', 'mobius', 'both'].includes(options.send) ? options.send : 'mobius';
      const gain = clamp(options.gain ?? 0.08, 0.001, 0.25);
      if (send === 'dry' || send === 'both') source.connect(this.makeGain(this.bus.routeFor('centre'), gain));
      if (send === 'mobius' || send === 'both') source.connect(this.makeGain(this.mobiusNetwork.input, gain * 0.72));
      this.externalSources.push(source);
      this.nodes.push(source);
      this.emit('media-stream-connected');
      return source;
    }

    getBridgeStream() {
      return this.bridgeDestination?.stream || null;
    }

    getState(reason = 'state') {
      const Contract = contract();
      return {
        reason,
        running: this.running,
        patch: this.patch,
        sourceCount: this.sources.length,
        externalSourceCount: this.externalSources.length,
        sharedContext: shared()?.state?.('coupler') || null,
        exactLoop: this.patch && Contract ? Contract.exactLoopReport(this.patch) : null,
        continuity: this.patch ? {
          mode: this.patch.continuityMode,
          oscillatorState: this.patch.continuityMode === 'infinite-field' ? 'phase-continuous' : 'held-live',
          mobiusState: this.mobiusNetwork ? 'persistent-within-context' : 'uninitialised',
          finiteRenderer: this.patch.continuityMode === 'sealed-loop' ? 'live-state-ready; offline tail-seal renderer pending' : 'not-required'
        } : null,
        transport: {
          native: 'shared-context',
          externalIngress: 'media-stream',
          bridgeStreamReady: Boolean(this.getBridgeStream())
        }
      };
    }

    emit(reason) {
      const state = this.getState(reason);
      try { global.dispatchEvent(new CustomEvent('starwell:wardenclyffe-mobius', { detail: state })); } catch (error) {}
      if (typeof this.onState === 'function') this.onState(state);
    }
  }

  function setupLab() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    const bus = global.mobiusAudioBus;
    const Contract = contract();
    if (!root || !grid || !bus || !Contract || root.querySelector('[data-wardenclyffe-coupler]')) return;

    const coupler = new WardenclyffeMobiusCoupler(bus);
    global.wardenclyffeMobiusCoupler = coupler;

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.wardenclyffeCoupler = 'true';
    card.innerHTML = `
      <h2>Wardenclyffe × Möbius Patch Bay</h2>
      <p>One shared AudioContext for native coupling, plus an optional MediaStream door for external audio. Every stem declares dry, Möbius, or both.</p>
      <div class="stack">
        <label>Patch preset<select data-wm-preset><option value="dream">Dream-Signal 3.4</option><option value="experimental">Experimental Field</option><option value="custom">Custom JSON</option></select></label>
        <div class="row">
          <label>Routing mode<select data-wm-routing>${Contract.ROUTING_MODES.map((value) => `<option value="${value}">${value}</option>`).join('')}</select></label>
          <label>Binaural integrity<select data-wm-integrity>${Contract.INTEGRITY_MODES.map((value) => `<option value="${value}">${value}</option>`).join('')}</select></label>
        </div>
        <div class="row">
          <label>Continuity<select data-wm-continuity>${Contract.CONTINUITY_MODES.map((value) => `<option value="${value}">${value}</option>`).join('')}</select></label>
          <label>Transport<select data-wm-transport>${Contract.TRANSPORT_MODES.map((value) => `<option value="${value}">${value}</option>`).join('')}</select></label>
        </div>
        <label class="inline"><input type="checkbox" data-wm-field checked> Materialize from latest Concurrent Field Snapshot</label>
        <div class="controls">
          <button class="primary" data-wm-action="wake" type="button">Wake shared engine</button>
          <button data-wm-action="start" type="button">Start patch</button>
          <button class="feather" data-wm-action="feather" type="button">Feather both</button>
          <button data-wm-action="microphone" type="button">Bridge microphone</button>
        </div>
        <p class="status" data-wm-status role="status" aria-live="polite">Patch bay loaded. Audio still requires a tap.</p>
      </div>
      <h3>Stem sends</h3>
      <div data-wm-stems class="stack"></div>
      <h3>Patch declaration</h3>
      <textarea data-wm-json spellcheck="false"></textarea>
      <div class="controls">
        <button data-wm-action="apply-json" type="button">Apply JSON</button>
        <button data-wm-action="save" type="button">Save local patch</button>
        <button data-wm-action="export" type="button">Export patch</button>
        <button data-wm-action="import" type="button">Import patch</button>
        <input data-wm-file type="file" accept=".json,application/json" hidden>
      </div>
      <h3>Coupled state</h3>
      <pre data-wm-state>{}</pre>
      <h3>Concurrent Field ingress</h3>
      <pre data-wm-field-state>{}</pre>
      <p class="tiny">Protected mode keeps binaural carriers on their native left/right lanes and sends only eligible chamber stems into Möbius. Unlocked mode permits deliberate carrier folding.</p>
    `;

    const toneMap = [...grid.querySelectorAll('.card h2')].find((heading) => heading.textContent.trim() === 'Tone map')?.closest('.card');
    if (toneMap) grid.insertBefore(card, toneMap);
    else grid.prepend(card);

    const $ = (selector) => card.querySelector(selector);
    const status = $('[data-wm-status]');
    const stateOut = $('[data-wm-state]');
    const fieldOut = $('[data-wm-field-state]');
    const editor = $('[data-wm-json]');
    const stemsRoot = $('[data-wm-stems]');
    const presetSelect = $('[data-wm-preset]');
    const routing = $('[data-wm-routing]');
    const integrity = $('[data-wm-integrity]');
    const continuity = $('[data-wm-continuity]');
    const transport = $('[data-wm-transport]');
    let patch = Contract.clone(Contract.presets.dreamSignal34);

    function setStatus(text) { status.textContent = text; }

    function syncEditor() {
      editor.value = JSON.stringify(patch, null, 2);
      routing.value = patch.routingMode;
      integrity.value = patch.binauralIntegrity;
      continuity.value = patch.continuityMode;
      transport.value = patch.transport;
      renderStems();
    }

    function renderStems() {
      stemsRoot.replaceChildren();
      patch.stems.forEach((stem, index) => {
        const row = document.createElement('div');
        row.className = 'note-entry';
        const frequency = stem.kind === 'binaural-pair'
          ? `${stem.leftFrequency} / ${stem.rightFrequency} Hz = ${stem.beatFrequency.toFixed(3)} Hz`
          : stem.kind === 'tone' ? `${stem.frequency} Hz` : stem.kind;
        row.innerHTML = `<strong>${stem.label}</strong><span class="tiny">${frequency}</span><label>Send<select data-wm-stem-send="${index}"><option value="dry">dry</option><option value="mobius">Möbius</option><option value="both">both</option></select></label>`;
        row.querySelector('select').value = stem.send;
        stemsRoot.appendChild(row);
      });
    }

    function readPatchFromEditor() {
      const parsed = JSON.parse(editor.value);
      patch = Contract.normalizePatch(parsed);
      syncEditor();
      return patch;
    }

    function selectPreset(value) {
      if (value === 'dream') patch = Contract.clone(Contract.presets.dreamSignal34);
      else if (value === 'experimental') patch = Contract.clone(Contract.presets.experimentalBlank);
      syncEditor();
    }

    coupler.onState = (state) => {
      stateOut.textContent = JSON.stringify(state, null, 2);
      if (state.reason === 'running') setStatus(`Running ${state.patch?.name || 'patch'} through shared context.`);
      if (state.reason === 'feather-stop') setStatus('Feather stop: Wardenclyffe sources stopped and Möbius output faded.');
    };

    field()?.subscribe(({ summary }) => { fieldOut.textContent = JSON.stringify(summary, null, 2); });

    card.addEventListener('change', (event) => {
      const target = event.target;
      if (target === presetSelect && target.value !== 'custom') selectPreset(target.value);
      if (target === routing) patch.routingMode = target.value;
      if (target === integrity) patch.binauralIntegrity = target.value;
      if (target === continuity) patch.continuityMode = target.value;
      if (target === transport) patch.transport = target.value;
      if (target.matches('[data-wm-stem-send]')) {
        patch.stems[Number(target.dataset.wmStemSend)].send = target.value;
      }
      if (target !== presetSelect) {
        patch = Contract.normalizePatch(patch);
        editor.value = JSON.stringify(patch, null, 2);
      }
      renderStems();
    });

    card.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-wm-action]');
      if (!button) return;
      const action = button.dataset.wmAction;
      try {
        if (action === 'wake') {
          await coupler.ensure();
          setStatus('Shared AudioContext awake. Wardenclyffe and Möbius are on one graph.');
        } else if (action === 'start') {
          readPatchFromEditor();
          const report = Contract.validatePatch(patch);
          if (!report.valid) throw new Error(report.errors.join(' '));
          await coupler.start(report.patch, { useFieldSnapshot: $('[data-wm-field]').checked });
          if (report.warnings.length) setStatus(`Running with declaration: ${report.warnings.join(' ')}`);
        } else if (action === 'feather') {
          coupler.feather();
        } else if (action === 'microphone') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          await coupler.connectMediaStream(stream, { send: 'mobius', gain: 0.045 });
          setStatus('Microphone bridged into Möbius after browser permission.');
        } else if (action === 'apply-json') {
          readPatchFromEditor();
          presetSelect.value = 'custom';
          setStatus('Patch JSON applied.');
        } else if (action === 'save') {
          readPatchFromEditor();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(patch));
          setStatus('Patch saved locally.');
        } else if (action === 'export') {
          readPatchFromEditor();
          const blob = new Blob([JSON.stringify(patch, null, 2)], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${patch.id}.starwell-audio.json`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          setStatus('Patch exported.');
        } else if (action === 'import') {
          $('[data-wm-file]').click();
        }
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      }
    });

    $('[data-wm-file]').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        patch = Contract.normalizePatch(JSON.parse(await file.text()));
        presetSelect.value = 'custom';
        syncEditor();
        setStatus(`Imported ${patch.name}.`);
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
      event.target.value = '';
    });

    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored) {
        patch = Contract.normalizePatch(stored);
        presetSelect.value = 'custom';
      }
    } catch (error) {}

    syncEditor();
    stateOut.textContent = JSON.stringify(coupler.getState('loaded'), null, 2);
    fieldOut.textContent = JSON.stringify(field()?.summarize?.() || { status: 'waiting' }, null, 2);
  }

  global.WardenclyffeMobiusCoupler = WardenclyffeMobiusCoupler;
  if (global.MobiusAudioBus) shared()?.installMobiusSharedContext(global.MobiusAudioBus);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupLab);
  else setupLab();
})(window);
