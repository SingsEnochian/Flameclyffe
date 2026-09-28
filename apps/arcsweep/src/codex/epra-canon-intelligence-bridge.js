import { normaliseCanonEvidence } from '../canon-intelligence-core.js';
import {
  EPRA_CANON_PACKET_SCHEMA,
  EPRA_UNIVERSE_ID,
} from './epra-canon-ingest-manifest.js';

export const EPRA_CANON_BRIDGE_SCHEMA = 'hearthweave.epra-canon-intelligence-bridge/v0.1';
export const EPRA_PUBLIC_INGEST_RECEIPT_SCHEMA = 'hearthweave.epra-public-ingest-receipt/v0.1';

const AUTHORITY_BY_CLASS = Object.freeze({
  current: 'primary-canon',
  ancestor: 'reference',
  legacy: 'reference',
  reference: 'reference',
});

const text = (value) => String(value ?? '').trim();
const slug = (value) => text(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function requirePacket(packet) {
  if (packet?.schema !== EPRA_CANON_PACKET_SCHEMA) {
    throw new Error('EPRA_BRIDGE: a private Epra canon ingest packet is required');
  }
  if (packet.universeId !== EPRA_UNIVERSE_ID) {
    throw new Error(`EPRA_BRIDGE: packet belongs to ${packet.universeId || 'unknown'}, not Epra`);
  }
  if (!packet.sourceKey || !packet.sourceRevision) {
    throw new Error('EPRA_BRIDGE: packet source identity is incomplete');
  }
  return packet;
}

function safeProvenance(packet, fact) {
  return Object.freeze({
    sourceKey: packet.sourceKey,
    sourceRevision: packet.sourceRevision,
    sourceTitle: packet.sourceTitle,
    canonClass: packet.canonClass,
    precedence: packet.precedence,
    retrievedAt: packet.retrievedAt,
    heading: text(fact.heading) || null,
    lineRange: text(fact.lineRange) || null,
    extractor: text(fact.extractor) || 'epra-private-canon-extractor',
    privacy: 'private-source-redacted',
    rawContentPersisted: false,
    privateLocatorPersisted: false,
  });
}

export function createEpraCanonEvidence({ packet, fact } = {}) {
  requirePacket(packet);
  const factId = text(fact?.factId || fact?.id);
  const entityHint = text(fact?.entityHint || fact?.entity_hint);
  const fieldHint = text(fact?.fieldHint || fact?.field_hint);
  if (!factId) throw new Error('EPRA_BRIDGE: factId is required');
  if (!entityHint) throw new Error(`EPRA_BRIDGE: ${factId} requires entityHint`);
  if (!fieldHint) throw new Error(`EPRA_BRIDGE: ${factId} requires fieldHint`);
  if (fact?.value === undefined) throw new Error(`EPRA_BRIDGE: ${factId} requires value`);

  return normaliseCanonEvidence({
    evidence_id: `evidence:epra:${slug(packet.sourceKey)}:${slug(packet.sourceRevision)}:${slug(factId)}`,
    source_id: `epra:${packet.sourceKey}:${packet.sourceRevision}`,
    source_kind: 'private-author-canon',
    source_title: packet.sourceTitle,
    source_url: null,
    locator: null,
    world_id: EPRA_UNIVERSE_ID,
    entity_hint: entityHint,
    field_hint: fieldHint,
    value: fact.value,
    excerpt: null,
    authority: AUTHORITY_BY_CLASS[packet.canonClass] || 'unknown',
    confidence: fact.confidence ?? (packet.canonClass === 'current' ? 1 : 0.75),
    observed_at: packet.retrievedAt,
    provenance: [safeProvenance(packet, fact)],
  });
}

export function createEpraCanonEvidenceBatch({ packet, facts = [] } = {}) {
  requirePacket(packet);
  if (!Array.isArray(facts) || !facts.length) throw new Error('EPRA_BRIDGE: at least one extracted fact is required');
  const evidence = facts.map((fact) => createEpraCanonEvidence({ packet, fact }));
  const ids = new Set(evidence.map((item) => item.evidence_id));
  if (ids.size !== evidence.length) throw new Error('EPRA_BRIDGE: duplicate fact/evidence id in batch');
  return Object.freeze(evidence);
}

export function createEpraPublicIngestReceipt({ packet, evidence = [] } = {}) {
  requirePacket(packet);
  if (!Array.isArray(evidence)) throw new Error('EPRA_BRIDGE: evidence must be an array');
  const entityHints = [...new Set(evidence.map((item) => text(item?.entity_hint)).filter(Boolean))].sort();
  const fieldHints = [...new Set(evidence.map((item) => text(item?.field_hint)).filter(Boolean))].sort();
  const evidenceIds = evidence.map((item) => text(item?.evidence_id)).filter(Boolean).sort();

  return Object.freeze({
    schema: EPRA_PUBLIC_INGEST_RECEIPT_SCHEMA,
    bridgeSchema: EPRA_CANON_BRIDGE_SCHEMA,
    universeId: EPRA_UNIVERSE_ID,
    sourceKey: packet.sourceKey,
    sourceTitle: packet.sourceTitle,
    sourceRevision: packet.sourceRevision,
    canonClass: packet.canonClass,
    precedence: packet.precedence,
    retrievedAt: packet.retrievedAt,
    factCount: evidence.length,
    evidenceIds: Object.freeze(evidenceIds),
    entityHints: Object.freeze(entityHints),
    fieldHints: Object.freeze(fieldHints),
    privacy: Object.freeze({
      rawContentPersisted: false,
      extractedValuesPublished: false,
      excerptsPublished: false,
      privateLocatorPersisted: false,
      sourceUrlPublished: false,
    }),
    authority: Object.freeze({
      evidenceOnly: true,
      mayPropose: true,
      mayPromoteToCanon: false,
      stewardReviewRequired: true,
    }),
  });
}

export function validateEpraPublicIngestReceipt(receipt) {
  const violations = [];
  if (receipt?.schema !== EPRA_PUBLIC_INGEST_RECEIPT_SCHEMA) violations.push('invalid-schema');
  if (receipt?.universeId !== EPRA_UNIVERSE_ID) violations.push('invalid-universe');
  if (receipt?.authority?.mayPromoteToCanon !== false) violations.push('unsafe-canon-authority');
  if (receipt?.authority?.stewardReviewRequired !== true) violations.push('missing-steward-review');
  if (receipt?.privacy?.rawContentPersisted !== false) violations.push('raw-content-persisted');
  if (receipt?.privacy?.extractedValuesPublished !== false) violations.push('extracted-values-published');
  if (receipt?.privacy?.privateLocatorPersisted !== false) violations.push('private-locator-persisted');
  const serialized = JSON.stringify(receipt || {});
  if (/drive\.google\.com|docs\.google\.com/i.test(serialized)) violations.push('private-drive-url');
  if (/\bcontent\b|\bexcerpt\b|\bsourceUrl\b|\blocator\b/i.test(Object.keys(receipt || {}).join(' '))) violations.push('private-payload-field');
  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
}
