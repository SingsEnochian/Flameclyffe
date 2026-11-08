export interface HttpsIntrospectionOptions {
  /** Operator-selected trust endpoint; HTTPS, no query/fragment/userinfo. */
  endpoint: string;
  /** Confidential resource-server client; never the user's bearer token. */
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
  /** 1–30000 ms, default 5000. */
  timeoutMs?: number;
  /** 1–65536 bytes, default 65536. */
  maxResponseBytes?: number;
}
/** Returns null for input, transport or response failures. No active-decision cache. */
export function createHttpsTokenIntrospector(options: HttpsIntrospectionOptions):
  (token: string) => Promise<Record<string, unknown> | null>;
