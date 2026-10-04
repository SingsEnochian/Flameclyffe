export const UNIVERSITY_REVOCATION_SCHEMA = 'hearthweave.ai-university-revocation/v0.1';

export function createAuthorityGraph(envelopes = []) {
  const nodes = new Map(envelopes.map((item) => [item.authorityId, { ...item }]));
  return {
    get(authorityId) { return nodes.get(authorityId) || null; },
    descendants(authorityId) {
      const found = [];
      const queue = [authorityId];
      while (queue.length) {
        const parent = queue.shift();
        for (const node of nodes.values()) {
          if (node.parentAuthorityId === parent && !found.includes(node.authorityId)) {
            found.push(node.authorityId);
            queue.push(node.authorityId);
          }
        }
      }
      return found;
    },
    revoke(authorityId) {
      const affected = [authorityId, ...this.descendants(authorityId)];
      for (const id of affected) {
        const node = nodes.get(id);
        if (node) nodes.set(id, { ...node, revoked: true, epoch: Number(node.epoch || 0) + 1 });
      }
      return Object.freeze({ schema: UNIVERSITY_REVOCATION_SCHEMA, authorityId, affected: Object.freeze(affected) });
    },
    mayExecute({ authorityId, queuedEpoch }) {
      const current = nodes.get(authorityId);
      return Boolean(current && !current.revoked && Number(current.epoch) === Number(queuedEpoch));
    },
  };
}
