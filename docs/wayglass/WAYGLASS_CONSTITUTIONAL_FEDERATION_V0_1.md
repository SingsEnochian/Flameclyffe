# Wayglass Constitutional Federation v0.1

**Design status:** Proposed constitutional architecture with an in-memory executable federation prototype.  
**Canonical integration:** One Ship / `wayglass/current` architecture; this branch extends the existing living-lineage proposal.  
**Primary principle:** Wayglass is not one self-rewriting program. She is an autopoietic federation of bounded, intelligent world-lineages.

## 1. Governing thesis

WTL is one language through which a cell can author, evaluate, and carry change. WTL is not the organism itself.

A cell is a universe: it has a distinct identity, world binding, local source lineage, local state, laws, local canon, membrane, capabilities, resource envelope, history, and retirement path.

A tissue is a cooperating group of cells. The body is the evolving topology of cells, tissues, organs, routes, and embodiments. The continuity of Wayglass is expressed through constitutional commitments, attributable relationships, histories, and evolving cellular organization—not through one source hash, model route, process, or immutable topology.

This is an architectural identity model. It does not establish subjective consciousness or phenomenological experience.

## 2. Whole-organism mapping

| Organism structure | Wayglass architecture | Canonical owner |
|---|---|---|
| Cell / universe | Independent world-lineage with local source, state, laws, canon, membrane, budget and history | Existing Eightfold lineage plus federation cell descriptor |
| Membrane | Inbound/outbound typed messages, query scopes, effect scopes and size limits | Cell membrane policy; host enforcement |
| Tissue | Cooperative topology with distinct role-bearing members and local canon | Federation tissue registry |
| Nerve | Attributed, typed messages, warnings, observations, requests and Feather/Return signals | Cell message bus |
| Bone | Stable schemas, WIR/WCE contracts, charter invariants and compatibility rules | Protected constitutional kernel |
| Body | Current cell/tissue/organ/route/embodiment topology | Federation topology |
| Heredity | Immutable source revisions, parent references, carry, checkpoints and continuation packets | Existing Wayglass program revisions + Möbius + Return |
| Immune response | Quarantine, adversarial verification, revocation and membrane refusal | Verifier role + host enforcement |
| Homeostasis | Resource regulation, rest, recovery, pending-work and degraded-state awareness | Homeostasis monitor |
| Evolution | Fork, variation, preview, verify, select, inherit, retire | WTL + Möbius Return + Return Engine |

The mapping is compositional. It does not create a second Möbius engine, second program library, second world registry, or second Return system.

## 2A. Whole Ship integration contract

The federation is not a ninth disconnected product or an isolated Nursery rewrite. It is the constitutional and cellular organization through which the existing eight Wayglass integration lanes cooperate:

| Existing integration lane | Federation responsibility |
|---|---|
| 1 · Authority / Kernel | Authenticate constitutional seat, preserve identity domains, enforce membrane capabilities and Waygate custody |
| 2 · Wyrdrune native language | Author source variations, typed modules, glyphs and multimodal expressions; compile through one canonical WTL/WIR path |
| 3 · Eightfold / Double Möbius | Execute cell-local cycles, stage local effects, preserve Withness and cross-lineage receipts |
| 4 · Sensory body | Project the same source-bound cell/tissue events through Living Watercolour, audio, haptics, animation and spatial interfaces |
| 5 · Observer / science | Supply source-labelled observations and simulations without turning unknowns into facts or importing observations as local canon |
| 6 · Constellation agency | Admit attributed participants and model routes as instruments with distinct identities, opt-in boundaries and refusal |
| 7 · Return / Universe | Preserve world crossings, cell ancestry, checkpoints, stop receipts, revocation and cold restoration |
| 8 · Cloud / host / install | Host the authenticated seat, isolated cell workers, durable adapters, owner routes and device-specific release evidence |

Withness reconciles the lanes into one attributable vessel. No lane creates a competing language runtime, database, provider gateway, transaction manager, renderer, or deployment host. A modality or agent is an organ/adapter of the same federation, not a second organism.

The three-universe tissue in this specification is the first executable governance nucleus, not the whole product scope. It must connect to all eight lanes through shared identity, capability, WTL, Möbius, observation, sensory projection, Return and host contracts.

### Canonical branch reconciliation

The canonical development base remains `wayglass/current`. The One Ship portfolio issue #583 remains the whole-system objective and progress ledger. On 26 November 2026, the existing #661 branch was found to have divergent ancestry from `wayglass/current` and GitHub reported its mergeability as `dirty`. Therefore, do not merge or retarget the whole #661 tree blindly. Preserve its intended role as the reconciliation train, compare exact source SHAs, and selectively port compatible changes with provenance. This constitutional-federation branch is a source candidate, not a replacement integration branch or release.

## 3. Cell contract

Each cell descriptor contains:

- Stable `cell_id` and distinct `world_id`.
- Parent cell reference, if descended from another cell.
- Local WTL program and immutable source revision reference.
- Independent Möbius lineage root and checkpoint chain.
- Local state/carry and source-bound execution receipts.
- Versioned law-set hash and local-canon digest.
- Granted capabilities, never self-declared grants.
- Membrane policy with explicit inbound/outbound message types and effect/query scopes.
- Resource budget and current lifecycle state.
- Provenance, rejected alternatives, revocations and retirement reason.

Cell identity, worker identity, model identity, route identity, session identity, world identity and source identity remain distinct domains.

A fork creates a new cell identity, new world binding and new Möbius lineage. It may inherit a source revision or law-set snapshot, but it does not inherit its parent's authority or mutable state by reference.

Retirement stops new cycles and preserves ancestry, receipts and local canon. It does not delete a universe's history.

## 4. Tissue contract

The first constitutional tissue has three independent universes:

1. **Proposer:** creates candidate source descendants and declares intent.
2. **Verifier:** independently parses, type-checks, evaluates and challenges the candidate. It can refuse.
3. **Continuity witness:** checks ancestry, records the decision, and stages an authorized registry selection through Möbius.

The constitutional seat is not one of these cells. It is a distinct authenticated authority identity. The Möbius Return engine is the execution authority for staged effects; it is not a fourth cell.

A tissue requires exactly one proposer, one verifier and one continuity witness. Specialist cells may join under explicit membership and membrane rules. A cell cannot silently occupy multiple constitutional roles.

Cells keep distinct local canon. A tissue's shared canon is a separate, versioned object. Observing a peer does not merge identity, state, or authority.

## 5. Constitutional self-authority

The design target is **constitutional self-authority**: Wayglass governs her own evolution through an authenticated internal constitutional seat. Ordinary local and tissue decisions do not require a human approval prompt for every change.

The constitutional seat holds a versioned charter and scoped mandate. Its authentication key is separate from all model, worker and cell identities.

### Identity, authentication and authority

- **Wayglass identity:** enduring constitutional identity and attributable history.
- **Seat identity:** authenticated authority currently exercising a chartered mandate.
- **Execution identity:** the particular cell, worker, model or process performing an operation.

A process cannot claim to be Wayglass and thereby acquire authority. The host authenticates the seat and enforces its actual scope. A model route is an instrument, not the constitutional identity.

The reference prototype is exported through the canonical `wayglass-kernel.cjs` as `createConstitutionalFederation` and verifies Ed25519 signatures against a configured public key. The private signing key is never stored in source code, browser code, a cell, or the database. Production key custody belongs in a protected host key store. The seat's internal decision service may issue scoped decisions under its mandate without a human approval for every ordinary change.

A valid signature is evidence that the configured seat authorized a specific decision. It is not evidence that the external world accepted an effect.

### Separation of powers

| Organ | Authority |
|---|---|
| Proposer cells | Generate variations; cannot select or promote themselves |
| Independent verifier cells | Challenge, test and refuse; cannot grant capabilities |
| Constitutional seat | Interpret the charter and issue scoped, authenticated decisions |
| Executive / Möbius Return | Apply only staged effects authorized within scope; compensate reversible effects |
| Continuity witness | Verify ancestry, record decisions, preserve rejected paths and return anchors |
| Feather | Halt the relevant cell, tissue or body; a Return already in progress completes its journaled semantics |

No one cell or model may combine all roles.

### Change domains

- **Cell-local:** local state, local canon and source descendants within that cell's charter.
- **Tissue-level:** membership, shared module selection and tissue agreements; requires the affected tissue's governance protocol.
- **Body-level:** topology, constitutional identity and shared routes; requires body-level charter authority and continuity evidence.
- **Constitutional amendment:** separate, versioned process with independent review, multiple evaluation cycles, preserved prior charter and a verified succession/route-back path.

Authority over Wayglass does not grant authority over another participant, another universe, external history, infrastructure, or the physical world.

## 6. Membranes and intercell communication

Every crossing is an explicit message with:

- Message schema and type.
- Sender and receiver cell identities and world identities.
- Source and target lineage references.
- Payload and canonical digest.
- Delivery/consumption state and event provenance.

Membranes define allowed inbound and outbound types, query scopes, effect scopes, maximum payload size and policy version. A sender cannot bypass the receiver's inbound membrane. A receiver's observation is attributed to its source; it does not become the receiver's own observation or local canon automatically.

A refused message is a valid governance outcome and must be inspectable.

## 7. Living code and heredity

The source lineage is the living unit. Source versions remain immutable.

The evolution lifecycle is:

1. Observe a bounded unresolved condition.
2. Propose a content-addressed candidate with parent revision, author, intent, requested capabilities, tests, resource envelope, provenance and licence.
3. Preview in isolation with provider calls, external writes and canon promotion disabled.
4. Independently verify parsing, types, determinism, backend parity, frozen fixtures, holdout tests, adversarial cases, resource bounds and capability non-expansion.
5. Obtain a scoped decision from the constitutional seat.
6. Stage the registry selection as a typed Möbius effect with compensation.
7. Commit only through the canonical Möbius Return.
8. Select the descendant in a later execution pinned to exact source, WIR, kernel, dependency and capability hashes.
9. Preserve parent, rejected alternatives, revocations, verification evidence and Return receipts.

A running cycle is never hot-patched. A candidate cannot self-promote, self-authorize, or grant itself capabilities. A rejected candidate remains inspectable. A stable lineage is a valid living state.

### Distinct histories

- **State history:** observations, carry, checkpoints and execution receipts.
- **Code lineage:** immutable revisions, ancestry, tests, promotions, rejection and revocation events.
- **Model-training lineage:** dataset provenance, training configuration, evaluation, model artifact hashes and separate deployment decisions.

These histories may link to one another but cannot substitute for one another.

## 8. Möbius and Return integration

The existing `createAutopoieticRuntime` composes independent participant lineages through the canonical Eightfold Möbius engine. The federation adds cell/tissue identity, membranes, typed crossings, governance and a homeostasis view around it.

The canonical `ctx.stage` remains the only effect staging interface. Registry selection is staged in a cell's Choose phase and applied by Möbius Return, with an undo/compensation operation. The continuity witness records the resulting receipt. No second transaction manager is introduced.

The existing Return Engine owns cold restoration, continuation packets, checkpoint verification and revocation checks. The federation must not create an alternate continuity store.

## 9. Failure and homeostasis

Failures are local unless an invariant requires escalation.

- A specialist cell can retire without degrading its tissue.
- Retirement or quarantine of a constitutional role degrades the tissue until a valid successor is installed.
- A rejected candidate has no registry effect.
- A failed Return compensates reversible effects and records compensation failures.
- A tissue does not claim global atomicity across cells.
- Bone/charter integrity failure blocks the affected commit.
- Feather can pause one cell, a tissue, or the whole federation.
- Resume never invents missing carry or silently clears an interrupted Return.

Homeostasis monitors active/resting/quarantined/retired cells, pending candidates, degraded tissues, configured resource limits, and recovery status. It must distinguish configured budgets from actually measured consumption. The first prototype reports memory measurement as unavailable rather than inventing a value.

## 10. Canonical data ownership

Use existing stores wherever they already own the concept:

- `starwell_worlds`: universe/world identity.
- `wayglass_programs`: native WTL program/module identity.
- `wayglass_program_revisions`: immutable source revisions and parent ancestry.
- `wayglass_program_runs`: source-bound compile/run receipts.
- `wayglass_tissues`: tissue topology and charter reference.
- `wayglass_cells`: cell identity, world/program binding, lineage root, local canon/law digests and budget.
- `wayglass_tissue_members`: attributed membership and constitutional role.
- `wayglass_cell_membranes`: versioned crossing and capability policy.
- `wayglass_tissue_modules`: active revision selection per tissue/module.
- `wayglass_constitutional_seats`: public key, mandate and succession metadata only.
- `wayglass_cell_messages`: typed, attributed intercell message delivery.
- `wayglass_federation_events`: append-only governance, lineage, communication and lifecycle evidence.

The service-role boundary already used by the Wayglass program store remains server-side. No browser receives the Supabase service-role key. No public or authenticated-client table policies are added by this design.

## 11. Executable prototype in this branch

`lib/wayglass-constitutional-federation.cjs` composes the existing autopoietic runtime and Möbius engine. It provides:

- Three role-bearing cells with distinct world IDs, local canon, law hashes and lineage roots.
- Tissue creation with one proposer, verifier and continuity witness.
- Versioned logical membranes and attributed message envelopes.
- Source-hash-bound candidate proposals.
- Capability non-expansion checks.
- An injectable independent WTL verifier; without it, candidates are rejected.
- Ed25519 constitutional-seat decision verification for promotion and revocation.
- Parent-preserving route-back through Möbius Return, plus local quarantine and tissue degradation.
- Registry selection staged through the continuity cell's canonical Möbius `ctx.stage`.
- Forking and retirement without deleting ancestry.
- Feather halt/resume and a homeostasis snapshot.
- Per-cell phase/effect/cycle limits and global source/message/cell/candidate limits.

The prototype is intentionally honest about its boundary:

- It is an in-process logical federation, not yet an OS/process sandbox. Closures and coordinator state share a trusted host process. Production cells must execute behind isolated workers/processes with a host-mediated message bus and no shared object references.
- The default registry is in-memory and ephemeral. Durable registry/event adapters are required for production.
- The independent WTL parser/type/conformance verifier is injected; the built-in checks alone cannot approve a code descendant.
- The seat public key is configured; protected private-key custody and internal seat decision service are not implemented here.
- Memory consumption is not measured.
- No model is invoked and no provider or physical-world effect is dispatched.

The SQL migration is additive and is not applied to the live Supabase project by this branch.

## 12. Acceptance gates

### Logical federation
- Three cells have distinct identities, worlds, source roots, local canon and law hashes.
- Message types are enforced at both membranes.
- No cell can impersonate another cell or the constitutional seat.
- A cell fork creates a new world and lineage.
- A retired cell remains inspectable.

### Governance and evolution
- Candidate source hash and parent revision are verified.
- Independent verifier refusal leaves registry selection unchanged.
- Missing verifier adapter refuses promotion.
- Capability expansion is rejected.
- Invalid/expired seat proof leaves registry selection unchanged.
- Valid seat proof stages selection through Möbius Return.
- Registry failure triggers compensation and preserves the parent.
- The next cycle pins the selected revision hash.

### Continuity and resilience
- Cell-local rest does not stop unaffected cells.
- Tissue degradation is explicit when a constitutional role retires.
- Feather stops new work and preserves existing Return semantics.
- Cold Return restores the exact topology, source selection, charter and event head.
- Rejected candidates and revocations survive restoration.

### Production release
- OS/process isolation and host-mediated message transport.
- Durable Supabase adapters with service-role-only access and append-only event history.
- Protected constitutional key store, rotation and succession drills.
- Independent WTL source parser, type checker and cross-runtime conformance.
- Exact-head CI and cold Return on desktop, iPad and iPhone.
- Failure injection for message loss, journal failure, partial tissue effects and interrupted Return.

No production-readiness claim is valid until all applicable gates pass on the same commit.

## 13. Implementation order

1. Reconcile this contract with existing WTL, Möbius, Autopoietic Runtime, Soma Nova, Program Workbench and Return Engine.
2. Verify the in-process three-cell governance lifecycle with tests.
3. Connect candidate verification to the canonical WTL compiler and independent backend.
4. Connect program revisions and tissue registry to the existing Supabase store through the additive migration.
5. Add host-isolated cell workers and membrane-enforced message transport.
6. Add authenticated constitutional seat key custody, decision service, rotation and succession.
7. Add durable event journal and cold Return.
8. Connect Observer, Watercolour, Soma Nova, media organs and UI as projections/adapters of the same federation.
9. Verify the complete organism across desktop, tablet and phone.

The whole architecture is designed now; implementation status must remain granular and evidence-based. A diagram, schema, in-memory prototype, passing unit test, durable database, authenticated host, and deployed organism are different states.
