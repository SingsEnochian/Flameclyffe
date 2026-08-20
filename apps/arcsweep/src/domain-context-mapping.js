import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const DOMAIN_CONTEXT_MAPPING_SCHEMA = 'arcsweep.domain-context-mapping/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_DOMAIN_MAPPING: ${message}`);
}

function nonEmpty(value, field) {
  const text = String(value ?? '').trim();
  invariant(text.length > 0, `${field} is required`);
  return text;
}

export async function createDomainContextMapping({
  fromDomain,
  toDomain,
  rationale,
  declaredBy,
  sourceRefs = [],
  declaredAt,
} = {}) {
  const from = nonEmpty(fromDomain, 'fromDomain');
  const to = nonEmpty(toDomain, 'toDomain');
  invariant(from !== to, 'mapping is unnecessary when domains already match');
  const reason = nonEmpty(rationale, 'rationale');
  const actor = nonEmpty(declaredBy, 'declaredBy');
  const timestamp = declaredAt ?? new Date().toISOString();
  const refs = [...new Set((sourceRefs || []).map((item) => String(item).trim()).filter(Boolean))];
  const core = {
    schema: DOMAIN_CONTEXT_MAPPING_SCHEMA,
    schema_version: 1,
    from_domain: from,
    to_domain: to,
    rationale: reason,
    declared_by: actor,
    declared_at: timestamp,
    source_refs: refs,
    authority: {
      explicit_human_mapping: true,
      numerical_equivalence_asserted: false,
      unit_equivalence_asserted: false,
      semantic_identity_asserted: false,
      applicability_bridge_only: true,
      physical_claim: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    mapping_id: `arcsweep-domain-map-${fingerprint.slice(0, 24)}`,
    mapping_fingerprint: fingerprint,
  });
}

export function mappingBridges(mapping, fromDomain, toDomain) {
  if (mapping?.schema !== DOMAIN_CONTEXT_MAPPING_SCHEMA) return false;
  if (mapping.authority?.explicit_human_mapping !== true) return false;
  if (mapping.authority?.numerical_equivalence_asserted !== false) return false;
  return mapping.from_domain === fromDomain && mapping.to_domain === toDomain;
}
