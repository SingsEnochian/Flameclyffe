import test from "node:test";
import assert from "node:assert/strict";
import { probeWayglassMcpOAuth, WAYGLASS_MCP_URL } from "../../scripts/wayglass-mcp-oauth-preflight.mjs";

const origin = new URL(WAYGLASS_MCP_URL).origin;
const issuer = origin + "/auth/v1";
const protectedUrl = WAYGLASS_MCP_URL + "/oauth-protected-resource";
const discoveryUrl = origin + "/.well-known/oauth-authorization-server/auth/v1";

function mockFetch({
  status = 401, challenge = 'Bearer resource_metadata="' + protectedUrl + '"',
  resource = WAYGLASS_MCP_URL, authorizationServers = [issuer],
  discoveredIssuer = issuer, authUrl = issuer + "/oauth/authorize",
  tokenUrl = issuer + "/oauth/token", registrationUrl = issuer + "/oauth/clients",
} = {}) {
  const urls = [];
  const fetchImpl = async (url, opts = {}) => {
    urls.push(url);
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers.accept, "application/json");
    assert.equal(opts.redirect, "error");
    assert.equal(opts.headers.authorization, undefined);
    if (url === WAYGLASS_MCP_URL)
      return new Response("{}", { status, headers: { "www-authenticate": challenge } });
    if (url === protectedUrl)
      return Response.json({ resource, authorization_servers: authorizationServers });
    if (url === discoveryUrl)
      return Response.json({ issuer: discoveredIssuer, authorization_endpoint: authUrl,
        token_endpoint: tokenUrl, registration_endpoint: registrationUrl });
    throw new Error("Unexpected URL " + url);
  };
  return { fetchImpl, urls };
}

test("unauthenticated OAuth discovery validates challenge, resource and issuer without credentials", async () => {
  const { fetchImpl, urls } = mockFetch();
  const receipt = await probeWayglassMcpOAuth({ fetchImpl });
  assert.deepEqual(urls, [WAYGLASS_MCP_URL, protectedUrl, discoveryUrl]);
  assert.equal(receipt.challenge_verified, true);
  assert.equal(receipt.dynamic_client_registration_advertised, true);
  assert.equal(receipt.authenticated_tool_invocation, "not-tested");
  assert.equal(receipt.model_reply, "not-tested");
});

test("rejects an MCP server which permits unauthenticated access", async () => {
  const { fetchImpl } = mockFetch({ status: 200 });
  await assert.rejects(probeWayglassMcpOAuth({ fetchImpl }), /did not return 401/);
});

test("rejects wrong, absent and off-origin protected-resource challenges", async () => {
  for (const challenge of ["", 'Bearer resource_metadata="https://evil.example/oauth-protected-resource"',
    'Bearer resource_metadata="' + protectedUrl + '/wrong"']) {
    const { fetchImpl } = mockFetch({ challenge });
    await assert.rejects(probeWayglassMcpOAuth({ fetchImpl }), /missing its exact/);
  }
});

test("rejects OAuth issuer substitution and misbound resource metadata", async () => {
  await assert.rejects(probeWayglassMcpOAuth(mockFetch({ resource: origin + "/other" })),
    /does not bind/);
  await assert.rejects(probeWayglassMcpOAuth(mockFetch({ discoveredIssuer: origin + "/other-issuer" })),
    /issuer mismatch/);
  await assert.rejects(probeWayglassMcpOAuth(mockFetch({ authUrl: "https://evil.example/authorize" })),
    /project origin/);
});

test("does not allow alternative endpoints or credentials in URL", async () => {
  await assert.rejects(probeWayglassMcpOAuth({ endpoint: origin + "/functions/v1/other" }),
    /exact public Wayglass/);
  await assert.rejects(probeWayglassMcpOAuth({ endpoint: "https://token@" + new URL(WAYGLASS_MCP_URL).host +
    "/functions/v1/wayglass-chat-mcp" }), /exact public Wayglass/);
});
