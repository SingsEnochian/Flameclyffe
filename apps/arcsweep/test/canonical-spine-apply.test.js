import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonicaliseCanonicalValue } from '../../../lib/canonical-spine-change-core.js';
import {
  buildAppliedCanonicalSpine,
  verifyCanonicalSpineChangePackage,
} from '../../../scripts/apply-canonical-spine-change.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');

function rootGraph() {
  return {
    schema: 'flameclyffe.canonical-spine.v0.1',
    updatedAt: '2026-09-14',
    architecturalRule: 'legibility before capability',
    nodes: [{
      id: 'system:root',
      name: 'Root',
      kind: 'system',
      summary: 'Root system.',
      owner: 'system:root',
      canonStatus: 'canonical',
      implementationStatus: 'implemented',
      visibility: 'shared',
      sourceRefs: ['test'],
      createdAt: '2026-09-14',
      updatedAt: '2026-09-14',
      tags: ['test'],
    }],
    edges: [],
    knowledgeBoundaries: [],
    receipts: [],
  };
}

function packageFor(baseFingerprint) {
  const requestBody = {
    schema: 'arcsweep.canonical-spine-change-request/v1',
    actor: 'agent:caretaker',
    created_at: '2026-09-14T04:10:00-04:00',
    operation: 'add_node',
    target: 'system:new',
    payload: {
      id: 'system:new',
      name: 'New System',
      kind: 'system',
      summary: 'New system.',
      owner: 'system:new',
      canonStatus: 'experimental',
      implementationStatus: 'not-started',
      visibility: 'shared',
      sourceRefs: ['proposal:test'],
      createdAt: '2026-09-14T04:10:00-04:00',
      updatedAt: '2026-09-14T04:10:00-04:00',
      tags: ['proposal'],
    },
    reason: 'Test governed application.',
    base_fingerprint: baseFingerprint,
    status: 'pending-review',
  };
  const requestHash = hash(canonicaliseCanonicalValue(requestBody));
  const request = {
    ...requestBody,
    request_id: `spine-change:${requestHash.slice(0, 24)}`,
    request_fingerprint: `sha256:${requestHash}`,
  };
  const reviewBody = {
    schema: 'arcsweep.canonical-spine-change-review/v1',
    request_id: request.request_id,
    request_fingerprint: request.request_fingerprint,
    reviewer: 'human:steward',
    decision: 'approved',
    notes: 'Reviewed.',
    reviewed_at: '2026-09-14T04:12:00-04:00',
  };
  const reviewHash = hash(canonicaliseCanonicalValue(reviewBody));
  const review = {
    ...reviewBody,
    review_id: `spine-review:${reviewHash.slice(0, 24)}`,
    review_fingerprint: `sha256:${reviewHash}`,
  };
  return { schema: 'flameclyffe.canonical-spine-change-package/v1', request, review };
}

test('apply gate requires an approved package bound to the current root', () => {
  const base = `sha256:${'b'.repeat(64)}`;
  const changePackage = packageFor(base);
  assert.equal(verifyCanonicalSpineChangePackage(changePackage, base), true);
  assert.throws(() => verifyCanonicalSpineChangePackage(changePackage, `sha256:${'c'.repeat(64)}`), /stale base fingerprint/);
});

test('tampering with an approved request invalidates its fingerprint', () => {
  const base = `sha256:${'b'.repeat(64)}`;
  const changePackage = packageFor(base);
  changePackage.request.reason = 'Tampered after approval.';
  assert.throws(() => verifyCanonicalSpineChangePackage(changePackage, base), /request fingerprint mismatch/);
});

test('applying an approved request produces a valid graph and receipt', () => {
  const base = `sha256:${'b'.repeat(64)}`;
  const changePackage = packageFor(base);
  const result = buildAppliedCanonicalSpine(rootGraph(), changePackage, { appliedAt: '2026-09-14T04:15:00-04:00' });
  assert.equal(result.audit.errors.length, 0);
  assert.ok(result.graph.nodes.some((node) => node.id === 'system:new'));
  assert.equal(result.graph.receipts.length, 1);
  assert.equal(result.receipt.provenance.requestId, changePackage.request.request_id);
  assert.equal(result.receipt.provenance.reviewId, changePackage.review.review_id);
});

test('non-approved reviews never pass the apply gate', () => {
  const base = `sha256:${'b'.repeat(64)}`;
  const changePackage = packageFor(base);
  changePackage.review.decision = 'rejected';
  assert.throws(() => verifyCanonicalSpineChangePackage(changePackage, base), /not approved|fingerprint mismatch/);
});
