export const CODEX_ASTRONOMY_CONTEXT_SCHEMA = 'hearthweave.codex-astronomy-context/v0.1';
export const CODEX_ASTRONOMY_CONTEXT_SOURCES = Object.freeze([
  'astrolabe',
  'orrery',
  'celestial-sphere',
]);

const sourceSet = new Set(CODEX_ASTRONOMY_CONTEXT_SOURCES);

export function createAstronomyContextOffer({
  source,
  selectedAt,
  observer = null,
} = {}) {
  const sourceId = String(source || '').trim();
  if (!sourceSet.has(sourceId)) {
    throw new RangeError(`CODEX_ASTRONOMY_CONTEXT: unsupported source ${sourceId || '(empty)'}`);
  }

  const instant = selectedAt instanceof Date ? selectedAt : new Date(selectedAt);
  if (!Number.isFinite(instant.getTime())) {
    throw new TypeError('CODEX_ASTRONOMY_CONTEXT: a valid selected instant is required');
  }

  let observerSnapshot = null;
  if (observer != null) {
    const latitudeDegrees = Number(observer.latitudeDegrees);
    const longitudeDegrees = Number(observer.longitudeDegrees);
    if (!Number.isFinite(latitudeDegrees) || latitudeDegrees < -90 || latitudeDegrees > 90) {
      throw new RangeError('CODEX_ASTRONOMY_CONTEXT: observer latitude must be between -90 and 90 degrees');
    }
    if (!Number.isFinite(longitudeDegrees) || longitudeDegrees < -180 || longitudeDegrees > 180) {
      throw new RangeError('CODEX_ASTRONOMY_CONTEXT: observer longitude must be between -180 and 180 degrees');
    }
    observerSnapshot = Object.freeze({ latitudeDegrees, longitudeDegrees });
  }

  return Object.freeze({
    schema: CODEX_ASTRONOMY_CONTEXT_SCHEMA,
    source: sourceId,
    selectedAt: instant.toISOString(),
    observer: observerSnapshot,
    authority: 'prefill-only context offer; target instrument must explicitly adopt and recompute',
  });
}

export function astronomyContextFromEvent(eventName, detail = {}) {
  switch (String(eventName || '')) {
    case 'codex:astrolabe-reading': {
      const reading = detail?.reading;
      if (!reading?.observedAt) return null;
      return createAstronomyContextOffer({
        source: 'astrolabe',
        selectedAt: reading.observedAt,
        observer: reading.observer || null,
      });
    }
    case 'codex:orrery-time-change': {
      const state = detail?.state;
      if (!state?.selectedAt) return null;
      return createAstronomyContextOffer({ source: 'orrery', selectedAt: state.selectedAt });
    }
    case 'codex:celestial-time-change': {
      const state = detail?.state;
      if (!state?.selectedAt) return null;
      return createAstronomyContextOffer({ source: 'celestial-sphere', selectedAt: state.selectedAt });
    }
    default:
      return null;
  }
}
