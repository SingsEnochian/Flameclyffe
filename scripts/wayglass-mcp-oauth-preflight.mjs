// Read-only Wayglass MCP OAuth discovery probe. No credentials, tools, models or state writes.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WAYGLASS_MCP_URL =
  "https://rufrmjyusalnifpegllj.supabase.co/functions/v1/wayglass-chat-mcp";

function requireSameProjectHttps(value, origin, label) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password)
    throw new Error(label + " must be HTTPS on the Wayglass project origin");
  return url.href;
}

async function readJson(fetchImpl, url, timeoutMs) {
  const res = await fetchImpl(url, {
    method: "GET", headers: { accept: "application/json" },
    redirect: "error", signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error("OAuth discovery request failed with HTTP " + res.status);
  const data = await res.json();
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("OAuth discovery did not return a JSON object");
  return data;
}

export async function probeWayglassMcpOAuth({
  endpoint = WAYGLASS_MCP_URL, fetchImpl = fetch, timeoutMs = 10000,
} = {}) {
  const resource = new URL(endpoint);
  if (resource.protocol !== "https:" ||
      resource.hostname !== "rufrmjyusalnifpegllj.supabase.co" ||
      resource.pathname !== "/functions/v1/wayglass-chat-mcp" ||
      resource.search || resource.hash || resource.username || resource.password)
    throw new Error("Only the exact public Wayglass MCP resource is permitted");
  const origin = resource.origin, resourceUrl = resource.href;
  const protectedResourceUrl = resourceUrl + "/oauth-protected-resource";
  const issuer = origin + "/auth/v1";
  const issuerMetadataUrl = origin + "/.well-known/oauth-authorization-server/auth/v1";

  const response = await fetchImpl(resourceUrl, {
    method: "GET", headers: { accept: "application/json" },
    redirect: "error", signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status !== 401)
    throw new Error("Unauthenticated MCP access did not return 401 (got " + response.status + ")");
  const challenge = response.headers.get("www-authenticate") || "";
  const metadataMatch = /(?:^|\s|,)Bearer\s+resource_metadata="([^"]+)"/i.exec(challenge);
  if (!metadataMatch || metadataMatch[1] !== protectedResourceUrl)
    throw new Error("MCP 401 is missing its exact OAuth protected-resource challenge");

  const protectedResource = await readJson(fetchImpl, protectedResourceUrl, timeoutMs);
  if (protectedResource.resource !== resourceUrl ||
      !Array.isArray(protectedResource.authorization_servers) ||
      !protectedResource.authorization_servers.includes(issuer))
    throw new Error("Protected-resource metadata does not bind Wayglass MCP to its owner OAuth issuer");

  const discovery = await readJson(fetchImpl, issuerMetadataUrl, timeoutMs);
  if (discovery.issuer !== issuer)
    throw new Error("OAuth authorization server issuer mismatch");
  requireSameProjectHttps(discovery.authorization_endpoint, origin, "OAuth authorization endpoint");
  requireSameProjectHttps(discovery.token_endpoint, origin, "OAuth token endpoint");
  if (discovery.registration_endpoint)
    requireSameProjectHttps(discovery.registration_endpoint, origin, "OAuth dynamic-registration endpoint");

  return {
    schema: "wayglass.mcp-oauth-discovery/v1",
    resource: resourceUrl, issuer,
    unauthorized_http_status: response.status,
    challenge_verified: true, resource_metadata_verified: true,
    issuer_metadata_verified: true,
    dynamic_client_registration_advertised: Boolean(discovery.registration_endpoint),
    owner_oauth_consent: "not-tested",
    authenticated_tool_invocation: "not-tested",
    model_reply: "not-tested",
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  probeWayglassMcpOAuth()
    .then((receipt) => console.log(JSON.stringify(receipt, null, 2)))
    .catch((error) => {
      console.error("Wayglass MCP OAuth public preflight failed:", error.message);
      process.exitCode = 1;
    });
}
