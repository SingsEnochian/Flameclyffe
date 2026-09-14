# Canonical Spine

**Architectural rule:** legibility before capability.

ArcSweep, STARWELL, Flameclyffe, Observer/DEEP, PREMAQC, Runa, Glyph Forge/Kelyran, Project Zero/Hearthfire, Lanternbridge, Worldseed, and hosted worlds attach to one shared canonical graph.

The graph is not a lore wiki and not a second database. It is the legibility layer that answers seven questions for every meaningful thing in the ecosystem:

1. **What is it?**
2. **What does it mean?**
3. **Who or what owns it?**
4. **What does it depend on?**
5. **What state is it in?**
6. **What evidence/provenance supports it?**
7. **What changed, when, and why?**

## Authority

`data/canonical-spine.seed.json` is the only persisted canonical Spine authority.

ArcSweep does not maintain a hand-edited mirror. Its Vite build/dev adapter validates the root graph, fingerprints it, and emits the runtime `canonical-spine.seed.json` directly from that authority. Build or runtime failures must remain visible; they must not silently fall back to an older graph.

## Core entity record

Every node should expose at least:

- `id` — stable machine identifier
- `name` — canonical human name
- `kind` — project, system, room, world, character, concept, capability, route, dataset, agent, ritual, language, asset, etc.
- `summary` — one-sentence semantic definition
- `owner` — project/system responsible for the node
- `canonStatus` — canonical, experimental, planned, deprecated, scrapped, external
- `implementationStatus` — implemented, partial, stub, blocked, not-started, retired
- `visibility` — shared, private, restricted, source-protected
- `sourceRefs` — files, commits, issues, records, conversations, datasets, or external sources
- `createdAt`, `updatedAt`
- `tags`

## Edge record

Every relationship is explicit and typed:

- `from`
- `to`
- `type`
- `meaning`
- `confidence`
- `sourceRefs`
- `createdAt`, `updatedAt`

Recommended first edge types:

- `owns`
- `contains`
- `depends_on`
- `implements`
- `observes`
- `describes_state_of`
- `compiles_state_for`
- `routes_to`
- `inherits_from`
- `supersedes`
- `conflicts_with`
- `equivalent_to`
- `related_to`
- `knows_about`
- `restricted_by`

## Knowledge-boundary record

Hidden state must never be invisible merely because content is restricted.

A knowledge boundary may expose:

- holder
- source category
- affected topic
- whether the content is actionable
- restriction reason category
- confidence
- expiry/review date

The protected content itself remains absent. `content`, `protectedContent`, and `secret` fields are rejected by the validator.

Example:

```json
{
  "holder": "agent:example",
  "affectedTopic": "topic:example",
  "sourceCategory": "restricted-collaborator-context",
  "actionable": false,
  "restrictionReason": "source-protected",
  "confidence": "medium"
}
```

## Change receipts

Every mutation to canonical graph state must emit a receipt containing:

- receipt id
- actor
- timestamp
- operation
- target node/edge
- base/request/review fingerprints as applicable
- reason
- provenance
- validation result

No silent canonical mutation.

## Mutation governance

Runtime agents and caretaker processes **cannot directly mutate the canonical root graph**.

The mutation path is deliberately split into four stages:

1. **Propose** — ArcSweep creates a fingerprinted change request against the exact runtime source fingerprint.
2. **Preview and validate** — the proposed graph is constructed in memory and run through the same shared structural validator used by builds.
3. **Review** — an independent fingerprinted review records `approved`, `adjust`, or `rejected`. Approval is evidence, not mutation.
4. **Apply** — only the repository-side apply gate may write the root seed. It verifies the request and review fingerprints, requires `approved`, refuses stale base fingerprints, validates the resulting graph, and appends a change receipt.

The browser/runtime path ends at proposal and review. There is intentionally no browser function that writes `data/canonical-spine.seed.json`.

Shared mutation semantics live in `lib/canonical-spine-change-core.js`. Runtime queuing/review lives in `apps/arcsweep/src/canonical-spine-change-control.js`. Repository application lives in `scripts/apply-canonical-spine-change.mjs`.

Repository application is dry-run by default:

```sh
npm run spine:change:check -- path/to/change-package.json
```

Writing requires an explicit apply command:

```sh
npm run spine:change:apply -- path/to/change-package.json
```

A change package uses schema `flameclyffe.canonical-spine-change-package/v1` and contains one fingerprinted request plus its fingerprinted review.

## Collision policy

Do not unify entities because their labels look similar.

A cross-world or cross-project equivalence requires an explicit edge and evidence. Shared names do not imply shared ontology. Duplicate normalised labels are surfaced as unresolved semantic collisions unless an explicit `equivalent_to`, `supersedes`, or `conflicts_with` relationship resolves the ambiguity.

Examples:

- a moon named Mawr in one world is not automatically the same object as Mawr in another world
- a narrative bond is not automatically a PREMAQC relational edge
- a Watcher role is not automatically an Observer process

The graph records mappings without flattening distinct mythframes.

## Initial owners

- **ArcSweep OS** — operating environment, rooms, navigation, guide/caretaker surfaces
- **Canonical Spine** — ontology, dependency, ownership, provenance, boundary, and change-legibility graph
- **STARWELL / Flameclyffe** — estate, observatory, world and experiment surfaces
- **Observer / DEEP** — evidence, provenance, receipts, replay, state observation
- **PREMAQC** — dynamic relational/state representation
- **Runa** — sensory/harmonic state compilation
- **Glyph Forge / Kelyran** — multimodal symbolic-language embodiment
- **Project Zero / Hearthfire** — capability ownership, continuity, governance, release proof
- **Lanternbridge** — cross-system handoff and semantic transport
- **Worldseed** — portable world inheritance/state packaging

## Build and release invariants

- `npm run spine:verify` must pass before ArcSweep build/test.
- ArcSweep dev/build emits the runtime graph from the root authority and includes its source fingerprint.
- the Spine room is a Vite multipage entry, not an untracked static afterthought.
- release verification checks both the Spine route and the generated graph asset.
- the viewer consumes the shared runtime API and exposes structural warnings rather than maintaining shadow validation logic.

## Next implementation targets

1. Connect approved mutation receipts to Observer/DEEP's existing provenance graph rather than creating a parallel receipt universe.
2. Add machine-readable dependency/capability nodes for the real ArcSweep modules and routes, generated or checked against source where possible.
3. Add collision checks for cross-world imported canon and Worldseed inheritance.
4. Add knowledge-boundary topology only where the holder/source boundary is intentionally registered; never infer or publish protected content.
5. Let caretaker and guide agents query the Spine through the runtime API before they propose or invoke capability changes.

This file is the architectural contract for the canonical Spine. Future capability work attaches to it rather than creating hidden parallel structure.
