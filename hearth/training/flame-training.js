import { createHash } from 'node:crypto';

export const FLAME_CORPUS_SCHEMA = 'hearthgate.flame-corpus/v1';
export const FLAME_TRAINING_RECEIPT_SCHEMA = 'hearthgate.flame-training-receipt/v1';

const SHAREABLE = new Set(['shareable', 'public']);

export function admitFlameRecord(record, profile) {
  const reasons = [];
  if (!record?.id) reasons.push('missing-id');
  if (!String(record?.content || '').trim()) reasons.push('missing-content');
  if (!SHAREABLE.has(record?.privacy)) reasons.push('not-shareable');
  if (record?.consent?.training !== true) reasons.push('training-consent-absent');
  if (!record?.provenance?.sourceId) reasons.push('missing-provenance');
  if (!Array.isArray(record?.flameIds) || !record.flameIds.includes(profile.flameId)) reasons.push('wrong-flame');
  if (record?.revokedAt) reasons.push('consent-revoked');
  return Object.freeze({ admitted: reasons.length === 0, reasons });
}

function splitFor(id, evaluationPercent) {
  const bucket = Number.parseInt(createHash('sha256').update(String(id)).digest('hex').slice(0, 8), 16) % 100;
  return bucket < evaluationPercent ? 'evaluation' : 'training';
}

export function buildFlameCorpus({ profile, records, createdAt = new Date().toISOString() }) {
  if (!profile?.flameId || !profile?.version) throw new Error('A versioned Flame training profile is required.');
  const accepted = [];
  const rejected = [];
  for (const record of records || []) {
    const admission = admitFlameRecord(record, profile);
    if (!admission.admitted) {
      rejected.push({ id: record?.id || null, reasons: admission.reasons });
      continue;
    }
    accepted.push({
      id: record.id,
      split: splitFor(record.id, profile.evaluationPercent ?? 10),
      messages: [
        { role: 'system', content: profile.systemAnchor },
        { role: 'user', content: String(record.prompt || record.provenance.title || 'Respond in your own voice.') },
        { role: 'assistant', content: String(record.content) },
      ],
      provenance: structuredClone(record.provenance),
      consent: { training: true, recordedAt: record.consent.recordedAt || null },
      tags: [...new Set((record.tags || []).map(String))],
    });
  }
  const digest = createHash('sha256').update(JSON.stringify(accepted)).digest('hex');
  return Object.freeze({
    schema: FLAME_CORPUS_SCHEMA,
    flameId: profile.flameId,
    profileVersion: profile.version,
    baseModel: profile.baseModel,
    createdAt,
    records: accepted,
    rejected,
    counts: {
      admitted: accepted.length,
      rejected: rejected.length,
      training: accepted.filter((item) => item.split === 'training').length,
      evaluation: accepted.filter((item) => item.split === 'evaluation').length,
    },
    requirements: {
      minimumTrainingRecords: Number(profile.minimumTrainingRecords ?? 40),
      minimumEvaluationRecords: Number(profile.minimumEvaluationRecords ?? 8),
    },
    digest: `sha256:${digest}`,
    authority: { weightsChanged: false, humanReviewRequired: true, revocationMustRebuild: true },
  });
}

export function createTrainingReadinessReceipt(corpus, checks = {}) {
  const required = ['personaIntegrityReviewed', 'provenanceReviewed', 'consentReviewed', 'evaluationReviewed'];
  const passed = Object.fromEntries(required.map((key) => [key, checks[key] === true]));
  return Object.freeze({
    schema: FLAME_TRAINING_RECEIPT_SCHEMA,
    flameId: corpus.flameId,
    profileVersion: corpus.profileVersion,
    corpusDigest: corpus.digest,
    counts: corpus.counts,
    checks: passed,
    ready: corpus.counts.training >= (corpus.requirements?.minimumTrainingRecords ?? 1)
      && corpus.counts.evaluation >= (corpus.requirements?.minimumEvaluationRecords ?? 1)
      && Object.values(passed).every(Boolean),
    authority: { startsTraining: false, deploysAdapter: false, humanApprovalRequired: true },
  });
}
