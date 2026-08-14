'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RECEIPT_SCHEMA = 'bifrost.runtime-receipt/v1';
const MAX_RECEIPTS = 500;

function receiptRoot(env = process.env) {
  const dataRoot = env.HEARTHGATE_DATA_DIR
    ? path.resolve(env.HEARTHGATE_DATA_DIR)
    : path.resolve(__dirname, '..', 'data');
  return path.join(dataRoot, 'ignition-receipts');
}

function cleanScalar(value, max = 2048) {
  if (value == null) return null;
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

function sanitizeIdentity(identity) {
  if (!identity || typeof identity !== 'object') return null;
  return {
    identityId: cleanScalar(identity.identityId, 128),
    identityName: cleanScalar(identity.identityName, 256),
    displayName: cleanScalar(identity.displayName, 256),
    affectionateName: cleanScalar(identity.affectionateName, 256),
    aliases: Array.isArray(identity.aliases)
      ? identity.aliases.map((value) => cleanScalar(value, 128)).filter(Boolean).slice(0, 16)
      : [],
  };
}

function sanitizeRuntimeReceipt(receipt = {}, { action = null } = {}) {
  const rules = receipt.rules && typeof receipt.rules === 'object'
    ? Object.fromEntries(Object.entries(receipt.rules)
        .filter(([, value]) => typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number')
        .slice(0, 32))
    : {};
  return {
    schema: RECEIPT_SCHEMA,
    receiptId: cleanScalar(receipt.receiptId, 160) || `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    action: cleanScalar(action || receipt.action || receipt.contract || 'runtime-event', 160),
    recordedAt: new Date().toISOString(),
    attemptedAt: cleanScalar(receipt.attemptedAt, 80),
    verifiedAt: cleanScalar(receipt.verifiedAt, 80),
    failedAt: cleanScalar(receipt.failedAt, 80),
    state: cleanScalar(receipt.state, 128),
    requestedRef: cleanScalar(receipt.requestedRef || receipt.resolvedFrom, 256),
    profileId: cleanScalar(receipt.profileId || receipt.profile_id, 256),
    flameId: cleanScalar(receipt.flameId || receipt.flame_id, 128),
    provider: cleanScalar(receipt.provider, 128),
    model: cleanScalar(receipt.model, 512),
    actualModel: cleanScalar(receipt.actualModel || receipt.actual_model, 512),
    sourceModel: cleanScalar(receipt.sourceModel || receipt.source_model, 512),
    runtimeAlias: cleanScalar(receipt.runtimeAlias, 512),
    baseModel: cleanScalar(receipt.baseModel, 512),
    challenge: cleanScalar(receipt.challenge, 128),
    identity: sanitizeIdentity(receipt.identity),
    error: cleanScalar(receipt.error || receipt.detail, 1024),
    loadDurationNs: Number.isFinite(Number(receipt.loadDurationNs)) ? Number(receipt.loadDurationNs) : null,
    totalDurationNs: Number.isFinite(Number(receipt.totalDurationNs)) ? Number(receipt.totalDurationNs) : null,
    rules,
  };
}

function assertNoSecretFields(value, pathName = 'receipt') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/(token|authorization|api.?key|secret|credential)/i.test(key)) {
      throw new Error(`Receipt contains prohibited secret-like field: ${pathName}.${key}`);
    }
    if (child && typeof child === 'object') assertNoSecretFields(child, `${pathName}.${key}`);
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, filePath);
  try { fs.chmodSync(filePath, 0o600); } catch { /* Windows ACLs are profile-owned. */ }
}

function persistRuntimeReceipt(receipt, { action = null, env = process.env } = {}) {
  const safe = sanitizeRuntimeReceipt(receipt, { action });
  assertNoSecretFields(safe);
  const root = receiptRoot(env);
  const safeIdentity = cleanScalar(safe.identity?.identityId || safe.profileId || 'runtime', 128)
    ?.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'runtime';
  const stamp = safe.recordedAt.replace(/[:.]/g, '-');
  const historical = path.join(root, `${stamp}-${safeIdentity}-${safe.receiptId.replace(/[^a-zA-Z0-9._-]+/g, '_')}.json`);
  const latest = path.join(root, `latest-${safeIdentity}.json`);
  writeJsonAtomic(historical, safe);
  writeJsonAtomic(latest, safe);
  pruneReceipts(root, MAX_RECEIPTS);
  return { receipt: safe, historical, latest };
}

function listRuntimeReceipts({ limit = 100, env = process.env } = {}) {
  const root = receiptRoot(env);
  if (!fs.existsSync(root)) return [];
  const files = fs.readdirSync(root)
    .filter((name) => name.endsWith('.json') && !name.startsWith('latest-'))
    .sort()
    .reverse()
    .slice(0, Math.max(1, Math.min(Number(limit) || 100, MAX_RECEIPTS)));
  const receipts = [];
  for (const name of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
      if (parsed?.schema === RECEIPT_SCHEMA) receipts.push(parsed);
    } catch { /* ignore malformed historical receipt rather than killing the ledger */ }
  }
  return receipts;
}

function pruneReceipts(root, keep = MAX_RECEIPTS) {
  if (!fs.existsSync(root)) return 0;
  const historical = fs.readdirSync(root)
    .filter((name) => name.endsWith('.json') && !name.startsWith('latest-'))
    .sort()
    .reverse();
  const stale = historical.slice(Math.max(1, keep));
  for (const name of stale) {
    try { fs.unlinkSync(path.join(root, name)); } catch {}
  }
  return stale.length;
}

module.exports = {
  RECEIPT_SCHEMA,
  MAX_RECEIPTS,
  receiptRoot,
  sanitizeRuntimeReceipt,
  assertNoSecretFields,
  persistRuntimeReceipt,
  listRuntimeReceipts,
  pruneReceipts,
};
