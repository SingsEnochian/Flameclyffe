# Observer Architecture v2 Migration Ledger

**Status:** Active migration plan  
**Opened:** 2026-07-29

## Governing rule

All implementation work must preserve the boundary:

```text
witness / evidence
→ interpretation
→ human response
→ PREMAQ update
→ canon transfer
→ projected world state
```

No layer may silently overwrite an earlier layer.

## Phase 0 — Documentation and terminology

- [x] Adopt the Observer Charter.
- [x] Record the Observer → PREMAQ → Canon Projection architecture decision.
- [ ] Link the Charter from repository entry points and relevant manuals.
- [ ] Mark older presentation-only PREMAQ descriptions as superseded.
- [ ] Add Nocturne Glint and the Observer founding conversation to the project lineage record.

## Phase 1 — Contracts

- [ ] Define `observation-receipt.schema.json`.
- [ ] Define `premaq-state-v2.schema.json`.
- [ ] Define `semantic-metric.schema.json`.
- [ ] Define `canon-graph-manifest.schema.json`.
- [ ] Define `transfer-function.schema.json`.
- [ ] Define `world-projection.schema.json`.
- [ ] Add source-class enum: witnessed, recorded, derived, model-interpreted, human-interpreted, remembered, correlated, simulated, projected, unknown.

## Phase 2 — Observer engine

- [ ] Preserve raw witness, telemetry, glyph, prompt, and prior state as immutable inputs.
- [ ] Store generated narrative and semantic metrics separately from measurements.
- [ ] Add accept, reject, annotate, defer, and partial-carry-forward actions.
- [ ] Produce an append-only receipt for every proposed state change.
- [ ] Ensure rejected output cannot enter the next observation state.
- [ ] Add deterministic replay using stored inputs, registry versions, prompt version, and model version.

## Phase 3 — PREMAQ v2

- [ ] Store value, derivative, uncertainty, confidence, contributors, timestamp, registry version, and receipt ID for each component.
- [ ] Preserve source contribution weights.
- [ ] Separate observed state from world-specific projections.
- [ ] Add migration adapter for historical PREMAQ packets.
- [ ] Add monotonic receipt sequence and immutable prior-state reference.

## Phase 4 — DEEP boundary

- [ ] Change DEEP outputs to `proposed_premaq_state` or `proposed_premaq_delta`.
- [ ] Remove or deprecate direct world manifestation fields.
- [ ] Attach evidence references, inference method, confidence, and uncertainty.
- [ ] Test all PREMAQ dimensions rather than evolving only one component.

## Phase 5 — Canon graph and transfer functions

- [ ] Attach transfer configuration to stable Arcsweep world anchors.
- [ ] Make timeline, era, contradiction ledger, source confidence, and canon rules available to projection.
- [ ] Version every transfer function independently.
- [ ] Add a current-reality evidence-grounded transfer function.
- [ ] Add representative fictional mappings for Terra Aeterna, Evil, and Starsong.
- [ ] Verify the same PREMAQ input produces distinct, canon-lawful outputs.

## Phase 6 — Arcsweep

- [ ] Resolve active world ID, canon graph version, timeline, era, anchors, and transfer version.
- [ ] Execute projection without mutating raw evidence or PREMAQ history.
- [ ] Record transition and projection lifecycle receipts.
- [ ] Expose projection status and failure mode.

## Phase 7 — STARWELL / Hearthgate

- [ ] Display witness, evidence, interpretation, human response, PREMAQ, canon, projection, and receipts as separate inspectable layers.
- [ ] Display uncertainty and provenance beside every metric.
- [ ] Add replay and comparison views.
- [ ] Use historical labels only with explicit semantic-metric typing.
- [ ] Apply the Charter's window test to UI acceptance.

## Phase 8 — Persistence and mirrors

- [ ] Align Supabase tables and RLS with consent and privacy scopes.
- [ ] Mirror canonical architecture records into Notion.
- [ ] Add export bundles for JSON, Markdown, and archival formats.
- [ ] Ensure Notion and other mirrors never become the only authoritative copy of receipts.

## Phase 9 — Verification

- [ ] Unit tests for source-class separation.
- [ ] Unit tests for PREMAQ component provenance.
- [ ] Integration test: observation → accepted PREMAQ delta → two world projections.
- [ ] Integration test: rejected interpretation does not propagate.
- [ ] Integration test: current-reality projection does not emit unsupported causal claims.
- [ ] Replay test reproduces stored transformation with identical versions.
- [ ] Migration test preserves historical records without silent relabelling.

## Definition of done

Architecture v2 is applied when every active route and interface can answer:

1. What was witnessed or measured?
2. What was generated or interpreted?
3. What did the human accept or reject?
4. How did PREMAQ change, and why?
5. Which canon graph and transfer function produced this projection?
6. Can the complete transition be replayed and audited?

The migration is incomplete anywhere those answers are unavailable.
