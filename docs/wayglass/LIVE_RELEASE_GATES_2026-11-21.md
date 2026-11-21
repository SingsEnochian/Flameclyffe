# Wayglass owner-approved live-release gates (2026-11-21)

Status: **approved plan; NOT deployed**. Source of truth: `wayglass/current`; `main` remains release branch. Never treat a PR, preview, or edge challenge as a live ship.

## 1. Integration
- Reconcile the existing one-ship train (#661), Mythience (#618), Watercolour (#652), Nursery/First Garden (#672), model routes and Astra-owned work against the exact current source SHA.
- Preserve distinct identities, provenance, consent, Feather, Withness and rollback. Do not overwrite parallel changes or silently merge.
- Produce a reviewed integration commit and record SHA. Verify Nursery interface is actually reachable from the ship navigation, not merely present in source.

## 2. Verification
- At exact integrated head: `npm ci`, `npm run contracts:verify`, `npm run wayglass:test`, `npm run wayglass:test:host`, `npm run wayglass:deploy:server`, `npm run arcsweep:build`.
- Include new source tests `node --test apps/wayglass/src/mobius-nursery-garden.test.mjs apps/wayglass/src/mobius-nursery-minimind.test.mjs` until they are integrated into the standard test command.
- Real browser smoke: navigation, iPad touch/Pencil, keyboard/VoiceOver, reduced motion, Watercolour, sound opt-in, WTL, Garden proposal/carry, consent revocation, Feather, cold Return. Record failures and exact head; do not fabricate PASS.

## 3. Cloud origin
- Deploy the **full** Wayglass/STARWELL authenticated host on an always-on owner-controlled compute origin, with encrypted durable state, backup/restore test, health checks and restart policy. Supabase alone is not a persistent Node host.
- Bind origin to loopback or private interface only; do not expose the server publicly or publish a static-only copy.
- Choose and review the actual provider, region, machine size, estimated recurring cost, backups, and owner approval **before provisioning or spend**. Keep credentials outside Git.
- Keep model inference optional and scoped; do not assume the 64M MiniMind model is deployed. Cloud model proxy must enforce server-side authentication and consent; a client `ownerAuthorised` boolean is not security.

## 4. Owner-only entry
- Use an owner-approved hostname, Cloudflare Access self-hosted app (owner identity allowlist + MFA) and named Tunnel; prohibit Quick Tunnel, public Funnel, allow-all Bypass and exposed Vite ports.
- Apply Access to the entire hostname including `/wayglass/`, `/api/v1/wayglass/*`, `/mcp` and streaming/websocket paths. Validate origin session/OAuth, scopes, CSRF and revocation separately from edge Access.
- Do not print tunnel tokens, credentials, private transcripts or session cookies in receipts.

## 5. Live acceptance and rollback
- Unauthenticated probe: `npm run wayglass:cloudflare:preflight -- --url https://OWNER-APPROVED-HOST`. All tested paths must challenge via Access, not return public 200. This proves only the edge.
- Authenticated owner session: verify UI, API, model routes, actual saved/returned Garden, Feather cancellation, persistent state after restart and phone/iPad access. Record exact deployed SHA, host health, screenshot evidence and timestamp.
- Verify rollback to the last known-good image and recovery from backup. Only then mark **LIVE** and share the verified URL privately.

## Current evidence / blockers
- Existing canonical branch, scripts and owner-only Cloudflare procedure inspected 2026-11-21.
- Nursery First Garden branch #672 has commits and unexecuted tests; it is not integrated or deployed.
- No owner-approved cloud host, Cloudflare account/domain/hostname or running endpoint verified.
- No production provisioning, credential changes, merges, or deployment authorised by this document. Owner's agreement authorises progressing through the gates, not spending or bypassing access controls.

Next owner: integration/build worker for gate 1, then verified test runner for gate 2. Cloud provisioning remains blocked pending concrete provider/cost and owner identity approval.

## Free-first owner direction (2026-11-21)

Rowan explicitly authorises preparing owner-only deployment and selecting/building a free option when feasible. Do not purchase or provision anything billable without presenting provider, monthly cost and security configuration for approval. No credit card entry, account creation or production credential changes are delegated by this direction.

**Preferred evaluation candidate:** Oracle Cloud Infrastructure Always Free Ampere A1 (published 2 OCPUs, 12 GB RAM; eligible shared block storage). Pair with Cloudflare Access Free + named Tunnel. Budget target: **$0/month** only if all resources remain within Always Free quotas; external domain registration, backups, outbound usage and model inference may cost extra and are not approved. Verify Arm64 native dependencies, capacity in selected home region, quotas, idle reclaim policy, storage, network and Cloudflare DNS/domain prerequisites before recommending provisioning. OCI account verification may require payment-card information; owner must do that directly.

**Fallback evaluation:** Google Cloud Compute Engine e2-micro free tier in eligible US region, 30 GB standard disk and 1 GB outbound monthly, likely too small for full Wayglass host. No automatic upgrade or trial-credit spend.

**Security:** no direct public origin, no publicly accessible API, owner identity allowlist and MFA, Access full hostname, tunnel to loopback/private service, separate app-level authentication, least privilege, backups, Feather and cold Return. Cloudflare Access Free may require account billing details.

**Evidence:** OCI https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm ; Cloudflare https://www.cloudflare.com/sase/products/access/ ; GCP https://docs.cloud.google.com/free/docs/free-cloud-features . Prices/limits checked 2026-11-21. No accounts or infrastructure provisioned, no live hostname.
