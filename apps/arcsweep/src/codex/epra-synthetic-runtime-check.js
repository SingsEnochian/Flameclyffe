import { createEpraCanonIngestPacket, EPRA_UNIVERSE_ID } from './epra-canon-ingest-manifest.js';
import {
  createEpraCanonEvidenceBatch,
  createEpraPublicIngestReceipt,
  validateEpraPublicIngestReceipt,
} from './epra-canon-intelligence-bridge.js';

export const EPRA_SYNTHETIC_CHECK_SCHEMA = 'hearthweave.epra-synthetic-runtime-check/v0.1';

// Explicit, in-memory preview check. No external read, persistence, or canon write.
export function runEpraSyntheticRuntimeCheck() {
  const privateBody = 'SYNTHETIC_PRIVATE_BODY_DO_NOT_PUBLISH';
  const privateLocator = 'SYNTHETIC_PRIVATE_LOCATOR_DO_NOT_PUBLISH';
  const privateValue = 'SYNTHETIC_EXTRACTED_VALUE_DO_NOT_PUBLISH';
  const packet = createEpraCanonIngestPacket({
    sourceKey: 'epra-current-ekhara',
    content: privateBody,
    sourceRevision: 'synthetic-preview-v1',
    retrievedAt: '2026-09-28T12:00:00.000Z',
    provenance: { privateLocator },
  });
  const evidence = createEpraCanonEvidenceBatch({
    packet,
    facts: [{
      factId: 'synthetic-runtime-fact',
      entityHint: 'Synthetic Ekhara',
      fieldHint: 'synthetic_trait',
      value: privateValue,
      extractor: 'synthetic-preview-check',
    }],
  });
  const receipt = createEpraPublicIngestReceipt({ packet, evidence });
  const validation = validateEpraPublicIngestReceipt(receipt);
  const serialized = JSON.stringify(receipt);
  if (!validation.valid
    || receipt.universeId !== EPRA_UNIVERSE_ID
    || receipt.factCount !== 1
    || receipt.authority.mayPromoteToCanon !== false
    || receipt.authority.stewardReviewRequired !== true
    || [privateBody, privateLocator, privateValue].some((secret) => serialized.includes(secret))) {
    throw new Error('EPRA_SYNTHETIC_CHECK: runtime boundary failed');
  }
  return Object.freeze({
    schema: EPRA_SYNTHETIC_CHECK_SCHEMA,
    status: 'passed',
    mode: 'synthetic-in-memory',
    receipt,
  });
}
