export function createMemorySyncStore(seed = []) {
  const records = new Map();
  const pending = new Set();
  let cursor = null;

  for (const envelope of seed) putSync(envelope, { pending: false });

  function key(stream, entityId, envelopeId = '') {
    return `${stream}:${entityId}:${envelopeId}`;
  }

  function putSync(envelope, options = {}) {
    const append = options.append || ['receipt', 'handoff', 'work-order', 'conflict'].includes(envelope.stream);
    const recordKey = key(envelope.stream, envelope.entityId, append ? envelope.envelopeId : 'head');
    records.set(recordKey, envelope);
    if (options.pending) pending.add(envelope.envelopeId);
    return envelope;
  }

  return Object.freeze({
    async put(envelope, options) { return putSync(envelope, options); },
    async get(stream, entityId) {
      const head = records.get(key(stream, entityId, 'head'));
      if (head) return head;
      return [...records.values()]
        .filter(item => item.stream === stream && item.entityId === entityId)
        .sort((a, b) => b.revision - a.revision || Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] || null;
    },
    async list(stream) { return [...records.values()].filter(item => !stream || item.stream === stream); },
    async outbox() { return [...records.values()].filter(item => pending.has(item.envelopeId)); },
    async markPushed(ids) { for (const id of ids) pending.delete(id); },
    async getCursor() { return cursor; },
    async setCursor(value) { cursor = value; },
  });
}
