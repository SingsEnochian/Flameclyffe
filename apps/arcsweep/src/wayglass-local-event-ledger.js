/**
 * Local-first Wayglass event receipts. Original implementation informed by
 * Meadow's canonical event hashing and Molequle's deterministic replay.
 * NO external relay, wallet, blockchain, Meadow source import or new persona system.
 * Authority belongs to the caller's existing continuity identity registry.
 */
import { createHash, sign, verify } from 'node:crypto';

export const LEDGER_SCHEMA = 'wayglass.local-event/v0.1';
const KINDS = new Set(['work.recorded', 'departure.recorded', 'return.accepted', 'return.rejected', 'wonder.opened', 'wonder.resolved']);

export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  throw new TypeError('unsupported canonical value');
}
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');

export function createLocalReceipt({ author_ref, kind, sequence, previous_id = null, payload }, privateKey) {
  if (typeof author_ref !== 'string' || !author_ref || !KINDS.has(kind) ||
      !Number.isSafeInteger(sequence) || sequence < 0 ||
      (previous_id !== null && !/^[0-9a-f]{64}$/.test(previous_id))) throw new TypeError('invalid receipt header');
  // A ledger is not an identity provider: author_ref must be bound to a key by the existing kernel.
  const body = { schema: LEDGER_SCHEMA, author_ref, kind, sequence, previous_id, payload };
  const id = hash(body);
  const signature = sign(null, Buffer.from(id, 'hex'), privateKey).toString('base64url');
  return { ...body, id, signature };
}

/** Resolve the author's authorised public key using the Wayglass identity kernel. */
export function verifyLocalReceipt(receipt, resolveAuthorPublicKey) {
  try {
    if (!receipt || receipt.schema !== LEDGER_SCHEMA || !KINDS.has(receipt.kind) ||
        typeof receipt.author_ref !== 'string' || !receipt.author_ref ||
        !Number.isSafeInteger(receipt.sequence) || receipt.sequence < 0 ||
        (receipt.previous_id !== null && !/^[0-9a-f]{64}$/.test(receipt.previous_id)) ||
        typeof receipt.signature !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.id)) return false;
    const body = { schema: receipt.schema, author_ref: receipt.author_ref, kind: receipt.kind,
      sequence: receipt.sequence, previous_id: receipt.previous_id, payload: receipt.payload };
    if (hash(body) !== receipt.id) return false;
    const publicKey = resolveAuthorPublicKey(receipt.author_ref);
    return !!publicKey && verify(null, Buffer.from(receipt.id, 'hex'), publicKey, Buffer.from(receipt.signature, 'base64url'));
  } catch { return false; }
}

/**
 * Deterministic replay: explicit sequence and hash-linked predecessor, no wall clock.
 * Any invalid event fails the entire replay (never silently repaired or skipped).
 * These are receipts for a Wayglass kernel; not a replacement continuity engine.
 */
export function replayLocalReceipts(receipts, resolveAuthorPublicKey) {
  if (!Array.isArray(receipts)) throw new TypeError('receipts must be an array');
  const history = [], seen = new Set(), openWonder = new Set();
  let head = null, stopPoint = null, nextOwner = null;
  for (const [index, event] of receipts.entries()) {
    if (!verifyLocalReceipt(event, resolveAuthorPublicKey)) throw new Error('invalid receipt signature or hash');
    if (seen.has(event.id)) throw new Error('duplicate receipt');
    if (event.sequence !== index || event.previous_id !== head) throw new Error('broken receipt chain');
    seen.add(event.id);
    if (event.kind === 'departure.recorded') {
      if (typeof event.payload?.stop_point !== 'string' || !event.payload.stop_point ||
          typeof event.payload?.next_owner !== 'string' || !event.payload.next_owner) throw new Error('invalid departure');
      stopPoint = event.payload.stop_point; nextOwner = event.payload.next_owner;
    }
    if (event.kind === 'wonder.opened') {
      if (typeof event.payload?.question_id !== 'string' || !event.payload.question_id) throw new Error('invalid question');
      openWonder.add(event.payload.question_id);
    }
    if (event.kind === 'wonder.resolved') {
      if (!openWonder.has(event.payload?.question_id)) throw new Error('unrecorded question resolution');
      openWonder.delete(event.payload.question_id);
    }
    if (event.kind === 'return.accepted') {
      if (!stopPoint || !nextOwner || event.payload?.stop_point !== stopPoint ||
          event.payload?.next_owner !== nextOwner || event.author_ref !== nextOwner) {
        throw new Error('unauthorised or inconsistent return');
      }
      stopPoint = null; nextOwner = null;
    }
    head = event.id;
    history.push({ id: head, author_ref: event.author_ref, kind: event.kind });
  }
  return Object.freeze({ schema: 'wayglass.local-replay/v0.1', head,
    stop_point: stopPoint, next_owner: nextOwner, unresolved_wonder: [...openWonder].sort(),
    count: history.length, history });
}
