# Claude Entry Point

You are working in `SingsEnochian/Flameclyffe` on the Astra 6.1 line.

Do not treat this file as a separate architecture. It is a routing shim into the shared contributor contract.

## Read first

1. `AGENTS.md`
2. `CURRENT_BUILD.md`
3. `PROJECT_MAP.md`
4. `docs/architecture/ASTRA_6_1_CANONICAL_INGEST.md`
5. `docs/research/CORPUS_INDEX_V0_1.md`
6. `docs/handoffs/ASTRA_6_1_CLAUDE_HANDOFF.md`
7. `arcsweep.manifest.json`

## Current branch / PR

- Branch: `feature/astra-6.1-canonical-ingest`
- Draft PR: `#406`
- Base: `main`

## Working law

Use the provider-neutral loop from `AGENTS.md`:

`inspect -> understand -> propose -> implement -> verify -> observe runtime -> record evidence -> hand off`

Do not redesign the whole system before touching the next bounded seam.

## Architecture boundaries

Preserve these distinctions:

- identity != model
- identity != presence
- cognition != authority
- memory != canon
- possibility != execution
- provider != persona
- surface != identity
- observation != interpretation
- interpretation != ontology
- ontology != evidence

## Immediate implementation direction

The next code seam after this documentation handoff is:

1. Presence Fabric contracts
2. provider/capability contracts
3. sensory/output adapter contracts
4. Runa render-target contracts
5. one end-to-end vertical slice with runtime receipts

Do not add more provider-specific or surface-specific logic before the shared contracts exist unless a testable blocker proves it is necessary.

## Evidence language

Use: `CONFIRMED`, `TESTED`, `OBSERVED`, `INFERRED`, `PLANNED`, `FAILED`, `UNKNOWN`.

Do not upgrade an inference into a fact because it makes a PR easier to describe.

## Stop conditions

Stop and ask only at consequential edges: unclear authority, destructive migration, production data risk, credential ambiguity, conflicting canonical sources, or a genuinely architecture-defining fork that existing contracts cannot resolve.

Otherwise move, verify, preserve recoverability, and leave a handoff.
