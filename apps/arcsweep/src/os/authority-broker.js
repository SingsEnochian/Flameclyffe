function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

const AUTHORITY = Object.freeze(['read', 'operate', 'mutate', 'admin']);
const DEFAULT_TTL_MS = 120000;
const MAX_TTL_MS = 300000;

function createId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`}`;
}

function validateAuthority(authority) {
  if (!AUTHORITY.includes(authority)) throw new Error(`Unknown authority: ${authority}`);
  return authority;
}

export function createAuthorityBroker({ now = () => Date.now(), maxTtlMs = MAX_TTL_MS } = {}) {
  const leases = new Map();

  function issue({
    actor_id,
    authority,
    capability_ids = [],
    ttl_ms = DEFAULT_TTL_MS,
    single_use = true,
    approved_by = 'human-steward',
  } = {}) {
    const actorId = String(actor_id || '').trim();
    if (!actorId) throw new Error('Authority lease requires actor_id.');
    const level = validateAuthority(authority);
    if (!['mutate', 'admin'].includes(level)) throw new Error('Steward authority leases are reserved for mutate/admin authority.');
    if (approved_by !== 'human-steward') throw new Error('Privileged authority lease requires human Steward approval.');
    const scopes = [...new Set(capability_ids.map((item) => String(item).trim()).filter(Boolean))];
    if (!scopes.length) throw new Error('Privileged authority lease requires at least one capability scope.');
    const ttl = Math.max(1000, Math.min(Number(ttl_ms) || DEFAULT_TTL_MS, maxTtlMs));
    const issuedAt = now();
    const token = createId('authority-token');
    const record = {
      schema: 'arcsweep.authority-lease/v1',
      lease_id: createId('authority-lease'),
      actor_id: actorId,
      authority: level,
      capability_ids: scopes,
      single_use: Boolean(single_use),
      approved_by,
      issued_at: new Date(issuedAt).toISOString(),
      expires_at: new Date(issuedAt + ttl).toISOString(),
      expires_at_ms: issuedAt + ttl,
      used_at: null,
      revoked_at: null,
    };
    leases.set(token, record);
    return Object.freeze({
      token,
      lease: publicRecord(record, issuedAt),
    });
  }

  function publicRecord(record, at = now()) {
    return clone({
      schema: record.schema,
      lease_id: record.lease_id,
      actor_id: record.actor_id,
      authority: record.authority,
      capability_ids: record.capability_ids,
      single_use: record.single_use,
      approved_by: record.approved_by,
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      used_at: record.used_at,
      revoked_at: record.revoked_at,
      status: record.revoked_at ? 'revoked' : record.used_at && record.single_use ? 'used' : at >= record.expires_at_ms ? 'expired' : 'active',
    });
  }

  function resolve({ token, actor_id, capability_id, consume = true } = {}) {
    const record = leases.get(token);
    if (!record) return { valid: false, reason: 'unknown-lease' };
    const at = now();
    if (record.revoked_at) return { valid: false, reason: 'revoked-lease', lease: publicRecord(record, at) };
    if (at >= record.expires_at_ms) return { valid: false, reason: 'expired-lease', lease: publicRecord(record, at) };
    if (record.single_use && record.used_at) return { valid: false, reason: 'used-lease', lease: publicRecord(record, at) };
    if (record.actor_id !== actor_id) return { valid: false, reason: 'actor-mismatch', lease: publicRecord(record, at) };
    if (!record.capability_ids.includes(capability_id)) return { valid: false, reason: 'capability-out-of-scope', lease: publicRecord(record, at) };
    if (consume && record.single_use) record.used_at = new Date(at).toISOString();
    return { valid: true, authority: record.authority, lease: publicRecord(record, at) };
  }

  function revoke(token) {
    const record = leases.get(token);
    if (!record || record.revoked_at) return false;
    record.revoked_at = new Date(now()).toISOString();
    return true;
  }

  return Object.freeze({
    issue,
    resolve,
    revoke,
    snapshot: () => [...leases.values()].map((record) => publicRecord(record)),
  });
}
