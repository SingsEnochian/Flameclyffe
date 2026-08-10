'use strict';

/*
  STARWELL Audio Patch Contract v0.2

  This schema is the shared language between Wardenclyffe, the Möbius Bus,
  external audio ingress, and the Starwell Concurrent Field Engine.

  Audio routing is established engineering. DEEP, Barbault, geometry,
  somatic, Terra Aeterna, and ritual mappings are explicitly declared
  layers. No theory output starts audio by itself.
*/

(function installAudioPatchContract(global) {
  const VERSION = '0.2.0';
  const ROUTING_MODES = new Set(['standalone', 'parallel', 'serial', 'matrix', 'experimental']);
  const INTEGRITY_MODES = new Set(['protected', 'unlocked', 'none']);
  const CONTINUITY_MODES = new Set(['exact-loop', 'sealed-loop', 'infinite-field']);
  const TRANSPORT_MODES = new Set(['auto', 'shared-context', 'media-stream']);
  const SEND_MODES = new Set(['dry', 'mobius', 'both']);
  const STEM_KINDS = new Set(['tone', 'binaural-pair', 'noise', 'external']);
  const ROUTES = new Set(['left', 'right', 'centre', 'return']);
  const WAVEFORMS = new Set(['sine', 'triangle', 'square', 'sawtooth']);

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const slug = (value, fallback = 'patch') => String(value || fallback)
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;

  function normalizeStem(stem, index = 0) {
    const raw = stem && typeof stem === 'object' ? stem : {};
    const kind = STEM_KINDS.has(raw.kind) ? raw.kind : (raw.leftFrequency || raw.rightFrequency ? 'binaural-pair' : 'tone');
    const send = SEND_MODES.has(raw.send) ? raw.send : 'dry';
    const route = ROUTES.has(raw.route) ? raw.route : 'centre';
    const waveform = WAVEFORMS.has(raw.waveform) ? raw.waveform : 'sine';
    const id = slug(raw.id || raw.label, `stem-${index + 1}`);

    const normalized = {
      id,
      label: String(raw.label || raw.name || id),
      kind,
      route,
      send,
      sendLevel: clamp(raw.sendLevel ?? 0.12, 0, 1),
      gain: clamp(raw.gain ?? 0.02, 0, 0.25),
      waveform,
      protected: raw.protected !== false,
      enabled: raw.enabled !== false,
      claimLabel: String(raw.claimLabel || 'subjective-experiment'),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      modulation: raw.modulation && typeof raw.modulation === 'object' ? {
        type: String(raw.modulation.type || 'none'),
        frequency: clamp(raw.modulation.frequency ?? 0, 0, 80),
        depth: clamp(raw.modulation.depth ?? 0, 0, 1)
      } : { type: 'none', frequency: 0, depth: 0 }
    };

    if (kind === 'binaural-pair') {
      normalized.leftFrequency = clamp(raw.leftFrequency ?? raw.left ?? 216, 1, 22050);
      normalized.rightFrequency = clamp(raw.rightFrequency ?? raw.right ?? 219.4, 1, 22050);
      normalized.beatFrequency = Math.abs(normalized.rightFrequency - normalized.leftFrequency);
    } else if (kind === 'tone') {
      normalized.frequency = clamp(raw.frequency ?? 432, 1, 22050);
    } else if (kind === 'noise') {
      normalized.noise = {
        type: raw.noise?.type === 'white' ? 'white' : 'pink',
        filterHz: clamp(raw.noise?.filterHz ?? raw.noise?.filter ?? 700, 20, 16000),
        q: clamp(raw.noise?.q ?? 0.7, 0.1, 12)
      };
    }

    return normalized;
  }

  function normalizePatch(input = {}) {
    const raw = input && typeof input === 'object' ? input : {};
    const routingMode = ROUTING_MODES.has(raw.routingMode) ? raw.routingMode : 'parallel';
    const binauralIntegrity = INTEGRITY_MODES.has(raw.binauralIntegrity) ? raw.binauralIntegrity : 'protected';
    const continuityMode = CONTINUITY_MODES.has(raw.continuityMode) ? raw.continuityMode : 'infinite-field';
    const transport = TRANSPORT_MODES.has(raw.transport) ? raw.transport : 'auto';
    const stems = (Array.isArray(raw.stems) ? raw.stems : []).map(normalizeStem);

    return {
      schema: 'starwell.audio-patch',
      schemaVersion: VERSION,
      id: slug(raw.id || raw.name, 'untitled-patch'),
      name: String(raw.name || 'Untitled Patch'),
      description: String(raw.description || ''),
      claimLabel: String(raw.claimLabel || 'subjective-experiment'),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transport,
      routingMode,
      binauralIntegrity,
      continuityMode,
      loopQuantumSeconds: clamp(raw.loopQuantumSeconds ?? 10, 0.1, 3600),
      masterGain: clamp(raw.masterGain ?? 0.12, 0.001, 0.32),
      stems,
      mobius: {
        enabled: raw.mobius?.enabled !== false,
        sendLevel: clamp(raw.mobius?.sendLevel ?? 0.12, 0, 1),
        returnLevel: clamp(raw.mobius?.returnLevel ?? 0.10, 0, 0.5),
        phaseInverted: raw.mobius?.phaseInverted !== false,
        returnSide: ['left', 'right', 'both'].includes(raw.mobius?.returnSide) ? raw.mobius.returnSide : 'both',
        feedback: clamp(raw.mobius?.feedback ?? 0.08, 0, 0.45),
        delaySeconds: clamp(raw.mobius?.delaySeconds ?? 0.13, 0, 1.5),
        filterHz: clamp(raw.mobius?.filterHz ?? 1100, 40, 18000),
        twist: clamp(raw.mobius?.twist ?? 0.16, 0, 1)
      },
      theoryBindings: {
        enabled: raw.theoryBindings?.enabled !== false,
        profile: String(raw.theoryBindings?.profile || 'concurrent-field-v0.1'),
        bindings: Array.isArray(raw.theoryBindings?.bindings) ? raw.theoryBindings.bindings : []
      },
      declarations: Array.isArray(raw.declarations) ? raw.declarations : [],
      metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}
    };
  }

  function validatePatch(input) {
    const patch = normalizePatch(input);
    const errors = [];
    const warnings = [];
    if (!patch.stems.length) errors.push('Patch has no stems.');
    if (patch.binauralIntegrity === 'protected') {
      patch.stems.forEach((stem) => {
        if (stem.kind === 'binaural-pair' && stem.send !== 'dry') {
          warnings.push(`${stem.id}: protected binaural carriers will bypass Möbius send.`);
        }
      });
    }
    if (patch.continuityMode === 'exact-loop') {
      const report = exactLoopReport(patch);
      if (!report.exact) warnings.push(`Exact-loop quantum does not close every oscillator: ${report.openFrequencies.join(', ')} Hz.`);
    }
    return { valid: errors.length === 0, errors, warnings, patch };
  }

  function frequencyList(patchInput) {
    const patch = normalizePatch(patchInput);
    const values = [];
    patch.stems.forEach((stem) => {
      if (!stem.enabled) return;
      if (stem.kind === 'binaural-pair') values.push(stem.leftFrequency, stem.rightFrequency);
      if (stem.kind === 'tone') values.push(stem.frequency);
      if (stem.modulation?.frequency > 0) values.push(stem.modulation.frequency);
    });
    return [...new Set(values.filter((value) => value > 0))];
  }

  function exactLoopReport(patchInput, epsilon = 1e-7) {
    const patch = normalizePatch(patchInput);
    const quantum = patch.loopQuantumSeconds;
    const rows = frequencyList(patch).map((frequency) => {
      const cycles = frequency * quantum;
      const nearest = Math.round(cycles);
      const error = Math.abs(cycles - nearest);
      return { frequency, cycles, nearestIntegerCycles: nearest, error, closes: error <= epsilon };
    });
    return {
      quantumSeconds: quantum,
      exact: rows.every((row) => row.closes),
      openFrequencies: rows.filter((row) => !row.closes).map((row) => row.frequency),
      frequencies: rows
    };
  }

  function normalizeFieldSnapshot(input = {}) {
    const raw = input?.fieldSnapshot || input?.snapshot || input?.detail || input || {};
    const deepRaw = raw.deep || raw.DEEP || raw.field || raw.state || {};
    const somaticRaw = raw.somatic || raw.body || {};
    const barbaultRaw = raw.barbault || raw.astrology?.barbault || {};
    const geometryRaw = raw.geometry || raw.sacredGeometry || {};

    return {
      schema: 'starwell.concurrent-field-snapshot',
      schemaVersion: '0.1.0',
      id: String(raw.id || raw.snapshotId || `field-${Date.now()}`),
      observedAt: raw.observedAt || raw.timestamp || new Date().toISOString(),
      source: String(raw.source || 'unknown'),
      project: String(raw.project || raw.context?.project || ''),
      mode: String(raw.mode || raw.context?.mode || ''),
      deep: {
        P: clamp(deepRaw.P ?? deepRaw.pressure ?? 0.55),
        C: clamp(deepRaw.C ?? deepRaw.coherence ?? 0.50),
        R: clamp(deepRaw.R ?? deepRaw.resonance ?? 0.45),
        E: clamp(deepRaw.E ?? deepRaw.entropy ?? 0.38),
        M: clamp(deepRaw.M ?? deepRaw.memory ?? 0.30),
        A: clamp(deepRaw.A ?? deepRaw.agency ?? deepRaw.attention ?? 0.65),
        dpdt: clamp(deepRaw.dpdt ?? deepRaw.dPdt ?? 0, -1, 1),
        stability: clamp(deepRaw.stability ?? raw.stability ?? 0.5)
      },
      barbault: {
        cyclicIndex: finite(barbaultRaw.cyclicIndex ?? barbaultRaw.cyclic_index, 0),
        compression: clamp(barbaultRaw.compressionScalar ?? barbaultRaw.compression ?? 0.5),
        phase: String(barbaultRaw.phase || 'unknown'),
        configuration: String(barbaultRaw.configuration || '')
      },
      geometry: {
        primary: String(geometryRaw.primary || geometryRaw.form || 'unmapped'),
        density: clamp(geometryRaw.density ?? 0.5),
        symmetry: clamp(geometryRaw.symmetry ?? 0.5),
        movementPattern: String(geometryRaw.movementPattern || geometryRaw.movement || 'still'),
        soundMap: geometryRaw.soundMap && typeof geometryRaw.soundMap === 'object' ? geometryRaw.soundMap : {}
      },
      somatic: {
        capacity: clamp(somaticRaw.capacity ?? 1),
        activation: clamp(somaticRaw.activationScalar ?? somaticRaw.activation ?? 0.3),
        fatigue: clamp(somaticRaw.fatigueScalar ?? somaticRaw.fatigue ?? 0.3),
        tinnitus: clamp(somaticRaw.tinnitusScalar ?? somaticRaw.tinnitus ?? 0),
        bodySays: String(somaticRaw.bodySays || somaticRaw.response || 'wait').toLowerCase(),
        audioMode: String(somaticRaw.audioMode || somaticRaw.interfaceSafetyMode || 'normal').toLowerCase()
      },
      terraAeterna: raw.terraAeterna || raw.terra_aeterna || {},
      agency: raw.agency || {},
      archive: raw.archive || {},
      declarations: Array.isArray(raw.declarations) ? raw.declarations : [],
      provenance: raw.provenance || { confidence: 'L0', claimLabel: 'unclassified' },
      raw
    };
  }

  function materializePatch(patchInput, snapshotInput) {
    const patch = normalizePatch(patchInput);
    const snapshot = normalizeFieldSnapshot(snapshotInput);
    const { P, C, R, E, M, A, dpdt, stability } = snapshot.deep;
    const somatic = snapshot.somatic;
    const compression = snapshot.barbault.compression;
    const geometry = snapshot.geometry;

    const veto = ['no', 'stop'].includes(somatic.bodySays) || ['mute', 'off'].includes(somatic.audioMode);
    const soften = ['soft', 'low', 'reduced'].includes(somatic.audioMode);
    const capacityScale = veto ? 0 : clamp(somatic.capacity * (1 - somatic.activation * 0.28) * (1 - somatic.fatigue * 0.22), 0.08, 1);
    const somaticScale = soften ? capacityScale * 0.52 : capacityScale;

    patch.masterGain = clamp(patch.masterGain * (0.72 + A * 0.22) * somaticScale, 0.0001, 0.32);
    patch.mobius.sendLevel = clamp(patch.mobius.sendLevel * (0.35 + R * 0.65) * somaticScale, 0, 1);
    patch.mobius.returnLevel = clamp(patch.mobius.returnLevel * (0.48 + M * 0.34) * somaticScale, 0, 0.5);
    patch.mobius.feedback = clamp(patch.mobius.feedback * (0.55 + M * 0.30 + stability * 0.12), 0, 0.45);
    patch.mobius.filterHz = clamp(480 + C * 3200 + (1 - E) * 1200, 80, 12000);
    patch.mobius.twist = clamp(patch.mobius.twist * (0.45 + R * 0.35 + geometry.symmetry * 0.20), 0, 1);

    const densityGate = clamp(0.48 + compression * 0.34 + geometry.density * 0.18, 0.35, 1);
    patch.stems = patch.stems.map((stem, index) => {
      const next = { ...stem };
      next.gain = clamp(next.gain * somaticScale * (0.78 + P * 0.16 + C * 0.10), 0, 0.25);
      next.sendLevel = clamp(next.sendLevel * patch.mobius.sendLevel, 0, 1);
      if (next.tags.includes('harmonic-chamber') && index / Math.max(1, patch.stems.length - 1) > densityGate) next.enabled = false;
      if (next.modulation?.frequency > 0) {
        next.modulation = { ...next.modulation, frequency: clamp(next.modulation.frequency * (0.75 + Math.abs(dpdt) * 0.5), 0, 80) };
      }
      return next;
    });

    patch.runtime = {
      materializedAt: new Date().toISOString(),
      fieldSnapshotId: snapshot.id,
      fieldSource: snapshot.source,
      somaticVeto: veto,
      somaticScale,
      geometryTopology: geometry.primary,
      geometryMovement: geometry.movementPattern,
      barbaultPhase: snapshot.barbault.phase,
      barbaultConfiguration: snapshot.barbault.configuration,
      theoryDeclaration: 'Interpretive audio mapping from a concurrent field snapshot. Audio requires explicit user invocation.'
    };
    patch.declarations = [
      ...patch.declarations,
      { type: 'audio-routing', status: 'established-engineering' },
      { type: 'deep-mapping', status: 'speculative-theory' },
      { type: 'barbault-mapping', status: 'symbolic-interpretation' },
      { type: 'geometry-mapping', status: 'symbolic-mapping' },
      { type: 'somatic-state', status: 'user-self-report' }
    ];
    patch.metadata.fieldSnapshot = snapshot;
    return patch;
  }

  const DREAM_SIGNAL_34 = normalizePatch({
    id: 'dream-signal-3-4',
    name: 'Dream-Signal 3.4',
    description: 'Three protected 3.4 Hz binaural tiers beneath a 432 Hz harmonic chamber.',
    claimLabel: 'subjective-experiment',
    transport: 'shared-context',
    routingMode: 'parallel',
    binauralIntegrity: 'protected',
    continuityMode: 'exact-loop',
    loopQuantumSeconds: 10,
    masterGain: 0.12,
    mobius: { enabled: true, sendLevel: 0.16, returnLevel: 0.09, phaseInverted: true, returnSide: 'both', feedback: 0.07, delaySeconds: 0.13, filterHz: 1400, twist: 0.12 },
    stems: [
      { id: 'dream-floor-54', label: 'Dream Floor 54', kind: 'binaural-pair', leftFrequency: 54, rightFrequency: 57.4, gain: 0.022, send: 'dry', protected: true, tags: ['binaural-spine'] },
      { id: 'dream-body-108', label: 'Dream Body 108', kind: 'binaural-pair', leftFrequency: 108, rightFrequency: 111.4, gain: 0.018, send: 'dry', protected: true, tags: ['binaural-spine'] },
      { id: 'dream-lantern-216', label: 'Dream Lantern 216', kind: 'binaural-pair', leftFrequency: 216, rightFrequency: 219.4, gain: 0.014, send: 'dry', protected: true, tags: ['binaural-spine'] },
      { id: 'harmonic-432', label: 'Harmonic 432', kind: 'tone', frequency: 432, route: 'centre', gain: 0.010, send: 'both', sendLevel: 0.16, tags: ['harmonic-chamber'] },
      { id: 'harmonic-864', label: 'Harmonic 864', kind: 'tone', frequency: 864, route: 'centre', gain: 0.0068, send: 'both', sendLevel: 0.13, tags: ['harmonic-chamber'] },
      { id: 'harmonic-1296', label: 'Harmonic 1296', kind: 'tone', frequency: 1296, route: 'centre', gain: 0.0048, send: 'both', sendLevel: 0.11, tags: ['harmonic-chamber'] },
      { id: 'harmonic-1728', label: 'Harmonic 1728', kind: 'tone', frequency: 1728, route: 'centre', gain: 0.0034, send: 'both', sendLevel: 0.09, tags: ['harmonic-chamber'] },
      { id: 'harmonic-2160', label: 'Harmonic 2160', kind: 'tone', frequency: 2160, route: 'centre', gain: 0.0024, send: 'both', sendLevel: 0.07, tags: ['harmonic-chamber'] },
      { id: 'harmonic-2592', label: 'Harmonic 2592', kind: 'tone', frequency: 2592, route: 'centre', gain: 0.0017, send: 'both', sendLevel: 0.05, tags: ['harmonic-chamber'] }
    ]
  });

  const EXPERIMENTAL_BLANK = normalizePatch({
    id: 'experimental-field',
    name: 'Experimental Field',
    description: 'Unlocked patch scaffold for declared experimental tones and external ingress.',
    transport: 'auto',
    routingMode: 'experimental',
    binauralIntegrity: 'unlocked',
    continuityMode: 'infinite-field',
    stems: [
      { id: 'experimental-pair', label: 'Experimental Pair', kind: 'binaural-pair', leftFrequency: 144, rightFrequency: 147.7, gain: 0.012, send: 'both', protected: false },
      { id: 'experimental-lantern', label: 'Experimental Lantern', kind: 'tone', frequency: 432, route: 'centre', gain: 0.006, send: 'both' }
    ]
  });

  global.StarwellAudioPatchContract = Object.freeze({
    VERSION,
    ROUTING_MODES: [...ROUTING_MODES],
    INTEGRITY_MODES: [...INTEGRITY_MODES],
    CONTINUITY_MODES: [...CONTINUITY_MODES],
    TRANSPORT_MODES: [...TRANSPORT_MODES],
    SEND_MODES: [...SEND_MODES],
    normalizeStem,
    normalizePatch,
    validatePatch,
    frequencyList,
    exactLoopReport,
    normalizeFieldSnapshot,
    materializePatch,
    presets: {
      dreamSignal34: DREAM_SIGNAL_34,
      experimentalBlank: EXPERIMENTAL_BLANK
    },
    clone
  });
})(window);

