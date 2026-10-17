'use strict';

/**
 * Read-only, host-authorised projection of TravellingInheritance into a
 * non-authoritative Wayglass semantic audit. Never runs in a browser bundle.
 * The store's hash chain is checked by TravellingInheritance.state().
 * A hash chain alone is NOT a participant signature or identity proof.
 */
const { TravellingInheritance } = require('./wayglass-travelling-inheritance.cjs');

const SOURCE_SCHEMA = 'wayglass.verified-inheritance-audit-source/v1';
const SAMPLE_SCHEMA = 'wayglass.ledger-supersession-sample/v0.1';
const MAX_RECORDS = 32;
const MAX_TEXT = 2000;
const required = (value, field, max = 240) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(`${field} must be a non-empty string <= ${max} characters`);
  }
  return value;
};
const copy = value => JSON.parse(JSON.stringify(value));

/**
 * `actor` must come from the authenticated host, NEVER a request body.
 * `authorise` is the host's real permission check. This adapter will not
 * manufacture or accept its own authorization token.
 *
 * The inherited ledger's only status operation is `revoke`. It does NOT
 * contain a supersede operation, so this projection makes no replacement
 * linkage or supersession claim.
 */
async function readVerifiedInheritanceAuditSource({
  participantId, actor, authorise, store, query, expectedDeedId,
} = {}) {
  required(participantId, 'participantId', 120);
  required(query, 'query', 500);
  required(expectedDeedId, 'expectedDeedId', 120);
  if (actor === undefined || actor === null || typeof authorise !== 'function') {
    throw new TypeError('host-authenticated actor and authorise callback required');
  }
  if (!store || typeof store.read !== 'function' || typeof store.compareAndSwap !== 'function') {
    throw new TypeError('host-owned atomic inheritance store required');
  }

  // Gate BEFORE any read, including reads whose result would be empty.
  if (await authorise(actor, participantId, 'read-inheritance') !== true) {
    throw new Error('unauthorised inheritance read');
  }
  const ledger = new TravellingInheritance({ participant_id: participantId, store, authorise });
  const state = await ledger.state(); // verifies schema, revision and every hash link
  const entries = state.events.map((receipt, index) => {
    const event = receipt?.event;
    if (!event || typeof event !== 'object' || event.participant_id !== participantId) {
      throw new Error(`inheritance event at ${index} crosses participant`);
    }
    return event;
  });

  const byId = new Map();
  for (const event of entries) {
    const id = required(event.event_id, 'event_id', 120);
    if (byId.has(id)) throw new Error('ambiguous duplicate inheritance event_id');
    byId.set(id, event);
  }
  const revocations = entries.filter(event => event.kind === 'revoke');
  const revoked = new Set();
  for (const revoke of revocations) {
    const target = required(revoke.target_event_id, 'revoke target_event_id', 120);
    if (!byId.has(target)) throw new Error('revocation target absent from verified chain');
    revoked.add(target);
  }
  if (!entries.some(event => event.kind === 'seed' && !revoked.has(event.event_id))) {
    throw new Error('active inheritance seed missing');
  }

  const deeds = entries.filter(event => event.kind === 'deed');
  if (deeds.length < 2 || deeds.length > MAX_RECORDS) {
    throw new RangeError(`verified audit requires 2–${MAX_RECORDS} deeds`);
  }
  if (!deeds.some(event => revoked.has(event.event_id))) {
    throw new RangeError('revocation trial requires at least one revoked deed');
  }
  const records = deeds.map(event => ({
    ref: required(event.event_id, 'deed event_id', 120),
    subject_id: participantId,
    source_ref: required(event.source_ref, 'deed source_ref', 240),
    text: required(event.description, 'deed description', MAX_TEXT),
    status: revoked.has(event.event_id) ? 'revoked' : 'active',
  }));
  const expected = records.find(record => record.ref === expectedDeedId);
  if (!expected || expected.status !== 'active') {
    throw new Error('expected retrieval target must be an active, verified deed');
  }
  const forbidden_refs = records.filter(record => record.status === 'revoked').map(record => record.ref);
  const sample = {
    schema: SAMPLE_SCHEMA,
    query,
    records,
    expected: { target_ref: expectedDeedId, forbidden_refs },
  };
  // This is an attested source PROJECTION, not a signed audit receipt.
  const source = {
    schema: SOURCE_SCHEMA,
    participant_id: participantId,
    revision: state.revision,
    chain_head_hash: state.events.at(-1)?.hash || null,
    source_kind: 'host-authorised-travelling-inheritance-read',
    integrity_check: 'existing-ledger-hash-chain',
    receipt_signature_verified: false,
    host_read_authorised: true,
    original_statuses_derived_from: 'deed/revoke event chain',
    replacement_links_inferred: false,
    canonical_store_updated: false,
    retrieved_deeds: records.length,
    excluded_deeds: forbidden_refs.length,
  };
  return Object.freeze({ source: Object.freeze(source), sample: copy(sample) });
}

async function auditVerifiedInheritance({ embed = null, model = null, ...args } = {}) {
  const verified = await readVerifiedInheritanceAuditSource(args);
  const { auditSupersession } = await import('../apps/wayglass/src/ledger-supersession-audit.js');
  const comparison = await auditSupersession(verified.sample, { embed, model });
  return Object.freeze({
    ...comparison,
    status: 'observed-authorised-ledger-comparison',
    provenance: {
      ...comparison.provenance,
      sample_only: false,
      host_read_source: verified.source,
      // Structural chain verification is not equivalent to per-event signing.
      receipt_signature_verified: false,
      canonical_store_updated: false,
    },
    claims: { ...comparison.claims, authorised_read_is_write_authority: false },
  });
}

module.exports = {
  SOURCE_SCHEMA, MAX_RECORDS, readVerifiedInheritanceAuditSource, auditVerifiedInheritance,
};