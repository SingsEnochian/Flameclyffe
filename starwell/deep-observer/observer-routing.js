export const ROUTING_VERSION = 'v1';

export const RESULT_BLOCKED = 'BLOCKED';
export const RESULT_HELD = 'HELD_FOR_REVIEW';
export const RESULT_DECOMPOSE = 'DECOMPOSE_AND_REROUTE';
export const RESULT_ROUTED = 'ROUTED';

const STORY_SOURCE_KINDS = new Set([
  'canon_event',
  'daily_event',
]);

const TIME_SOURCE_KINDS = new Set([
  'temporal_reading',
  'arcsweep_temporal',
]);

const THEORY_SOURCE_KINDS = new Set([
  'pattern_analysis',
  'theory_update',
  'world_update',
]);

export function routeObservation(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return { result: RESULT_BLOCKED, destinations: [], notes: 'Envelope must be an object.' };
  }

  if (Object.prototype.hasOwnProperty.call(envelope, 'destination_datasets')) {
    return {
      result: RESULT_BLOCKED,
      destinations: [],
      notes: 'Sources may not specify destination_datasets. The Observer owns all routing decisions.',
    };
  }

  const { source_kind, content_kind, canon_effect, consent_scope, confidence, evidence_class, temporal_extent } = envelope;

  if (consent_scope === 'excluded') {
    return { result: RESULT_BLOCKED, destinations: [], notes: 'Consent scope is excluded.' };
  }

  if (consent_scope === 'review_required') {
    return { result: RESULT_HELD, destinations: [], notes: 'Consent scope requires review before routing.' };
  }

  if (source_kind === 'news_digest') {
    return {
      result: RESULT_DECOMPOSE,
      destinations: [],
      notes: 'News digests must be decomposed into individual observations before routing. No bulk routing.',
    };
  }

  if (
    typeof confidence === 'number' &&
    confidence < 0.3 &&
    evidence_class === 'unknown'
  ) {
    return {
      result: RESULT_HELD,
      destinations: [],
      notes: 'Low-confidence unknown observation held for human review.',
    };
  }

  const destinations = new Set();

  if (
    STORY_SOURCE_KINDS.has(source_kind) ||
    content_kind === 'event' ||
    (source_kind === 'world_update' && canon_effect !== 'none' && canon_effect !== 'interpretive')
  ) {
    if (canon_effect !== 'none') {
      destinations.add('DEEPStory');
    }
  }

  if (TIME_SOURCE_KINDS.has(source_kind)) {
    destinations.add('DEEPTime');
  }

  if (
    source_kind === 'canon_event' &&
    temporal_extent?.utc_start &&
    typeof temporal_extent.utc_start === 'string'
  ) {
    destinations.add('DEEPTime');
  }

  if (source_kind === 'daily_event' && temporal_extent?.ongoing === true) {
    destinations.add('DEEPTime');
  }

  if (
    source_kind === 'glyph_cast' &&
    (canon_effect === 'additive' || canon_effect === 'corrective')
  ) {
    destinations.add('DEEPStory');
    destinations.add('DEEPTime');
  }

  if (
    THEORY_SOURCE_KINDS.has(source_kind) ||
    content_kind === 'analysis' ||
    content_kind === 'discovery'
  ) {
    destinations.add('DEEPTheory');
  }

  if (canon_effect === 'contradictory') {
    destinations.add('DEEPTheory');
  }

  if (canon_effect === 'contradictory' && destinations.has('DEEPStory')) {
    destinations.add('DEEPTheory');
  }

  return {
    result: RESULT_ROUTED,
    destinations: [...destinations].sort(),
    routing_version: ROUTING_VERSION,
    notes: null,
  };
}
