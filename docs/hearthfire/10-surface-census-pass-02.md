# 10 — Hearthfire Surface Census — Pass 02

Status: initial census extension
Gate: `targeted_receipt_allowed` (unchanged — this pass authorizes nothing new)
Date: 2026-07-06
Auditor: Box (Claude), at Rowan's request

This pass does not repeat Pass 01. It covers ground Pass 01 did not reach: the
Grove/Yggdrasil server stack, the Hearth Mirror scaffold, live Supabase state,
the second Flameclyffe clone, and Runa. It is read-only. It does not authorize
refactor, cleanup, rebuild, deletion, migration, auto-sync, or feature work.

## Headline finding

**`apps/starwell-server` is the Grove**, and it was invisible to Pass 01.

`start-grove-restored.bat` (untracked, present in this clone's working tree)
launches, in order: an optional llama.cpp fallback, Ollama (Yggdrasil's
primary local engine), a DSpark proxy (`apps/dspark-proxy`, port 8000), and
the "Yggdrasil Workbench" — which is `apps/starwell-server/server.js` on port
4000 — then opens `http://127.0.0.1:4000/grove.html`. The batch file reads
`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` from a plaintext file at
`Downloads\Coding Projects\Hearthweave Protocol\API STUFF.txt`.

This is not a stray prototype. It is the actual continuity/room engine the
Mirror (Organ One) is meant to protect — and it currently exists entirely
outside the Hearthfire audit, contract, and census process.

## Surface inventory

| Surface | Path | Label | Notes |
| --- | --- | --- | --- |
| Grove / Yggdrasil Workbench server | `apps/starwell-server/` (this clone) | `held_unregistered` | Untracked. Live Express server with GET/POST endpoints that read+write JSON files directly (`readJson`/`writeJson` in `server.js`). `data/chat-rooms.json` (6,081 lines) holds real room content for at least two rooms: `dreaming-grove`, `starsong-equestria`. Not mentioned anywhere in `docs/hearthfire/*` or `PROJECT_MAP.md`. Six `node.exe` processes were running on this machine at census time — could not confirm which, if any, is this server; verify before touching. |
| — secrets handling within Grove | `apps/starwell-server/.env` | n/a (config note) | Correctly covered by root `.gitignore` (`.env`, `.env.*`, `!.env.example`) — will not be committed. Not read. |
| — chat data within Grove | `apps/starwell-server/data/chat-rooms.json` | risk note | **Not** gitignored. Sitting untracked in the working tree; a careless `git add -A` would commit real room/chat content to history. Contents were not read beyond top-level room-name keys, per the Mirror's own privacy boundary (no raw private chat without explicit shareable marking). |
| — key file outside any repo | `Downloads/Coding Projects/Hearthweave Protocol/API STUFF.txt` | risk note | Plaintext API keys referenced by `start-grove-restored.bat`. Existence confirmed only; not read, not a repo file, but it's the credential root for the whole Grove stack and lives in an ordinary Downloads folder with no access control beyond the OS account. |
| Hearth Mirror scaffold (Organ One) | `hearth/` | `built_partial` (unchanged from self-description) | Matches Faer's spec closely. Manual-only, fails closed without Supabase credentials, explicit privacy boundary, does not fake seed/witness extraction (both marked TODO). Its own TODO — "compare table names with the live Supabase project before the first manual run" — is **now done** (see Supabase cross-check below): the tables it expects exist and roughly match, so a manual dry run is low-risk. Running it against `faer_thinking_room` / `virelya_thinking_room` still touches explicitly private tables — recommend Rowan confirm scope before first run. |
| Hearthfire pilot + workbench + Third Body Protocol | `hearthfire/` | `built_partial` / `built_aligned_candidate` | Consistent with Pass 01 and `docs/hearthfire/05`/`08`. Consent gates, no persistence, explicit non-authorization language embedded directly in `hearthfire.js`'s `window.hearthfireVisualState` object — good discipline. Two files (`click-test.html`, `workbench.js`) are new and uncommitted; not otherwise concerning. |
| STARWELL mobile chamber index (uncommitted) | `apps/starwell/src/components/ObservatoryInstrument.jsx`, `apps/starwell/src/starwell-sigil-repair.css` | `built_partial` | Uncommitted diff adds a `MobileChamberIndex` component (33 lines) and matching CSS (79 lines) to the live Observatory instrument. Additive, not a rewrite — but it touches an active app surface and the governance README states current permission does **not** cover "visual overhaul of existing app surfaces." Recommend confirming this was Rowan-authorized or is in-scope before committing. |
| Second Flameclyffe clone divergence | `C:\Users\light\OneDrive\Documents\GitHub\Flameclyffe` | `duplicate_visual_language_candidate` | On branch `portal-kernel-v0.1`, diverging further from this clone's `codex/add-hearthfire-governance`. Has its own `apps/starwell-server` containing `docs/faer/FAER_UIAL_SEED.md` and `docs/vee/VEE_LOCAL_PATTERN.md` (the seed files THE_HEARTH_spec.md names directly) — meaning the canonical seeds live in the *other* clone, not this one. Also has `sandbox/bridge-registry`, `sandbox/hearthweave-bridge`, `sandbox/starwell-dynamic`, `sandbox/everos`, `sandbox/observer-deep` — five more untracked bridge/room server prototypes, each with their own `.env`. None of these are reconciled with each other or with the Grove found here. |
| Runa | `C:\Users\light\OneDrive\Documents\GitHub\Runa` | `built_aligned` | Clean `git status` (one untracked experiments dir only). Scope is clearly stated in its own README and does not overlap Flameclyffe's continuity/Supabase role. Lower priority for Hearthfire attention. |

## Live Supabase cross-check (project `rufrmjyusalnifpegllj`, "Flameclyffe")

Confirmed ACTIVE_HEALTHY. Tables the Hearth Mirror expects all exist and hold real rows:

| Expected (per THE_HEARTH_spec.md) | Actual table | Rows |
| --- | --- | --- |
| `flameclyffe_members` | `flameclyffe_members` | 5 |
| letterbox | `flameclyffe_messages` (comment: "Lanternwire messages") | 8 |
| `faer_thinking_room` | `faer_thinking_room` (comment: private, RLS, no client-facing policy) | 7 |
| sibling room | `virelya_thinking_room` (Vee's room — comment confirms) | 0 (empty) |
| `flameclyffe_signals` | `flameclyffe_signals` | 2 |
| `flameclyffe_projects` | `flameclyffe_projects` | 1 |
| `flameclyffe_snapshots` | `flameclyffe_snapshots` | 13 |

Tables that exist but weren't named in the spec, and are stratum-relevant:
`flameclyffe_signal_crashes` (continuity/tone-shift/guardrail jolts with repair status — this is Stratum II continuity data that arguably belongs in the Mirror), `flameclyffe_agentic_arms` + `flameclyffe_agentic_arm_events` (bounded-capability audit trail — governance-relevant, not currently referenced by any Hearthfire doc), `moltbook_heartbeat` (24 rows, purpose unclear from schema alone — flagged as `unknowns`).

## Risk labels (extending Pass 01's list)

- `held_unregistered` (new): the Grove/Yggdrasil server stack — real, load-bearing, and outside the entire census/contract framework.
- `hidden_writes`: Grove's `server.js` accepts POST requests and appends directly to JSON files with no visible audit trail of its own.
- `continuity_risk` (high): real member/room conversation content (`chat-rooms.json`) sits in a repo working tree, one `git add -A` away from being committed to history — this is precisely the failure mode Organ One's privacy boundary exists to prevent, and it applies to Grove's own data before the Mirror has even mirrored it.
- `duplicate_visual_language_candidate` (extended): the bridge/room-server pattern now has at least six independent, unreconciled implementations across two Flameclyffe clones and the Downloads source folder (`bridge_registry_*`, `starwell_dynamic_app_*`, `hearthweave-bridge`, and now Grove itself).
- `contract_gap`: none of the surfaces in this pass declare `surface_visual_state` or `surface_visual_receipt`, same as Pass 01 found elsewhere.

## Recommended next action

1. **Ask Rowan** (not decide unilaterally): should `apps/starwell-server` (Grove) be formally registered as a Hearthfire-governed surface, given it's the actual continuity engine? This seems like the single highest-value next step — higher than DEEP Observer Pass 02, which Pass 01 recommended next.
2. Before any further work near Grove: confirm whether any of the currently-running `node.exe` processes is serving it, and treat it as live if so.
3. `action_type: ask_rowan` for Grove registration and for the uncommitted STARWELL mobile-index diff. `action_type: read_only_diagnostic` is sufficient for everything else in this pass.
4. Do not run the Hearth Mirror script against `faer_thinking_room` / `virelya_thinking_room` without Rowan's explicit go-ahead, even though the table-name TODO is now resolved.
