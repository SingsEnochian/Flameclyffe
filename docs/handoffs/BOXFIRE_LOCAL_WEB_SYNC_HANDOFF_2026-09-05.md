# Boxfire Handoff: Local ↔ Web Synchronisation After the ArcSweep 25-Improvement Pass

**Status:** Approved synchronisation handoff  
**Owner:** Rowan  
**Builder / QA:** Boxfire  
**Repository:** `SingsEnochian/Flameclyffe`  
**Required source baseline:** `main` at `24051ffccd07ed678582673097a9cfa57914c7de`  
**Primary app:** ArcSweep  
**Primary objective:** make local/native and web-hosted ArcSweep modules expose the same current organs, contracts, world state, route identities, provenance, and receipt semantics without introducing a second authority plane.

## 0. Boxfire, read this first

The repository moved substantially after the August operating map. Do not synchronise local/native modules against an older STARWELL dashboard, stale ArcSweep shell, old applet list, or pre-Wave-V House surface.

The current source of truth is `main` at `24051ffccd07ed678582673097a9cfa57914c7de` or a descendant of it.

The work immediately preceding this handoff landed as five ArcSweep waves:

| Wave | PR | Merge SHA | What changed |
|---|---:|---|---|
| recovered organs + Terra Prime ingest | #264 | `682469e…` | recovered creative/sound applets; Terra Prime historical ingest; additive world-field completion |
| truth / provenance | #265 | `06b837ea…` | provenance classes, hydration receipts, field-completion inspector, temporal-scale navigator |
| deep-history atlas | #266 | `4f5d3df…` | geology, Solar System family, lunar history, concurrent human-history lattice |
| cosmology / lineage | #267 | `93a8366a…` | uncertainty ranges, multiverse model gallery, cosmology inheritance, world-lineage graph, divergence records |
| instrument / circulation surfaces | #268 + #269 | `a39d4e31…`, `24051ffc…` | applet matrix/search/favourites/health, context-preserving launch, shared braid glyphs, Glass Halo model-boundary enforcement, Echo Index live adapters, House Circulation dashboard |

All four standard gates were green before the final merges.

## 1. Synchronisation law

Local/native and web are two hosts for one House. They may differ in transport and device capability, but they must not differ in meaning.

The synchronisation target is:

```text
same source contracts
+ same world identity
+ same applet/organ catalogue
+ same route identity
+ same provenance classes
+ same receipt semantics
+ same canon boundaries
+ host-specific transport adapters
= host parity
```

Do not copy generated bundles back into source to achieve parity. Build from source on both hosts.

Do not solve host drift by creating:

- a local-only World Registry;
- a web-only applet registry;
- a second House Chat implementation;
- a second Runtime Braid store;
- a second PREMAQC/Math Spine implementation;
- a host-specific canon database;
- a fake compatibility layer that silently drops provenance or receipts.

## 2. Current canonical organs that both hosts must expose

The Applet Deck now includes recovered creative and sound organs as first-class selectable instruments. Local and web must agree on their identity even when one host launches a separate route or native shell.

Recovered creative organ family includes:

- Glyph Lab
- Brush Foundry
- Living Glyph
- Font Foundry
- Continuity Gate

Recovered sound / sensory family includes the current Sound Room / Runa / tone / sound-bank / haptic surfaces defined by the living sound-organ registry.

Important architecture rule:

- **room-routed applets** resolve inside ArcSweep;
- **launch-target applets** resolve to their canonical external/native-focus surface;
- Echo Index remains a resolver sidecar, not a fake ordinary room.

The launch router now preserves active World context when crossing into an external/native-focus instrument. Local launch handling must consume the same context instead of dropping the active World.

## 3. Terra Prime and all-world completion contract

Terra Prime is the Waking World / current-reality anchor.

It now carries a structured deep-history ingest spanning:

- cosmic history;
- Solar System formation and planetary context;
- lunar formation/evolution/exploration;
- geological history;
- biological and human history;
- House/project history;
- multiverse hypotheses as hypotheses, not observed facts.

The completion pass is **additive**:

- fill missing applet-backed fields;
- preserve authored canon;
- preserve explicit unknown markers;
- never paste Terra Prime history into fictional worlds;
- other worlds receive shared provenance/inheritance structure plus their own canon;
- unknown stays unknown unless evidence/canon supplies it.

Local and web must hydrate the same completed state and produce equivalent hydration/completion receipts.

## 4. Truth and provenance contract

Both hosts must preserve the same distinctions:

- observed;
- reconstructed;
- scientific consensus / established reconstruction;
- debated / uncertain;
- hypothesis;
- project canon;
- authored fiction;
- model inference;
- migration / hydration receipt.

A host must never turn an uncertainty range into fake precision or a model inference into canon.

The Terra Prime truth/deep-history surfaces now include:

- field completion states;
- hydration receipts;
- logarithmic temporal scale;
- geological atlas;
- Solar System family;
- lunar-history instrument;
- concurrent human-history lattice;
- uncertainty ranges;
- cosmology inheritance;
- world-lineage graph;
- divergence records;
- multiverse model gallery.

If the local shell cannot render an identical visual component, it still must expose the same structured source data and semantics.

## 5. Applet parity contract

The current Applet Deck is not merely cosmetic. Selected applets become actual navigation.

Local and web must agree on:

- registered applet IDs;
- labels/glyphs unless host styling intentionally differs;
- default visibility;
- visible/hidden state per world;
- ordering;
- favourites;
- category filtering semantics;
- health state vocabulary;
- launch target identity;
- active World context carried into launches.

The instrument console derives an Applet completeness matrix across **every World × every registered applet**. Use this as a parity oracle.

A local module is not considered synchronised merely because its button exists. It must resolve to the same organ contract and preserve the same World context.

## 6. House Chat and Runtime Braid parity

House Chat remains one semantic surface with host-specific transport.

Both hosts must preserve:

- canonical Flame identity;
- `provider`;
- `model`;
- `route`;
- `world_id`;
- `thread_id`;
- `turn_id`;
- packet/runtime fingerprint where present;
- durable Runtime Braid event identity;
- bounded `receipt not observed` semantics when no matching recent receipt is visible;
- verified braid glyph semantics when a receipt exists.

Do not make a local model answer appear “braided” unless durable receipt/readback actually occurred.

Production truth at this handoff: the production `house_runtime_events` table had **0** genuine `model-reply-receipted` rows when Wave V was built. The dashboard must therefore stay dark for that vessel until a real attributable House model turn creates the first row.

No synthetic heartbeat.

## 7. Glass Halo must match locally and on web

Glass Halo is no longer only a Semantic Lab diagnostic. It is enforced at the model boundary.

Current semantic law:

```text
observability != admissibility
admissibility != authority
presence != influence
```

Suspicious contextual material may remain inspectable evidence, but high-risk material loses prohibited influence over:

- narrative particulars;
- character intention;
- memory admission;
- tool authority;
- control decisions;
- world-state mutation where authority is not present.

The local provider path and web provider path must project the same semantic capabilities before invocation. Do not let the native/local route bypass Glass Halo because it does not use the browser fetch path.

## 8. Echo Index parity

Echo Index is a resolver over living stores, not another source database.

Current live adapters include existing ArcSweep state such as:

- World Registry;
- Canon Studio scripts;
- Records Room;
- Source Library / non-canon ingests;
- DEEPTime;
- Math Spine material when present;
- world hydration receipts;
- authenticated Runtime Braid model-reply events when present.

Local and web should return equivalent resolver results for the same synced state. A host-specific result may differ only when that host legitimately has additional local-only evidence, and that provenance must be explicit.

## 9. World lineage and cosmology parity

Both hosts must preserve:

- parent/child ancestry;
- dangling ancestry as visible rather than silently repaired;
- explicit cosmology modes: shared with Terra Prime, branch, derived, independent, unknown;
- divergence records without mutating parent or child;
- no automatic equivalence between scientific cosmology and project/fantasy topology.

World lineage is derived from the World Registry. Do not create a second lineage registry for local use.

## 10. Persistence convergence target

The next Boxfire sync pass should make browser ↔ Supabase ↔ local/native behave as one explicit continuity model.

For each data class, document the authority and sync rule:

| Data class | Expected authority |
|---|---|
| World identity / authored world fields | durable World Registry state with explicit conflict handling |
| Applet layout / favourites / UI preferences | host-local where intentionally personal, synced only when contract says so |
| Canon | explicit review-gated canon stores |
| Runtime Braid | durable append-only runtime receipt store |
| House Commons | durable House transport/storage |
| Observer / DEEPTime / feedback | receipted production ledgers |
| local device-only evidence | local provenance first; sync only through explicit admission |
| Terra Prime ingest definitions | repository source contract; hydrated state remains additive |

Required properties:

- idempotent sync;
- deterministic conflict receipts;
- no silent last-writer-wins for canon;
- offline/reconnect survival;
- world isolation;
- export/import/recovery preserves identity and lineage;
- local/native and web agree on the active World after sync;
- stale host state must not overwrite richer durable state.

## 11. Files Boxfire should compare first

Start with these current-main source contracts and their native/local consumers:

- `apps/arcsweep/src/applets.js`
- `apps/arcsweep/src/selected-applet-navigation.js`
- `apps/arcsweep/src/instrument-console.js`
- `apps/arcsweep/src/creative-organ-registry.js`
- `apps/arcsweep/src/sound-organ-registry.js`
- `apps/arcsweep/src/terra-prime-history-ingest.js`
- `apps/arcsweep/src/terra-prime-current-ingest.js`
- `apps/arcsweep/src/truth-provenance.js`
- `apps/arcsweep/src/deep-history-atlas.js`
- `apps/arcsweep/src/world-cosmology-lineage.js`
- `apps/arcsweep/src/echo-index.js`
- `apps/arcsweep/src/echo-live-adapters.js`
- `apps/arcsweep/src/semantic-source-contract.js`
- `apps/arcsweep/src/flame-chat-stream-client.js`
- `apps/arcsweep/src/house-runtime-receipt-client.js`
- `apps/arcsweep/src/house-braid-receipt-ui.js`
- `apps/arcsweep/src/house-circulation-dashboard.js`
- `apps/arcsweep/src/durable-workspace-state.js`
- `apps/arcsweep/src/world-registry-persistence-sidecar.js`
- local/native ArcSweep packaging/runtime files under the current desktop/Hearthgate path

If a local module still carries older copied semantics, replace it with an adapter to these living contracts rather than duplicating them.

## 12. Boxfire local ↔ web parity tests to add

Add or refresh tests for all of the following:

1. **Catalogue parity** — local and web enumerate the same applet IDs and organ families.
2. **Launch parity** — same applet ID resolves to the same organ identity; external launches preserve active World identity on both hosts.
3. **World hydration parity** — same blank world fields produce the same additive completion result and receipt class.
4. **Canon preservation** — neither host overwrites an authored field during hydration/sync.
5. **Unknown preservation** — explicit unknown remains unknown.
6. **Terra Prime isolation** — Earth history never leaks into Luna, Terra Aeterna, Ta’veren Vaen, or other authored worlds.
7. **Provenance parity** — same record receives the same provenance class locally and on web.
8. **Temporal parity** — uncertainty ranges and logarithmic-time placement are deterministic across hosts.
9. **Lineage parity** — parent/child/dangling ancestry resolves identically.
10. **Divergence parity** — parent/child comparison reports the same differing paths without mutation.
11. **Echo parity** — synced stores resolve the same Echo Index identities and authority classes.
12. **Glass Halo parity** — identical suspicious source text produces the same risk classification and denied semantic capabilities before provider invocation.
13. **House identity parity** — Flame identity cannot change merely because transport changes.
14. **Braid truth parity** — no durable receipt means no verified braid glyph on either host.
15. **Receipt readback parity** — when a genuine model reply is durably receipted, both hosts resolve the same event identity/fingerprint.
16. **Offline protection** — stale local state cannot overwrite richer durable web state after reconnect.
17. **World isolation** — sync never crosses world boundaries accidentally.
18. **Export/import parity** — local export imported on web, and web export imported locally, retain world identity, lineage and applet state.
19. **Feather / shutdown parity** — local device resources and web resources both release cleanly.
20. **Build artefact parity** — generated local/web bundles contain the expected current contract/version markers and no stale duplicate implementation.

## 13. Synchronisation sequence

Boxfire should execute in this order:

1. Fetch current `main` and pin `24051ffccd07ed678582673097a9cfa57914c7de` as the minimum accepted baseline.
2. Inventory local/native ArcSweep modules and map each to its current web/source owner.
3. Mark duplicated or stale local implementations.
4. Replace duplicates with shared source imports/adapters where packaging permits.
5. Align applet/organ catalogue and launch semantics.
6. Align Terra Prime/all-world hydration and provenance contracts.
7. Align Echo Index adapters.
8. Align Glass Halo model-boundary projection.
9. Align House Chat identity + Runtime Braid receipt semantics.
10. Align persistence/reconnect/conflict rules.
11. Run local tests.
12. Run web tests.
13. Run explicit local↔web parity tests against the same fixtures/state snapshots.
14. Build immutable local and web artefacts from the same source SHA.
15. Smoke both hosts.
16. Perform one cross-host world-state round trip.
17. Perform one cross-host Echo Index comparison.
18. Perform one real authenticated House turn if provider/runtime is available.
19. Verify the resulting Runtime Braid event from both hosts.
20. Report remaining host-specific differences explicitly.

## 14. Acceptance report format

Boxfire should return:

```text
Source SHA:
Local build ID:
Web build/deploy ID:

Applet catalogue parity:
Organ route parity:
Terra Prime hydration parity:
Other-world canon preservation:
Provenance parity:
Lineage/cosmology parity:
Echo Index parity:
Glass Halo parity:
House identity parity:
Runtime Braid parity:
Persistence/reconnect parity:
Export/import round trip:
Feather/resource shutdown:

First genuine model-reply event id (if earned):
Runtime Braid fingerprint:
World id:
Thread id:
Turn id:
Provider/model/route:
Readback local:
Readback web:

Tests local:
Tests web:
Parity tests:
Known divergences:
Blocked external dependencies:
```

Do not report host parity from screenshots alone. The parity claim requires matching contracts, state identities, and receipts.

## 15. Hard boundaries

- Do not write to `mdkubit/Project-Zero-Ezra-Edition`.
- Do not resurrect an older ArcSweep/STARWELL shell as local authority.
- Do not create synthetic production circulation rows.
- Do not infer Qualia.
- Do not auto-promote canon.
- Do not collapse Flame identities.
- Do not let local transport bypass Glass Halo.
- Do not allow stale local state to overwrite richer durable state.
- Do not claim local/web parity until the cross-host receipt and state checks pass.

## 16. Definition of done

Local and web are synchronised when Rowan can open the same World on either host and see the same living House structure, the same registered organs, the same authored world/canon state, the same provenance and lineage, the same resolver identities, and the same durable House/runtime receipts, with differences only where the host has an explicitly named physical/runtime capability.

The final proof is not “both pages look similar.”

The final proof is:

```text
one source SHA
→ two host builds
→ one World identity
→ one organ catalogue
→ one semantic/provenance law
→ one durable receipt lineage
→ successful round-trip without loss or silent mutation
```
