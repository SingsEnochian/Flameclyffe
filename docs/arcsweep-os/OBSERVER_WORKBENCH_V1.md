# ArcSweep Observer Workbench v1

Status: implementation branch  
Owner: Rowan  
Surface: `apps/arcsweep/observer/`  
Authority: observational / working-note / witness-only unless an existing ArcSweep capability explicitly grants more

## Purpose

Observer Workbench is the ArcSweep-native interface for inspecting the living Observer / DEEP / PREMAQC system without creating another authority plane. It combines the strongest compatible patterns already present in ArcSweep with clean-room architectural lessons from Project Zero Ezra, NarrativeNode, and scientific-agent workflow research.

The Workbench is not a replacement for the existing `deep-observer` room. It is an instrument surface over the same source contracts. The existing room remains available for its current workflows while the Workbench becomes the higher-density inspection and authoring surface.

## Core law

```text
one source state
→ several projections
→ explicit provenance
→ semantic verification
→ receipted witness
```

A green UI control, HTTP 200, successful tool dispatch, or rendered visual is not by itself evidence that the intended semantic state changed.

Unknown remains unknown. Unset is not automatically missing. Missing is not automatically error. Narrative is not automatically evidence. A claim is not automatically fact. A visualised mechanism is not automatically an observed mechanism.

## Surface layout

### Semantic truth rail

The top rail reports separate states for:

- availability;
- integration health;
- runtime state;
- data health;
- activity;
- domain status such as attention capture and mathematics inspection.

These are intentionally separate. A readable snapshot can prove data availability while still leaving process liveness unknown.

### PREMAQC projection

The current DEEP projection displays the PREMAQC axes `P, C, R, E, M, A, Q` without silently converting missing source values into claims about the underlying Observer. Transformation receipts remain inspectable.

### Epistemic ledger

The Workbench exposes a typed lineage of:

```text
observation
→ measurement
→ transformation
→ evidence / claim
→ explicit mechanism edge
```

Mechanism edges carry an epistemic status such as observed, measured, calculated, inferred, hypothesised, visualised, declared, or unknown.

### Rich working leaf

The Workbench includes a dependency-free first-party rich working editor. It supports ordinary rich-text structure plus semantic marks for Evidence, Claim, Hypothesis, and Canon reference.

This editor is deliberately a working-note surface. Saved leaves are marked `working-note-non-canon`; highlighting or writing something does not promote it to evidence or canon.

The design lesson is the separation between a human-readable rich document and machine-readable graph/state contracts. The implementation is ArcSweep's own and does not incorporate NarrativeNode source code.

### Narrative state

Narrative interpretation is shown as a downstream projection with claims, evidence, objections, risks, research gaps, and mechanism edges kept distinct. The Workbench does not use prose presence as proof.

### Selective skills

The scientific skill router supplies a bounded subset of procedural knowledge based on current topics and capability intent. Skills are procedural context only; selection does not grant runtime authority.

The intended future MCP catalogue follows the same law: expose the smallest useful capability surface for the current task and current authority state rather than loading every possible tool.

## Project Zero Ezra lessons incorporated

The Workbench clean-room implementation adopts these architectural lessons:

1. Availability, integration health, runtime state, data health, activity, and domain status are distinct truths.
2. Plugin/instrument readiness should report what is known rather than infer healthy runtime from mere registration.
3. Adapters should project existing authority rather than become new state owners.
4. UI status is a projection of machine truth, not the source of machine truth.

No Project Zero source is copied into Flameclyffe. Project Zero remains an external donor/reference system.

## Scientific-agent lessons incorporated

1. Select procedural skills instead of loading a complete catalogue into standing context.
2. Track evidence and mechanism edges explicitly.
3. Distinguish transport/schema success from semantic correctness and scientific support.
4. Preserve source versions, transformations, provenance, and pass/fail receipts.
5. Acceptance should exercise actual state transitions and read back the intended result.

## NarrativeNode lessons incorporated

NarrativeNode is studied as an external design reference only. Its licence does not permit incorporating its source code into ArcSweep.

Compatible design lessons include:

- rich human text and structured graph state should remain separate but linked;
- history is more useful than destructive global-state replacement;
- MCP/tool surfaces should be adapters over the authoritative application state;
- read and write capability exposure can vary with the current session authority;
- predictable model call errors can be normalised before a strict canonical execution boundary;
- post-dispatch connection loss produces an unknown outcome that must be read back before retry.

ArcSweep implementations of these ideas must remain independently authored.

## Boxfire witness contract

Schema: `arcsweep.observer-witness/v1`

A witness packet may include:

- active World identity;
- semantic Observer status;
- current DEEP projection and transformation receipts;
- narrative-state counts;
- epistemic-ledger counts and boundaries;
- workspace counts such as feedback cycles and accepted DEEPTime records;
- a bounded excerpt of the current working note;
- host mode and receipt lineage.

Every packet carries:

```json
{
  "authority": {
    "witness_only": true,
    "grants_authority": false,
    "canon_commit": false,
    "source_mutation": false
  }
}
```

### Browser lane

The browser publishes the latest bounded history to:

- localStorage key `hearthgate.arcsweep.observer-witness.v1`;
- `BroadcastChannel('arcsweep-observer-witness-v1')` when available;
- DOM event `arcsweep:observer-witness`.

These are convenience witness projections. They are not durable canonical receipts.

### Desktop lane

The Electron host additionally writes under the ArcSweep local data root:

```text
observer-witness/
├── latest.json
└── receipts.jsonl
```

`latest.json` is atomically replaced. `receipts.jsonl` is append-oriented and bounded to recent witness packets. The desktop IPC surface exposes publish/read/status calls but no witness-driven mutation operation.

A local Boxfire process can watch the lane with:

```text
npm run arcsweep:observer:witness
```

Use `ARCSWEEP_DATA_DIR` to point the watcher at a non-default ArcSweep data root when required.

## Source ownership

The Workbench reads existing ArcSweep/Observer sources rather than creating replacements:

- durable ArcSweep workspace state;
- active World identity;
- feedback cycles;
- `premaqcByWorld`;
- `observatory.deep_time_records`;
- Observer shared snapshot `hearthgate.observer.premaq.v1`;
- derived DEEP projection;
- Observer OS semantic/narrative/epistemic builders.

No separate World Registry, PREMAQC store, DEEPTime store, canon store, or Boxfire authority store is introduced.

## Semantic retry law for future MCP work

ArcSweep MCP should distinguish at least:

```text
NOT_DISPATCHED
  → safe to retry

DISPATCHED_ACKNOWLEDGED
  → verify intended semantic state

DISPATCHED_OUTCOME_UNKNOWN
  → read authoritative state before retry

VERIFIED
  → receipt semantic acceptance
```

Blind retry after a post-dispatch disconnect is forbidden because the first write may already have landed.

## Acceptance targets

The Workbench v1 is ready for merge when all of the following are demonstrated:

1. `observer-workbench` appears in the applet catalogue and opens the packaged `/arcsweep/observer/` surface.
2. Existing World identity is preserved in the launch context.
3. Semantic status never claims runtime liveness from snapshot availability alone.
4. PREMAQC renders without mutating source state.
5. Claims and evidence remain separate in the narrative/epistemic surfaces.
6. Rich working notes persist per World and remain explicitly non-canon.
7. Publishing a witness produces the same receipt id in browser history and, when desktop-hosted, the local witness files.
8. Boxfire's local watcher can observe a newly published receipt without receiving write authority.
9. Desktop and web render the same semantic status from the same source fixture, except for explicitly host-specific witness transport fields.
10. Existing `deep-observer` workflows still operate.
11. ArcSweep tests and build pass from the same source SHA.

## Next layer

After v1 acceptance, the MCP layer should compile its tool catalogue from the ArcSweep capability registry. The intended sequence is:

```text
current task
→ selective skill/workflow context
→ current authority lease
→ bounded MCP capability catalogue
→ strict canonical validation
→ tolerant pre-validation normalisation
→ capability invocation
→ Observer semantic readback
→ receipt
```

This preserves the ArcSweep rule that the capability registry and Steward authority system remain the constitution, while MCP is merely another doorway into the House.
