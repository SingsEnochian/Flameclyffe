# Wayglass cloud host package

Purpose: host the existing reviewed MCP gateway behind public TLS, while keeping native routing, owner grants and durable custody in explicit host adapters. This package adds no authorization server, worker, deployment or participant identity.

Run with Node 24:

```sh
node scripts/wayglass-cloud-host.cjs
```

Host variables:

| Name | Required meaning |
| --- | --- |
| `WAYGLASS_CLOUD_ADAPTER` | Absolute path to reviewed, host-owned CommonJS deployment adapter. Never caller-controlled. |
| `WAYGLASS_SOURCE_SHA` | Full 40-character SHA of the source used for this host build. |
| `PORT` | Listening port; defaults to 7860. |
| `WAYGLASS_BIND_HOST` | Defaults to loopback; set `0.0.0.0` only in the reviewed container ingress. |

The adapter exports `createCloudAdapters({sourceSha})` returning `gatewayHandler`, `isStopped`, optional `checkReadiness`, and optional asynchronous `close`. Gateway construction belongs to the integrated MCP module. A Node server factory can be delegated without opening a second public port:

```js
const gateway = createWayglassMcpServer(trustedGatewayOptions);
const gatewayHandler = (request, response) => gateway.emit('request', request, response);
```

`isStopped({signal})` must read current owner/Feather state. Only explicit `false` permits dispatch; missing, unknown, thrown or timed-out state holds the crossing. The receiving router and receipt worker retain their own atomic stop and current-grant gates. Releasing Feather does not replay work.

`checkReadiness({sourceSha,signal})` runs trusted integration probes and returns `wayglass.cloud-readiness/v1` evidence. Required checks: `oauth_pkce`, `bearer_verification`, `native_router`, `durable_receipts`, `grant_revocation`. Each has `ok:true` and a credential-free opaque `evidence_id`. Evidence must carry `source_sha` matching this build and `observed_at` within 60 seconds. Adapter callbacks alone never imply readiness. Probe results must refer to observed integration evidence, not configuration presence. AbortSignal permits cancellation; the host bounds awaited probes regardless of adapter cooperation.

`GET /healthz` reports process liveness and source SHA. `GET /readyz` reports only ready true/false, returning 503 until all checks pass and Feather is explicitly released. Errors project no private exception text or raw probe payload. Readiness is an ingress gate report; it does not independently certify a live ChatGPT session or participant reply.

Deployment ownership: public TLS/ingress belongs to a verified existing Cloudflare or Hugging Face target; durable receipt storage belongs to the owner-controlled native/Supabase adapter. Ordinary ephemeral container disk is not a durable cloud receipt store. Keep storage outside the repository/web root and never copy private state into image layers. The existing local server's loopback binding is intentional and is not changed here.

First verification after host integration: anonymous `/mcp` challenge, exact protected-resource metadata, OAuth authorization-code S256 PKCE, authorized owner tool call, distinct delegate attribution, revoked consent/grant denial, Feather stop, restored host with durable receipt, and actual ChatGPT MCP invocation. Record source SHA, external TLS URL, receipt IDs and tested participant/worker boundaries without token values. No deployment command is provided until target identity, ingress, persistence and authorization issuer are verified.
