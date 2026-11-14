// Evidence comparison for named Wayglass/ArcSweep timelines.
// Presentation only: a source-backed observation is not a causal or predictive proof.
export const TIMELINE_EVIDENCE_SCHEMA = 'wayglass.timeline-evidence-comparison/v0.1';

const text = value => typeof value === 'string' ? value.trim() : '';
const array = value => Array.isArray(value) ? value : [];
const CLASSES = new Set(['observed', 'reported', 'projected', 'simulated']);
const RELATIONS = new Set(['supports', 'challenges', 'context']);

// Each source receipt can carry explicitly reviewed timeline_evidence entries:
// { timeline_id, relation, evidence_class, source_refs? }. Neither timeline
// membership nor a shared timestamp implies an observation or a correlation.
export function compareTimelineEvidence(receipts = [], timelineIds = []) {
  const ids = [...new Set(array(timelineIds).map(text).filter(Boolean))];
  const rows = new Map(ids.map(id => [id, []]));
  const seenReceipts = new Set();
  const seenEntries = new Set();
  const exclusions = { duplicate_receipts: 0, unclassified: 0, invalid: 0 };
  for (const receipt of array(receipts)) {
    const receiptId = text(receipt?.receipt_id);
    if (!receiptId) { exclusions.invalid++; continue; }
    if (seenReceipts.has(receiptId)) { exclusions.duplicate_receipts++; continue; }
    seenReceipts.add(receiptId);
    for (const evidence of array(receipt?.timeline_evidence)) {
      const id = text(evidence?.timeline_id);
      if (!rows.has(id)) continue;
      const relation = text(evidence?.relation);
      const kind = text(evidence?.evidence_class);
      const sourceRefs = [...new Set(array(evidence?.source_refs).length ?
        array(evidence.source_refs).map(text).filter(Boolean) :
        array(receipt.source_refs).map(text).filter(Boolean))];
      if (!RELATIONS.has(relation) || !CLASSES.has(kind) || !sourceRefs.length) {
        exclusions.unclassified++;
        continue;
      }
      const key = [receiptId, id, relation, kind].join('|');
      if (seenEntries.has(key)) continue;
      seenEntries.add(key);
      rows.get(id).push(Object.freeze({
        receipt_id: receiptId, timeline_id: id, relation,
        evidence_class: kind, source_refs: Object.freeze(sourceRefs),
        time: text(receipt?.when?.occurred_at) || text(receipt?.created_at) || null,
      }));
    }
  }
  const timelines = ids.map(id => {
    const evidence = rows.get(id);
    const observed = evidence.filter(entry => entry.evidence_class === 'observed');
    const support = observed.filter(entry => entry.relation === 'supports');
    const challenge = observed.filter(entry => entry.relation === 'challenges');
    const sources = [...new Set(evidence.flatMap(entry => entry.source_refs))];
    // No numerical winner or probability: cited sources may have common origins.
    const assessment = support.length && challenge.length ? 'contested' :
      support.length ? 'observational-support' :
      challenge.length ? 'observational-challenge' :
      evidence.length ? 'context-only' : 'unassessed';
    return Object.freeze({
      timeline_id: id, assessment,
      observed_support_receipts: support.length,
      observed_challenge_receipts: challenge.length,
      distinct_source_refs: sources.length,
      source_independence_verified: false,
      evidence: Object.freeze(evidence),
    });
  });
  return Object.freeze({
    schema: TIMELINE_EVIDENCE_SCHEMA,
    verdict: 'undetermined',
    winner: null,
    timelines: Object.freeze(timelines),
    exclusions: Object.freeze(exclusions),
    limitations: Object.freeze([
      'Timeline classification must be explicit and source-referenced',
      'Shared sources do not establish independence or causation',
      'Simulation and projection never count as observations',
      'No automatic timeline selection, identity, canon or production mutation',
    ]),
  });
}
