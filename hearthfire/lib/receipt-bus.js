const nowIso = () => new Date().toISOString();

const makeId = (prefix = 'receipt') => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}:${crypto.randomUUID()}`;
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
};

export class ReceiptBus {
  constructor({ surfaceId = 'hearthfire', gate = 'targeted_receipt_allowed', limit = 120, onReceipt = null } = {}) {
    this.surfaceId = surfaceId;
    this.gate = gate;
    this.limit = limit;
    this.receipts = [];
    this.subscribers = new Set();
    if (onReceipt) this.subscribers.add(onReceipt);
  }

  emit(input = {}) {
    const receipt = {
      id: input.id || makeId('receipt'),
      surface_id: input.surface_id || this.surfaceId,
      gate: input.gate || this.gate,
      timestamp: input.timestamp || nowIso(),
      event_type: input.event_type || 'receipt:emitted',
      result_state: input.result_state || 'unknown',
      effect_id: input.effect_id || null,
      source_event: input.source_event || null,
      mapped_variable: input.mapped_variable || null,
      output_channel: input.output_channel || null,
      requested: Boolean(input.requested),
      emitted: Boolean(input.emitted),
      reason: input.reason || null,
      consent: input.consent || {},
      accessibility: input.accessibility || {},
      confidence: input.confidence || 'unknown',
      source_status: input.source_status || 'unknown',
      persistence: input.persistence || 'none',
      plain_language: input.plain_language || 'A Hearthfire event was recorded.',
      boundary: input.boundary || 'This receipt records interface state and claim boundaries.',
      data: input.data || {}
    };

    this.receipts.unshift(receipt);
    if (this.receipts.length > this.limit) this.receipts.length = this.limit;
    for (const subscriber of this.subscribers) subscriber(receipt, this.list());
    return receipt;
  }

  emitPlan({ event, result, gatedPlan, state }) {
    const receipts = [];
    for (const channel of Object.keys(gatedPlan.channels)) {
      for (const effect of gatedPlan.channels[channel]) {
        receipts.push(this.emit({
          event_type: 'effect:evaluated',
          result_state: result.result_state,
          effect_id: effect.effect_id,
          source_event: event?.type || null,
          mapped_variable: effect.source || null,
          output_channel: channel,
          requested: true,
          emitted: effect.emitted,
          reason: effect.reason,
          consent: state.consent,
          accessibility: state.accessibility,
          confidence: state.confidence,
          source_status: state.source_status,
          plain_language: effect.plain_language || result.plain_language,
          boundary: effect.boundary || result.boundary,
          data: { effect, result, values: state.values, interaction: state.interaction }
        }));
      }
    }

    if (receipts.length === 0) {
      receipts.push(this.emit({
        event_type: 'null:held',
        result_state: result.result_state,
        source_event: event?.type || null,
        requested: false,
        emitted: false,
        reason: result.reason || 'no_effect_requested',
        consent: state.consent,
        accessibility: state.accessibility,
        confidence: state.confidence,
        source_status: state.source_status,
        plain_language: result.plain_language,
        boundary: result.boundary,
        data: { result, values: state.values, interaction: state.interaction }
      }));
    }

    return receipts;
  }

  list() {
    return [...this.receipts];
  }

  latest() {
    return this.receipts[0] || null;
  }

  clear() {
    this.receipts = [];
    for (const subscriber of this.subscribers) subscriber(null, this.list());
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}

export const NULL_BOUNDARY = 'No clear pattern is a valid Hearthfire result. Quiet is allowed to be truthful.';
