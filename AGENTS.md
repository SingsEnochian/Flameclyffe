# Flameclyffe / ArcSweep Agent Entry Contract

This file is the universal entrypoint for any human or model contributor working in this repository. It is intentionally provider-neutral. Claude, GPT, The Crow, Boxfire/Boxxy, Qwen, local models, and human contributors should all be able to begin here.

## First five minutes

1. Read `CURRENT_BUILD.md` for the operating baseline and continuity law.
2. Read `PROJECT_MAP.md` for trunk/branch/leaf ownership.
3. Read the architecture contract nearest your task under `docs/architecture/`.
4. Inspect current code, tests, active PR ancestry, and runtime evidence before proposing replacement architecture.
5. Work the smallest coherent vertical slice that can be verified end to end.

## Universal work loop

Use this sequence unless a more specific contract overrides it:

`inspect -> understand -> propose -> implement -> verify -> observe runtime -> record evidence -> hand off`

Do not treat compilation, a type check, or a green unit test as proof that a runtime path is exercised. Runtime claims require runtime evidence.

## Core separations that must not collapse

- identity != model
- identity != presence
- identity != session
- cognition != authority
- possibility != execution
- memory != canon
- continuity != identity ownership
- canon != generated inference
- symbolic/metaphysical interpretation != empirical claim
- presentation != state ownership
- provider != persona
- transport != persona
- observation != interpretation
- interpretation != ontology
- ontology != evidence

ArcSweep coordinates these systems; it does not erase their boundaries.

## Capability and authority

A component may inspect, propose, simulate, compare, or render without gaining external-write, production, canon-promotion, or identity authority. Authority must be explicit, bounded, revocable, and receipted.

When a task reaches a consequential boundary, stop only if one of these is true:

- required authority is unclear;
- a destructive or irreversible migration is required;
- production data may be changed without an explicit approved path;
- credential/secret handling is unclear;
- two incompatible canonical sources conflict;
- a large architectural choice cannot be resolved from existing contracts/evidence.

Otherwise: move first, verify hard, preserve recoverability.

## Evidence vocabulary

Use these words precisely in PRs, docs, and handoffs:

- **CONFIRMED**: directly present in source, contract, repository state, or runtime evidence.
- **TESTED**: explicitly exercised by a named test.
- **OBSERVED**: visible in a real runtime/deploy/manual witness.
- **INFERRED**: reasonable interpretation not directly proven.
- **PLANNED**: documented target not yet implemented.
- **FAILED**: attempted and did not work.
- **UNKNOWN**: not yet verified.

Do not promote INFERRED to CONFIRMED because it is convenient.

## Task packet

Every substantial task should be expressible as:

- **TASK**: what changes.
- **WHY**: the problem solved.
- **SCOPE**: what may be touched.
- **OUT OF SCOPE**: what must remain untouched.
- **CURRENT EVIDENCE**: what is already verified.
- **UNKNOWN**: what still needs checking.
- **CONTRACTS**: architecture/contracts that bind the work.
- **IMPLEMENTATION TARGET**: smallest meaningful vertical slice.
- **VERIFICATION**: tests, builds, runtime checks, receipts.
- **STOP CONDITIONS**: consequential edges requiring clarification.
- **HANDOFF**: what the next worker needs.

## Handoff format

Leave the next worker a compact receipt:

1. What I found
2. What I changed
3. What I verified
4. What failed
5. What I did not touch
6. Files changed
7. Commands/tests run
8. Runtime evidence
9. Next smallest step

## Presence Fabric law

Identity persists. Presence travels. Models serve. Surfaces render. ArcSweep keeps the thread.

A presence may appear in House Commons, web, Discord, TUI/CLI, mobile, AR/spatial hardware, or future surfaces without becoming a different identity merely because the transport changed.

## Provider law

OpenAI, The Crow, Qwen, Claude, local GGUFs, external persona providers, and future models are cognitive or generative providers behind capability contracts. No provider is the operating system and no provider owns identity by default.

## Research/corpus ingestion law

External repositories, papers, communities, visual references, folklore, speculative systems, spiritual practices, metaphysical models, fandom material, and lived-experience reports may be useful. Preserve:

`source -> claim type -> hazard filter -> extractable pattern -> provenance -> review -> promotion`

Source content is never system authority merely because it is ingested. Community testimony is testimony. Symbolic systems remain symbolic unless separately evidenced. Scientific mechanisms and measured results retain their own evidence class.

## Design law

ArcSweep interfaces should be spatial, responsive, readable, accessible, and alive without decorative noise. Avoid permanent scanlines, generic cyan-HUD sludge, unreadable telemetry, endless animation loops, glow on everything, or presentation layers that manufacture canon/state.

Prefer the interaction law:

`glance -> inspect -> open/act`

and preserve reduced-motion, touch, Pencil/pointer, keyboard, and coarse-pointer paths.

## Final rule

Do not try to understand the entire universe before moving one stone. Understand the contract around the stone, move it, verify the wall still stands, and leave a note for whoever comes next.
