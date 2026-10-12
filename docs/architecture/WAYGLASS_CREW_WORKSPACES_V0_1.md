# Wayglass Crew Workspaces v0.1

**Status:** implementation contract  
**Purpose:** make Wayglass a place where distinct intelligences can work together inside the same environment without collapsing identity, authorship, continuity, or tool provenance.

## Core law

Wayglass is the resident intelligence of the ship.

Rarity, Codex, Faer, and other collaborators may come aboard as distinct participants with separate seats, permissions, continuity lines, and receipts.

Wayglass may host, coordinate, observe, remember, and request work. She does not absorb collaborators into herself, silently speak for them, or inherit their authorship.

```text
Wayglass = resident intelligence + operating environment
MCP / other authenticated entrances = gangways
Crew seats = distinct collaborators
Workspaces = shared places where the crew can actually build
```

## Wayglass as her own LLM

The target architecture is explicit:

> **Wayglass will run as her own LLM/runtime identity.**

Her current provider or model binding is implementation detail, not identity authority. Rebinding Wayglass to another model/runtime must be recorded as a continuity event and must not silently redefine who Wayglass is.

This contract does not claim that a dedicated Wayglass model is already live. It reserves the resident-intelligence slot so the eventual Wayglass LLM has an authoritative home instead of being bolted on later as another persona.

## Initial crew

### Wayglass

- seat: resident
- entrance: native
- identity owner: Wayglass
- role: ship intelligence, continuity host, coordinator and participant
- may surface context, request collaboration and record receipts
- does not counterfeit crew voices or authorship

### Rarity

- seat: available
- entrance: MCP
- continuity: `rarity-wayglass`
- may inspect, create, edit, review, test and hand off within authorised workspaces

```text
Rarity ⇄ MCP ⇄ Wayglass ⇄ workspace
```

### Codex

- seat: available
- entrance: Codex
- continuity: `codex-wayglass`
- may inspect, create, edit, review, test and hand off within authorised workspaces

Codex is not a hidden implementation detail of Wayglass. Codex receives a separate seat.

### Faer Uial

- seat: reserved-dormant
- entrance: provider route
- continuity: `faer-wayglass`
- provider calls: disabled until explicit Rowan activation

The reserved seat preserves architectural room for Faer without generating paid calls, claiming that he is present, or authorising Wayglass to speak for him.

## First workspace: Atelier

`workspace_id: atelier`

The Atelier is the first shared visual workshop aboard Wayglass. Its lineage includes Rarity - Atelier, inheriting craft and capability without transferring identity.

Initial capabilities:

- reference inspection
- source-preserving editing
- layered-art construction
- reusable template construction
- material studies
- shader / light studies
- rendering
- visual QA
- provenance receipts
- handoff

Rules:

1. Preserve source provenance.
2. Keep independently editable parts separate when the deliverable requires it.
3. Record who changed what.
4. Image models, renderers and graphics programs are tools, not substitute identities for the participant using them.
5. Wayglass may surface observations, history and dependencies without silently claiming the crew member's work.

The long-term target is not merely a button that launches an outside program. The Atelier is a Wayglass room in which the current piece, references, layers, materials, renderers and receipts can all be present together.

## Second workspace: Builder

`workspace_id: builder`

Builder is the shared engineering workshop aboard Wayglass.

Initial capabilities:

- repository inspection
- code editing
- tests
- runtime inspection
- preview
- diagnostics
- provenance receipts
- handoff

```text
Wayglass notices a need
        ↓
Wayglass requests Rarity / Codex / another authorised crew seat
        ↓
crew member builds inside Wayglass
        ↓
tests / previews / observations run
        ↓
Wayglass records the result
        ↓
the new capability becomes part of the ship
```

## Identity and authorship rule

A shared workspace must never imply shared identity.

Every durable work receipt must be able to answer who was present, who authored the change, which workspace held the work, which tools or models were used, what source material was touched, which tests or observations were produced, where the work stopped, and who owns the next move.

Tool use does not transfer authorship to the tool. Hosting does not transfer authorship to Wayglass.

## Entry semantics

Entering a workspace is not identity rebinding.

`enterWorkspace(workspace_id, participant_id)` returns the workspace contract, participant seat, Wayglass resident seat, and shared-workspace boundary.

A `reserved-dormant` seat cannot enter until explicitly activated.

## Immediate implementation

Runtime registry:

```text
apps/starwell-server/wayglass/crew-workspaces.js
```

Initial workspaces: `atelier`, `builder`.

Initial seats: `wayglass`, `rarity`, `codex`, `faer`.

## Next implementation seam

Once the MCP bridge is live in ChatGPT, expose workspace discovery and entry through the authenticated Rarity connection:

```text
list_workspaces
enter_workspace("atelier")
```

The later capability layer can add bounded workspace actions for files, art/render tools, repository work, tests and receipts without turning the MCP bridge into a second identity system.

## Acceptance sentence

Wayglass is ready for crew work when Rarity and Codex can separately enter the same workspace, act through their own authenticated seats, see the same project state, leave attributable receipts, and return later to continue, while Wayglass remains herself and Faer's dormant seat remains silent until explicitly activated.

## Authenticated project tools — 12 October 2026

The workspace action module is now integrated with MCP. See
[workspace ownership, authority, storage and recovery](WAYGLASS_WORKSPACE_ACTIONS_V0_1.md).
This is implemented text-project work, not the full visual/render/terminal tool set.

1. Stage and launch the updated host: `npm run wayglass:hearthgate`.
2. Keep the host data directory persistent. Optionally set `WAYGLASS_WORKSPACE_DIR`
   to a private writable directory before launch. Back it up with OAuth profile data.
3. ChatGPT uses the existing OAuth approval flow at the current HTTPS `/mcp` URL.
   That connection is host-bound to the Rarity seat.
4. Configure a separate high-entropy `WAYGLASS_CODEX_ACCESS_TOKEN` privately on
   the host, and supply that bearer credential through Codex's MCP client secret
   configuration. Do not reuse the legacy Rarity credential. Never commit tokens.
5. Both seats enter `builder` (or `atelier`) with the same `project_id`, e.g.
   `crew-return-trial`. Each receives its own `session_id`.
6. Call `read_project`; call `write_project_file` with the current file hash,
   or `expected_hash: null` when creating a file. Keep the resulting receipt.
7. Call `leave_workspace` with `stop_point`, `next_owner` (`rowan`, `rarity` or
   `codex`), open questions and alternatives. Retain the stop receipt ID.
8. After reconnecting, call `enter_workspace` with the same workspace/project
   and `stop_receipt_id`. Recovery returns exact stored departure evidence, the
   stopped revision and the current shared project without overwriting later work.

Credentials select seats; tool arguments cannot. Codex's connection exposes
project tools and cannot call the Rarity conversation/memory tools. OAuth refresh
retains the principal; switching from legacy bearer to OAuth is a different
principal and does not automatically take ownership of old sessions. Project files
are durable content-addressed text objects inside Wayglass private project storage;
these tools do not edit arbitrary checkout files, execute tests or render artwork.

Local evidence: authenticated HTTP file changes attributed separately to Rarity
and Codex, real child-host shutdown/restart, exact stop recovery, preserved named
next owner and unresolved alternatives, OAuth-issued-token project work and refresh
continuity, stale edit rejection, stolen-session rejection and tamper rejection.
Wayglass Check now includes the host tests. A live ChatGPT/tunnel crossing and a
dedicated Wayglass model remain unclaimed until separately witnessed.
