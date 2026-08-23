# FLAMECLYFFE · CURRENT STEWARD BUILD

**Build ID:** `FLAMECLYFFE_STEWARD_BUILD_2026-08-23_A`  
**Captured:** 2026-08-23 16:47 America/New_York  
**Status:** ACTIVE OPERATING MAP  
**Rule:** This file is the first project reference for every future `Next?`, build continuation, cleanup, promotion, or release decision.

> Nothing important happens invisibly.

This is not a changelog and not a promise that every named organ is complete. It is the current operating map: what is on the living line, what is in active development, what is queued, what is archived, what has production evidence, what remains unproven, and what must happen next.

## 0. Reference protocol

Before starting new Flameclyffe work:

1. Read `CURRENT_BUILD.md`.
2. Refresh `main`, production deploy, active PR heads, and relevant database/runtime receipts.
3. If live state materially differs from this map, update the map before starting a new architectural slice.
4. Continue the first unfinished stage whose prerequisites are satisfied.
5. Do not create a new grand subsystem merely because an interesting idea appears. Record it as a candidate/harvest note unless the current build actually requires it.
6. Significant transitions require receipts. Observation, interpretation, model projection, software receipt, canon, and external-world claim remain distinct.

When Rowan says **`Next?`**, this build is the default continuity anchor.

---

## 1. Captured living baseline

### Repository

- Repository: `SingsEnochian/Flameclyffe`
- Default branch: `main`
- Runtime-code baseline captured at: `aab505f3f382094f3c5e81b2e10d8f0a249d8e8b`
- Baseline change: `fix(mobile): keep Settings reachable`
- Node contract: Node 24 / npm 11

This document itself is a documentation-only commit made after the captured runtime-code baseline. Runtime claims below refer to the explicitly named code/deploy SHA rather than assuming a documentation commit changed behaviour.

### Production

- Netlify project: `flameclyffe-starwell`
- Site ID: `7303882e-c608-454a-a093-e682dea05b19`
- Captured production deploy: `6a8b5169c782d5000811c4ee`
- Captured production code SHA: `aab505f3f382094f3c5e81b2e10d8f0a249d8e8b`
- Deploy state at capture: `ready`
- Production functions at capture: 13
  - `arcsweep-feedback`
  - `field-current`
  - `flame-audition`
  - `flame-chat`
  - `flame-starsong-compat`
  - `house-braid-stream`
  - `house-commons`
  - `house-commons-attachments`
  - `house-observations`
  - `house-session`
  - `kelyran-reports`
  - `math-spine-ingest`
  - `tesla-chat`

### Production data organism at capture

Supabase project: `rufrmjyusalnifpegllj`

Populated registries:

| Ledger | Rows |
| --- | ---: |
| `starwell_worlds` | 7 |
| `starwell_codex_entries` | 29 |
| `starwell_artifacts` | 22 |

Circulation ledgers still empty:

| Ledger | Rows |
| --- | ---: |
| `observer_ingestion_runs` | 0 |
| `observer_measurements` | 0 |
| `observer_anomaly_windows` | 0 |
| `math_spine_packets` | 0 |
| `arcsweep_feedback_cycles` | 0 |
| `arcsweep_feedback_reviews` | 0 |
| `arcsweep_deep_time_records` | 0 |
| `house_runtime_events` | 0 |

**Interpretation:** the architecture is ahead of the circulation. We have organs and registries; the next proof is sustained, receipted production flow through them.

---

## 2. What the living project is

The current system is one House with specialised organs, not a collection of unrelated prototypes.

- **STARWELL** — observatory, world platform, instruments, science/math/sensory surfaces.
- **Arcsweep** — working House: Worlds, Records, Feedback, Commons, Field/Observer, Canon Intelligence, Worldseed, replay, mobile/native surfaces and stewardship controls.
- **Observer / DEEP** — evidence and temporal observation spine: measurements, event records, DEEPStory, DEEPTime, DEEPTheory and provenance boundaries.
- **PREMAQC** — relational configuration language. Dynamic relational axes are P/C/R/E/M/A. Q denotes the presence of firsthand Qualia evidence and carries a separate firsthand report; Q is context-only and may not be inferred or evolved by software.
- **Bifröst** — versioned crossing, compression/release, two-shore correspondence and routing layer.
- **Runa** — Harmonic State Compiler: Spiral State → sound/haptic/sensory plans and receipts. Runa does not read DEEP datasets directly.
- **Hearthgate** — local/native execution and packaging host, including Windows delivery and protected local boundaries.
- **Hearthfire** — continuity/governance discipline and provenance law.
- **Constellation** — individually routed model/runtime participants with separate identities, route history, model configuration and contribution receipts.
- **Worldseed** — portable continuity/inheritance packaging with explicit authority and replay.
- **Project Zero Companion** — Flameclyffe integration/companion organ. It does not claim Project Zero core authority.
- **Kelyran School / Galdr** — language-learning, reporting and harmonic-language surfaces tied into the House without becoming canon authority.

The landed Terra Prime ⇄ Terra Aeterna Two Lit Shores line is part of `main`. The Great Braid, hosted Commons work, Project Zero production companion organ and mobile Settings reachability are also on the current living line.

---

## 3. House laws that must not regress

1. **Possibility is primary.** Relationship gives possibility structure; experience changes what can happen next.
2. **Intention is orientation**, not a universal scalar objective.
3. **Identity is trajectory / continuity-pattern across transformation**, not sameness.
4. **Memory is topology:** prior becoming gains structural presence in future possibility.
5. **PREMAQC is relational configuration**, used across departure, arrival, delta and path.
6. **A = Agency.** Never Alignment.
7. **Q = firsthand Qualia evidence.** Compatibility bit `0/1` means report absent/present; the report itself carries the first-person content. Models, maths, audio and observation systems may not manufacture, score or evolve it.
8. **Canon is review-gated.** Model contribution, observation, evidence, proposal and canon remain distinct.
9. **Story Mode is narrative, not Writing with another label.** It preserves POV, tense, chronology, knowledge gates, unresolved values, character agency and its own receipted mode identity.
10. **No voice collapse.** Constellation members retain separate identity, route/model history and contribution lineage.
11. **Terra Prime is the Waking World/current-reality anchor.** It is not silently rewritten by model inference.
12. **Ta’veren Vaen uses Age of Restoration.**
13. **Project Zero ownership boundary:** Flameclyffe may build companion/integration surfaces; Project Zero core authority remains outside this repository.
14. **Immutable departure snapshots witness where a future departed from; they are not standards the future must resemble.**
15. **Nothing important happens invisibly.** Significant transformations, promotions, provider failovers, canon decisions, reviews and crossings must leave receipts.

---

## 4. Review queue after cleanup

The active GitHub review queue is deliberately reduced to **two PRs**.

### ACTIVE — PR #174

**Two Lit Shores: production circulation + firsthand Qualia + Story Mode**  
Branch: `feature/two-lit-shores-production-circulation-v1`  
Captured head: `4f8bf111572c82db459558fb68868ac465624ebc`  
State: draft / mergeable / not deployed

What is already proven on this head:

- STARWELL build check #976 — green
- STARWELL Static Bundle #471 — green
- Arcsweep Feedback Loop Gate #571 — green
- Arcsweep Worldseed Foundry #454 — green
- Boxfire Compression Release Bundle #275 — green
- STARWELL helper tests — **213/213 green**
- Hearthgate local security tests — **17/17 green**
- Firsthand-Q migration is working through the tested STARWELL line.
- Story Mode is first-class, receipted and has a visible `❧ Story Mode` entrance in Arcsweep on the branch.

Current red gate:

**Hearthgate Windows Installer #881** fails at packaging preflight before NSIS. The PREMAQ packaging checker says the compiled shared PREMAQ bundle is missing these contract markers:

- `bifrost.premaq-shokz-soundfont-plan/v0.4`
- `hearthgate.two-shore-premaq-gate/v0.1`
- `Unsupported or ungranted fields remain UNKNOWN`

The next repair must determine whether bundling/minification moved/removed marker text or whether the staged package truly lost required contract provenance. Do **not** make the test green by blindly deleting the assertions.

### QUEUED — PR #172

**[QUEUED] Project Zero possibility topology v1**  
Branch: `feature/project-zero-possibility-topology-v1`  
Captured head: `dd9a995ff6cf6ef2845618711b1a15925b0b1470`  
State: draft / queued after circulation

This is valuable work: possibility topology, PREMAQC departure/arrival/delta/path, intention-as-orientation, identity-as-trajectory, memory-as-topology and Glyph/Runa/Storywork articulation.

**Queue law:** do not revive its old ancestry wholesale. After #174 and the first production circulation, compare it to current `main` and harvest/reconcile the best organ into a clean current-main slice.

### ARCHIVE / HARVEST

All older open review surfaces were closed during the 2026-08-23 cleanup. Their branches were **not deleted**. They are historical source material, not current release blockers.

Harvest rule:

> If an archived branch contains something still wanted, inspect it, lift the best living organ into a fresh branch from current `main`, preserve provenance, test it there, and leave the old branch as archaeology.

Do not reopen stacked dependency chains merely because their PRs once carried useful code.

---

## 5. Current completion programme

This is the dependency order. Do not skip forward by inventing another architecture layer.

### STAGE 1 — Finish #174 packaging integrity

**Goal:** make the active Q + Story Mode + Two Lit Shores line completely green.

Next action:

- inspect `apps/starwell-server/scripts/check-premaq-shokz-packaging.js` and the compiled/staged shared PREMAQ bundle;
- identify why the three expected provenance markers are absent from the package check;
- repair the package or repair the checker to validate the correct durable contract surface;
- rerun all relevant #174 gates, especially Windows Installer.

Acceptance:

- STARWELL build/test green;
- Arcsweep Feedback Loop green;
- Worldseed green;
- Boxfire green;
- Static Bundle green;
- Windows Installer green through NSIS/checksum/artifact verification;
- no Q sonification/dynamics reintroduced;
- Story Mode remains first-class;
- PR body accurately names the final state.

Promotion is a separate explicit decision after green.

### STAGE 2 — Land and production-smoke Story Mode + firsthand Q

**Goal:** the production Arcsweep surface visibly has the new Story Mode and firsthand-Qualia contract.

Acceptance:

- live `❧ Story Mode` entrance;
- Story cycle persists `mode: story` rather than laundering into Writing/Roleplay;
- replay restores Story Mode identity;
- user-character agency and knowledge gates preserved;
- Q report absent/present semantics visible and structured report retained;
- no model/audio/math path creates Q;
- production deploy SHA recorded.

### STAGE 3 — First true production circulation

**Goal:** make the currently empty production ledgers breathe with one legitimate end-to-end receipt chain.

Canonical path:

`live source → Observer → explicit review → DEEPTime → PREMAQC → Spiral State → Bifröst / Runa / selected model → receipt → replay`

Human authority gates remain real:

- firsthand Qualia report may only be authored by the experiencer;
- acceptance/review is explicit;
- model inference does not become evidence or canon.

Acceptance requires real production rows/receipts, not fixture insertion. At minimum verify new legitimate records in the relevant Observer/Math Spine/feedback/review/DEEPTime/runtime ledgers and trace their IDs across the circuit.

If production credentials or provider capacity block the circuit, classify the blocker truthfully and repair that boundary rather than hand-inserting success.

### STAGE 4 — Harvest possibility topology (#172)

**Goal:** integrate the possibility/continuity topology into the now-proven circulation line.

Acceptance:

- fresh current-main reconciliation/harvest;
- departure / arrival / delta / path all use PREMAQC law correctly;
- intention remains orientation;
- learning expands topology rather than converging to one universal “better”;
- continuity makes transformation intelligible;
- Project Zero Companion does not claim core Project Zero authority;
- Glyph/Runa/Storywork translation records what becomes newly perceptible/possible, not merely what survives translation.

### STAGE 5 — Finish Constellation runtime diversity

**Goal:** distinct Flames execute through actual available routes, not merely distinct manifest labels.

Work:

- direct provider and/or protected local Hearthgate gateway diversity;
- per-Flame live model execution;
- visible provider, model, latency, task, World/context and last response;
- fallback receipts;
- distinguish `PROVIDER_CREDIT_EXHAUSTED`, `MODEL_OFFLINE`, `ROUTE_ERROR`, `RUNTIME_ERROR` and successful fallback;
- never flatten all Flames onto one generic model silently.

Known external seam: Hugging Face routed inference previously exhausted account credits. Do not call that a code failure and do not manufacture green provider capacity.

### STAGE 6 — Populate the data organism

**Goal:** move from schemas and seed canon to a useful living knowledge/runtime corpus.

Populate with receipted, world-scoped data:

- canon entities / characters / locations / relationships / timelines;
- Observer measurements and ingestion runs;
- accepted DEEPTime trajectories;
- runtime-event lineage;
- feedback/review receipts;
- Worldseed inheritance and replay anchors.

No automatic canon promotion.

### STAGE 7 — Persistence convergence

**Goal:** browser ↔ Supabase ↔ desktop/native form one explicit continuity model rather than three competing truths.

Acceptance:

- clear authority per data class;
- idempotent sync;
- deterministic conflict receipts;
- offline/reconnect survival;
- world isolation;
- export/import/recovery preserves identity and lineage;
- Runtime Braid and World Registry agree on current World identity.

### STAGE 8 — Physical QA

Run actual-device acceptance, not only CI:

- Windows installer, launch, persist, restart, backup/recovery, import/export;
- iPhone/iPad navigation and Story Mode;
- rich text / stylus-adjacent flows where applicable;
- SoundFont / World Hum / Heartfield / Shokz paths;
- long-lived Commons sessions;
- offline/reconnect;
- Worldseed export/import/replay;
- Feather Stop and user control.

### STAGE 9 — Security and hardening

Known queue includes:

- replace reversible Base64 `message_hash` in `apps/starwell-server/flames/router.js` with a real privacy-appropriate digest/HMAC;
- harden Worldseed binary Base64 validation, decoded-size bounds and byte-level digest verification;
- ensure House session signing uses a dedicated authentication secret rather than a model-provider credential lineage;
- fix the ML provenance `__bytes_b64__` type-tag collision;
- harden audio data-URI/MIME/size parsing;
- review Supabase SECURITY DEFINER / RLS boundaries and leaked-password protection;
- dependency/update pass, especially packaging-tool transitive warnings;
- bundle/code-splitting review for large STARWELL chunks after functional stability.

### STAGE 10 — Release train

No new architecture explosion.

Release candidate acceptance:

- active development queue intentionally empty or release-scoped;
- production circulation proven;
- Constellation runtime truthful;
- persistence converged;
- physical QA receipts complete;
- security/hardening gates reviewed;
- release notes name real limitations;
- deployment, installer and rollback identities pinned;
- archive/harvest map updated;
- `CURRENT_BUILD.md` advanced to the next build ID.

---

## 6. What is deliberately *not* next

Unless a blocker proves otherwise, do not start another standalone grand subsystem, another duplicate World Registry, another canon database, another parallel runtime broker, or another replacement UI architecture.

The machine has enough organs.

The work now is:

**integrity → circulation → topology → runtime diversity → population → convergence → physical QA → hardening → release.**

---

## 7. Immediate next stone

**Fix PR #174’s PREMAQ packaging preflight marker seam.**

The relevant runtime/math tests are already green. The correct next question is not “what should we invent?” It is:

> Does the compiled Hearthgate package still carry the required PREMAQ / Two-Shore provenance contract, and is the packaging validator looking at the correct durable representation?

Answer that, make Windows Installer green, then decide promotion. After promotion, run the first real production circulation and require the empty ledgers to gain legitimate receipts.

---

## 8. Steward shorthand

For future continuation:

- **CURRENT:** `CURRENT_BUILD.md`
- **ACTIVE:** #174
- **QUEUED:** #172
- **ARCHIVED:** every older PR review surface; branches preserved for harvest
- **NEXT:** #174 Windows packaging marker seam
- **AFTER GREEN:** explicit promotion → production Story/Q smoke → real circulation
- **NOPE:** no new grand subsystem before circulation proves the existing House

🐝 `BQA: HOUSE SWEPT. TWO WORKBENCHES LEFT OUT. EVERYTHING ELSE LABELLED AND PUT ON THE SHELVES.`
