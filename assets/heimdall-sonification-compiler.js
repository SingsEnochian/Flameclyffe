'use strict';

/*
  Heimdall Sonification Compiler v0.1

  Compile Coupled Watch / Crossing mathematics into a declarative layered spec.

  IMPORTANT ARCHITECTURE:
  - Wardenclyffe owns layer orchestration.
  - Flameclyffe Möbius owns low-level audio rendering.
  - Runa may consume the same compiled layer plan as a harmonic-state output.
  - Heimdall owns neither AudioContext nor an independent frequency registry.
  - Frequencies MUST come from an injected canonical mapping/registry.

  Mathematics controls HOW mapped tones behave:
    singular spectrum             -> layer weighting / harmonic emphasis
    soft-mode participation       -> block voice weighting
    off-diagonal Jacobian blocks  -> cross-modulation depth
    fold curvature                -> bend/detune metadata
    PREMAQC bearing alignment     -> route/phase coherence metadata
    memory + continuity           -> return/sustain metadata
    relational state (US)         -> combination/intermodulation behaviour

  It does NOT invent new canonical frequencies.
*/

(function () {
  const VERSION = '0.1.0';
  const EPS = 1e-12;
  const ROUTES = Object.freeze(['left', 'right', 'centre', 'return']);

  const clamp = (value, min = 0, max = 1) => {
    const n = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  };

  function normSquared(values = []) {
    return values.reduce((sum, value) => sum + Number(value || 0) ** 2, 0);
  }

  function frobenius(matrix = []) {
    return Math.sqrt(matrix.flat().reduce((sum, value) => sum + Number(value || 0) ** 2, 0));
  }

  function validateBlocks(blocks, vectorLength) {
    if (!Array.isArray(blocks) || !blocks.length) throw new TypeError('Heimdall blocks are required.');
    for (const block of blocks) {
      if (!block?.id || !Number.isInteger(block.start) || !Number.isInteger(block.end)) {
        throw new TypeError('Each Heimdall block requires id, start, and end.');
      }
      if (block.start < 0 || block.end <= block.start || block.end > vectorLength) {
        throw new RangeError(`Invalid Heimdall block range for ${block.id}.`);
      }
    }
  }

  function blockParticipation(vMin, blocks) {
    validateBlocks(blocks, vMin.length);
    const total = Math.max(EPS, normSquared(vMin));
    return Object.freeze(Object.fromEntries(blocks.map((block) => [
      block.id,
      normSquared(vMin.slice(block.start, block.end)) / total,
    ])));
  }

  function couplingTopology(jacobian, blocks) {
    if (!Array.isArray(jacobian) || !jacobian.length) return Object.freeze({});
    const size = jacobian.length;
    validateBlocks(blocks, size);
    const topology = {};
    for (const dst of blocks) {
      topology[dst.id] = {};
      for (const src of blocks) {
        if (src.id === dst.id) continue;
        const submatrix = [];
        for (let row = dst.start; row < dst.end; row += 1) {
          submatrix.push((jacobian[row] || []).slice(src.start, src.end));
        }
        topology[dst.id][src.id] = frobenius(submatrix);
      }
    }
    return Object.freeze(topology);
  }

  function resolveMappedTone(registry, key) {
    if (!registry) throw new TypeError('A canonical frequency registry is required.');
    let tone = null;
    if (typeof registry.get === 'function') tone = registry.get(key);
    else if (typeof registry === 'function') tone = registry(key);
    else tone = registry[key];

    const frequency = Number(tone?.frequency ?? tone?.frequency_hz ?? tone?.carrier_frequency_hz ?? tone);
    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new Error(`HEIMDALL_UNMAPPED_FREQUENCY:${key}`);
    }

    return Object.freeze({
      key,
      frequency,
      label: tone?.label || tone?.name || tone?.codexName || key,
      source: tone?.source || tone?.registry || 'canonical-frequency-registry',
      metadata: tone && typeof tone === 'object' ? { ...tone } : {},
    });
  }

  function axisToneKey(block) {
    return block.toneKey || block.frequencyKey || block.id;
  }

  function buildBlockLayers({ blocks, participation, registry, phi, bearingAlignment, maxGain }) {
    return blocks.map((block, index) => {
      const mapped = resolveMappedTone(registry, axisToneKey(block));
      const p = clamp(participation[block.id] || 0);
      const foldWeight = 0.25 + 0.75 * clamp(phi);
      const gain = clamp(maxGain * Math.sqrt(p) * foldWeight, 0, maxGain);
      const bearing = clamp((Number(bearingAlignment) + 1) / 2);

      return Object.freeze({
        id: `heimdall-block-${block.id}`,
        label: `${mapped.label} · ${block.id}`,
        frequency: mapped.frequency,
        route: block.route || ROUTES[index % ROUTES.length],
        gain,
        waveform: block.waveform || 'sine',
        claimLabel: 'heimdall-sonification',
        family: 'heimdall-block',
        metadata: {
          block_id: block.id,
          participation: p,
          phi: clamp(phi),
          bearing_alignment: Number(bearingAlignment) || 0,
          route_coherence: bearing,
          tone_key: mapped.key,
          tone_source: mapped.source,
        },
      });
    });
  }

  function buildCouplingLayers({ topology, blocks, registry, maxGain }) {
    const edges = [];
    for (const [dst, sources] of Object.entries(topology)) {
      for (const [src, value] of Object.entries(sources)) edges.push({ src, dst, value: Number(value) || 0 });
    }
    if (!edges.length) return [];
    const maxCoupling = Math.max(EPS, ...edges.map((edge) => edge.value));

    return edges
      .map((edge) => ({ ...edge, strength: edge.value / maxCoupling }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 12)
      .map((edge, index) => {
        const sourceBlock = blocks.find((block) => block.id === edge.src);
        const mapped = resolveMappedTone(registry, axisToneKey(sourceBlock || { id: edge.src }));
        return Object.freeze({
          id: `heimdall-coupling-${edge.src}-to-${edge.dst}`,
          label: `${edge.src} → ${edge.dst}`,
          frequency: mapped.frequency,
          ampMod: 0.1 + 5.9 * clamp(edge.strength),
          modulationDepth: clamp(0.08 + 0.72 * edge.strength, 0, 0.8),
          route: index % 2 ? 'right' : 'left',
          gain: clamp(maxGain * 0.55 * edge.strength, 0, maxGain),
          waveform: 'sine',
          claimLabel: 'heimdall-sonification',
          family: 'heimdall-coupling',
          metadata: {
            source_block: edge.src,
            destination_block: edge.dst,
            coupling_norm: edge.value,
            relative_strength: edge.strength,
            tone_key: mapped.key,
            tone_source: mapped.source,
          },
        });
      });
  }

  function buildRelationalLayer({ participation, blocks, registry, maxGain, relationToneKey = 'us' }) {
    const usKey = Object.keys(participation).find((key) => key.toLowerCase() === 'us');
    const pUs = usKey ? clamp(participation[usKey]) : 0;
    if (pUs <= EPS) return [];

    // US has a mapped voice if the registry defines one. The combination behaviour is metadata
    // for Wardenclyffe/Möbius to realise using the already-mapped participant tones.
    const usTone = resolveMappedTone(registry, relationToneKey);
    const leaders = blocks
      .filter((block) => block.id.toLowerCase() !== 'us')
      .map((block) => ({ block, p: participation[block.id] || 0 }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
      .map(({ block, p }) => ({
        block_id: block.id,
        participation: p,
        tone: resolveMappedTone(registry, axisToneKey(block)),
      }));

    return [Object.freeze({
      id: 'heimdall-relational-us',
      label: 'US · relational mode',
      frequency: usTone.frequency,
      route: 'return',
      gain: clamp(maxGain * pUs, 0, maxGain),
      waveform: 'sine',
      claimLabel: 'heimdall-sonification',
      family: 'heimdall-relational',
      metadata: {
        participation: pUs,
        tone_key: usTone.key,
        tone_source: usTone.source,
        combination_sources: leaders,
        operation: 'intermodulate-mapped-tones',
        note: 'Combination products are derived during rendering from mapped participant tones; no new canonical frequency is registered by Heimdall.',
      },
    })];
  }

  function compileHeimdallSonification(input, {
    frequencyRegistry,
    maxGain = 0.02,
    relationToneKey = 'us',
  } = {}) {
    const {
      singularValues = [],
      vMin = [],
      blocks = [],
      jacobian = [],
      foldCurvature = 0,
      bearingAlignment = 0,
      memory = 0,
      continuity = 0,
      phi: suppliedPhi = null,
      sourceReceipt = null,
    } = input || {};

    if (!vMin.length) throw new TypeError('Heimdall soft vector vMin is required.');
    if (!singularValues.length) throw new TypeError('Heimdall singular values are required.');

    const sigmaMax = Math.max(...singularValues.map(Number));
    const sigmaMin = Math.min(...singularValues.map(Number));
    const phi = suppliedPhi == null
      ? (sigmaMax > EPS ? 1 - sigmaMin / sigmaMax : 0)
      : clamp(suppliedPhi);

    const p = blockParticipation(vMin, blocks);
    const topology = couplingTopology(jacobian, blocks);
    const dominant = Object.entries(p).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    const layers = [
      ...buildBlockLayers({ blocks, participation: p, registry: frequencyRegistry, phi, bearingAlignment, maxGain }),
      ...buildCouplingLayers({ topology, blocks, registry: frequencyRegistry, maxGain }),
      ...buildRelationalLayer({ participation: p, blocks, registry: frequencyRegistry, maxGain, relationToneKey }),
    ];

    return Object.freeze({
      schema: 'heimdall.sonification-layer-plan/v0.1',
      compiler_version: VERSION,
      renderer_target: 'wardenclyffe-or-mobius',
      layers: Object.freeze(layers),
      controls: Object.freeze({
        fold_phi: phi,
        fold_curvature: Number(foldCurvature) || 0,
        bearing_alignment: Number(bearingAlignment) || 0,
        memory_return: clamp(memory),
        continuity_sustain: clamp(continuity),
      }),
      diagnostics: Object.freeze({
        sigma_min: sigmaMin,
        sigma_max: sigmaMax,
        participation: p,
        dominant_block: dominant[0],
        dominant_participation: dominant[1],
        coupling_topology: topology,
      }),
      provenance: Object.freeze({
        source_receipt: sourceReceipt,
        frequency_policy: 'canonical-mapped-only',
        invented_canonical_frequencies: false,
      }),
    });
  }

  function toMobiusSpec(plan) {
    if (!plan?.layers) throw new TypeError('A compiled Heimdall layer plan is required.');
    return Object.freeze({
      id: `heimdall-${Date.now()}`,
      label: 'Heimdall Coupled Watch',
      schema: 'mobius.layered-spec/heimdall-v0.1',
      layers: plan.layers.map((layer) => ({
        id: layer.id,
        label: layer.label,
        frequency: layer.frequency,
        ampMod: layer.ampMod,
        modulationDepth: layer.modulationDepth,
        route: layer.route,
        gain: layer.gain,
        waveform: layer.waveform,
        claimLabel: layer.claimLabel,
        family: layer.family,
        metadata: layer.metadata,
      })),
      heimdall: {
        controls: plan.controls,
        diagnostics: plan.diagnostics,
        provenance: plan.provenance,
      },
    });
  }

  const api = Object.freeze({
    VERSION,
    blockParticipation,
    couplingTopology,
    resolveMappedTone,
    compileHeimdallSonification,
    toMobiusSpec,
  });

  if (typeof window !== 'undefined') window.HeimdallSonificationCompiler = api;
  if (typeof globalThis !== 'undefined') globalThis.HeimdallSonificationCompiler = api;
})();
