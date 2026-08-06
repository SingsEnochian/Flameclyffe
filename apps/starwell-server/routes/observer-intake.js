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

function buildReceipt({ envelopeId, receivedAt, routing }) {
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
    emitted_at: new Date().toISOString(),
  };
}

function registerObserverRoutes(app) {
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
    const receipt = buildReceipt({ envelopeId, receivedAt, routing });

    return res.status(200).json({ receipt });
  });
}

module.exports = { registerObserverRoutes };
