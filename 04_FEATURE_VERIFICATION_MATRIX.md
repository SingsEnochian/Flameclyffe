# 04 · FEATURE VERIFICATION MATRIX

**Scope:** ArcSweep living line  
**Baseline SHA:** `06a06c620d37965d8a2f7afe6acf91a11ca83fbb`  
**Captured:** 2026-08-30 America/New_York  

Status vocabulary follows the Forge contract:

- `ENVISIONED`
- `SPECIFIED`
- `MOCKED`
- `PARTIAL`
- `FUNCTIONAL`
- `VERIFIED`
- `RELEASED`

`VERIFIED` requires named evidence beyond code existence.

| Feature / organ | Status | Existing evidence | Missing acceptance evidence / next gate |
| --- | --- | --- | --- |
| ArcSweep canonical shell / navigation | FUNCTIONAL | Real `apps/arcsweep` application; canonical applet catalogue; room graph; creative/sound sidecar loading; route-integrity tests | Physical/browser navigation QA, failure-state navigation, supported-device acceptance |
| World Registry | FUNCTIONAL | Canonical world surface and populated `starwell_worlds` | Deeper character/location/timeline population; cross-store authority proof |
| House Chat authoritative surface | FUNCTIONAL | Native House Chat authority, room management, tools, live runtime roster, portable transport | Real production multi-Flame persisted conversation + reload + runtime receipt |
| Semantic rich text | FUNCTIONAL | Semantic formatted-text spine integrated with House Chat / narrative modes | Paste/edit/long-message/reload fidelity on real browser/device |
| Chat mode | FUNCTIONAL | Native House Chat runtime mode | Durable mode-specific runtime receipt and replay |
| Roleplay mode | FUNCTIONAL | Shared Fantasy Roleplay skill/runtime and participant-view receipts | Real routed model roleplay persisted and replayed without voice collapse |
| Story mode | FUNCTIONAL | First-class Story semantics and narrative circuit support | Production/restart evidence proving mode identity is retained |
| Narrative semantic circuit | FUNCTIONAL | Semantic source contract, semantic transition contract, immutable narrative arrival receipt, narrative circuit tests | Durable House-ledger circulation through runtime/review/replay |
| Hearthweave semantic lexicon | FUNCTIONAL | Mainline lexicon and protected narrative-circuit tests | Use in live narrative receipt/replay acceptance rather than code-only presence |
| Ox Alpha portable route | FUNCTIONAL | Host-neutral route and OpenRouter-backed portable inference path on main | Production route receipt under current runtime capacity, plus fallback truth |
| Constellation runtime roster | FUNCTIONAL | Roster derived from runtime presence and visible selector | Two distinct live model routes with provider/model identity and durable events |
| Constellation runtime diversity | PARTIAL | Distinct manifests/routes and OA path exist | Prove multiple genuinely distinct model executions; no silent generic-model flattening |
| Durable ArcSweep workspace state | FUNCTIONAL | Cross-host durable workspace mirror; persisted operator/private-workspace data | Authority/conflict model across browser, Supabase, native/offline; reconnect proof |
| House Commons | FUNCTIONAL | Persistent Commons ledger populated | Long-session/reconnect/replay proof; attachment persistence currently unproven |
| Commons attachments | PARTIAL | Storage/attachment contracts exist | Real persisted attachment row, retrieval and access-control acceptance |
| Source sync organism | FUNCTIONAL | Populated roots/runs/items/revisions/edges/content segments | Ongoing integrity/recovery QA and disclosure-boundary acceptance |
| Source Library | FUNCTIONAL | Populated document catalogue and extracted segments | Real query receipts linking exact segments to model/runtime outputs |
| Source Library query receipt | SPECIFIED | Durable table exists and roadmap contract now defined | First genuine receipt; reproducible segment set; private/reference-only boundary proof |
| Non-Canon Ingest | FUNCTIONAL | Canonical ArcSweep collection room with explicit non-canon boundary | End-to-end ingest → source identity → review → optional canon-candidate path |
| Canon Studio | FUNCTIONAL | Canon Studio surface exists and is distinct from records/non-canon intake | Explicit candidate → Steward review → canonical registry receipt |
| Records Room | FUNCTIONAL | Receipted record schema and Canon Carry fields | Persist/reload/replay and Canon Carry acceptance against real records |
| Timeline surface | FUNCTIONAL | Canonical ArcSweep timeline room exists | Populate canonical timeline registry and prove cross-world linkage |
| Relationships surface | FUNCTIONAL | Canonical relationships room exists | Populate canonical relational graph and prove provenance/authority |
| Echo Index | ENVISIONED / MISSING | Original ArcSweep requirement remains; no authoritative current implementation found in main audit | Implement resolver across existing stores; no duplicate database; route/search/failure tests |
| Replay / Continuity Recall | FUNCTIONAL | Canonical replay entrance and narrative/continuity machinery | Full durable runtime + creative + narrative reconstruction after restart |
| Continuity Gate | FUNCTIONAL | Recovered creative/continuity organ and guarded integration | Live fail-closed proof with provenance and restart recovery |
| Glyph Forge | FUNCTIONAL | Existing Glyph Studio deliberately reused and mounted through creative organ registry | Real stylus/material stroke persistence, export/import and physical QA |
| Brush Foundry | FUNCTIONAL | Existing studio deep-link and creative-organ integration | Three-material behavioural acceptance in current integrated path; stylus QA |
| Living Glyph | FUNCTIONAL | Real Living Glyph implementation and ArcSweep organ registration | Deterministic integrated transformation → persistence → replay proof |
| Font / glyph handoff | FUNCTIONAL | Font Foundry / FontForge integration is registered | Real generated glyph/font handoff acceptance across restart/export |
| Sound organ registry | FUNCTIONAL | Sound/resonance organs restored as first-class instruments | Actual-device audio acceptance and receipt lineage |
| Sound Bank | FUNCTIONAL | Explicit persistent Sound Bank state and in-room sound rail | Reload/device-routing validation and failure-state truth |
| SoundFont runtime | FUNCTIONAL | Static-host worklet repair and loader contracts | Real-device playback and long-session QA |
| Runa binding | FUNCTIONAL | Canonical Runa engine/surface bound into sound organ spine | Five-phase workflow acceptance, state→sound receipt lineage, Feather Stop physical proof |
| Aemeth Chamber | FUNCTIONAL | Rich collection-room contract, route truth, OA transport/status and production-smoke tests | Live session acceptance with witness/model/interpretation separation and durable replay |
| Observer feed registry / ingestion | FUNCTIONAL | Populated feed registry and ingestion runs | Convert real intake into canonical measurements and review chain |
| Observer measurements | SPECIFIED | Append-only measurement store exists | First real supported normalized measurement with provenance/uncertainty |
| Observer anomaly windows | SPECIFIED | Versioned anomaly store exists | First reviewed measurable departure; no causation inflation |
| Observer correlation receipts | SPECIFIED | Correlation receipt store exists | First traceable correlation linking measured evidence without causal claim |
| DEEPTime | PARTIAL | Architecture/contracts and durable table exist | First accepted trajectory, replay hash, time/provenance chain |
| PREMAQC circulation | PARTIAL | Shared contracts and semantic usage exist | First accepted evidence → PREMAQC state/path in durable circulation |
| Math Spine packets | SPECIFIED | Durable packet table and runtime contracts exist | First real packet linked to accepted evidence and downstream receipt |
| ArcSweep feedback cycle | PARTIAL | Feedback runtime/tests/workflow exist | First legitimate durable cycle row |
| ArcSweep feedback review | PARTIAL | Review architecture exists | First explicit review row linked to cycle and downstream replay |
| House runtime events | PARTIAL | Runtime transport and model surfaces exist | Critical gate: first genuine persisted runtime event; then second distinct Flame |
| WILD emergence lane / Bridge Network | PARTIAL / BRANCH | PR #250 contains reviewed branch work and isolated WILD lane | Current-main reconciliation, exact-head gates, Steward merge decision |
| Browser House smoke | FUNCTIONAL | Explicit browser smoke instrument exists in current main | Current production execution evidence, not merely embedded instrument |
| Production health panel | FUNCTIONAL | Sidecar health panel mounted | Live production-health snapshot tied to deployed SHA |
| GitHub Pages production publisher | FUNCTIONAL | One canonical Pages publisher enforced in mainline workflow | Record actual deployed SHA and run browser acceptance against it |
| Vercel authenticated production smoke | PARTIAL / BLOCKED | Workflow exists | Current baseline run was skipped; no verified Vercel production receipt for this audit |
| Desktop / Windows packaging | PARTIAL | Packaging/staging commands and workflow exist | Current-main package/install/launch/persist/restart acceptance |
| iPhone | PARTIAL | Responsive/mobile surfaces exist | Physical navigation, House Chat, reload/reconnect acceptance |
| iPad / stylus | PARTIAL | Responsive and creative surfaces exist | Physical Pencil/stylus workflow, long-session and export/replay acceptance |
| Offline / reconnect | PARTIAL | Durable/local-first components exist | Deterministic offline change, reconnect sync, conflict receipt and recovery proof |
| Export / import / recovery | PARTIAL | Worldseed/creative/persistence components exist | End-to-end identity/receipt preservation through export/import/restart |
| Accessibility / reduced motion / keyboard | PARTIAL | Accessibility principles and component support exist | Named physical/browser acceptance evidence |
| Boxfire QA gate | SPECIFIED | Boxfire review role and multiple CI/test surfaces established | Final evidence review across roadmap stages; no self-verification shortcut |

## Current critical zero-ledger gates

At the 2026-08-30 audit, the following persisted circulation ledgers remained empty and therefore block an overall `VERIFIED` claim:

- `observer_measurements`
- `observer_anomaly_windows`
- `observer_correlation_receipts`
- `math_spine_packets`
- `arcsweep_feedback_cycles`
- `arcsweep_feedback_reviews`
- `arcsweep_deep_time_records`
- `house_runtime_events`
- `source_library_query_receipts`

These are not all equally urgent. The dependency order is defined in `03_ACTIVE_ROADMAP.md`.

## Verification law

A row count alone is not acceptance. A stage becomes `VERIFIED` only when the row/receipt is:

1. produced by the intended real workflow;
2. linked to its source identity and provenance;
3. inspectable through the relevant user/runtime surface;
4. restart/replay safe where applicable;
5. honest about failure, fallback and uncertainty;
6. covered by named tests and, where relevant, physical/browser evidence.
