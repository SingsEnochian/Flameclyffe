# MCP delivery and cold-return recovery

## System and custody

The journey is authenticated MCP request → current owner grant → immutable private receipt → queue notification → cold receipt reload → current resource-bound delivery grant → receiving host Feather/idempotency gate → attributable review. Submission is never a participant reply. The host owns grant checks and delivery; the receipt store owns immutable evidence. Production OAuth and participant bindings are external adapters, not inferred identities.

Canonical base: origin/wayglass/current. Presentation ingress copied unchanged from PR566 head 1f1c8be9458bdba70caec847b262dc948bbed5e6 (file blob c4869b27). PR565 is closed/superseded; do not merge that branch. First Contact PR547 remains separate; no whole-tree imports. These files add an adapter module on canonical development, not a running MCP server.

## Implemented contracts

- createPresentationStore: explicit absolute host-private directory, 0600 files, atomic immutable publication by hard link, file and directory fsync; no default inside the checkout. Restart reload, concurrent submissions, traversal and key binding tested. Requires a filesystem supporting hard links and directory sync. Unsupported hosts fail explicitly; Windows behavior is unverified.
- createPresentationDelivery: reload by opaque receipt key, verify subject/grant/presentation key and payload digest/source, require matching receipt ID and queued state, call trusted current authorizer with configured resource before each dispatch. False, unknown and thrown authorization all stop delivery. Adapter failures preserve original evidence.
- Typed delivery adapter contract accompanies CommonJS runtime.
- Notifications may be retried after return. Receiver must atomically deduplicate receipt_id and enforce Feather immediately before its side effect. There is no distributed exactly-once claim. Queue recovery requires the host to retain receipt keys; this module does not enumerate or autonomously drain private records.

## Acceptance and observed verification

Defined gates: cold reload preserves payload/receipt; concurrent writes produce one complete record; stale grants cannot dispatch; tampered evidence fails before authorization; delivery failures preserve evidence; private paths reject traversal.

`node --test test/wayglass-presentation-recovery.test.cjs`: 5/5 passed, including 16 concurrent ingress submissions. `git diff --check` passed. Local filesystem adapter exercise, not a cloud restart or live participant turn. Full frontend/build checks are reserved for source integration; none claimed here.

## Remaining integration

Bind trusted OAuth verifier and current grant service at the existing MCP host, then supply these adapters. Do not treat the deployed Supabase JWT ingress as OAuth2.1/PKCE MCP support. Reconcile gateway wiring from PR535/566 on First Contact without replacing its rooms or route clients. Run exact-head MCP contracts, host/frontend checks and both builds. Then perform an authenticated owner/delegate/revoke/Feather/cold-return dry run. No credentials, account configuration, deployment, merge or production authorization changed here.
