function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export const ARCSWEEP_BOOT_STATES = Object.freeze(['BOOTING', 'READY', 'DEGRADED', 'PAUSED', 'ERROR']);

const TRANSITIONS = Object.freeze({
  BOOTING: Object.freeze(['READY', 'DEGRADED', 'PAUSED', 'ERROR']),
  READY: Object.freeze(['DEGRADED', 'PAUSED', 'ERROR']),
  DEGRADED: Object.freeze(['READY', 'PAUSED', 'ERROR']),
  PAUSED: Object.freeze(['READY', 'DEGRADED', 'ERROR']),
  ERROR: Object.freeze(['BOOTING']),
});

function makeRecord(state, { sequence, previous = null, reason = null, details = null, now }) {
  return Object.freeze(clone({
    schema: 'arcsweep.os-boot-state/v1',
    sequence,
    state,
    previous_state: previous,
    reason,
    details: details == null ? null : clone(details),
    changed_at: now().toISOString(),
  }));
}

export function createBootLifecycle({ bus = null, now = () => new Date(), historyLimit = 32 } = {}) {
  let sequence = 0;
  let current = makeRecord('BOOTING', { sequence: ++sequence, now, reason: 'kernel-install-started' });
  const history = [current];

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:os-boot-state')) {
      bus.define('arcsweep:os-boot-state', (payload) => payload?.schema === 'arcsweep.os-boot-state/v1' && ARCSWEEP_BOOT_STATES.includes(payload?.state));
    }
  }

  function transition(nextState, { reason = null, details = null, force = false } = {}) {
    const next = String(nextState || '').toUpperCase();
    if (!ARCSWEEP_BOOT_STATES.includes(next)) throw new Error(`Unknown ArcSweep boot state: ${nextState}`);
    if (next === current.state) return clone(current);
    const allowed = TRANSITIONS[current.state] || [];
    if (!force && !allowed.includes(next)) {
      throw new Error(`Invalid ArcSweep boot transition: ${current.state} -> ${next}`);
    }
    const previous = current.state;
    current = makeRecord(next, { sequence: ++sequence, previous, reason, details, now });
    history.push(current);
    if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
    bus?.publish?.('arcsweep:os-boot-state', current, { source: 'os-boot-lifecycle' });
    return clone(current);
  }

  return Object.freeze({
    state: () => current.state,
    snapshot: () => clone(current),
    history: () => history.map(clone),
    transition,
  });
}
