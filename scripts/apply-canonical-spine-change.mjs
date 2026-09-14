import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCanonicalSpine } from '../lib/canonical-spine-core.js';
import {
  assertApprovedCanonicalSpineChange,
  applyCanonicalSpineChange,
  canonicaliseCanonicalValue,
  copyCanonicalValue,
} from '../lib/canonical-spine-change-core.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_PATH = resolve(REPO_ROOT, 'data/canonical-spine.seed.json');
const PACKAGE_SCHEMA = 'flameclyffe.canonical-spine-change-package/v1';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fingerprintRaw(raw) {
  return `sha256:${sha256(raw)}`;
}

function requestBody(request) {
  const {
    request_id: _requestId,
    request_fingerprint: _requestFingerprint,
    ...body
  } = request;
  return body;
}

function reviewBody(review) {
  const {
    review_id: _reviewId,
    review_fingerprint: _reviewFingerprint,
    ...body
  } = review;
  return body;
}

export function verifyCanonicalSpineChangePackage(changePackage, rootFingerprint) {
  if (changePackage?.schema !== PACKAGE_SCHEMA) throw new Error(`SPINE_APPLY: unsupported package schema ${changePackage?.schema}`);
  const { request, review } = changePackage;
  assertApprovedCanonicalSpineChange(request, review);

  const requestHash = sha256(canonicaliseCanonicalValue(requestBody(request)));
  const requestFingerprint = `sha256:${requestHash}`;
  if (request.request_fingerprint !== requestFingerprint) throw new Error('SPINE_APPLY: request fingerprint mismatch');
  if (request.request_id !== `spine-change:${requestHash.slice(0, 24)}`) throw new Error('SPINE_APPLY: request id mismatch');

  const reviewHash = sha256(canonicaliseCanonicalValue(reviewBody(review)));
  const reviewFingerprint = `sha256:${reviewHash}`;
  if (review.review_fingerprint !== reviewFingerprint) throw new Error('SPINE_APPLY: review fingerprint mismatch');
  if (review.review_id !== `spine-review:${reviewHash.slice(0, 24)}`) throw new Error('SPINE_APPLY: review id mismatch');

  if (request.base_fingerprint !== rootFingerprint) {
    throw new Error(`SPINE_APPLY: stale base fingerprint; request targets ${request.base_fingerprint}, root is ${rootFingerprint}`);
  }
  return true;
}

export function buildAppliedCanonicalSpine(rootGraph, changePackage, { appliedAt = new Date().toISOString() } = {}) {
  const { request, review } = changePackage;
  const preview = applyCanonicalSpineChange(rootGraph, request);
  if (!preview.valid) throw new Error(`SPINE_APPLY: resulting graph invalid: ${preview.audit.errors.join('; ')}`);

  const candidate = copyCanonicalValue(preview.graph);
  const candidateFingerprint = `sha256:${sha256(`${JSON.stringify(candidate, null, 2)}\n`)}`;
  const receipt = {
    id: `receipt:canonical-spine:${request.request_id.split(':').at(-1)}`,
    actor: review.reviewer,
    timestamp: appliedAt,
    operation: request.operation,
    target: request.target,
    reason: request.reason,
    provenance: {
      requestId: request.request_id,
      requestFingerprint: request.request_fingerprint,
      reviewId: review.review_id,
      reviewFingerprint: review.review_fingerprint,
      baseFingerprint: request.base_fingerprint,
      candidateFingerprint,
    },
    validationResult: {
      status: 'valid',
      validator: 'scripts/apply-canonical-spine-change.mjs',
      warningCount: preview.audit.warnings.length,
      collisionCount: preview.audit.collisions.length,
    },
  };

  candidate.receipts = [...(candidate.receipts || []).filter((item) => item.id !== receipt.id), receipt];
  candidate.updatedAt = request.created_at;
  const finalAudit = auditCanonicalSpine(candidate);
  if (finalAudit.errors.length) throw new Error(`SPINE_APPLY: receipted graph invalid: ${finalAudit.errors.join('; ')}`);
  return { graph: candidate, receipt, audit: finalAudit, candidateFingerprint };
}

export async function applyCanonicalSpineChangeFile(packagePath, { write = false } = {}) {
  if (!packagePath) throw new Error('SPINE_APPLY: change package path is required');
  const [rootRaw, packageRaw] = await Promise.all([
    readFile(ROOT_PATH, 'utf8'),
    readFile(resolve(packagePath), 'utf8'),
  ]);
  const rootGraph = JSON.parse(rootRaw);
  const changePackage = JSON.parse(packageRaw);
  const rootAudit = auditCanonicalSpine(rootGraph);
  if (rootAudit.errors.length) throw new Error(`SPINE_APPLY: root graph invalid before change: ${rootAudit.errors.join('; ')}`);
  const rootFingerprint = fingerprintRaw(rootRaw);
  verifyCanonicalSpineChangePackage(changePackage, rootFingerprint);
  const result = buildAppliedCanonicalSpine(rootGraph, changePackage);
  const output = `${JSON.stringify(result.graph, null, 2)}\n`;
  const finalFingerprint = fingerprintRaw(output);
  if (write) await writeFile(ROOT_PATH, output, 'utf8');
  return {
    ...result,
    rootFingerprint,
    finalFingerprint,
    wrote: write,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const packagePath = args.find((arg) => arg !== '--write');
  const result = await applyCanonicalSpineChangeFile(packagePath, { write });
  const mode = write ? 'APPLIED' : 'DRY RUN';
  console.log(`${mode} Canonical Spine change ${result.receipt.provenance.requestId}`);
  console.log(`base: ${result.rootFingerprint}`);
  console.log(`candidate: ${result.candidateFingerprint}`);
  console.log(`final: ${result.finalFingerprint}`);
  console.log(`warnings: ${result.audit.warnings.length} · collisions: ${result.audit.collisions.length}`);
  if (!write) console.log('No file was changed. Re-run with --write after reviewing this output.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
