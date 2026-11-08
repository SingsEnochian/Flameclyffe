export interface McpNativeContext {
  principalId: string;
  resource: string;
  consentRef: string;
  scopes: string[];
}
export interface NativeGrantRequest {
  subject: string; resource: string; consentRef: string; scopes: string[];
  action: 'routes' | 'respond'; routeId: string | null;
}
export interface NativeGrant {
  active: true; ownerAuthorized: true; consentActive: true;
  revoked?: false; consentRevoked?: false;
  subject: string; resource: string; consentRef: string; grantId: string;
  scopes: string[]; routeIds: string[];
  // Host-authorized native context; caller turn arguments cannot supply these.
  nativeContext?: { world_id?: string; participant_id?: string; session_id?: string;
    surface_id?: string; character_id?: string; waygate_manifest?: unknown;
    continuation_packet?: unknown; stop_receipt?: unknown; embodiment?: unknown;
    checkpoint_storage_id?: string; checkpoint_world_id?: string;
    checkpoint_participant_id?: string; emergence_question_id?: string };
  externalProviderConsent?: boolean;
}
export interface NativeTurn {
  route_id: string; input: string; history?: Array<{role: 'user' | 'assistant'; content: string}>;
  interaction?: Record<string, unknown>; max_output_tokens?: number; think?: boolean;
}
export function createWayglassMcpNativeBridge(options: {
  nativeOrigin: string; resource: string;
  authorize(request: NativeGrantRequest, options?: {signal: AbortSignal}): Promise<NativeGrant | null>;
  credentialFor(request: NativeGrantRequest & {grantId: string}, options?: {signal: AbortSignal}): Promise<{authorization: string}>;
  featherStopped(request: NativeGrantRequest, options?: {signal: AbortSignal}): Promise<boolean>;
  fetchImpl?: typeof fetch;
  /** Default5000, range1–30000ms per trusted adapter wait. */
  adapterTimeoutMs?: number;
}): {
  listRoutes(context: McpNativeContext): Promise<Array<Record<string, unknown>>>;
  respond(payload: NativeTurn, context: McpNativeContext): Promise<Record<string, unknown>>;
};
