/**
 * Proposed contract only. No Cloudflare entrypoint or runtime implementation.
 * The verified context is created by the host auth adapter, never from tool args.
 */
export type WayglassRouteCapability = "wayglass.routes.read";

export interface VerifiedOwnerContext {
  readonly subject: string;
  readonly issuer: string;
  readonly ownerAuthorized: true;
  readonly consentRef: string;
  readonly scopes: readonly WayglassRouteCapability[];
  readonly requestId: string;
}

export interface NativeRouteRecord {
  readonly route_id: string;
  readonly label: string;
  readonly provider: string;
  readonly model?: string;
  readonly configured: boolean;
  readonly capabilities: readonly string[];
}

export interface RouteCatalogueView {
  readonly schema: "wayglass.route-catalogue-view/v0.1";
  readonly routes: readonly NativeRouteRecord[];
}

export interface NativeWayglassRouteReader {
  /**
   * The implementation must authenticate/revalidate at the host boundary,
   * apply a fixed route allowlist, and return only the approved projection.
   * It must never receive a bearer token through this contract.
   */
  listRoutes(context: VerifiedOwnerContext): Promise<readonly unknown[]>;
}

export interface CodeModeToolExecutionContext {
  readonly executionId: string;
}

/** No arguments are accepted; additional caller properties must be rejected. */
export type ListWayglassRoutesInput = Readonly<Record<string, never>>;

export interface ListWayglassRoutesTool {
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: Readonly<Record<string, never>>;
  };
  readonly outputSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["schema", "routes"];
  };
  readonly execute: (
    input: unknown,
    context?: CodeModeToolExecutionContext,
  ) => Promise<RouteCatalogueView>;
}

/**
 * The eventual CodeModeConnector adapter should expose only this read method.
 * Do not implement until package version, Worker runtime, host route and auth
 * source are verified. Approval/replay/rollback hooks remain intentionally
 * unspecified pending lifecycle tests against the installed Code Mode version.
 */
export interface WayglassCodeModeConnector {
  readonly name: "wayglass";
  readonly tools: {
    readonly list_wayglass_routes: ListWayglassRoutesTool;
  };
}
