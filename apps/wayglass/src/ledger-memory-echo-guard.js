/** Pure, non-authoritative Memory Echo guard for small Ledger audit packets.
 * Shared source refs, declared origin refs and exact canonical text may identify
 * duplicate evidence. The resulting groups are NOT independent-witness proof.
 * Never mutates receipt statuses, source stores, permissions or model context.
 */
const WORDS = /[\p{L}\p{N}]+/gu;
const canonicalText = text => (text.toLowerCase().match(WORDS) || []).join(' ');

export function groupMemoryEcho(records) {
  if (!Array.isArray(records) || records.length < 2 || records.length > 32) {
    throw new RangeError('Memory Echo guard requires 2–32 validated records');
  }
  const parent = records.map((_, i) => i);
  const root = i => { while (parent[i] !== i) i = parent[i]; return i; };
  const join = (a, b) => { const x = root(a), y = root(b); if (x !== y) parent[y] = x; };
  const anchors = records.map(r => new Set([r.source_ref, r.origin_ref].filter(Boolean)));
  const words = records.map(r => canonicalText(r.text));
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      if (records[i].subject_id !== records[j].subject_id) continue;
      if (words[i] === words[j] || [...anchors[i]].some(anchor => anchors[j].has(anchor))) {
        join(i, j);
      }
    }
  }
  const families = new Map();
  records.forEach((record, index) => {
    const key = root(index);
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(record);
  });
  const byRef = new Map();
  const groups = [...families.values()].map(members => {
    const retired = members.filter(m => m.status !== 'active');
    const family = Object.freeze({
      family_ref: members[0].ref,
      subject_id: members[0].subject_id,
      member_refs: members.map(m => m.ref),
      retired_refs: retired.map(m => m.ref),
      active_refs: members.filter(m => m.status === 'active').map(m => m.ref),
      retired_overlap: retired.length > 0,
      origin_independence_verified: false,
    });
    for (const member of members) byRef.set(member.ref, family);
    return family;
  });
  return Object.freeze({ groups, byRef });
}
