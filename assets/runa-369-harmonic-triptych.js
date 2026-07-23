'use strict';

/*
  Runa 3-6-9 Harmonic Triptych v0.1

  Registers three protected binaural presets in the canonical STARWELL audio
  patch contract and exposes an explicit-tap UI inside the Wardenclyffe ×
  Möbius laboratory.

  Engineering register:
  - stereo carrier arithmetic and Web Audio routing: established engineering
  - binaural perception / entrainment effects: active research
  - geometry, chakra, element, crystal, and Tesla correspondences: symbolic
  - haptic and geometry output adapters: specified, not yet implemented
*/

(function installRuna369Triptych(global) {
  const Contract = global.StarwellAudioPatchContract;
  if (!Contract) throw new Error('StarwellAudioPatchContract is unavailable.');

  const SOURCE_PROVENANCE = Object.freeze({
    sourceType: 'user-supplied-graphic',
    sourceTitle: 'Nikola Tesla: The Magnificence of the 3, 6 and the 9… A Key to the Universe',
    attributionShownInSource: 'Pythagoras Beats',
    recordedAt: '2026-07-23',
    evidenceRegister: 'symbolic-correspondence',
  });

  const SPECS = Object.freeze([
    Object.freeze({
      key: 'seed',
      label: '333 / 3 — Seed',
      carrierHz: 333,
      beatHz: 3,
      brainwaveLabel: 'theta',
      geometry: { id: 'threefold-spiral', label: 'Threefold spiral', order: 3 },
      chakra: 'solar plexus',
      element: 'fire',
      material: 'citrine',
      qualities: ['beauty', 'wisdom', 'joy'],
      rhythm: 'three-count',
      hapticPatternMs: [180, 180, 540],
    }),
    Object.freeze({
      key: 'coupling',
      label: '666 / 6 — Coupling',
      carrierHz: 666,
      beatHz: 6,
      brainwaveLabel: 'theta',
      geometry: { id: 'sixfold-flower', label: 'Sixfold flower', order: 6 },
      chakra: 'heart',
      element: 'water',
      material: 'rose quartz',
      qualities: ['grace', 'divine love', 'correspondence'],
      rhythm: 'six-count',
      hapticPatternMs: [120, 120, 120, 120, 120, 600],
    }),
    Object.freeze({
      key: 'transition',
      label: '999 / 9 — Transition',
      carrierHz: 999,
      beatHz: 9,
      brainwaveLabel: 'alpha',
      geometry: { id: 'ninefold-star', label: 'Ninefold star', order: 9 },
      chakra: 'soul star',
      element: 'spirit',
      material: 'moonstone',
      qualities: ['transition', 'release', 'rhythm'],
      rhythm: 'nine-count',
      hapticPatternMs: [90, 90, 90, 90, 90, 90, 90, 90, 720],
    }),
  ]);

  function makePreset(spec) {
    const halfBeat = spec.beatHz / 2;
    const leftHz = spec.carrierHz - halfBeat;
    const rightHz = spec.carrierHz + halfBeat;

    return Contract.normalizePatch({
      id: `runa-369-${spec.key}`,
      name: `Runa 3-6-9 · ${spec.label}`,
      description: `${spec.carrierHz} Hz centre carrier expressed as a protected ${leftHz}/${rightHz} Hz stereo pair with a ${spec.beatHz} Hz binaural difference.`,
      claimLabel: 'symbolic-correspondence',
      transport: 'shared-context',
      routingMode: 'parallel',
      binauralIntegrity: 'protected',
      continuityMode: 'exact-loop',
      loopQuantumSeconds: 2,
      masterGain: 0.08,
      mobius: {
        enabled: false,
        sendLevel: 0,
        returnLevel: 0,
        phaseInverted: false,
        returnSide: 'both',
        feedback: 0,
        delaySeconds: 0.13,
        filterHz: 1400,
        twist: 0,
      },
      stems: [
        {
          id: `runa-${spec.carrierHz}-${spec.beatHz}-pair`,
          label: `${spec.carrierHz} centre / ${spec.beatHz} beat`,
          kind: 'binaural-pair',
          leftFrequency: leftHz,
          rightFrequency: rightHz,
          gain: 0.018,
          send: 'dry',
          protected: true,
          waveform: 'sine',
          claimLabel: 'active-research',
          tags: ['runa', '369-triptych', spec.key, 'protected-binaural-pair'],
        },
      ],
      declarations: [
        { type: 'stereo-frequency-arithmetic', status: 'established-engineering' },
        { type: 'binaural-perception', status: 'active-research' },
        { type: 'geometry-correspondence', status: 'symbolic-correspondence' },
        { type: 'chakra-element-material-correspondence', status: 'symbolic-correspondence' },
        { type: 'tesla-3-6-9-attribution', status: 'source-attribution' },
      ],
      metadata: {
        instrumentFamily: 'runa-369-harmonic-triptych',
        triptychRole: spec.key,
        carrierHz: spec.carrierHz,
        beatHz: spec.beatHz,
        leftHz,
        rightHz,
        centreCalculation: '(leftHz + rightHz) / 2',
        brainwaveLabel: spec.brainwaveLabel,
        geometry: {
          ...spec.geometry,
          outputStatus: 'specified-not-implemented',
        },
        correspondences: {
          chakra: spec.chakra,
          element: spec.element,
          material: spec.material,
          qualities: [...spec.qualities],
          evidenceRegister: 'symbolic-correspondence',
        },
        haptic: {
          rhythm: spec.rhythm,
          patternMs: [...spec.hapticPatternMs],
          target: 'iPad / compatible haptic adapter',
          outputStatus: 'specified-not-implemented',
        },
        provenance: { ...SOURCE_PROVENANCE },
      },
    });
  }

  const seed = makePreset(SPECS[0]);
  const coupling = makePreset(SPECS[1]);
  const transition = makePreset(SPECS[2]);

  Contract.presets.runa369Seed = seed;
  Contract.presets.runa369Coupling = coupling;
  Contract.presets.runa369Transition = transition;
  Contract.presets.runa369Triptych = Object.freeze({ seed, coupling, transition });

  const registry = Object.freeze({
    version: '0.1.0',
    familyId: 'runa-369-harmonic-triptych',
    source: SOURCE_PROVENANCE,
    specs: SPECS,
    presets: Contract.presets.runa369Triptych,
  });

  global.Runa369HarmonicTriptych = registry;

  function setupUi() {
    const document = global.document;
    const root = document?.querySelector?.('[data-mobius-lab]');
    const grid = root?.querySelector?.('.grid');
    const coupler = global.wardenclyffeMobiusCoupler;
    if (!root || !grid || !coupler || root.querySelector('[data-runa-369-triptych]')) return;

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.runa369Triptych = 'true';
    card.innerHTML = `
      <h2>Runa 3-6-9 Harmonic Triptych</h2>
      <p>Protected stereo pairs keep the named carrier at the acoustic centre while the left/right difference carries 3, 6, or 9 Hz. Geometry and correspondences are declared beside the signal, never mixed into the measurement.</p>
      <div class="controls">
        <button type="button" data-runa-369-preset="seed">333 / 3 · Seed</button>
        <button type="button" data-runa-369-preset="coupling">666 / 6 · Coupling</button>
        <button type="button" data-runa-369-preset="transition">999 / 9 · Transition</button>
        <button type="button" class="feather" data-runa-369-action="feather">Feather</button>
      </div>
      <p class="status" data-runa-369-status role="status" aria-live="polite">Triptych registered. Playback still requires a tap.</p>
      <details>
        <summary>Declared layer status</summary>
        <pre>${JSON.stringify({
          audio: 'functional through canonical patch contract',
          geometry: 'specified-not-implemented',
          haptic: 'specified-not-implemented',
          evidenceRegister: 'symbolic-correspondence',
        }, null, 2)}</pre>
      </details>
    `;

    const patchBay = grid.querySelector('[data-wardenclyffe-coupler]');
    if (patchBay?.nextSibling) grid.insertBefore(card, patchBay.nextSibling);
    else grid.prepend(card);

    const status = card.querySelector('[data-runa-369-status]');
    card.addEventListener('click', async (event) => {
      const presetButton = event.target.closest('[data-runa-369-preset]');
      const featherButton = event.target.closest('[data-runa-369-action="feather"]');
      try {
        if (featherButton) {
          coupler.feather();
          status.textContent = 'Triptych feathered.';
          return;
        }
        if (!presetButton) return;
        const preset = registry.presets[presetButton.dataset.runa369Preset];
        if (!preset) throw new Error('Unknown Runa triptych preset.');
        const validation = Contract.validatePatch(preset);
        if (!validation.valid) throw new Error(validation.errors.join(' '));
        await coupler.start(Contract.clone(validation.patch), { useFieldSnapshot: false });
        status.textContent = `Running ${validation.patch.name}. Exact carrier pair preserved.`;
      } catch (error) {
        status.textContent = `Triptych did not start: ${error.message}`;
      }
    });
  }

  const document = global.document;
  if (document?.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => global.setTimeout(setupUi, 0), { once: true });
  } else if (document) {
    global.setTimeout(setupUi, 0);
  }
})(window);
