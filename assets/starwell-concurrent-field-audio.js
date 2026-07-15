'use strict';

/*
  Starwell Concurrent Field -> Audio Adapter v0.2

  Reads one shared Field Snapshot across DEEP, Barbault, sacred geometry,
  somatic, Terra Aeterna, agency, and archive layers. It never starts audio.
  It only materializes an explicitly selected audio patch after user action.
*/

(function installConcurrentFieldAudio(global) {
  const STORAGE_KEY = 'starwell.concurrentFieldAudio.v0.2.snapshot';
  const CHANNEL = 'starwell-concurrent-field';
  const LEGACY_DEEP_CHANNEL = 'starwell-deep-observer';
  const subscribers = new Set();
  let snapshot = null;
  let channel = null;
  let legacyChannel = null;

  const contract = () => global.StarwellAudioPatchContract;

  function parse(value) {
    try { return typeof value === 'string' ? JSON.parse(value) : value; }
    catch (error) { return null; }
  }

  function levelScalar(value, fallback = 0.3) {
    if (Number.isFinite(Number(value))) return Math.max(0, Math.min(1, Number(value)));
    const token = String(value || '').toLowerCase();
    return ({ none: 0, not_reported: 0, low: 0.24, stable: 0.24, moderate: 0.55, watchful: 0.58, high: 0.86, sensitive: 0.88 }[token] ?? fallback);
  }

  function compressionScalar(value) {
    if (Number.isFinite(Number(value))) return Math.max(0, Math.min(1, Number(value)));
    return ({
      wide_distribution: 0.18,
      distributed: 0.34,
      moderate_compression: 0.58,
      high_compression: 0.82,
      extreme_compression: 0.95
    }[String(value || '').toLowerCase()] ?? 0.5);
  }

  function geometryDensity(value) {
    if (Number.isFinite(Number(value))) return Math.max(0, Math.min(1, Number(value)));
    return ({ open: 0.32, low: 0.32, moderate: 0.58, high: 0.86 }[String(value || '').toLowerCase()] ?? 0.5);
  }

  function capacityScalar(value) {
    if (Number.isFinite(Number(value))) return Math.max(0, Math.min(1, Number(value)));
    return ({
      body_no: 0,
      rest_or_silent: 0.08,
      limited_but_available: 0.48,
      stable: 0.88,
      available: 0.74
    }[String(value || '').toLowerCase()] ?? 0.65);
  }

  function scfeToField(packet) {
    const raw = packet?.snapshot || packet?.fieldSnapshot || packet?.detail || packet || {};
    const somatic = raw.somatic || {};
    const geometry = raw.sacred_geometry || {};
    const render = geometry.render_payload || {};
    const safety = String(somatic.interface_safety_mode || 'standard').toLowerCase();
    const bodySays = somatic.body_no ? 'no' : somatic.body_yes ? 'yes' : 'wait';
    const audioMode = safety === 'paused' || safety === 'low_light_silent'
      ? 'mute'
      : safety === 'gentle' ? 'soft' : 'normal';

    return {
      schema: 'starwell.concurrent-field-snapshot',
      schemaVersion: '0.1.0',
      id: raw.snapshot_id || raw.id || `scfe-${Date.now()}`,
      timestamp: raw.target_timestamp || raw.created_at || new Date().toISOString(),
      source: raw.schema_version || 'scfe.field_snapshot',
      project: raw.context?.project || '',
      mode: raw.mode || '',
      deep: {
        P: raw.deep?.P ?? 0.55,
        C: raw.deep?.C ?? 0.50,
        R: raw.deep?.R ?? 0.45,
        E: raw.deep?.E ?? 0.38,
        M: raw.deep?.M ?? 0.30,
        A: raw.deep?.A ?? 0.65,
        dpdt: raw.deep?.dp_dt ?? 0,
        stability: Math.max(0, Math.min(1, ((raw.deep?.C ?? 0.5) + (1 - (raw.deep?.E ?? 0.5))) / 2))
      },
      barbault: {
        cyclicIndex: raw.barbault?.cyclic_index ?? 0,
        compressionScalar: compressionScalar(raw.barbault?.compression_level),
        compression: raw.barbault?.compression_level || 'unknown',
        phase: raw.barbault?.phase_label || 'unknown',
        configuration: raw.barbault?.configurations?.[0]?.configuration_type || ''
      },
      geometry: {
        primary: geometry.primary_form || 'unmapped',
        density: geometryDensity(render.density),
        symmetry: geometry.primary_form === 'cradle_vessel' || geometry.primary_form === 'harmonic_triangle' ? 0.82 : 0.5,
        movementPattern: render.motion || 'still',
        soundMap: render.sound_map || {}
      },
      somatic: {
        capacity: capacityScalar(somatic.capacity_label),
        activation: levelScalar(somatic.activation),
        fatigue: levelScalar(somatic.fatigue),
        tinnitus: levelScalar(somatic.tinnitus, 0),
        bodySays,
        audioMode,
        capacityLabel: somatic.capacity_label || 'unknown',
        interfaceSafetyMode: safety
      },
      terraAeterna: raw.terra_aeterna || {},
      agency: {
        ...(raw.agency || {}),
        switchboard: raw.agency_switchboard || {}
      },
      archive: {
        evidenceLabels: raw.evidence_labels || {},
        ephemeris: raw.ephemeris || {},
        ephemerisComparison: raw.ephemeris_comparison || {}
      },
      declarations: [
        { type: 'barbault-index', status: raw.evidence_labels?.barbault_index || 'mathematical-index' },
        { type: 'deep', status: raw.evidence_labels?.deep || 'theoretical-field-model' },
        { type: 'sacred-geometry', status: raw.evidence_labels?.sacred_geometry || 'theoretical-form-mapping' },
        { type: 'somatic', status: raw.evidence_labels?.somatic || 'self-report' },
        { type: 'frequency', status: raw.evidence_labels?.frequency || 'evidence-informed-not-medical' },
        { type: 'terra-aeterna', status: raw.evidence_labels?.terra_aeterna || 'narrative-application' },
        { type: 'agency', status: raw.evidence_labels?.agency || 'user-chosen-action' }
      ],
      provenance: {
        confidence: raw.ephemeris?.calculation_status === 'manual_input_only' ? 'L1' : 'L3',
        claimLabel: 'scfe-concurrent-field',
        schemaVersion: raw.schema_version,
        createdAt: raw.created_at,
        evidenceLabels: raw.evidence_labels || {}
      }
    };
  }

  function legacyDeepToField(packet) {
    const raw = packet?.packet || packet?.detail || packet || {};
    const deep = raw.deep || raw.DEEP || raw.field || raw.state || raw;
    return {
      schema: 'starwell.concurrent-field-snapshot',
      schemaVersion: '0.1.0',
      id: raw.glyphId || raw.id || `legacy-deep-${Date.now()}`,
      timestamp: raw.timestamp || new Date().toISOString(),
      source: raw.source || 'legacy-deep-observer',
      deep: {
        P: deep.P ?? deep.pressure ?? deep.presence ?? 0.55,
        C: deep.C ?? deep.coherence ?? 0.50,
        R: deep.R ?? deep.resonance ?? 0.45,
        E: deep.E ?? deep.entropy ?? 0.38,
        M: deep.M ?? deep.memory ?? 0.30,
        A: deep.A ?? deep.agency ?? deep.alignment ?? deep.attention ?? 0.65,
        dpdt: deep.dpdt ?? deep.dPdt ?? deep.dp_dt ?? 0,
        stability: deep.stability ?? 0.5
      },
      barbault: raw.barbault || {},
      geometry: raw.geometry || raw.sacred_geometry || {},
      somatic: raw.somatic || {},
      terraAeterna: raw.terraAeterna || raw.terra_aeterna || {},
      agency: raw.agency || {},
      archive: raw.archive || {},
      declarations: [
        ...(Array.isArray(raw.declarations) ? raw.declarations : []),
        { type: 'legacy-adapter', status: 'implementation-bridge', note: 'Legacy P semantics may mean Presence rather than Pressure.' }
      ],
      provenance: raw.provenance || { confidence: 'L0', claimLabel: 'legacy-unclassified' }
    };
  }

  function canonicalInput(input) {
    const raw = input?.snapshot || input?.fieldSnapshot || input?.detail || input || {};
    if (String(raw.schema_version || '').startsWith('scfe.field_snapshot.')) return scfeToField(raw);
    return raw;
  }

  function setSnapshot(input, reason = 'snapshot') {
    const api = contract();
    if (!api) throw new Error('StarwellAudioPatchContract must load before Concurrent Field audio.');
    const canonical = canonicalInput(input);
    snapshot = api.normalizeFieldSnapshot(canonical);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(input)); } catch (error) {}
    notify(reason);
    return snapshot;
  }

  function getSnapshot() {
    return snapshot;
  }

  function materialize(patch) {
    const api = contract();
    if (!api) throw new Error('StarwellAudioPatchContract is unavailable.');
    return api.materializePatch(patch, snapshot || {});
  }

  function notify(reason = 'state') {
    const detail = { reason, snapshot, summary: summarize() };
    subscribers.forEach((fn) => {
      try { fn(detail); } catch (error) {}
    });
    try { global.dispatchEvent(new CustomEvent('starwell:concurrent-field-audio', { detail })); } catch (error) {}
  }

  function summarize() {
    if (!snapshot) return { status: 'waiting' };
    return {
      id: snapshot.id,
      source: snapshot.source,
      observedAt: snapshot.observedAt,
      deep: snapshot.deep,
      barbault: snapshot.barbault,
      geometry: snapshot.geometry,
      somatic: snapshot.somatic,
      project: snapshot.project,
      mode: snapshot.mode,
      provenance: snapshot.provenance,
      boundary: 'Shared interpretive state only. Audio remains user-invoked.'
    };
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn);
    fn({ reason: 'subscribe', snapshot, summary: summarize() });
    return () => subscribers.delete(fn);
  }

  function listen() {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.addEventListener('message', (event) => {
        const data = event.data;
        if (data?.type === 'starwell:field-snapshot' || data?.type === 'field-snapshot') {
          setSnapshot(data.snapshot || data.fieldSnapshot || data, 'broadcast-field-snapshot');
        }
      });
    } catch (error) {}

    try {
      legacyChannel = new BroadcastChannel(LEGACY_DEEP_CHANNEL);
      legacyChannel.addEventListener('message', (event) => {
        if (event.data?.type === 'deep-observer:packet') {
          setSnapshot(legacyDeepToField(event.data.packet || event.data), 'legacy-deep-broadcast');
        }
      });
    } catch (error) {}

    global.addEventListener('starwell:field-snapshot', (event) => setSnapshot(event.detail, 'field-event'));
    global.addEventListener('starwell:concurrent-field-snapshot', (event) => setSnapshot(event.detail, 'concurrent-field-event'));
    global.addEventListener('starwell:deep-observer:packet', (event) => setSnapshot(legacyDeepToField(event.detail), 'legacy-deep-event'));

    const stored = parse(sessionStorage.getItem(STORAGE_KEY));
    if (stored) setSnapshot(stored, 'session-restore');
    else {
      const legacy = parse(sessionStorage.getItem('starwell.deepObserver.v0.1.packet'));
      if (legacy) setSnapshot(legacyDeepToField(legacy), 'legacy-session-restore');
    }
  }

  global.StarwellConcurrentFieldAudio = Object.freeze({
    VERSION: '0.2.0',
    CHANNEL,
    setSnapshot,
    getSnapshot,
    materialize,
    summarize,
    subscribe,
    scfeToField,
    legacyDeepToField
  });

  listen();
})(window);
