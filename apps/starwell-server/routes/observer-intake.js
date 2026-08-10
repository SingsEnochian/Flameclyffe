const { randomUUID } = require('crypto');

const OBSERVER_INTAKE_VERSION = 'v1';

const REQUIRED_FIELDS = [
  'schema',
  'envelope_id',
  'received_at',
  'source_id',
  'source_kind',
  'evidence_class',
  'content_kind',
  'temporal_extent',
  'canon_effect',
  'consent_scope',
  'confidence',
  'payload',
];

function validateEnvelope(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['Envelope must be a JSON object.'];
  }

  if (body.schema !== 'hearthgate/observation-envelope/v1') {
    errors.push(`schema must be 'hearthgate/observation-envelope/v1'. Got: ${body.schema}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if ('destination_datasets' in body) {
    errors.push('Sources may not include destination_datasets. The Observer owns all routing decisions.');
  }

  if (typeof body.confidence === 'number' && (body.confidence < 0 || body.confidence > 1)) {
    errors.push(`confidence must be in [0, 1]. Got: ${body.confidence}`);
  }

  if (!body.temporal_extent?.utc_start) {
    errors.push('temporal_extent.utc_start is required.');
  }

  if (!body.payload || typeof body.payload !== 'object' || Object.keys(body.payload).length === 0) {
    errors.push('payload must be a non-empty object.');
  }

  return errors;
}

function buildReceipt({ envelopeId, receivedAt, routing, storeRecords }) {
  return {
    schema: 'hearthgate/routing-receipt/v1',
    receipt_id: randomUUID(),
    envelope_id: envelopeId,
    received_at: receivedAt,
    routing_version: OBSERVER_INTAKE_VERSION,
    result: routing.result,
    destinations: routing.destinations,
    held: routing.result === 'HELD_FOR_REVIEW',
    blocked: routing.result === 'BLOCKED',
    decompose: routing.result === 'DECOMPOSE_AND_REROUTE',
    notes: routing.notes ?? null,
    store_records: storeRecords,
    emitted_at: new Date().toISOString(),
  };
}

// Build a minimal DEEPStory-compatible record from an observation envelope.
// The story store requires source_refs and at least one event with text.
function storyInputFromEnvelope(envelope) {
  const text = JSON.stringify(envelope.payload).slice(0, 2000);
  return {
    title: `${envelope.source_kind}: ${envelope.source_id}`,
    summary: '',
    narrative_mode: 'documentary',
    canon_state: 'draft',
    source_refs: [{
      ref: envelope.envelope_id,
      dataset: 'observation-intake',
      record_type: 'witnessed',
    }],
    events: [{
      text,
      epistemic_status: 'witnessed',
      narrative_treatment: 'verbatim',
      source_refs: [envelope.envelope_id],
    }],
    consent_scope: {
      store: true,
      sequence: true,
      interpret: false,
      render: false,
      link_sources: true,
      share_with_constellation: false,
      notes: null,
    },
  };
}

function registerObserverRoutes(app, { storyStore, timeStore, theoryStore } = {}) {
  app.post('/api/observer/intake', async (req, res) => {
    let routeObservation;
    try {
      ({ routeObservation } = await import('../../../starwell/deep-observer/observer-routing.js'));
    } catch (err) {
      return res.status(500).json({ error: 'Routing module unavailable.', detail: err.message });
    }

    const body = req.body;
    const receivedAt = new Date().toISOString();
    const envelopeId = body?.envelope_id ?? randomUUID();

    const errors = validateEnvelope(body);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid observation envelope.',
        envelope_id: envelopeId,
        validation_errors: errors,
      });
    }

    const routing = routeObservation(body);

    // Save to each destination store and collect record IDs for the receipt.
    const storeRecords = [];

    if (routing.result === 'ROUTED' && routing.destinations.length > 0) {
      await Promise.all(routing.destinations.map(async (dest) => {
        try {
          if (dest === 'DEEPStory' && storyStore) {
            const record = await storyStore.save(storyInputFromEnvelope(body));
            storeRecords.push({ dataset: 'DEEPStory', record_id: record.id });
          } else if (dest === 'DEEPTime' && timeStore) {
            const record = await timeStore.save({
              envelope_id: body.envelope_id,
              source_kind: body.source_kind,
              source_id: body.source_id,
              utc: body.temporal_extent?.utc_start,
              confidence: body.confidence,
              evidence_class: body.evidence_class,
              consent_scope: body.consent_scope,
            });
            storeRecords.push({ dataset: 'DEEPTime', record_id: record.id });
          } else if (dest === 'DEEPTheory' && theoryStore) {
            const record = await theoryStore.save({
              envelope_id: body.envelope_id,
              source_kind: body.source_kind,
              source_id: body.source_id,
              content_kind: body.content_kind,
              canon_effect: body.canon_effect,
              confidence: body.confidence,
              evidence_class: body.evidence_class,
              temporal_extent: body.temporal_extent,
              payload: body.payload,
              consent_scope: body.consent_scope,
              source_refs: [{ ref: body.envelope_id, dataset: 'observation-intake' }],
            });
            storeRecords.push({ dataset: 'DEEPTheory', record_id: record.id });
          }
        } catch (storeErr) {
          // Store failure is non-fatal — log it but do not block the receipt.
          console.error(`[observer-intake] store save failed for ${dest}:`, storeErr.message);
          storeRecords.push({ dataset: dest, record_id: null, error: storeErr.message });
        }
      }));
    }

    const receipt = buildReceipt({ envelopeId, receivedAt, routing, storeRecords });
    return res.status(200).json({ receipt });
  });
}

module.exports = { registerObserverRoutes };
