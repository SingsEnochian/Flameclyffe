# ArcSweep OS v0.1 Migration Map

**Status:** implementation map  
**Companion charter:** `docs/architecture/ARCSWEEP_OS_V0_1_CHARTER.md`

## 1. Migration principle

ArcSweep OS is a reclassification and coordination layer before it is a rewrite.

Existing working organs remain in place while OS contracts are introduced around them. A component moves only when its authority, lifecycle, persistence, and replay behaviour are understood.

The migration rule is:

> Wrap first. Route second. Consolidate third. Delete only after replay and parity evidence exist.

## 2. Existing authority → OS role

| Existing organ | ArcSweep OS role | Migration action | Authority note |
| --- | --- | --- | --- |
| House Runtime Broker / Braid | Model scheduler / runtime process manager | Keep authority; expose through `model.invoke` capability | No duplicate model router |
| Hearthfire browser state | OS state persistence substrate | Keep authority; add typed ArcSweep OS extension state | No new competing session store |
| ArcSweep shell/navigation | OS interactive shell host | Wrap with OS navigation events and context capsules | Existing rooms stay usable |
| Story Mode | Story application | Route through OS context + cognitive service | Output remains proposal/narrative contribution |
| Fantasy Roleplay runtime | Interaction skill service | Keep contracts; consume OS context | Identity and agency boundaries remain intact |
| Feedback Chamber | Transition/review application | Reframe around PREMAQC transition receipts | Human review remains explicit |
| PREMAQC / Math Spine | State/transition mathematics service | Expose canonical transition evaluation | Q remains firsthand/context-only |
| Observer / DEEP | Telemetry, evidence, temporal lineage | Keep authority; consume OS receipts | Observation is not canon |
| Runa | Multimodal compositor | Expose sound/haptic/glyph/gesture capabilities | No duplicate sensory engines |
| Source Library | Source/document service | Expose via object resolver | Preserve source provenance |
| Canon Studio / ingest | Canon review application | Consume proposal and provenance objects | No automatic canon commit |
| Replay | OS/app replay service | Extend to OS navigation/action receipts | Historical receipts remain versioned |
| Glyph Forge / Living Glyph / Brush Foundry | Creative applications | Consume object, Runa, context, replay capabilities | Preserve glyph lineage |
| House Commons | Conversational application | Use Guide + House Runtime + OS context | Commons is not the Guide itself |
| Echo Index | Object resolver/search service | Restore as resolver over existing stores | Do not create competing registry |
| Knowledge banks | Skill/cognitive configuration | Add shared cognitive spine bank | Keep per-voice identity separate |
| Local learning store | Reviewed learning-example source | Extend with reasoning-operator subjects later | Human-reviewed provenance required |

## 3. Stage 1: Kernel + Caretaker foundation

### 3.1 New modules

Proposed initial modules under `apps/arcsweep/src/os/`:

```text
os/
  arcsweep-os.js
  os-session.js
  os-event-bus.js
  os-capabilities.js
  os-context-capsule.js
  caretaker-daemon.js
  caretaker-receipts.js
  feather-state.js
```

These modules must be additive and must not replace existing room implementations in Stage 1.

### 3.2 Session state

The OS session should maintain pointers, not copies, for:

- operator/session id;
- world id;
- project id;
- room id;
- scene id;
- document id;
- active object ids;
- current goal;
- Guide presence mode;
- Feather/autonomy state;
- last durable receipt id;
- open work queue references.

Session state should be serialisable, versioned, and able to restore safely after reload.

### 3.3 Event bus

The first event bus implementation should be a small typed wrapper around browser `EventTarget`/`CustomEvent`, not a new heavy framework.

Minimum events:

```text
arcsweep:os-ready
arcsweep:navigation-changed
arcsweep:context-capsule-created
arcsweep:draft-dirty
arcsweep:draft-snapshotted
arcsweep:caretaker-alert
arcsweep:model-route-fallback
arcsweep:feather-paused
arcsweep:feather-resumed
```

Each emitted event should have:

- schema/version;
- event id;
- occurred_at;
- source organ;
- authority class;
- payload;
- optional parent receipt/event ids.

### 3.4 Capability registry

The first registry is declarative. Existing functions are wrapped as capabilities without moving their implementations.

Initial capability names:

```text
navigation.open
context.read
context.update
model.invoke
object.resolve
object.search
story.continue
canon.compare
replay.open
audio.play
haptic.render
observer.record
```

A capability declaration should expose:

- id;
- provider organ;
- destructive/non-destructive flag;
- network requirement;
- model requirement;
- consent requirement;
- degraded behaviour;
- input/output schema ids.

### 3.5 Context capsule bridge

Add a thin bridge at the existing navigation boundary.

On room change:

1. snapshot dirty local draft state;
2. read current OS session pointers;
3. update `previous_room` and `current_room`;
4. resolve minimum relevant object references;
5. emit `arcsweep:navigation-changed`;
6. create a context capsule;
7. emit `arcsweep:context-capsule-created`;
8. allow the Caretaker and Guide to consume the capsule.

No LLM call is required for this path.

## 4. Stage 2: Guide shell

The Guide should be mounted once at the ArcSweep shell level, outside room-specific render lifecycles.

Initial Guide contract:

```text
GuideState
  session_id
  presence_mode
  current_room
  current_world
  current_goal
  last_context_capsule_id
  conversation_thread_id
  autonomy_paused
```

The first Guide does not need interface-driving autonomy. Stage 2 acceptance requires only:

- one persistent conversation thread;
- room-aware context;
- continuity across navigation;
- Guide presence modes;
- explicit Feather pause/resume state;
- ability to request navigation through a capability rather than DOM reach-through.

## 5. Stage 3: Echo resolver

Restore Echo Index as an OS service rather than a parallel data product.

Resolver sources should initially include the canonical stores already present for:

- worlds;
- codex entries;
- source library documents/segments;
- artifacts;
- discovery logs;
- Observer events/relations;
- House/runtime receipts;
- story/narrative receipts;
- glyph and Runa artifacts where resolvable.

The resolver must return authority/provenance with every object.

## 6. Stage 4: Cognitive Spine

Add a shared bank to `apps/arcsweep/skills/cell-banks.json`:

```json
{
  "subject": { "kind": "shared_constellation", "id": "cognitive-spine" },
  "banks": ["./cells/shared/cognitive-spine.cells.json"]
}
```

The cognitive bank teaches operators, not identity.

Initial operator set:

```text
relate
find_invariants
generate_alternatives
mechanise
formalise
counterfactual
boundary_test
falsify
track_provenance
preserve_reversibility
least_damage_transition
```

A new `compileCognitiveEnvelope()` should be callable before mode/voice compilation when a task requests cognition.

The default pipeline should remain cheap: one model pass unless the task explicitly requests or heuristically merits deeper multi-pass reasoning.

## 7. Stage 5: Story generation

Current Story Mode already defines continuity semantics. The OS migration adds generation orchestration.

A Story request should resolve:

- world object;
- current scene object;
- relevant canon objects;
- participant view/knowledge;
- relationship state;
- user-visible contribution;
- Story Mode contract;
- selected voice/participant route where applicable;
- cognitive operators requested;
- output authority = narrative contribution/proposal.

Story output then produces:

- visible prose;
- semantic/narrative receipt;
- optional story event candidates;
- optional canon candidates;
- replay pointer;
- explicit model/provider attribution.

## 8. PREMAQC correction

ArcSweep OS should never treat PREMAQC as a generic scorecard.

The OS uses PREMAQC to describe and evaluate transitions while preserving hard constraints.

Hard constraints such as provenance loss, identity collapse, perspective laundering, or unreviewed canon promotion invalidate a candidate regardless of any scalar preference score.

Q remains context-only and firsthand-only according to the canonical PREMAQC contract.

## 9. Human collaborator identity boundary

Human collaborators are never represented as routed model identities merely because their work informs system design.

If a human collaborator explicitly contributes reasoning patterns or source material for model training, those patterns must be represented as provenance-bearing source material or named derived lenses, not as synthetic identity substitution.

## 10. Stage 1 code acceptance target

The first code PR after this charter should prove one narrow loop:

```text
ArcSweep loads
  ↓
OS session initialises
  ↓
operator enters Room A
  ↓
navigation event + context capsule
  ↓
operator enters Room B
  ↓
Caretaker observes transition
  ↓
Guide state still exists
  ↓
receipt chain replays
```

No model call is needed to pass this first gate.

## 11. Do-not-break list

During the OS migration, do not regress:

- current House Chat;
- Story/Roleplay mode selection;
- model-route attribution;
- Glass Halo model boundary;
- Source Library;
- current creative rooms;
- sound/resonance organs;
- Runa canonical binding;
- existing replay/receipt semantics;
- current GitHub Pages/static hosting path.

## 12. Immediate next files

After approval of this migration map, create:

```text
apps/arcsweep/src/os/os-event-bus.js
apps/arcsweep/src/os/os-session.js
apps/arcsweep/src/os/os-context-capsule.js
apps/arcsweep/src/os/caretaker-daemon.js
apps/arcsweep/test/arcsweep-os-foundation.test.js
```

Then wire them into the shell with the smallest possible bootstrap hook and prove the Stage 1 navigation loop before introducing Guide UI or model cognition.
