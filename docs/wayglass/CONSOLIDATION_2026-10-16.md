# Wayglass consolidation — 16 October 2026

## Purpose and acceptance

Rowan requested one maintained home for the newest Wayglass versions. `wayglass/current` is the combined development branch in Flameclyffe; `main` is the reviewed release branch. The stable entry document is `WAYGLASS_CURRENT.md`.

Acceptance: preserve the independently developed modules, current mainline policies and dependency repairs; reconcile shared interfaces without silently discarding features; run combined checks; publish one durable source tree; record provenance, inaccessible work and unverified live boundaries; direct future work back to this branch. Do not delete prior branches, move credentials into public source, deploy production, or modify UH/Ezra originals.

## System and ownership

The browser shell composes Writing Room, Research Library, Commons, Toybox, Observer and Video Atelier. The authenticated Hearthgate host owns MCP/OAuth, crew seats, project persistence and provider adapters. Existing `lib/wayglass-*` contracts own continuity and route semantics. ArcSweep retains Code Loom, Pilot Deck, Broker, public reasoning receipts, signed local event ledger and soundscapes. These modules share one repository and retain their packaging paths.

Private host state stays outside tracked source. The existing artifact journal and the newer session-bound project store keep their own formats; this consolidation performs no data migration. Authentication binds authors server-side for both tool families. New stop/return project work uses `enter_workspace`, `read_project`, `write_project_file` and `leave_workspace`. Compatibility artifact tools do not acquire another participant's authority from caller arguments.

## Source and reconciliation

Exact source heads are recorded in `current.json`; source branches and source commits remain the ancestry/provenance references. The consolidation has linear release ancestry rooted in the recorded mainline baseline. Source branches are retained, not overwritten or deleted.

- Crew/project return and restart witness: #460/#469, including their MCP/OAuth ancestors.
- Glass Writing Room, per-opening Bluebird authorisation, request guards, Broker and public reasoning receipts: #459/#465/#466/#467/#468.
- Griff and The Evil Gene world registry: #472, with separate world/checkpoint binding and unavailable transport status.
- Research Library, Wonder/Complexify and Observer self-development: current #456 namespace-corrected head.
- Code Loom, Pilot Deck, local signed receipts, sonic score and living ship ecology: #464.
- StepFun and voice consent controller: #443. No live StepAudio connection is asserted.
- Toybox, mobile Commons, Bitty Twi interview, Wonder Light, world soundscapes, Bluebird trial and Constellation fixture: #453/#444/#442/#448/#449/#457/#437.
- Travelling inheritance code is included through the crew/return line.

Overlaps were reconciled rather than choosing a last-writer whole-file overwrite. Both authenticated project tool families remain available. Current project session checks reject unexpected author/participant arguments; the older artifact test now verifies that rejection before verifying a legitimate Rarity-attributed write. The host test enters using its authenticated seat rather than passing a caller-selected participant. Neither acceptance boundary is weakened.

The glass route picker remains, alongside StepFun consent, explicit character selection, Griff world context and Wonder controls. Opening the Writing Room no longer silently selects Bitty Twi over an authorised Bluebird route. The StepFun disclosure is closed before the main desk so hiding it does not hide the composer. Observer private interior, optical events, voice consent and Feather controls coexist. Duplicate Commons registration and duplicate host-test workflow execution were removed.

Bluebird failures remain on his SpicyChat route with an explicit failure; no automatic Crow/DeepSeek substitution is introduced. The Bluebird trial's separately recorded proposal does not grant a provider fallback. Griff is never substituted for Bluebird.

## Observed verification

| Check | Observed result |
| --- | --- |
| `npm ci --ignore-scripts` | Pass |
| `npm ci --prefix apps/starwell-server --omit=dev --ignore-scripts` | Pass |
| `npm run wayglass:test` | 181 passed, zero failures |
| `npm run wayglass:test:host` | 55 passed, zero failures, including the Bluebird trial |
| `npm run arcsweep:test` | 1,626 passed, zero failures |
| `npm run contracts:verify` | Pass: contract, Wonder, whole-system and canonical spine gates |
| `npm run wayglass:deploy:server` | Local build and host staging pass; this command does not publish a remote deployment |
| `npm run arcsweep:build` | Pass; existing large-chunk advisory remains |
| `npm run wayglass:stage:vercel` | Local preview staging pass; no Vercel deployment or authentication attempted |
| DOM harness using synthetic fetch responses | Mounted integrated Writing Room; visible composer while consent is hidden; explicit character choice; synthetic request and rendered response pass |
| Full Chromium desktop/mobile rendering | Not completed: browser executable absent; download returned truncated/non-ZIP content |

The first combined host run reported two API-compatibility failures. They were repaired by binding both project APIs to authenticated seats and retaining strict argument validation; the next run passed all 52 tests. A duplicate local variable introduced during conflict reconciliation was caught by syntax checking and corrected before the final passing build/tests. HTML inspection also found a missing disclosure closure. The DOM harness confirmed the repair keeps all main controls outside the hidden StepFun disclosure.

CI now runs on every push to `wayglass/current` and on relevant PR changes, covering combined contracts, ArcSweep tests/build and the Wayglass frontend/host gates. Current remote CI results must be checked after publication; these local results do not establish remote CI success.

## Outstanding and release boundary

The previously reported local `7ac7beb0` audio/empty-reply work is not present in the fetched remote history. The Windows checkout is not available here. Preserve and compare that source before importing it; do not claim it was consolidated.

This does not configure the Windows host, migrate private records, authenticate ChatGPT, call live SpicyChat/StepFun providers, train a model, deploy a new site or promote a resident seat. Those retain their existing acceptance requirements. The book/bookmark UI remains proposed work.

Update or branch from `origin/wayglass/current` for all subsequent Wayglass development. Promote a reviewed, tested commit to `main` for releases. Existing dated PRs are historical source lines and must not become independent current versions again.
