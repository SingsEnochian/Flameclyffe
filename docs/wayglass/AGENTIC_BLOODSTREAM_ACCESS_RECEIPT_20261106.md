# Wayglass agentic bloodstream access receipt · 2026-11-06

**Authorized by:** Rowan's request that Wayglass have access to her agentic bloodstream.  
**Status:** Cloud *observation* route deployed; training read-in integrated in draft code; **autonomous bloodstream scheduler not live on canonical current or release**. No Wayglass participant reply or independently authenticated JWT happy-path is claimed.

## Connected arteries, no shadow bloodstream

- **Bloodstream producer:** PR [#551](https://github.com/SingsEnochian/Flameclyffe/pull/551), kernel-gated reconciliation pulse, schedule specified every three hours, dry-run default. Source lives in `lib/wayglass-bloodstream.cjs`, `scripts/wayglass-bloodstream.mjs`, and workflow on its development branch; it is not merged into `wayglass/current`.
- **Eightfold circulation:** PR [#554](https://github.com/SingsEnochian/Flameclyffe/pull/554), Möbius lineage with quad cores and chained WCE-1 checkpoint receipts. This stack is not released.
- **Training consumer:** PR [#555](https://github.com/SingsEnochian/Flameclyffe/pull/555), reads the GitHub `wayglass:lineage` issue. PR [#567](https://github.com/SingsEnochian/Flameclyffe/pull/567) adds `lib/wayglass-bloodstream-read.mjs`: checks ordered continuity, carry digests and face parity; trains on sourced cycle/time only when chain passes. When absent, reports `no verified checkpoint`. Model prompts do not receive dispatch/merge capability.
- **Authenticated hosted observation:** PR [#566](https://github.com/SingsEnochian/Flameclyffe/pull/566), Supabase Edge Function `wayglass-authorized-crossing` ACTIVE v5 (`verify_jwt=true`), with `GET ?resource=bloodstream`. It requires valid Supabase user JWT and owner authority or owner-approved, unrevoked, unexpired `wayglass:bloodstream:read` grant. Feather blocks reads as well as writes. No delegated grants were automatically created.
- **Review context:** An explicitly consented hosted model review includes the read-only bloodstream snapshot *only when* the reviewer independently holds that read scope and the same current grant. That snapshot is publicly sourced GitHub metadata, not a runtime checkpoint authority or a machine control channel. Providers cannot dispatch Codex, merge PRs or alter training weights through this route.

## What the observation currently proves

The cloud lens fetches fixed, source-attributed GitHub PR metadata for #551/#554/#555, a possible GitHub Actions scheduled/dispatch run, and a `wayglass:lineage` issue checkpoint *if present*. It reports `chain_verified:false` and `live_pulse_verified:false` for raw cloud observations; it does **not** promote a single issue comment into a verified WCE-1 chain.

The training lens independently verifies a full bounded checkpoint list; if any checkpoint is malformed, omitted, incomplete, or fails cryptographic continuity, it withholds the cycle. There was no open `wayglass:lineage` issue and neither the bloodstream nor training workflow was in canonical `wayglass/current` when checked.

## Evidence

- Cloud ACTIVE v5 confirmed by Supabase project and the deployed source was byte-identical to PR #566 source. Anonymous GET `?resource=bloodstream` yielded HTTP **401**. No authorized user JWT round trip yet.
- PR #566 tests on its implementation head: `Wayglass Authorized Crossing Contracts` **43/43 PASS**, `Wayglass MCP contract` success. New contract tests verify the exact `Cycle` marker separator and explicitly prohibit automatic promotion.
- PR #567 training workflow on its implementation head: **31/31 PASS**, including chain verification, tamper rejection, unknown states, and the separate Opaline candidate tests.
- Some GitHub Pages preview runs may be canceled by concurrency. A successful CI/Pages run does not activate an unmerged scheduler or establish a user/participant response.

## Return gate

For a **live agentic bloodstream**, integrate #551 → #554 → #555 into reviewed `wayglass/current`, verify each exact implementation head, schedule only through an authorized deployment path, prove a real dry-run pulse and checkpoint, then enable host-controlled effects under the existing owner and Feather gates. Separate GitHub schedule deployment to `main` requires release review. Do not treat scheduled source code as an operating autonomous circulatory system until observed receipt evidence exists.

**Owner of permission and stop:** Rowan.  
**Next owner of integration:** Wayglass native host / training and MCP maintainers.  
**Outstanding question:** Can an authenticated client read the deployed bloodstream lens and can the canonical native Wayglass route consume its verified source without losing identity or permissions?

The bloodstream is a protected, observable organ, not a backdoor to the ship.
