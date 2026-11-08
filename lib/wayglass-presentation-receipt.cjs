'use strict';
const { createHash } = require('node:crypto');
const SCHEMA = 'wayglass.presentation-receipt/v1';
const MAX_BYTES = 64 * 1024;
const PHASES = ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'];
const digest = value => createHash('sha256').update(value).digest('hex');
const safeString = (value, limit = 160) => typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\u0000-\u001f]/.test(value);
function validResource(resource) {
  if (!safeString(resource, 2048)) return false;
  try {
    const url = new URL(resource);
    return url.href === resource && !url.username && !url.password && !url.search && !url.hash &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)));
  } catch { return false; }
}
function snapshot(value) { return JSON.parse(JSON.stringify(value)); }
function assertPayload(payload) {
  const phases = payload && (payload.phases || payload.eightfold);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !safeString(payload.presentation_id) || !safeString(payload.source_ref, 1024) || !safeString(payload.intent, 1024) ||
      !Array.isArray(phases) || phases.length !== 8 || phases.some((p,i) => !p || p.index !== i+1 || (p.name || p.phase) !== PHASES[i]) ||
      Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_BYTES) throw new Error('Invalid presentation');
}
const receiptKey = ({ resource, principal_id, grant_id, presentation_id }) =>
  digest(JSON.stringify([SCHEMA,resource,principal_id,grant_id,presentation_id]));
function assertReceipt(record, key) {
  if (!record || record.schema !== SCHEMA || record.math_spine !== 'hearthgate.math-spine/v1.8' || !/^[a-f0-9]{64}$/.test(key || '') || record.key !== key ||
      !validResource(record.resource) || !safeString(record.receipt_id) || !safeString(record.principal_id) ||
      !safeString(record.grant_id) || !safeString(record.created_at) || record.status !== 'queued_for_review' ||
      record.wayglass_reply !== null || receiptKey(record) !== key) throw new Error('Receipt integrity failure');
  assertPayload(record.payload);
  if (record.payload.presentation_id !== record.presentation_id || record.payload.source_ref !== record.source_ref ||
      digest(JSON.stringify(record.payload)) !== record.digest) throw new Error('Receipt integrity failure');
  return record;
}
module.exports = { SCHEMA, MAX_BYTES, digest, safeString, validResource, snapshot, assertPayload, receiptKey, assertReceipt };
