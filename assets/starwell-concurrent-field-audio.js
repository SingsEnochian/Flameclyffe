'use strict';

/*
  Starwell Concurrent Field -> Audio Adapter v0.1

  Reads one shared Field Snapshot across DEEP, Barbault, sacred geometry,
  somatic, Terra Aeterna, agency, and archive layers. It never starts audio.
  It only materializes an explicitly selected audio patch after user action.
*/

(function installConcurrentFieldAudio(global) {
  const STORAGE_KEY = 'starwell.concurrentFieldAudio.v0.1.snapshot';
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
        dpdt: deep.dpdt ?? deep.dPdt ?? 0,
        stability: deep.stability ?? 0.5
      },
      barbault: raw.barbault || {},
      geometry: raw.geometry || {},
      somatic: raw.somatic || {},
      terraAeterna: raw.terraAeterna || {},
      agency: raw.agency || {},
      archive: raw.archive || {},
      declarations: [
        ...(Array.isArray(raw.declarations) ? raw.declarations : []),
        { type: 'legacy-adapter', status: 'implementation-bridge', note: 'Legacy P semantics may mean Presence rather than Pressure.' }
      ],
      provenance: raw.provenance || { confidence: 'L0', claimLabel: 'legacy-unclassified' }
    };
  }

  function setSnapshot(input, reason = 'snapshot') {
    const api = contract();
    if (!api) throw new Error('StarwellAudioPatchContract must load before Concurrent Field audio.');
    snapshot = api.normalizeFieldSnapshot(input);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.raw || input)); } catch (error) {}
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
    VERSION: '0.1.0',
    CHANNEL,
    setSnapshot,
    getSnapshot,
    materialize,
    summarize,
    subscribe,
    legacyDeepToField
  });

  listen();
})(window);
