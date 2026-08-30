# 08 · CURRENT RELEASE BASELINE

**Captured:** 2026-08-30 America/New_York  
**Repository:** `SingsEnochian/Flameclyffe`  
**Default branch:** `main`  
**Code baseline:** `06a06c620d37965d8a2f7afe6acf91a11ca83fbb`  
**Baseline commit:** `feat(arcsweep): close narrative circuit and add Hearthweave lexicon (#253)`  
**Release posture:** FUNCTIONAL mainline, not yet end-to-end VERIFIED

## 1. Repository baseline

Current audited mainline includes, among other recent ArcSweep work:

- authoritative native House Chat;
- live runtime roster derived from runtime presence;
- host-neutral / GitHub Pages House transport through Supabase;
- durable cross-host workspace state;
- semantic rich text;
- shared Fantasy Roleplay runtime;
- Chat / Roleplay / Story mode integration;
- OpenRouter-backed portable Ox Alpha route;
- truthful OA route-state surface;
- restored creative organs;
- restored sound and resonance organs;
- canonical Runa engine/surface binding;
- lazy room-specific sidecar scheduling;
- Semantic Lab contracts and transition toys;
- production health panel and explicit House browser-smoke instrument;
- closed narrative circuit and immutable narrative arrival receipt;
- Hearthweave Mythience lexicon.

## 2. CI state on baseline SHA

Observed GitHub Actions state for `06a06c620d37965d8a2f7afe6acf91a11ca83fbb` during the 2026-08-30 audit:

- workflow runs observed: 10;
- successful: 9;
- failed: 0;
- skipped: 1.

The skipped run was:

- `Vercel Production Authenticated Smoke`.

Therefore:

- the audited code head has no observed failing GitHub workflow runs;
- this does **not** constitute a current authenticated Vercel production proof;
- a skipped production smoke may not be interpreted as green.

## 3. Deployment evidence boundary

### GitHub Pages

Mainline contains the repair that enforces one canonical Pages publisher and the ArcSweep Pages build workflow includes route-integrity protection.

This baseline records that the publisher machinery is present and functional in code/CI. It does not claim a specific currently served Pages deployment SHA until a live browser/deployment receipt is captured.

### Vercel

The connected Vercel account exposed no projects through the available project listing during this audit, while the GitHub `Vercel Production Authenticated Smoke` run on the baseline SHA was skipped.

Status: `NOT VERIFIED IN THIS AUDIT`.

Do not infer Vercel production state from code existence.

### Netlify

Earlier operating maps contain historical Netlify production information. This file does not silently carry that historical deployment state forward as current ArcSweep production truth.

Any current Netlify claim requires a fresh deployment lookup/receipt.

## 4. Supabase persistence baseline

The connected production data organism showed the following relevant state during the audit.

### Populated House / source / Observer infrastructure

| Store | Rows |
| --- | ---: |
| `starwell_worlds` | 6 |
| `starwell_codex_entries` | 16 |
| `starwell_discovery_logs` | 3 |
| `starwell_artifacts` | 14 |
| `deep_observer_events` | 7 |
| `deep_observer_event_relations` | 9 |
| `observer_handoff_queue` | 7 |
| `observer_feed_registry` | 7 |
| `observer_ingestion_runs` | 58 |
| `arcsweep_operator_profiles` | 1 |
| `arcsweep_private_workspaces` | 2 |
| `arcsweep_operator_invites` | 1 |
| `house_commons_entries` | 32 |
| `source_sync_roots` | 3 |
| `source_sync_runs` | 58 |
| `source_sync_items` | 409 |
| `source_sync_item_revisions` | 808 |
| `source_sync_edges` | 957 |
| `source_sync_content_segments` | 6416 |
| `source_sync_events` | 816 |
| `source_library_documents` | 392 |
| `lanternbridge_message_index` | 32 |

### Empty or not-yet-circulating critical ledgers

| Store | Rows |
| --- | ---: |
| `starwell_locations` | 0 |
| `starwell_characters` | 0 |
| `starwell_timeline_events` | 0 |
| `observer_measurements` | 0 |
| `observer_anomaly_windows` | 0 |
| `observer_correlation_receipts` | 0 |
| `math_spine_packets` | 0 |
| `arcsweep_feedback_cycles` | 0 |
| `arcsweep_feedback_reviews` | 0 |
| `arcsweep_deep_time_records` | 0 |
| `house_runtime_events` | 0 |
| `house_commons_attachments` | 0 |
| `source_library_query_receipts` | 0 |

Interpretation:

> The archive and source-library organism is genuinely populated. The central analytical/runtime circulation remains unproven in durable production ledgers.

That is the defining release fact for this baseline.

## 5. Active accepted roadmap

The accepted ArcSweep dependency order is maintained in `03_ACTIVE_ROADMAP.md`:

1. operating-map and verification reconciliation;
2. PR archaeology and stale-surface cleanup;
3. Echo Index restoration as a resolver over existing stores;
4. first genuine House runtime receipt;
5. receipted multi-Flame House Chat;
6. Source Library query receipts;
7. first real Observer measurement chain;
8. DEEPTime → PREMAQC / Math Spine → Feedback circulation;
9. creative Glyph → Living Glyph → Runa → replay proof;
10. physical QA and Boxfire acceptance.

## 6. Current open-review caution

PR #250, `ArcSweep: Bridge Network + WILD emergence lane`, is valuable current branch work but is not part of this mainline release baseline.

Its own contract requires:

- fresh exact-head validation;
- reconciliation with current main;
- no merge until those gates are satisfied.

Other historical ArcSweep PRs require archaeology before being treated as active release work. The existence of an open PR does not automatically make it authoritative.

## 7. Known missing original organ

The audit found no authoritative current-main Echo Index implementation.

Echo Index is therefore classified as `ENVISIONED / MISSING` for this baseline and is the next bounded product organ after documentation/review reconciliation.

It must be implemented as a resolver over canonical existing stores, not as a new competing registry.

## 8. Release classification

### Can truthfully claim

- ArcSweep is a substantial functional application.
- Native House Chat, semantic rich text, narrative modes, source sync, Source Library, Commons, creative organs, sound/resonance organs and semantic narrative machinery exist on the current mainline.
- Source synchronization and Source Library persistence are materially populated.
- The baseline SHA had no observed failing GitHub workflow runs during this audit.

### Cannot yet claim

- end-to-end House circulation verified;
- production multi-Flame conversation durably receipted;
- canonical Observer measurement circulation;
- DEEPTime/Math Spine/feedback ledgers breathing;
- current Vercel production smoke passed;
- full physical iPhone/iPad/desktop acceptance;
- Echo Index restored;
- overall ArcSweep `VERIFIED` or `RELEASED` under the Forge definition.

## 9. Next release gate

The immediate release gate is **not another feature wave**.

It is:

> produce one real, traceable, replayable runtime/event chain that begins with an actual House interaction and creates durable evidence in the currently empty circulation ledgers.

Until that happens, this baseline remains `FUNCTIONAL`, not `VERIFIED`.
