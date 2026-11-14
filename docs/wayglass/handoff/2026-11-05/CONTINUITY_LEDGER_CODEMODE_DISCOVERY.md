# Wayglass continuity ledger — Code Mode infrastructure discovery

## Executed follow-through — 2026-11-05

`WAYGLASS-CODEMODE-001` remains selected. Continue the existing discovery PR #538; do not create a competing Worker or a replacement MCP server.

### Results and acceptance evidence

- **Real native router exercised:** `apps/starwell-server/test/wayglass-route-catalogue-boundary.test.js` mounts the canonical router from `wayglass/current` baseline `8bb0e3b5938f694e56028d54a2f092102bcd4b96` at the actual `/api/v1/wayglass` prefix on an ephemeral loopback port. Anonymous, invalid bearer, invalid House cookie, unverified Access assertion, and caller-declared owner/project cases each returned HTTP 200 and identical catalogue data. All five request cases passed their characterization assertions. This is evidence of an unguarded **application** catalogue, not successful owner-authentication enforcement. No live hostname was probed. An externally configured Access policy remains unknown.
- **Harness preparation:** the first run failed because the generated `wayglass-runtime` modules were absent. Copied canonical `lib/wayglass-*.cjs` into the generated runtime directory, as the existing `apps/wayglass/server-stage.cjs` packaging step does, then reran successfully with Express 5.2.1. No production router or authentication behavior changed. The test is included by the existing `wayglass:test:host` glob; normal Wayglass CI builds/stages the runtime before host tests.
- **Contract checks executed:** the proposed connector declaration passes TypeScript 5.9.3 `--noEmit --strict --skipLibCheck false`. Ajv 8.17.1 with ajv-formats 3.0.1 validates the positive receipt fixture under draft 2020-12 and rejects four completed-receipt mutations: null principal, false owner grant, added `access_token`, and a write operation. These checks validate artifacts, not connector execution. The six connector vectors remain design inputs; no Code Mode executor has run.
- **Worker source reconciled:** private proxy `main` is still `6abccc193ead2e75e3adea0c5501b150e4bbb190`. Public proxy `main` is `d130708b97ba87c0e3bb7e36728dff83e3442b7e`; its additional `codespace-special-guacamole-7gqq76r6wvxfxxw6` branch is `622b76efd3e4650557efe9cd6f866bcdea8b5655`. Both public branches declare the same `opencode-cowork-proxy`, `src/index.ts`, and `2025-05-30` Wrangler settings. The additional branch contains local Wrangler state, which was not read. Its release workflow is unchanged and release-only. No deployment linkage to the live account is established.
- **Cloudflare agent setup performed:** fetched the official `https://developers.cloudflare.com/agent-setup/prompt.md`, ran its global Cloudflare skills installation (19 skills), and registered `https://mcp.cloudflare.com/mcp` using Codex MCP setup. `codex mcp list` reports Cloudflare enabled and **Not logged in**. OAuth authorization started, but no authenticated callback occurred. Registration is not account access. The optional beta `cf` CLI was not installed. No account/resource settings changed.
- **Separate PR #535 repair:** local execution at `fe8345c98727b8f4c18dfc8879191f40556e25db` found 36 passing tests and one failure: the async context assertion omitted the newly forwarded `consentRef: null`. Corrected that assertion without changing production code. All **37/37** MCP/co-development tests then passed locally. GitHub repair commit `a7abf486d6231624e4c9b1d554bea0c6136cb949` independently passed MCP Contract **42093263976**, Wayglass Check **42093264131**, Boxfire **42093264299**, and Pages **42093263902**. Keep the earlier `0c843d1` implementation evidence and `f380074` documentation-only evidence separate; neither is relabelled as this repair.

### Complete integration plan and ownership

1. **Infrastructure adapter:** use authenticated Cloudflare MCP read operations to identify the deployed script/version, source linkage, hostname, Access application/policies and Tunnel ingress. Match deployed source to a repository SHA. The sole external blocker is completion of Cloudflare OAuth; do not substitute a guessed Worker/account/route. No request for Rowan to gather source or design the plan is needed.
2. **Owner-authenticated native service:** select the existing owner/House boundary after inspecting its live ingress. The native `/routes` path currently fails owner-only acceptance. Preserve local caller compatibility while designing an explicitly protected connector ingress; credential presence, CORS, project declarations and forwarded headers confer no authority. Map the internal `wayglass.routes.read` capability to verified host authorization explicitly; do not silently mint a new OAuth scope or equate it with `wayglass:constellation`.
3. **Code Mode adapter:** pin the supported package only after the actual runtime/bindings are known. Implement the existing typed `list_wayglass_routes` seam with host-created context, fixed route allowlist, reviewed field projection, and credential-free output. The existing OpenCode proxy remains a separate provider translation service. Do not add arbitrary fetch, caller-chosen upstreams, model calls or writes to this read-only interface.
4. **Receipt owner:** use host-owned persistence with execution/request identity, principal/consent provenance and digests; revalidate authorization on every host call. Reconcile interruption by original execution ID before retrying. The fixture's placeholder hashes are synthetic and are never runtime evidence.
5. **Verification/recovery:** execute all connector vectors, expired/revoked/non-owner and forged-context denials with zero native reads, projection and redaction checks, cancellation/reconciliation, restart recovery, and safe read replay. Verify the complete private staging crossing at an exact commit before deployment. Rollback removes only the new connector binding/version; existing proxy, native routes and historical receipts remain independently owned.

**Return pointer:** use the registered Cloudflare MCP connection once authenticated; obtain the account inventory autonomously, then implement against the verified deployment. Until then the typed adapter, isolated boundary evidence and existing PRs are preserved and reviewable. No live Code Mode invocation, account inventory, merge, or production deployment is claimed.

The dated discovery record below is retained as earlier evidence; this section supersedes its statements that no local runtime test or setup was available.

**Record:** WAYGLASS-CODEMODE-001 / discovery phase  
**Recorded:** 2026-11-05 UTC  
**Status:** Selected; implementation held on verified infrastructure and route-boundary evidence. This is an engineering discovery record, not a runtime stop/return receipt.  
**Canonical source branch inspected:** `wayglass/current` at `8bb0e3b5938f694e56028d54a2f092102bcd4b96` (branch API verified 2026-11-05).  
**Discovery branch:** `wayglass/codemode-infrastructure-discovery-20261105`, based on that exact SHA.  
**Owner boundary:** no merge, production change, account mutation, secret access, or promotion performed.

## Continuity: selected task and why

`WAYGLASS-CODEMODE-001 — Cloudflare Code Mode read-only native-router crossing` remains the selected task. It is the next useful integration after PR #535’s authenticated MCP contract, but a real Cloudflare target, host route, and external protection policy have not been identified. Implementing an entrypoint or deployment config now would invent infrastructure. This record advances the task by documenting the accessible source landscape, route auth boundary, typed connector contract, fixtures, and exact read-only discovery request.

The next execution sequence is:

1. Obtain a redacted read-only inventory of the deployed Cloudflare Worker, route/hostname, Access application/policy, and Tunnel mapping if applicable.
2. Confirm which repository/commit builds that deployed Worker and how its deployment pipeline runs.
3. Decide whether the selected existing route can be called from that host under a verified owner-authenticated path. Route catalogue data is not presumed safe merely because the GET is read-only.
4. Install the versioned Code Mode package in a verified compatible test harness; implement one allowlisted read-only connector against the confirmed existing host capability.
5. Run denial, attribution, output filtering, interruption/reconciliation, and replay tests in isolation; only then request any staging permission that is actually needed.

## Repository and Cloudflare source discovery

Search scope used accessible GitHub repository listing, repository/code searches for Cloudflare and Wrangler references, branch search in Flameclyffe and Runa, and inspection of accessible candidate repositories. Search-index coverage is incomplete for private repositories; absence from indexed search is not proof of absence.

| Repository/source | Verified finding | Evidence/status |
| --- | --- | --- |
| `SingsEnochian/Flameclyffe` | Canonical development branch is `wayglass/current`; HEAD `8bb0e3b5938f694e56028d54a2f092102bcd4b96`. `WAYGLASS_CURRENT.md` names this branch and maps Writing Room, host, route registry and continuity modules. | Source inspected; repository metadata and branch SHA verified. |
| Private `SingsEnochian/opencode-cowork-proxy` | Accessible source candidate, default `main`; sole inspected commit `6abccc193ead2e75e3adea0c5501b150e4bbb190`. Contains `wrangler.toml`, `src/index.ts`, no discovered GitHub Actions deployment workflow. | Source-controlled Worker candidate, not a verified deployed Worker. |
| Public `SingsEnochian/opencode-cowork-proxy-1` | Duplicate source candidate; latest inspected commit `d130708b97ba87c0e3bb7e36728dff83e3442b7e`. Release workflow creates GitHub releases; no Cloudflare deploy command found in that workflow. | Does not establish deployment of the private copy or live Worker. |
| `SingsEnochian/Runa` | Branch/code searches for Cloudflare/Wrangler terms returned no indexed match. | Search result only; private/unindexed coverage may be incomplete. |

The private proxy’s `wrangler.toml` declares `name = "opencode-cowork-proxy"`, `main = "src/index.ts"`, compatibility date `2025-05-30`; it has no declared account ID, route/domain, binding, Durable Object, or vars. Its package scripts include `npx wrangler dev`, `npx wrangler deploy`, and `vitest run`; Wrangler dependency range is `^4.87.0`. These facts establish a source-level candidate and a possible manual CLI path only. No tracked CI deploy path was found in this repository; dashboard management, another repository/workflow, and manual deployment remain possible.

The candidate `src/index.ts` is a Hono translation proxy for OpenCode Go/Zen-compatible upstreams, with `/go`, `/zen`, default routing, and dynamic upstream headers. It does not import Wayglass, Code Mode, Hearthgate, or the Wayglass route registry. Candidate `src/auth.ts` extracts an API key/Bearer value and checks only presence/minimum length; its tests accept arbitrary strings of sufficient length. That is input-format validation, not proof of an owner-authenticated principal. No Cloudflare Access JWT validation or durable Wayglass receipt is present in the inspected source. External Access or network controls may exist but were not observable.

The public duplicate’s deploy button points to the upstream project; its inspected workflow is release-only. Do not infer that either repository is the source of the Worker Rowan saw in the Cloudflare dashboard.

### CI workflow/environment search

Accessible repository searches did not find a Cloudflare deployment workflow in Flameclyffe, Runa, or the public duplicate. The private candidate has no `.github/workflows` files in its inspected commit. The private candidate does contain the scripts above. No secret values were accessed or displayed. No deployment environment variable names for a Cloudflare account were found in accessible workflow source. This is a bounded discovery result, not proof that no external pipeline exists.

## Relationship between the Worker, Access, Hearthgate, and route catalogue

- **Candidate Worker:** standalone OpenCode-compatible translation proxy described above. No source-level connection to Wayglass was found.
- **Hearthgate:** Node/Express host in Flameclyffe; `apps/starwell-server/server.js` mounts the native Wayglass MCP, workspaces, Bluebird and Wayglass routers. The inspected server is a distinct process/service from the candidate Worker.
- **Wayglass route catalogue:** `lib/wayglass-route-registry.cjs` provides `publicWayglassRoutes()`; `apps/starwell-server/wayglass/router.js` exposes it at `GET /api/v1/wayglass/routes` through the `/api/v1/wayglass` mount. The handler sets `Cache-Control: no-store`, but contains no request gate, bearer verification, owner check, or authorization middleware. The generic server mount likewise has no auth middleware around this route in the inspected path.
- **Cloudflare Access/Tunnel:** no account-level configuration was available to inspect. An Access application, tunnel ingress policy, firewall, private network, or other outer gate could protect the host; that remains unknown. CORS is not authentication. The normal server uses permissive origin reflection; `server-secure.js` changes CORS policy, which still does not establish identity or authorization.
- **Effective boundary conclusion:** source inspection finds no app-level authentication on the route catalogue endpoint. Whether an external Cloudflare/network boundary protects the reachable hostname is **unverified**. Therefore the endpoint cannot yet be treated as safe for Code Mode discovery or invocation. Its output includes provider/model, participant/continuity/candidate identifiers, environment, configuration and capability/policy metadata; return only an explicitly reviewed projection behind verified owner authorization.

The current PR #535 MCP tool is a separate `/mcp` service contract with an injected verifier and a read-only `wayglass_routes` tool. It is not the native `/api/v1/wayglass/routes` endpoint and is not evidence of Cloudflare deployment or route binding.

## Code Mode compatibility and connector contract preparation

The authoritative Cloudflare API reference inspected on 2026-11-05 is [Code Mode API reference](https://developers.cloudflare.com/agents/tools/codemode/api-reference/), updated 2026-07-22. It documents `@cloudflare/codemode` entry points; `createCodemodeRuntime({ ctx, connectors, executor, ... })`; connector tools with input/output schemas and execute function; and the executor interface. Those signatures are documentation-level compatibility, not proof that Flameclyffe has the package installed, a compatible Worker runtime, a Worker Loader binding, a Durable Object, or a deployable entrypoint. No Code Mode dependency/package version is recorded in Flameclyffe or the candidate Worker source inspected here. Resolve the installed version and runtime before implementation.

The proposed first tool is a no-argument, read-only `list_wayglass_routes` operation. It is **not implemented**. Its host-injected context must carry authenticated principal and owner grant; callers cannot supply or override identity. Enforce a fixed host-side allowlist and a field projection. Do not provide model invocation, arbitrary URL fetching, dynamic upstream headers, writes, or generic proxy methods in this crossing. `codemode-readonly-route.connector.d.ts` defines the runtime-neutral typed seam; the JSON Schema defines receipt fields; the fixture and test vectors are synthetic design artifacts, not receipts or executed tests. The receipt schema allows a null principal for pre-auth denial and requires a verified owner principal for completed executions.

Receipt requirements: execution ID, request ID, principal subject and issuer, initiating agent, connector and operation, declared capability, target identifier, canonical input/result digests, status, start/end times, and an idempotency key when the operation later gains side effects. Never persist bearer tokens, credentials, raw private route configuration, or unreviewed result payloads. For this no-side-effect read operation, replay may be safe only after the connector has been proven read-only and authorization is revalidated at each host call.

## Isolated test state and remaining test work

Source was inspected, but this session had no local repository shell/runtime available; therefore no fresh local isolated endpoint test was run. Existing `wayglass-request-gate.test.js` and `security-boundary.test.js` cover gated entrances and OAuth/MCP mount ordering but do not assert a gate on `GET /api/v1/wayglass/routes`. Existing checks are not proof of route-level authentication. A targeted test must start the real router/host on loopback and assert:
1. anonymous request behavior at the actual mounted path;
2. an unauthorized principal is rejected before route enumeration;
3. an authorized owner principal receives only the approved projection;
4. revocation blocks a subsequent call;
5. neither errors nor receipts disclose secrets or raw headers.
First test the current behavior and record it; do not silently alter existing compatibility behavior in this discovery PR. Any auth change should be a focused code PR with explicit caller/host boundary and regression coverage.

Planned Code Mode isolated suite: installed package/runtime import smoke; connector discovery and typed invocation; no-identity and revoked-identity denial with zero native calls; unexpected route/fields rejected; digest and attribution stable; tool output contains no credentials; executor outbound disabled unless a specifically reviewed host adapter is required; interruption is reconciled against the original execution ID; no retry on unknown outcome; safe read-only replay. Approval/rollback tests belong to a separately verified reversible operation and are not implied by this read-only crossing.

## Exact read-only access request if the deployment remains inaccessible

Please provide a **redacted, read-only Cloudflare inventory** for the existing Wayglass/Flameclyffe Worker (no token or secret values):

- Cloudflare account display name or account ID (ID may be partially redacted if needed), deployed Worker script name/ID, and current deployed version or deployment timestamp.
- Worker source view or source repository/branch/commit, plus deployment history showing whether deployment came from Dashboard, Wrangler/CI, or another system.
- Bound public hostname and whether it is a Workers route, Worker custom domain, or Tunnel public hostname.
- If Cloudflare Access is used: matching Access application hostname and policy summary (principal selectors and allow/deny posture; redact emails if preferred).
- If Tunnel is used: tunnel name/ID and the hostname-to-service ingress mapping only; omit connector tokens and credentials.
- Whether the target route reaches Hearthgate, and the exact route path/protocol.
- Confirmation whether the deployed Worker is the `opencode-cowork-proxy` candidate or another source.

Preferred permission: dashboard **Viewer** access restricted to the relevant account/resources, or equivalent narrowly scoped read-only API token. For API token permissions, use Workers Scripts **Content Read Only** scoped to the relevant Worker; Access Apps and Policies **Read** for the relevant account/zone; Workers Routes **Read** for the relevant zone; and Cloudflare One Connector / cloudflared **Read** only if Tunnel configuration must be inspected. Do not grant write, deploy, route-edit, secret-read, tunnel-token, DNS-write, or account-admin permissions. Cloudflare documents these permission families in its [Workers permissions](https://developers.cloudflare.com/workers/authorization/workers/) and [API permission matrix](https://developers.cloudflare.com/fundamentals/api/reference/permissions/). A redacted dashboard export/screenshots of the items listed is sufficient if connector scope is unavailable. Never send credential values.

## PR evidence continuity — keep heads distinct

- **PR #527** remains open and draft against `wayglass/current`. Exact cleanup head `f03825b065566e94dcf218b8fcd70517b11383da` has recorded Wayglass Check `42059935178`, Windows Installer `42059935319` (audit, unsigned x64 NSIS, verification and artifact upload succeeded; release skipped), and Pages preview `42059935194` successes. No merge or release.
- **PR #535 implementation evidence:** original implementation head `0c843d15dbe9d9612d3acfbd3e8e254a170f1b50` has recorded MCP contract `42065413788` (33/33), Wayglass Check `42065413764`, Boxfire `42065413873`, Pages preview `42065413715`.
- **PR #535 documentation-only head:** `f3800745f2c7cdd45bb6b5da3fa2ea423763f76a` updated the cloud-crossing record. Its recorded Pages preview succeeded; no new GitHub Actions test run was reported for that documentation-only head.
- **PR #535 subsequent implementation head:** GitHub reports head `aa2f13be50660be1efb56c2adc99c5ce8c9b7829`, parent `f380074...`, adding `lib/wayglass-mcp-introspection-verifier.cjs`. This remains distinct from the earlier implementation head `0c843d1...` and documentation-only head `f380074...`. Exact-head Actions were subsequently verified at `aa2f13b`: MCP Contract `42069853674` succeeded, Wayglass Check `42069853880` succeeded, Boxfire `42069853756` succeeded, and Pages `42069853641` succeeded; an additional MCP contract run `42069842266` also succeeded. The status is now **tested in CI at aa2f13b**, while the 33/33 result remains specific to `0c843d1`. PR remains open and draft against `main`; its API snapshot reports mergeable false. No live OAuth binding, cloud-native route binding, or deployment follows from these CI results.
- PR #535 remains separate from this discovery task. Do not merge or retarget it here.
- **PR #538 discovery artifact:** draft PR [#538](https://github.com/SingsEnochian/Flameclyffe/pull/538) targets `wayglass/current`. Initial exact head `8f1b1f995788049d0cfa920e48f3fba2844bf028` passed Wayglass Check `42070660847` and Pages preview `42070661237`. Intermediate head `256c008febbf4c60df3bad4fcd2fbe9382f80960` passed Wayglass Check `42070845372` and Pages preview `42070845363`. Subsequent connector declaration, test-vector and receipt-schema files advanced the branch to `a3ed0b38c2fa0ec53c549193f912cc197239f865`; its Wayglass Check `42071284133` and Pages preview `42071283816` passed. Ledger reconciliation then advanced to `ebb56298c7ebd011fe15fa5fa137b8c34a595a11`; exact-head Wayglass Check `42071610841` and Pages preview `42071610599` both passed. CI validates repository workflows at those SHAs; it does not execute the synthetic vectors, validate the JSON Schema semantically, run the native route endpoint, or prove a Code Mode execution. These are documentation/contract checks, not a Code Mode execution or route-auth test.

## Roadmap update

1. **Selected:** WAYGLASS-CODEMODE-001, source/account/route-boundary discovery and read-only contract preparation (this record).
2. **Blocked on read-only infrastructure evidence:** identify actual Worker, host route, Access/Tunnel policy, source commit and deployment process.
3. **Ready after #2:** implement the one read-only connector using a confirmed supported Code Mode version/runtime; run isolated tests and record receipts.
4. **Separate follow-up:** add route-level auth-boundary tests to the real Hearthgate router; determine whether the endpoint should become owner-only or whether a verified external boundary is the accepted design.
5. **Independent Wayglass lane:** preserve PR #535's exact-head receipts separately: `0c843d1` has the recorded 33/33 MCP result, while `aa2f13b` has later successful MCP/Wayglass/Boxfire/Pages runs. Inspect the test output for the new verifier and keep it separate from Code Mode. Preserve PR #527 as draft and retain its exact-head evidence. PR #538 is a separate discovery draft; verify the final contract-artifact head checks before calling those artifacts tested.
6. Do not merge branches, change account configuration, or promote production as part of these tasks.

## Return

**What helped:** accessible GitHub source, route registry, native router and exact commit/status APIs exposed useful boundaries; the candidate Worker could be examined without requesting secrets.  
**What was hard:** Cloudflare account resources are outside the available connector/session; repository search index coverage is incomplete; no local shell was available for an isolated host test. PR #535 advanced while discovery was underway, so its prior evidence needed exact-head separation.  
**Held:** actual deployed Worker identity and pipeline; external Access/Tunnel protection; route-catalogue effective external auth; Code Mode installed package/runtime compatibility; isolated endpoint test; Code Mode connector implementation.  
**Return pointer:** resume at “Exact read-only access request,” then continue the selected task from step 1 above.
