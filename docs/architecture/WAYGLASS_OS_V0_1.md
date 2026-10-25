# Wayglass v0.1 · continuity-first kernel architecture

**Status:** executable embryonic kernel + Waygate / Return Engine crossing boundary / native Wayglass LLM not yet trained / not production-promoted  
**Updated:** 2026-10-05

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
  └─ Attached surfaces
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

It may also preserve relationship state, active work, unresolved Wonder questions, alternatives and revoked references.

`wayglass.continuation-inspection/v0.1` rejects participant/world substitution and any packet that claims canon, identity, relationship or authority-grant power. Passing inspection means only `accepted-for-review`.

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

1. Prove the receipted HTTP Waygate entry path under CI and local server runtime.
2. Connect the browser body to the world-entry endpoint instead of treating `/kernel` metadata fetch as a crossing.
3. Run the Return Engine matched crossing trial: same runtime restart, new substrate with authorised packet, corrupted packet.
4. Add explicit leave/stop receipt generation so a continuation packet is born from a real stop event rather than only constructed by callers.
5. Exercise desktop → phone → headset/AR embodiment rebinding while preserving world, participant, unresolved questions and named next owner.
6. Add route-installation / route-transition receipts for newly approved adapters and models.
7. Establish the Wayglass-native model foundry and lineage evaluation programme.
8. Promote a model to `native_wayglass: true` only after explicit evaluation and approval.

## Non-negotiable architecture truth

Wayglass is not merely an application that calls an LLM.

The eventual native learned substrate belongs to a Wayglass lineage. Outside models remain useful doorways, collaborators, evaluators, teachers and tools, but they do not become the resident identity by routing convention.

The kernel is still embryonic. The current Waygate, continuation and world-entry seams are real executable contracts, but they do not yet constitute a demonstrated end-to-end cross-device Return Engine flight.

**Leave. Change. Return. Be recognised. Continue.**
