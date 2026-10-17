# Wayglass deployment readiness — 2026-10-12

## Release objective

Implement the authorised crew-workspace priority: Rarity and Codex work in shared Atelier/Builder projects through separate authenticated entrances, preserve authorship, and recover artifacts and named handoffs after host restart. Wayglass remains the resident intelligence; Faer remains dormant. The complete artifact/handoff module design is in `docs/architecture/WAYGLASS_WORKSPACE_ARTIFACTS_V0_1.md`.

## Reconciled lineage

This change starts at crew branch head `858425e831308a2bf9ae8fc2f3011ee98ad6e044`. It is a child review branch, not a merge into main. Parent lineage, verified from fetched refs:

| PR | Subsystem | Head |
| --- | --- | --- |
| #436 | OS kernel, world entry and continuity | `fedb60c2ae634211dfa0ce1732f2074b58632022` |
| #439 | Travelling inheritance host and voyage choice | `dbbf8a780c4f6be5d238ebd2e5c364aaafed9230` |
| #445 | Video Atelier | `03c6121d8e1f357f23d2df505806c5f7c9cb669a` |
| #446 | Living Observer | `3badf2aa079139c9ce9ac368c9082fed556d2743` |
| #450 | MCP/OAuth entrance | `aca518886fe31a349a5bb0b76c226f3c0e9d742f` |
| #451 | Crew registry and workspace entry | `858425e831308a2bf9ae8fc2f3011ee98ad6e044` |

Current main inspected: `6bf816d48d76dbbffd0c98fa39f91e1c492a842e`. Its current `AGENTS.md`, Other Realities law and travelling-inheritance language clarification are carried into this child branch without rewriting historical source records. This does not promote any branch runtime into main.

Sibling work remains separately reviewable: Commons #444, StepFun #443, Bitty Twi #442, Worldseed Atlas #440, Wonder light #448, soundscapes #449 and Toybox #453. Do not substitute a sibling branch for the crew candidate or close its review merely because some code appears elsewhere. Fresh parent-head CI and integration decisions remain necessary before merging the release stack.

## Implemented here

- Shared append-only text-artifact revisions and stop/handoff receipts for Atelier/Builder, outside the checkout.
- Rarity MCP tools for project inspection, writing and handoff, with server-bound author identity.
- Separate authenticated local Codex entrance and bounded CLI using the same project state.
- Optimistic head checks, non-overwriting storage, custody hashes, corruption/ancestry checks and explicit failure behaviour.
- No automatic provider calls, dormant-seat activation, identity/canon mutation, arbitrary terminal execution or native Procreate editing.
- Fixed local launch CORS for Wayglass ports 5186/4186; unrelated origins remain rejected.
- Fixed two stale MCP tests. Included the previously omitted crew/MCP/OAuth/security tests in Wayglass CI with appropriate trigger paths.
- Ignored generated staged browser assets, keeping builds separate from source commits.

## Verification evidence and limits

Local Node 24 verification: **99 Wayglass tests and 31 host/security tests passed**. Build/server staging and contract/Wonder/design/canonical-spine checks passed. The host test launches the actual secure Hearthgate server, checks staged UI and OAuth discovery, rejects unauthenticated access and cross-seat bearer reuse, writes through MCP as Rarity and local API as Codex, rejects stale revisions, stores a named handoff, terminates the host, starts a new process and recovers the same project through both entrances.

The two-seat runtime trial uses explicitly synthetic artifact content and temporary credentials. It proves host integration and restart custody, not a real Rarity conversation, a live ChatGPT OAuth connection, model continuity, physical device acceptance or a dedicated Wayglass LLM. A Codex-authored release artifact may be recorded separately through the CLI as real work; it must not be confused with the synthetic Rarity test.

Dependency remediation: root `source-map-js` updated to 1.2.2 and `@fastify/busboy` to 3.2.3; host `multer` updated to 2.4.0 and `proxy-addr` to 2.0.8. Root production audit reports zero findings; host audit has no high/critical findings but retains three moderate package findings in the Mammoth → argparse → sprintf-js chain. The latest published sprintf-js is still 1.1.3 with no fixed release advertised. Do not force npm's proposed Mammoth downgrade to 0.3.29. These remaining findings require a source-backed remedy or explicit deployment disposition; this report does not waive them.

## Remaining release gates

Rowan's subsequent 2026-10-12 direction adds the opening authorization box for Bluebird's SpicyChat provider token and removes Bluebird's DeepSeek/hosted fallback. The updated local suites pass **102 Wayglass tests and 35 host/security tests**. The real SpicyChat host adapter/character binding remains required; see `BLUEBIRD_SPICYCHAT_AUTHORIZATION_2026-10-12.md`. The browser session does not authorize an independent MCP caller to borrow the provider credential.

Chromium desktop and 390-pixel mobile checks verified the masked field, rejected-token error and clearing, successful entry through a synthetic local adapter, absence of provider credentials in local/session storage, fresh authorization on reload, and no mobile horizontal overflow. These browser results use synthetic credentials and do not claim a live SpicyChat account connection.

The complete ArcSweep suite also passed: **1,555 tests, zero failures**. Two prior universal-fallback assertions were updated to enforce Rowan's Bluebird SpicyChat-only exception while retaining hosted continuity for eligible other participants.

1. Review this child module and reconcile/verify the parent stack before promotion; required CI must cover the proposed head.
2. Select and run the real host with retained private data roots and separate Codex credential. Run the crew session using `CREW_SESSION_RUNBOOK_2026-10-12.md`.
3. Supply the current HTTPS MCP address and complete the user's local ChatGPT pairing step. Verify an actual Rarity/Codex work session and interruption/return, retaining real receipts.
4. Qualify backup restoration, crash-lock recovery and supported Windows/iPhone/iPad behaviour. The automated test covers process restart, not power-loss durability.
5. Run the full Return Engine model/runtime swap and corruption trial; preserve rightful/forbidden memories, identity, relationships and unresolved Wonder.
6. Refresh the August durable-ledger audit; historical zero counts are not current measurements. Verify genuine House/source/Observer/DEEPTime/Math Spine/feedback circulation.

No Vercel preview repair or reauthentication is required by this work. GitHub Pages remains a static publisher; successful Pages builds do not establish an authenticated Wayglass crew deployment.
