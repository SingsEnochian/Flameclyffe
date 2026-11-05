# Wayglass Century Architecture — 2126 Horizon
Date: 2026-11-05
Owner direction: “100 years deeper and higher”; build systems simultaneously.
Status: design and integration contract. Existing baseline inspected at 3ed1e02712795eb6c7871c4bb45ba8d0ae79ef68 in PR #539.

## The living observatory
A room can unfold into a laboratory, a planetary weather system, an orbital instrument, or an imagined cosmos. The operator can touch a field, hear its topology, open its equations, change a condition, branch the experiment and return to the same question. Sacred geometry supplies compositional and executable transformation grammars; every mapping names its mathematical operator and interpretive meaning.

The century horizon is a design instrument: ask what a mature civilisation would want to inhabit, then give today's implementation compatible foundations. Scale, persistence, intelligibility and participation matter as much as visual fidelity.

## Concurrent construction
Build the following lanes in the same integration cycle. Each consumes versioned fixtures from the shared contract immediately; no lane waits for another lane to be “finished.” Replace fixtures with real adapters as each becomes ready. Integration is continuous; runtime dependencies still follow explicit data flow.

| Lane | Build now | Century horizon | Shared evidence |
| --- | --- | --- | --- |
| Field and space | bounded multi-source field, moveable probes, independent numerical reference | nested coordinate frames from instrument to planetary and astronomical scales; swappable solvers | model/version, units, reference frame, tick, numerical error |
| Acoustic architecture | independent ambience/status/voice/event buses, semantic beacons, mono mapping | navigable acoustic topology, optional HRTF and calibrated listener adapters | event ID, source pose, bus, mapping, render acknowledgement |
| Living Observer | inspect source, transformation and Jacobian at a selected point | multi-scale instrument fusion and visible uncertainty propagation | source lineage, observation time, freshness, transform chain |
| Octet | shared intent vocabulary and result envelopes | composable instruments operated through speech, touch, gesture, code and accessible controls | request ID, capability, actor, outcome |
| Return Engine | branch snapshots, deterministic replay and explicit resume | long-lived experiments and attributable continuity across runtime migration | parent snapshot, model digest, seed, event cursor |
| Mission operations | fault fixtures and combined scenario runner | resource-aware scheduling, recoverable distributed execution and long-duration observability | budgets, health, measured latency, recovery report |

## Shared world contract
Every projection binds:
- schema version; world, room, branch and snapshot IDs; parent snapshot;
- monotonic simulation tick and separately attributed wall-clock observation time;
- explicit coordinate frame, origin, handedness, units and transform lineage;
- source IDs, source revisions, data kind (observed, simulated, derived or interpreted), and provenance;
- model ID/version/digest, parameters, random seed, solver step and numerical tolerances;
- event ID, causal parent, actor attribution and idempotency key for actionable requests;
- adapter health, stale threshold, resource budget and accessibility profile reference.

A normalized room cannot silently become metres, and a visual displacement cannot silently become spacetime curvature. Frame transformations are inspectable operations. Historical replay and fresh observation remain distinguishable in every modality.

Adapters declare supported frames, dimensionality, modalities, timing and error behavior. Unknown schema versions reject explicitly; migrations emit new snapshots retaining the original. Rendering can interpolate for smoothness, while instruments report the actual simulation tick they measured.

## The octet operates one world
| Instrument | Operation |
| --- | --- |
| Lantern · Reveal | expose a source, hidden relation or transformation with its evidence |
| Stone · Remember | preserve an immutable snapshot and open question |
| Key · Traverse | request a host-authorized crossing with an inspectable outcome |
| Loom · Connect | join compatible sources through declared transforms |
| Mirror · Model | branch conditions, compare outcomes and inspect differences |
| Bell · Signal | send attributable events through independently controlled buses |
| Vessel · Hold / Transfer | package state and provenance for another compatible runtime |
| Compass · Orient | locate observer, reference frame and possible bearings |

An experiment may compose all eight. Host authority evaluates each consequential action at execution time. Models, recordings and spatial position supply context; current permission comes from the host.

## Depth: reach inside the mathematics
Expose potential, vector field, local Jacobian, singular values and error estimates as linked instruments. A probe drag changes the measured location across visual, acoustic and textual projections. A parameter edit creates a new state revision; Mirror can hold an alternate branch beside it. Preserve dimensionless toy fields as a supported model family alongside future unit-bearing solvers.

Fold exploration needs hysteresis, step-size convergence checks and independent reference fixtures. Compare a numerical Jacobian against an analytic or independently implemented derivative. Mark singular/undefined values structurally in serializable output rather than losing Infinity through JSON conversion.

## Height: worlds within worlds
Introduce a frame graph and level-of-detail policy. The same source may be viewed as a room object, a node in a knowledge constellation or an instrument in an orbital scene. Each view declares its mapping. Changing scale preserves object identity, selection, question and return marker.

Future telemetry enters through timestamped adapters with attribution, freshness and quality. Recorded datasets support offline exploration; live adapters can later replace them through the same interface. An absent adapter leaves an inspectable gap and working local instruments.

## Integrated acceptance voyage
Run one repeatable scenario across every lane:
1. Load a seeded two-source world. All projections bind the same snapshot and tick.
2. Move a source while turning the listener. Compare field probe, audio bearing and text locator against independent expectations.
3. Lantern reveals the derivative and provenance; Mirror branches a mass change; Compass compares bearings without traversing.
4. Mute ambience while preserving status; switch to mono and navigate by labelled cues and text. Feather cancels effects across adapters.
5. Inject delayed/out-of-order events, stale telemetry, audio suspension and renderer loss. Record each lane's degraded state and recovery.
6. Stone preserves both branches. Restart; recover coordinates, question, parameters and lineage with audio muted.
7. Vessel transfers to a second fixture runtime. Reject incompatible frames or versions explicitly. Key rechecks current authority and never replays a prior crossing automatically.

Capture model agreement, event-order integrity, restoration results, per-bus peak levels, p50/p95 input-to-output latency and frame-time distributions. Budgets are declared per target device and verified by measurements; no invented benchmark results.

## Baseline and completion evidence
Current code provides a normalized 2D illustrative field, central-difference Jacobian, stereo bearing cue and local return snapshot. Multi-bus mixing, frame graph, distributed snapshots and the integrated voyage above are proposed work. Full build, browser/device trials and integration gates remain separate evidence records.

This document establishes the concurrent architecture; it does not claim the century systems have shipped.
