const boot = {
  status: 'loading',
  startedAt: new Date().toISOString(),
  completedAt: null,
  loaded: [],
  failed: null,
  missingGlobals: [],
};

const stages = [
  ['audio patch contract', () => import('../../../assets/starwell-audio-patch-contract.js')],
  ['Groundwire audio contract', () => import('../../../assets/starwell-groundwire-audio-contract.js')],
  ['output calibration', () => import('../../../assets/starwell-audio-output-calibration.js')],
  ['shared AudioContext', () => import('../../../assets/starwell-shared-audio-context.js')],
  ['Concurrent Field audio adapter', () => import('../../../assets/starwell-concurrent-field-audio.js')],
  ['Groundwire field adapter', () => import('../../../assets/starwell-groundwire-field-adapter.js')],
  ['Groundwire panel', () => import('../../../assets/starwell-groundwire-panel.js')],
  ['Groundwire telemetry', () => import('../../../assets/groundwire.js')],
  ['Möbius Audio Bus', () => import('../../../assets/mobius-audio-bus.js')],
  ['Möbius layered adapter', () => import('../../../assets/mobius-layered-spec-adapter.js')],
  ['Möbius DEEP/Groundwire adapter', () => import('../../../assets/mobius-deep-groundwire-adapter.js')],
  ['Wardenclyffe/Möbius coupler', () => import('../../../assets/wardenclyffe-mobius-coupler.js')],
  ['Runa 3-6-9 Harmonic Triptych', () => import('../../../assets/runa-369-harmonic-triptych.js')],
  ['live Groundwire coupling', () => import('../../../assets/wardenclyffe-groundwire-live.js')],
  ['audio output witness', () => import('../../../assets/starwell-audio-output-witness.js')],
];

function statusElement() {
  return document.querySelector('#mobius-status');
}

function publishBootState() {
  window.StarwellCoupledBoot = Object.freeze({
    ...boot,
    loaded: [...boot.loaded],
    missingGlobals: [...boot.missingGlobals],
    failed: boot.failed ? { ...boot.failed } : null,
  });

  try {
    window.dispatchEvent(new CustomEvent('starwell:coupled-boot', {
      detail: window.StarwellCoupledBoot,
    }));
  } catch (error) {}
}

function renderBootState() {
  const root = document.querySelector('[data-mobius-lab]');
  const status = statusElement();
  if (root) root.dataset.controlLayer = boot.status;

  if (!status) return;

  if (boot.failed) {
    status.textContent = `Control layer failed at ${boot.failed.stage}: ${boot.failed.message}`;
    return;
  }

  if (boot.missingGlobals.length) {
    status.textContent = `Control layer incomplete: ${boot.missingGlobals.join(', ')}`;
    return;
  }

  status.textContent = 'Control layer awake. Use Speaker test first.';
}

for (const [stage, load] of stages) {
  try {
    await load();
    boot.loaded.push(stage);
  } catch (error) {
    boot.status = 'failed';
    boot.failed = {
      stage,
      message: error?.message || String(error),
      stack: error?.stack || null,
    };
    break;
  }
}

if (!boot.failed) {
  const requiredGlobals = [
    ['audio patch contract', window.StarwellAudioPatchContract],
    ['shared AudioContext', window.StarwellSharedAudioContext],
    ['Möbius bus instance', window.mobiusAudioBus],
    ['Wardenclyffe coupler', window.wardenclyffeMobiusCoupler],
    ['Runa 3-6-9 Triptych', window.Runa369HarmonicTriptych],
    ['Groundwire', window.StarwellGroundwire],
    ['output witness', window.StarwellAudioOutputWitness],
  ];

  boot.missingGlobals = requiredGlobals
    .filter(([, value]) => !value)
    .map(([name]) => name);

  boot.status = boot.missingGlobals.length ? 'incomplete' : 'ready';
}

boot.completedAt = new Date().toISOString();
publishBootState();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Some legacy instruments deliberately initialise at DOMContentLoaded.
    // Recheck after those listeners have had one turn of the event loop.
    window.setTimeout(() => {
      if (!boot.failed) {
        const lateGlobals = [
          ['Möbius bus instance', window.mobiusAudioBus],
          ['Wardenclyffe coupler', window.wardenclyffeMobiusCoupler],
          ['Runa 3-6-9 Triptych', window.Runa369HarmonicTriptych],
          ['Groundwire', window.StarwellGroundwire],
          ['output witness', window.StarwellAudioOutputWitness],
        ];
        boot.missingGlobals = lateGlobals
          .filter(([, value]) => !value)
          .map(([name]) => name);
        boot.status = boot.missingGlobals.length ? 'incomplete' : 'ready';
        boot.completedAt = new Date().toISOString();
        publishBootState();
      }
      renderBootState();
    }, 0);
  }, { once: true });
} else {
  window.setTimeout(() => {
    if (!boot.failed) {
      boot.missingGlobals = [
        ['Möbius bus instance', window.mobiusAudioBus],
        ['Wardenclyffe coupler', window.wardenclyffeMobiusCoupler],
        ['Runa 3-6-9 Triptych', window.Runa369HarmonicTriptych],
        ['Groundwire', window.StarwellGroundwire],
        ['output witness', window.StarwellAudioOutputWitness],
      ].filter(([, value]) => !value).map(([name]) => name);
      boot.status = boot.missingGlobals.length ? 'incomplete' : 'ready';
      publishBootState();
    }
    renderBootState();
  }, 0);
}
