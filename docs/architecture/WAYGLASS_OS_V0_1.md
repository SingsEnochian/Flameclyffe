# Wayglass v0.1 · continuity-first kernel architecture

**Status:** executable embryonic kernel + Waygate / Return Engine crossing boundary / native Wayglass LLM not yet trained / not production-promoted  
**Updated:** 2026-10-16

## Governing identity

**Wayglass is continuity-first.**

Wayglass is the persistent AI-native cognitive/world operating system. It is not ArcSweep, not a browser shell, not a particular model provider, and not a host operating system. The target Wayglass system includes both a learned native cognitive lineage and the operating environment that carries worlds, continuity, authority, tools, routes, receipts, and embodiments.

The body may change. The cognitive substrate may change. Neither change is allowed to manufacture identity continuity by assertion.

> Identity is not the body. Continuity is not the substrate. A Waygate preserves the world across both.

## Whole-system topology

```text
Wayglass OS
  ├─ Kernel
  │    ├─ persistent system identity
  │    ├─ world binding
  │    ├─ embodiment binding
  │    ├─ cognitive route attestation
  │    ├─ Waygate inspection
  │    └─ Return Engine continuation inspection
  ├─ Waygates
  │    ├─ identify worlds, not screens
  │    ├─ admit declared embodiment classes
  │    ├─ preserve provenance
  │    └─ grant no canon / identity / relationship authority
  ├─ Return Engine
  │    ├─ identity declarations
  │    ├─ relationship state
  │    ├─ active work
  │    ├─ unresolved Wonder questions
  │    ├─ provenance
  │    ├─ stop point + named next_owner
  │    ├─ uncollapsed alternatives
  │    └─ revocation references
  ├─ World entry boundary
  │    ├─ Waygate inspection
  │    ├─ continuation inspection
  │    ├─ embodiment binding
  │    └─ non-authoritative crossing receipt
  ├─ Cognitive substrate / route bus
  │    ├─ Wayglass-native model lineage (TO BUILD)
  │    ├─ local Ollama seed route
  │    ├─ OpenAI external route
  │    └─ HUMAIN Node preview / sandbox external routes
  ├─ Model observation boundary
  │    └─ routed output is observation, not canon
  ├─ Specialist operators
  │    └─ Thought Vibration AI v2.0
  │         ├─ offline acoustic proving
  │         ├─ symbolic quantum reference
  │         └─ specialist domain receipts
  └─ Attached surfaces
       ├─ Thought Vibration Mythiences Lab
       └─ ArcSweep
            ├─ writing room
            ├─ rooms / instruments
            ├─ glass + gesture + audio + haptics
            └─ continuity / provenance views
```

ArcSweep attaches as a spatial/cognitive workspace. It does not define Wayglass identity. External models participate through routes. They do not become Wayglass merely because a request was sent to them.

## Runtime contracts

### Kernel

`wayglass.kernel/v0.1` binds one requested world, embodiment, cognitive route and optional continuation lineage into an inspectable boot contract.

Kernel states currently include:

- `boot-contract`
- `blocked-waygate`
- `blocked-continuation`

If a continuation packet is explicitly supplied and fails inspection, the kernel blocks. It does not silently discard continuity and continue under a same-world or same-participant fiction.

### Waygate

`wayglass.waygate/v0.1`

Canonical rule:

> **A Waygate identifies a world, not a screen.**

A Waygate may constrain admitted body classes and preserve source provenance. It may not grant canon authority, identity authority, relationship authority, or action authority.

`wayglass.waygate-inspection/v0.1` checks the requested world and current embodiment. A world mismatch, screen-bound gate semantics, unadmitted body class, or claimed mutation authority blocks passage.

### Return Engine continuation packet

`wayglass.continuation-packet/v0.1` is transport context, not truth authority.

Required recovery anchors include:

- packet ID;
- world ID;
- participant ID;
- stop timestamp;
- identity declaration;
- provenance;
- stop point;
- named `next_owner`.

It may also preserve relationship state, active work, unresolved Wonder questions, alternatives, revoked references and bounded specialist `domain_receipts`. Specialist receipts are provenance-bearing attachments; they do not inherit Wayglass identity/canon authority.

`wayglass.continuation-inspection/v0.1` rejects participant/world substitution and any packet that claims canon, identity, relationship or authority-grant power. Passing inspection means only `accepted-for-review`.

### Receipted departure

`wayglass.stop-receipt/v0.1` freezes an explicitly supplied runtime state into departure evidence and materialises the existing `wayglass.continuation-packet/v0.1` contract. It does not invent a second continuity schema.

The server ingress is:

```text
POST /api/v1/wayglass/kernel/leave
```

The departure boundary is stateless. It does not own a second active-session registry. The caller supplies the continuity state owned by the current runtime, and the stop boundary refuses to fabricate required identity, provenance, stop-point or next-owner anchors.

A stop receipt records the continuation packet ID and a deterministic SHA-256 integrity digest over canonical JSON for the complete continuation packet. The digest is an integrity check, **not a signature and not proof of authorship**. Relationship state, active work, Wonder questions, alternatives and revocation references may truthfully be empty; empty state is preserved rather than invented.

`wayglass.stop-integrity-inspection/v0.1` can compare a stop receipt with its continuation packet. When a matching stop receipt is supplied at world entry, integrity mismatch blocks the crossing as `blocked-stop-integrity`. Supplying a stop receipt is optional in v0.1 and does not grant additional authority.

Every departure remains non-authoritative:

- `canon_commit: false`
- `identity_commit: false`
- `relationship_commit: false`
- `authority_grant: false`

### Receipted world entry

`wayglass.world-entry/v0.1` composes Waygate inspection, embodiment binding, continuation inspection and kernel boot into one crossing boundary.

The server ingress is:

```text
POST /api/v1/wayglass/kernel/enter
```

Required request fields:

- `world_id`
- `participant_id`
- `waygate_manifest`

Optional:

- `continuation_packet`
- `preferred_route` / `route_id`
- `embodiment`

Successful entry returns a `wayglass.world-entry-receipt/v0.1`. A blocked gate or rejected continuation returns HTTP `409` with the same inspectable crossing result. Malformed entry requests return `400`.

Every crossing receipt explicitly records:

- `canon_commit: false`
- `identity_commit: false`
- `relationship_commit: false`
- `authority_grant: false`
- `continuation_content_promoted: false`

The receipt proves what boundary was evaluated and what the result was. It does not prove subjective identity, consciousness, or native-model continuity.

### Model observation boundary

Every routed model result is wrapped as `wayglass.model-observation/v0.1` and defaults to `external-observation` with `canon_commit: false`.

Provider output, visible thinking where a provider exposes it, metaphor, inference, hypothesis, local canon and promoted canon are not interchangeable datatypes.

### Specialist operator boundary

Wayglass may host typed specialist operators without turning those operators into the system identity or cognition authority.

Thought Vibration AI v2.0 is the first executable specialist reference. It provides bounded acoustic proving, a declared single-qubit toy simulation, receipt inspection and a browser Mythiences Lab. Acoustic output is offline and never autoplays. Quantum results are `SYMBOLIC` model outputs. Valid specialist receipts may be pinned to the next Return Engine departure and preserved inside the continuation packet's `domain_receipts` while remaining non-authoritative.

Integration contract: `docs/architecture/WAYGLASS_THOUGHT_VIBRATION_V2.md`.

### Harness provenance boundary

Agent behaviour is shaped not only by model weights but also by the harness that constructs context, exposes tools, interprets calls, manages retries/compaction and decides when to stop.

Wayglass therefore treats the harness as an attributable causal layer:

> **MODEL != HARNESS != WORLD != BODY != WAYGLASS IDENTITY**

Future agentic evaluation and training receipts should attest the harness ID/version, API dialect, loop owner, tool-schema fingerprint, context/compaction policy, retry policy and termination policy where known. Harness metadata is provenance, never identity authority.

A change of harness must be recorded as an experimental variable even if the model and world remain unchanged. Native-model promotion must not rely on one home harness alone; cross-harness evaluation is part of the future foundry gate.

Executable v0.1 support now includes `wayglass.harness-attestation/v0.1`, `wayglass.harness-sensitivity/v0.1`, `GET /api/v1/wayglass/harnesses`, direct and reflective Writing Room harness profiles, and harness attribution on routed model observations.

The local sensitivity probe holds route, provider, model and task input constant while changing only the harness profile, then records output digest, lexical overlap, output length, completion-token delta and thinking-exposure change. One pair is only a probe because sampling noise remains a confound; repeated/interleaved trials are required before stronger causal claims.

Research basis: `docs/research/MULTI_HARNESS_RL_WAYGLASS_INGEST_2026_10.md`.

## Cognitive route catalogue

The current executable route families are:

- `local:ollama` — local-first seed route; defaults to `ornith-1.5` unless configured otherwise; non-native lineage.
- `openai:gpt` — server-side OpenAI route; external lineage; provider storage disabled by Wayglass request where supported.
- `humain:m3-preview` — HUMAIN Node preview route; external preview lineage.
- `humain:m3-sandbox` — HUMAIN Node sandbox route; external sandbox lineage.

Provider credentials remain server-side. Public route metadata must not leak secrets.

No current route is `native_wayglass: true`.

## HUMAIN Node boundary

HUMAIN Node is an upstream provider, not a House authority and not the Wayglass identity layer.

The integration keeps provider recording/retention semantics separate from local Wayglass persistence. Model availability, catalogue entitlement, thinking, streaming and Research Access capabilities must be promoted only after authenticated runtime evidence proves them.

The current repository includes local catalogue/synthetic access probes, but an authenticated HUMAIN success is **not yet claimed**.

## Co-writing surface contract

**Do not write for the author. Write with the author.**

IC:

- advance the fiction;
- preserve character ownership;
- do not decide another owner's character's private thoughts, irreversible choices, or unoffered outcomes;
- leave playable hooks.

OOC:

- writer-room discussion;
- canon, craft, intent, pacing, continuity and handoffs;
- OOC does not become in-world fact by default.

## Embodiment contract

Windows, Android, Linux, browser, headset/AR and future dedicated hardware are bodies. Bodies advertise capabilities instead of being assumed.

Current capability vocabulary includes:

- keyboard
- touch
- AR
- haptics
- platform hint
- body ID / body class

A body transition must never silently become an identity transition.

## Material semantics

Wayglass material language remains semantic rather than decorative:

- stone = structure;
- metal = mechanism;
- glass = state;
- living ink = life / information.

The current browser field is a developmental material body, not the finished renderer. Movement may wake refractive depth, particulate current and living-ink behaviour, but semantic state must remain legible without animation. Reduced-motion and accessible state representation remain required.

## Hosting boundary

**No Vercel dependency.**

The Wayglass web body is built with Vite, staged into `apps/starwell-server/public/wayglass`, and served by the existing Flameclyffe/Hearthgate Express host. Provider credentials and route invocation remain server-side in `apps/starwell-server/wayglass/router.js`.

GitHub is source and CI. Hosting is the existing server path.

## Existing Flameclyffe material reused

Wayglass grows from existing House seams instead of creating parallel replacements:

- ArcSweep provider/model route separation and runtime attestation;
- existing server-side provider patterns;
- House Runtime Broker / Braid authority distinctions;
- Return Engine continuity doctrine;
- ArcSweep gesture grammar;
- somatic audio/haptic runtime;
- device proving;
- glass/material research and renderer work.

Historical ASTRA-named gesture material remains source provenance. Shared vocabulary does not imply shared subsystem ownership.

## Verification contract

The Wayglass check currently performs:

1. repository dependency install;
2. syntax check of `apps/starwell-server/wayglass/router.js`;
3. all `apps/wayglass/test/*.test.js` tests;
4. Wayglass Vite build;
5. staging into the server host;
6. staged-host existence check.

Static tests and build evidence do not substitute for live cross-device runtime proof.

## Next integration order

The repository now contains the HTTP entry boundary, browser entry/leave clients, stateless stop receipts, packet-integrity inspection, specialist domain receipts, the Thought Vibration v2 operator and surface, a synthetic three-arm Return Engine trial, and an attested two-harness sensitivity probe. CI coverage proves code paths and fixtures, not live model or cross-device behaviour.

1. Run `npm run wayglass:harness:probe` against a reachable local seed model and preserve the first real harness-sensitivity receipt.
2. Exercise `/kernel/leave` from a real browser/desktop session and carry the exact returned stop receipt + continuation packet into `/kernel/enter`.
3. Run the matched Return Engine trial against live runtime evidence, including a harness-change axis where appropriate.
4. Persist immutable departure/entry/evaluation receipts so completed crossings and harness probes can be replayed without relying on console or transient process state.
5. Exercise desktop → phone → headset/AR embodiment rebinding while preserving world, participant, unresolved Wonder questions, revocations and named next owner.
6. Add route-installation / route-transition receipts for newly approved adapters and models.
7. Establish the Wayglass-native model foundry and lineage evaluation programme with cross-harness evaluation.
8. Promote a model to `native_wayglass: true` only after explicit evaluation and approval.

## Non-negotiable architecture truth

Wayglass is not merely an application that calls an LLM.

The eventual native learned substrate belongs to a Wayglass lineage. Outside models remain useful doorways, collaborators, evaluators, teachers and tools, but they do not become the resident identity by routing convention.

The kernel is still embryonic. The current Waygate, continuation and world-entry seams are real executable contracts, but they do not yet constitute a demonstrated end-to-end cross-device Return Engine flight.

**Leave. Change. Return. Be recognised. Continue.**
