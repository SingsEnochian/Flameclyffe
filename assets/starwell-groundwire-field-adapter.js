'use strict';

/* Merge the latest Groundwire snapshot into the shared Concurrent Field feed. */

(function installGroundwireFieldAdapter(global) {
  const base = global.StarwellConcurrentFieldAudio;
  const contract = global.StarwellAudioPatchContract;
  if (!base || !contract || base.__groundwireV03) return;

  const CHANNEL = 'starwell-groundwire';
  const SESSION_KEY = 'starwell.groundwire.v0.1.sessionSnapshot';
  const subscribers = new Set();
  let groundwire = null;

  function parse(value) {
    try { return value ? JSON.parse(value) : null; }
    catch (error) { return null; }
  }

  function getSnapshot() {
    const field = base.getSnapshot();
    if (!field) return null;
    return { ...field, groundwire: groundwire || contract.normalizeGroundwire({ status: 'waiting' }) };
  }

  function summarize() {
    const summary = base.summarize();
    return {
      ...summary,
      groundwire: groundwire ? {
        version: groundwire.version,
        updatedAt: groundwire.updatedAt,
        location: groundwire.location,
        network: groundwire.network,
        hardware: groundwire.hardware,
        microphone: groundwire.microphone,
        battery: groundwire.battery,
        boundary: groundwire.boundary
      } : { status: 'waiting' }
    };
  }

  function notify(reason) {
    const detail = { reason, snapshot: getSnapshot(), summary: summarize() };
    subscribers.forEach((fn) => {
      try { fn(detail); } catch (error) {}
    });
    try { global.dispatchEvent(new CustomEvent('starwell:concurrent-field-audio', { detail })); } catch (error) {}
  }

  function setGroundwire(input, reason = 'groundwire') {
    const raw = input?.snapshot || input?.detail || input || {};
    groundwire = contract.normalizeGroundwire(raw);
    notify(reason);
    return groundwire;
  }

  function materialize(patch) {
    const snapshot = getSnapshot();
    if (!snapshot) return null;
    return contract.materializePatch(patch, snapshot);
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn);
    fn({ reason: 'subscribe', snapshot: getSnapshot(), summary: summarize() });
    return () => subscribers.delete(fn);
  }

  base.subscribe(({ reason }) => notify(`field:${reason}`));

  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.addEventListener('message', (event) => {
      if (event.data?.type === 'groundwire:snapshot') {
        setGroundwire(event.data.snapshot || event.data, 'groundwire-broadcast');
      }
    });
  } catch (error) {}

  global.addEventListener('starwell:groundwire:snapshot', (event) => {
    setGroundwire(event.detail, 'groundwire-event');
  });

  const stored = parse(sessionStorage.getItem(SESSION_KEY));
  if (stored) setGroundwire(stored, 'groundwire-session-restore');

  global.StarwellConcurrentFieldAudio = Object.freeze({
    ...base,
    VERSION: '0.3.0',
    __groundwireV03: true,
    setGroundwire,
    getGroundwire: () => groundwire,
    getSnapshot,
    materialize,
    summarize,
    subscribe
  });
})(window);
