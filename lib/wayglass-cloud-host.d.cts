import type { IncomingMessage, ServerResponse, Server } from 'node:http';
export interface CloudReadinessEvidence {
  schema: 'wayglass.cloud-readiness/v1';
  source_sha: string;
  observed_at: string;
  checks: Record<'oauth_pkce' | 'bearer_verification' | 'native_router' | 'durable_receipts' | 'grant_revocation', {
    ok: boolean; evidence_id: string;
  }>;
}
export interface WayglassCloudAdapters {
  gatewayHandler(request: IncomingMessage, response: ServerResponse): Promise<void> | void;
  isStopped(request: { signal: AbortSignal }): Promise<boolean> | boolean;
  checkReadiness?(request: { sourceSha: string; signal: AbortSignal }): Promise<CloudReadinessEvidence>;
}
export function createWayglassCloudHost(options: WayglassCloudAdapters & {
  sourceSha: string; readinessTimeoutMs?: number; maxEvidenceAgeMs?: number; now?: () => number;
}): Server;
export const REQUIRED_CHECKS: readonly string[];
