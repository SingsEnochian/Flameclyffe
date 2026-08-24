# Bifröst Agent Integration Workflow

Date: 2026-08-04
Branch: `feature/bifrost-arcsweep-current-ui-v0.4`
Status: active draft workflow for agent execution and Boxfire review

## Purpose

Make Bifröst the shared operational seam between STARWELL, Hearthgate, Arcsweep, Glyph Studio, Brush/Stylus authoring, Houses, UI, tone/haptic routing, canon-library work, and platform packaging.

The target is one coherent unit with platform adapters, not separate products wearing similar names.

The unit must run in these lanes:

- Windows: installed Hearthgate / STARWELL desktop shell with local services and durable local data.
- iPad: installable PWA first, with iPad-safe touch, stylus, audio, offline, and safe-area behaviour.
- Android: installable PWA first, with touch, pointer, audio, offline, and responsive behaviour.

Native wrappers may be added later, but the shared web/PWA kernel remains the first common body.

## Governing law

```text
one shared state
→ one Bifröst bridge packet
→ one STARWELL/Hearthgate shell
→ platform adapters
→ receipted outputs
```

No subsystem may invent a rival active truth. STARWELL, Hearthgate, Arcsweep, Glyph Studio, Brush Studio, Houses, tone routing, haptics, and UI all consume the same active Bifröst session contract.

The compression-release law remains active:

```text
compression
→ release
→ compression of the release
→ release
→ infinite continuation
```

Every next operation consumes the preceding released state.

## Non-negotiable product boundary

Bifröst is not a demo route, sidecar toy, or visual-only page. It is the bridge layer that lets the House run as one unit.

The implementation must preserve:

- local-first operation;
- no browser secrets;
- no automatic canon writes;
- no automatic tone approval;
- no autoplay;
- Feather Stop and Stop & Close;
- explicit audio/haptic/device-fidelity labels;
- inspectable receipts;
- separate observable and experiential aspects;
- platform-specific adapters without platform-specific truth forks;
- Notion as authored canon/source registry where declared;
- GitHub as implementation and release receipt source;
- Supabase as archive/provenance layer where explicitly routed;
- local desktop/PWA storage as user data authority for runtime state.

Forbidden drift:

- duplicate Bifröst implementations with incompatible state;
- hardcoded Node/runtime versions outside the repository runtime law;
- `clone` language in Arcsweep/Hearthgate interfaces;
- direct browser Supabase service-role access;
- unlabelled physical or metaphysical claims;
- unreceipted persistence mutation;
- UI-only completion claims for engines that are metadata-only;
- destructive migration of local projects, glyphs, brushes, scripts, or House profiles.

## Agent roles

Each agent run must choose one role and one bounded slice. Multiple agents may work in parallel only when their files and authority surfaces do not collide.

### 1. Bifröst Architect

Owns the bridge contract, shared state, interface boundaries, and dependency order.

Tasks:

- maintain the active Bifröst manifest;
- define the shared session packet shape;
- map Bifröst to STARWELL, Hearthgate, Arcsweep, Glyph Studio, Brush Studio, Houses, and platform adapters;
- block rival active-state stores;
- keep compression-release receipts chained.

Exit receipt:

- updated contract/schema/docs;
- tests or fixtures proving same-state binding;
- list of downstream agent tasks.

### 2. STARWELL UI Weaver

Owns the visible shell, navigation, route discovery, theme/vestment grammar, responsive layout, and accessibility states.

Tasks:

- make Bifröst a first-class STARWELL room;
- ensure the theme switcher affects the whole site;
- ensure Faer's vestments load last where declared;
- expose Arcsweep, Glyph Studio, Brush Studio, Houses, and Bifröst through one room grammar;
- add empty/loading/error/degraded/offline states;
- keep keyboard and touch paths equal.

Exit receipt:

- route and UI files changed;
- screenshot/preview route or fixture when practical;
- reduced-motion and focus-state checks.

### 3. Hearthgate Runtime Steward

Owns Windows desktop execution, local service launch, local data paths, installer packaging, and recovery receipts.

Tasks:

- route Bifröst through the installed Hearthgate body;
- start/stop local services safely;
- keep mutable data under writable user data directories;
- preserve desktop launch and installer workflows;
- provide health, import/export, backup/restore, and crash diagnostics;
- verify Windows installed and portable flows.

Exit receipt:

- installer/build workflow result;
- startup/recovery receipts;
- manual physical Windows test status when available.

### 4. Arcsweep Continuity Steward

Owns world/session continuity, Canon Library bridge, active House/world selection, scripts, timelines, and Waking Thread.

Tasks:

- bind Arcsweep active world to the Bifröst active packet;
- prevent rival active world/session state;
- connect Canon Library bridge without silent imports;
- support local/offline mirror and explicit rollback;
- preserve Notion-source identity and local overrides;
- keep `Waking Thread / Continuity Log` as the interface term.

Exit receipt:

- session binding tests;
- import/export/rollback fixtures;
- visible degraded state when desktop bridge is absent.

### 5. Glyph and Brush Studio Steward

Owns glyph generator, stylus support, raster/vector layer compatibility, brush engine, import/export, and cross-tool asset handoff.

Tasks:

- treat Glyph Studio and Brush Studio as authoring workspaces inside the same House unit;
- preserve existing project JSON compatibility;
- implement Pointer Events for mouse/touch/stylus;
- support pressure/tilt when available and gracefully degrade when absent;
- keep brush shape, grain, spacing, jitter, opacity, blend mode, eraser, smudge, clipping, mask, selection, and transform work staged in dependency order;
- connect glyph/brush assets to Houses and Bifröst receipts without forcing canon promotion.

Dependency order:

1. raster compositor and reversible raster history;
2. native brush dab engine: shape, grain, spacing, jitter, pressure, tilt;
3. eraser and smudge modes;
4. alpha lock, clipping, and mask compositing;
5. selection and transform tools;
6. `.brush` / `.brushset` import adapters with compatibility receipts;
7. shared asset tray and cross-tool handoff;
8. physical iPad / Apple Pencil validation harness;
9. Windows packaging verification.

Exit receipt:

- drawing/project compatibility tests;
- pointer/stylus degradation matrix;
- saved project roundtrip proof.

### 6. House Registry Steward

Owns Houses, world reception profiles, canon/source boundaries, PREMAQ transfer functions, and profile registration.

Tasks:

- make every House/profile load through the same Bifröst session seam;
- keep canon foundation and project overlay separate;
- expose House-specific tone, UI, glyph, brush, script, and arrival metadata;
- never auto-approve a tone or canon mutation;
- keep Rowan-owned calibration gates explicit.

Exit receipt:

- profile registry updates;
- schema validation;
- visible profile/source/provenance status.

### 7. Platform Adapter Steward

Owns Windows, iPad, Android, PWA, offline, responsive, and installability behaviour.

Tasks:

- keep the web/PWA kernel common;
- provide Electron/Windows as an adapter, not a divergent product;
- provide iPad/Android installability through manifest, service worker, safe-area, touch, and offline routes;
- label unsupported hardware features honestly;
- ensure no platform silently loses Feather Stop, export, import, or accessibility controls.

Exit receipt:

- PWA artifact check;
- service worker/offline relaunch proof;
- Windows installer result;
- iPad/Android manual test checklist.

### 8. Consent, Accessibility, and Safety Steward

Owns consent gates, no-autoplay law, audio/haptic boundaries, reduced motion, readable status, keyboard access, and stop controls.

Tasks:

- enforce `no autoplay` on every sound/haptic path;
- require user activation for AudioContext;
- keep Feather Stop immediate and global;
- stop sound on page hide and route change;
- ensure reduced motion disables JS motion, not only CSS animation;
- keep AR/stylus/touch controls keyboard-accessible where possible;
- label physical-device claims as not tested until tested.

Exit receipt:

- consent tests or manual matrix;
- accessibility checks;
- explicit remaining NOT TESTED list.

### 9. Boxfire QA

Owns independent review. Boxfire does not bless intent. Boxfire reviews evidence.

Boxfire statuses:

- PASS;
- PASS WITH NOTES;
- BLOCKED;
- NOT TESTED.

Boxfire must verify:

- the feature exists in code, not just docs;
- the route is reachable;
- state binding is single-source;
- receipts are generated;
- no hidden autoplay exists;
- Feather Stop works;
- reduced motion and keyboard paths work;
- platform claims match tested platforms;
- canon and tone approval boundaries hold;
- local data survives restart/import/export/backup/restore where claimed.

## Work rings

Agents must move in ring order unless a hotfix explicitly targets a smaller safe defect.

### Ring 0 — Inventory and authority lock

Goal: identify what already exists and what is only staged.

Checks:

- active PR stack and branch heads;
- current deployed SHA versus PR head SHA;
- Node/runtime contract;
- routes and entrypoints;
- schemas and manifests;
- Notion/Supabase authority records;
- platform build workflows;
- known blockers.

Acceptance:

- one inventory receipt;
- no merge/release claim until deployment SHA, PR head, and verification matrix agree.

### Ring 1 — Shared Bifröst session kernel

Goal: one active packet and one active state across the House.

Deliverables:

- shared `BifrostSession` contract;
- active world/House/session identifiers;
- DualAspectPacket binding;
- PREMAQ vector plus provenance;
- compression-release receipt chain;
- local reference mode label;
- same-origin/session/local storage strategy;
- desktop bridge handshake when available.

Acceptance:

- tests prove one state source;
- rival active state fails closed;
- local reference mode is labelled.

### Ring 2 — STARWELL shell integration

Goal: Bifröst becomes a first-class STARWELL room and navigation seam.

Deliverables:

- route registration;
- room-rack/rail link;
- theme switcher propagation;
- Faer vestment layer loading last;
- responsive room layout;
- status/degraded/offline panels;
- export and receipt controls.

Acceptance:

- route reachable in web build;
- room visible from STARWELL navigation;
- theme change affects Bifröst and sibling rooms;
- reduced-motion check passes.

### Ring 3 — Hearthgate desktop integration

Goal: same Bifröst runs inside Windows Hearthgate without losing local-first guarantees.

Deliverables:

- Electron route packaging;
- local service health;
- user-data directory use;
- installer artifact;
- backup/restore/export/import path;
- startup diagnostics.

Acceptance:

- Windows installer workflow green;
- installed physical launch marked PASS or NOT TESTED;
- no mutable write beneath Program Files.

### Ring 4 — Arcsweep continuity integration

Goal: Arcsweep active world/session/canon continuity flows through Bifröst.

Deliverables:

- active world/session resolver;
- Canon Library bridge connection;
- Waking Thread / Continuity Log integration;
- local/offline mirror status;
- import/export/rollback receipts;
- canon-foundation/project-overlay separation.

Acceptance:

- Arcsweep route can bind to Bifröst active packet;
- missing desktop bridge shows degraded state, not fake success;
- canon import requires explicit approval.

### Ring 5 — Glyph, stylus, and brush integration

Goal: creative authoring belongs to the same House unit.

Deliverables:

- shared project/asset handoff;
- Pointer Events input adapter;
- pressure/tilt support when available;
- reversible raster/vector layer model;
- brush engine stages;
- project save/load roundtrip;
- export receipts.

Acceptance:

- stylus/touch/mouse degrade correctly;
- existing Glyph Studio projects remain readable;
- saved brush/glyph project roundtrip passes.

### Ring 6 — Houses and profiles

Goal: Houses, world reception profiles, UI, tone, glyph, and scripts share one registered profile seam.

Deliverables:

- House registry adapter;
- per-House profile load;
- source authority labels;
- PREMAQ transfer-function labels;
- tone/glyph/brush/script availability matrix;
- Rowan-owned approval gates.

Acceptance:

- at least Terra Aeterna, Luna, T’averen Vaen, Starsong, Dreaming Grove, Feather & Flame, and A Momento Creationis load as profiles or marked placeholders;
- incomplete Houses are labelled as seed/partial/not started;
- no canon or tone approval occurs automatically.

### Ring 7 — Platform installability

Goal: one shared unit runs on Windows, iPad, and Android.

Deliverables:

- Windows installer and portable bundle;
- installable PWA manifest;
- service worker/offline relaunch;
- safe-area CSS for iPad;
- Android touch/responsive pass;
- platform capability matrix;
- device-fidelity labels.

Acceptance:

- Windows workflow green;
- PWA artifact check green;
- physical iPad and Android tests marked PASS or NOT TESTED, never assumed;
- no platform lacks Feather Stop.

### Ring 8 — Release evidence and Boxfire handoff

Goal: declare only what is actually proven.

Deliverables:

- verification matrix;
- platform matrix;
- Boxfire QA receipt;
- remaining blockers;
- release-notes draft;
- rollback plan.

Acceptance:

- Boxfire PASS or PASS WITH NOTES for release candidate;
- all BLOCKED/NOT TESTED items visible;
- release title matches actual evidence.

## Agent task template

Every agent task must include:

```text
Mode: build | design | ingest | audit | release
Ring: 0-8
Target branch:
Primary files/directories:
Do not touch:
Source authorities:
Expected user-visible behaviour:
Required tests/builds:
Manual QA needed:
Completion receipt:
```

## Required validation matrix

Minimum automated validation for any code-bearing slice:

- repository runtime guard;
- relevant unit/contract tests;
- STARWELL production build when a STARWELL route changes;
- package/installer preflight when desktop shell changes;
- PWA artifact check when mobile installability changes;
- schema validation when contracts/profiles change;
- no production dependency vulnerabilities where the existing workflow checks this;
- route smoke check for any new visible route.

Minimum manual validation before release claims:

- Windows installed launch;
- iPad Safari route load;
- iPad installed-PWA relaunch;
- Android browser route load;
- Android installed-PWA relaunch;
- Feather Stop during sound/song;
- page-hide teardown;
- keyboard navigation;
- reduced-motion mode;
- export/import receipt roundtrip;
- local data restart survival;
- Boxfire independent review.

## Current known integration branches

The agent should inspect these before designing a new seam:

- `feature/compression-release-mathematics-spine-v1` — compression-release mathematics spine.
- `feature/ipad-somatic-haptics-v1` — iPad somatic renderer and hardware truth boundary.
- `feature/bifrost-arcsweep-current-ui-v0.4` — current Bifröst interface and PREMAQ song.
- `feature/bifrost-canon-library-bridge-v0.2` — canon library bridge lineage.
- `feature/arcsweep-local-0.1` — desktop Arcsweep body.
- `fix/arcsweep-electron-43-launch` — Electron runtime repair.
- `feat/arcsweep-noncanon-ingest-v0.1` — non-canon ingest quarantine.
- `feat/arcsweep-house-dr-library-v0.1` — House DR library.
- `feat/arcsweep-notion-web-feed-v0.1` — Notion-authored web feed snapshot.
- `feat/arcsweep-continuity-adapter-v0.1` — continuity adapter.
- `feat/arcsweep-session-resolver-v0.1` — session resolver.
- `feat/starwell-raster-brush-foundation` — raster brush foundation.
- `forge/arkfire-integrated-build` — integrated Arkfire build line.
- `feat/starwell-builder-agent` — workshop-agent operating contract.

## Release naming discipline

Do not call the integrated unit complete until the evidence supports it.

Allowed labels:

- `prototype`: visible interface or partial behaviour exists;
- `partial`: automated subcircuits pass, but required platform/physical/QA gates remain;
- `release candidate`: all automated checks pass and all required manual gates are PASS or explicitly deferred by release notes;
- `released`: tagged/published artefact with rollback path and Boxfire receipt.

## Boxfire final gate

Boxfire should receive:

- PR list and dependency order;
- branch/head SHA matrix;
- deployment URL matrix;
- workflow result matrix;
- platform test matrix;
- Supabase/Notion authority status;
- security/accessibility/consent review;
- remaining blockers;
- PASS / PASS WITH NOTES / BLOCKED / NOT TESTED verdict.

The House is one unit only when Boxfire can trace the same active state through STARWELL, Hearthgate, Arcsweep, Glyph/Brush authoring, Houses, platform adapters, and receipts without finding a rival truth store.
