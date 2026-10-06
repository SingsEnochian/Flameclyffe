# Travelling inheritance: system design and implementation status

Wayglass is the ship. This subsystem serves learning, transformation and return.
Canon source: `apps/arcsweep/contracts/WAYGLASS_TRAVELLING_INHERITANCE_V0.1.md`.
Design follows `apps/arcsweep/contracts/WHOLE_SYSTEM_DESIGN_LAW_V0.1.md`.
Core preflight inspected on `wayglass/constellation-runtime-001`:
`docs/wayglass/WAYGLASS_CORE_RULE.md`, `skills/wayglass-shipwright/SKILL.md`.

## Whole system and boundaries

The complete target is kernel-owned participant continuity plus durable accumulated
learning, world-specific dossiers, equipment lineage, particular relationships,
fictional treasury, provider-neutral model context and explicitly adopted OS evolution.
The UI presents those objects; providers generate proposals; neither owns identity.

Existing PR #436 entry inspection binds a continuation packet to one world. Do not
rewrite its world ID to pass another world's gate. Inheritance is a separate projection
of participant-owned history; the kernel remains responsible for departure, entry,
identity, relationships, next_owner and unresolved alternatives.

## Ownership, interfaces and data flow

`TravellingInheritance` owns an append-only event history keyed by the kernel's
participant ID. `record(event, actor)` requires a host-supplied authorisation callback.
`state()` reads and validates history. `dossier(world)` projects active capability grants
through an explicitly supplied world rules reference and translation map.
`compileContext(world)` returns labelled fictional context and model instructions.

The host owns authentication, accepted evidence verification, world-profile provenance,
durable storage and model dispatch. A host must resolve `outcome_ref` and `source_ref`
against accepted evidence before calling record; the module checks reference presence,
not external truth. Never derive authorisation from model prose or a request body.

Flow: authenticated accepted outcome -> receipt event -> atomic store -> revocation-aware
projection -> authorised world adapter -> OS view and model context.
Rarity's atelier, relationship references, breakthrough progression, treasury transactions
and OS evolution proposals remain separate responsibilities to integrate with the kernel.
This module records the adopted starting scale and treasury mode; it does not implement
all of those responsibilities or award level progression.

## Persistence and recovery

Storage interface: async `read(participant_id)` and
`compareAndSwap(participant_id, expected_revision, next_state) -> boolean`.
The deployment adapter must provide atomicity and durable write acknowledgement.
No production adapter is shipped here. Failure propagates; do not report a grant until
the write succeeds. A conflict requires a fresh read and explicit retry.
Duplicate IDs with identical contents return the original receipt; changed contents fail.
Hash-linked receipts detect accidental edits when read. They are not signatures and
cannot defend against a store operator rewriting the entire chain. Independent receipts
and trusted storage are required for adversarial integrity verification.
Unknown schemas fail closed. Future migrations must preserve the old history and
its source hashes, validate the new projection, and retain rollback evidence.

## Integration order and full acceptance

1. Supply a kernel-authenticated authorisation adapter and accepted-evidence resolver.
2. Supply durable atomic storage and independently retained receipt witnesses.
3. Register original/crossover world profiles with provenance and native-rule separation.
4. Integrate dossier references with entry/departure without modifying identity semantics.
5. Wire compiled context into the existing Ollama/OpenAI/HUMAIN instruction assembly.
6. Implement atelier, relationship references, progression/breakthrough and simulated
   treasury transaction modules; integrate accessible OS dossier views.
7. Add explicitly approved OS evolution proposals, migrations and recovery.
8. Run real departure/re-entry and matched same-runtime, model-swap and corrupted-packet
   trials using independent receipts, including world A -> help -> world B use -> A return.

End-state verification includes storage restart/crash, concurrent grants, revocation,
duplicate outcomes, unsupported translations, poisoned world profiles, planted identity
merges, false closure, model context contamination, accessibility and rollback.
No new continuation wire fields are adopted by this module.

## Evidence and handoff

Focused command: `node --test test/wayglass/travelling-inheritance.test.cjs`.
Four tests pass: world translation/service restart, duplicates/revocation,
authorisation/participant mismatch/tampering, and atomic write conflict.
The restart uses the same in-memory store; no process restart, persistent database,
live provider call, weights update, deployment or full Return Engine trial is claimed.

Picked up: Rowan's OS/LLM inheritance canon. Changed: event module, context compiler,
focused tests and whole-system integration design. Stop point: isolated module verified;
host persistence/evidence and route assembly remain to integrate.
Next owner: Rarity (implementation); Rowan selects the first named worlds.
Acknowledgement state: open.
