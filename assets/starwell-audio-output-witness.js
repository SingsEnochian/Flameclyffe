'use strict';

/* Audible output witness for the coupled lab. Runs only after an explicit tap. */

(function installAudioOutputWitness(global) {
  function rms(analyser) {
    if (!analyser) return 0;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const sample of data) sum += sample * sample;
    return Math.sqrt(sum / data.length);
  }

  async function directSpeakerWitness() {
    const shared = global.StarwellSharedAudioContext;
    if (!shared?.ensure) throw new Error('Shared AudioContext is unavailable.');
    const ctx = await shared.ensure();
    if (ctx.state !== 'running') await ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.035);
    gain.gain.setTargetAtTime(0.0001, now + 0.48, 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.72);

    return {
      contextState: ctx.state,
      sampleRate: ctx.sampleRate,
      frequency: 660,
      peakGain: 0.055,
      route: 'direct-to-destination'
    };
  }

  async function routedBusWitness() {
    const bus = global.mobiusAudioBus;
    if (!bus) throw new Error('Möbius Bus is unavailable.');
    await bus.ensure();
    bus.setMaster(Math.max(0.24, Number(bus.masterLevel || 0)));
    bus.setDuration(1.1);
    await bus.runTest('centre');

    await new Promise((resolve) => setTimeout(resolve, 180));
    const left = rms(bus.nodes.leftAnalyser);
    const right = rms(bus.nodes.rightAnalyser);
    return {
      contextState: bus.ctx?.state || 'unknown',
      masterGain: bus.nodes.master?.gain?.value ?? null,
      leftRms: left,
      rightRms: right,
      detected: left > 0.00005 || right > 0.00005,
      route: 'centre-bus-to-master-to-destination'
    };
  }

  function install() {
    const root = document.querySelector('[data-mobius-lab]');
    const heroControls = root?.querySelector('.hero .controls');
    const status = root?.querySelector('#mobius-status');
    if (!root || !heroControls || root.querySelector('[data-output-witness]')) return;

    const direct = document.createElement('button');
    direct.type = 'button';
    direct.dataset.outputWitness = 'speaker';
    direct.textContent = 'Speaker test';

    const routed = document.createElement('button');
    routed.type = 'button';
    routed.dataset.outputWitness = 'bus';
    routed.textContent = 'Routed bus test';

    heroControls.append(direct, routed);

    const report = document.createElement('pre');
    report.dataset.outputWitnessReport = 'true';
    report.textContent = JSON.stringify({ status: 'waiting for explicit test' }, null, 2);
    heroControls.insertAdjacentElement('afterend', report);

    root.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-output-witness]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      button.disabled = true;
      try {
        const result = button.dataset.outputWitness === 'speaker'
          ? await directSpeakerWitness()
          : await routedBusWitness();
        report.textContent = JSON.stringify(result, null, 2);
        if (status) {
          status.textContent = button.dataset.outputWitness === 'speaker'
            ? 'Direct speaker witness fired at 660 Hz. If silent, check browser/tab/device output.'
            : result.detected
              ? 'Routed signal detected in the left/right analysers and sent to the speaker destination.'
              : 'Routed test ran, but the analysers detected no signal. The graph still has a break.';
        }
      } catch (error) {
        report.textContent = JSON.stringify({ error: error.message }, null, 2);
        if (status) status.textContent = `Output witness failed: ${error.message}`;
      } finally {
        button.disabled = false;
      }
    }, true);
  }

  global.StarwellAudioOutputWitness = Object.freeze({
    VERSION: '0.1.0',
    directSpeakerWitness,
    routedBusWitness
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})(window);

