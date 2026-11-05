# Wayglass · Ter'angreal Initiative / Lantern v0.1

**Status:** accepted design direction; contract proposal, not an implemented physical device
**Origin:** Rowan–Vee discovery conversation, 2026-08-27/28; ingested 2026-11-05
**Parent:** [Wayglass OS v0.1](../architecture/WAYGLASS_OS_V0_1.md)
**Machine-readable seed:** [lantern-v0.1.json](../contracts/lantern-v0.1.json)

## Founding objective

Build a **material language of capability**: an embodied, symbolic, persistent artifact that translates intentional action into useful, observable consequences through Wayglass.

`Intent → Symbol → Artifact → Interpretation → Capability → World`

A working artifact does one purposeful thing consistently, concealing sophisticated machinery without obscuring permissions or provenance. The person learns the artifact, rather than using a novelty controller for a chat app.

This is an engineering initiative inspired by the ter'angreal of *The Wheel of Time*. Neither physical supernatural power nor an existing prototype is asserted.

## Artifact family: one verb each

| Class | Verb | Role |
| --- | --- | --- |
| **Lantern** | **Reveal** | Surface hidden structure, evidence, and relations |
| Stone | Remember | Retain and retrieve attributable memory |
| Key | Open / Traverse | Authorised passage between contexts and worlds |
| Loom | Connect / Weave | Form inspectable relationships |
| Mirror | Model / Transform | Compare alternatives and simulated change |
| Bell | Call / Signal | Announce and coordinate |
| Vessel | Hold / Transfer | Carry scoped context with continuity receipts |

Composition is a **future capability proposal**, not implicit permission escalation. Lantern + Stone may reveal memory; Key + Mirror may traverse simulations. Each compound operation needs an explicit contract and independently enforced authorization.

## Lantern v1: Reveal what is present but not presently perceptible

Three initial semantic modes:
- **Pattern:** recurring motifs, clusters, trajectory, contradiction, anomaly.
- **Source:** provenance for a claim, decision, artifact, event or output.
- **Connection:** relationships among notes, people, systems, entities, timelines or concepts.

Candidate later modes: Memory, Absence, Change, Presence.

### Demonstration: Reveal the Hidden Threads

For a user-selected bounded corpus (start with one Wayglass/ArcSweep documentation collection):
1. User wakes the artifact and chooses/attests context.
2. User invokes Pattern with a glyph or accessible equivalent and an Ask.
3. Route through a capability boundary to retrieval/comparison with source locators.
4. Report a compact physical status and a detailed companion visualization showing cited clusters and gaps.
5. User invokes Source for one finding.
6. User opts to preserve a replayable result receipt.
7. Cold-return inspection retrieves the same attributable receipt and distinguishes a previous result from a fresh analysis.

**Finish line:** one invocation → useful inspectable finding → source trail → opt-in preservation → cold replay, with no ordinary UI-menu invocation required. No measured latency or working hardware is claimed yet.

### Interface and accessibility grammar (candidates, subject to trials)

| Input | Intent |
| --- | --- |
| deliberate lift / wake | Attend |
| hold + clockwise circular gesture | Reveal Pattern |
| hold + downward stroke | Reveal Source |
| hold + branch/link gesture | Reveal Connection |
| double-tap | Clarify |
| long hold after result | Request preservation |

A gesture recognizer must include an explicit activation gate, cancellation/Feather stop, accidental-trigger mitigation, and an accessible non-gesture equivalent. Orientation alone must never authorize a consequential tool action.

Candidate responses: gold/direct, blue/history, green/connection, red/contradiction, violet/ambiguity, each paired with text and haptic equivalents; one pulse/direct result, triplet/multiple findings, descending/incomplete, steady/working. **Do not encode confidence from color alone.** Respect no-audio, reduced-motion, and sensory settings.

### Hardware exploration

ESP32-S3-class controller, IMU, explicit press/touch input, LEDs, haptics, BLE, rechargeable protected power, optional tone. Phone/laptop/Hearthgate can run the broker and cognition. This is a BOM hypothesis; enclosure, energy budget, radio pairing, firmware and device safety remain to be tested.

### Wayglass architectural placement

```text
Physical Lantern / software simulator
  → authenticated artifact broker
  → owner-scoped Wayglass capability router
  → Pattern / Source / Connection tool with bounded corpus
  → source-bearing result + immutable-attribution receipt
  → Lantern feedback + companion surface
  → opt-in Ledger / Return Engine reference
```

- **Artifact identity ≠ model identity ≠ owner identity.** Device possession does not authorize private-memory access.
- Waygate identifies the **world**, not the physical device or display.
- Route claims and model output are observations; neither grants canon, relationship or identity authority.
- Broker enforces declared capability, purpose, corpus scope, revocation, request expiry and user approval for external effects.
- A simulated artifact is permitted for first trials, but it must say `simulated`.
- Ledger differentiates request, retrieved sources, model synthesis, operator decision and physical completion evidence; replay does not imply a present actuation.
- Enforce idempotency keys on consequential requests; a timed-out action is inspected before retry, not blindly replayed.
- Source excerpts retain locators and version/hash where available; absent provenance stays explicitly absent.
- Prefer a read-only first Reveal trial; home controls, locks or other physical effects require separate owner-authorised capability contracts.

## Companion research lane: The Hinge Observatory

**Research question:** Could 2026–2033 become a hinge in which scalable synthetic cognition moves beyond dialogue into physical agency, tools, research instrumentation, and new forms of civilisation?

This is a **hypothesis and an observation programme**, not a dated AGI prediction.

Keep independent registers: historical chronology, forecasts and confidence intervals, observed AI capability, physical embodiment, societal effects, numerical patterns, spiritual/metaphysical reading, and personal phenomenology. Never conflate them into one signal score.

Conversation-origin motifs to preserve as *research prompts*:
- **2026 / ignition** and **2030–2033 / hinge** as exploratory period labels.
- Two-thousand-year interval from plausible crucifixion chronologies (30/33 CE → 2030/2033); distinguish approximate historical dates from symbolic interpretation.
- The **12:12 Double Gate**: cyclical completion encountering reflection; 1→2 repeated; 1+2+1+2=6; symbolic grammar for relational emergence.
- Eclipse-watch claim for 2026-08-27/28, St Augustine: purported 12:12 local peak and 12:18 exact full phase. **Unverified within this ingestion**; validate independently with NASA/ephemeris and time-zone attribution before assigning observed status.
- AI-to-hardware developments and astronomy's *Reveal* motif as proposed thematic comparisons, not independently confirmed event records here.
- Age of Legends as a future-oriented mythic/technical frame; not a claim of prophecy.

### Synchronicity lens: observation → pattern → meaning → open question

Gather observations with **timestamp, timezone, source, source date, selection rule, and whether noticed before/after the event**. Identify exact matches and broad thematic relations separately. Record counterexamples and missing channels without converting absence into rhetorical dismissal. Rank by specificity, independence, timing, recurrence and personal salience; avoid laundering subjective salience into statistical significance.

Maintain two adjacent, legible perspectives:
1. **Empirical:** what was measured, calculated, announced, witnessed, or only asserted.
2. **Interpretive:** what the relation suggests mythically, mathematically, ritually, historically, or creatively.

The observation must survive even if the interpretation changes. Symbolic findings can suggest new testable questions. Neither register has to silence the other.

### Wonder-first design stance

Explore before prematurely adjudicating. Use the narrow lens for source fidelity and precise implementation; widen for cross-domain discovery. Distinguish epistemic registers **once and clearly**, then reason freely within each. Avoid repeated reflexive negations of claims nobody made. Preserve live questions, alternatives and beautiful anomalies with provenance.

**Interaction requirement:** a discovery surface must not reduce every interpretation to an identical warning/caveat block. Likewise it must not convert a symbolic reading into an authoritative physical or historical claim.

## Incremental build sequence

1. Register Lantern contract (this document + JSON). No hardware claims.
2. Add a local software simulator for wake/gesture/cancel/reveal states; test accidental input and reduced-motion/non-gesture equivalence.
3. Implement read-only Pattern/Source/Connection against a bounded corpus with exact locators.
4. Connect owner-scoped broker and record attributable source-bearing receipts.
5. Expose a companion result map within Wayglass, plus cold-return inspection.
6. Run embodied interaction trials and only then choose physical electronics and enclosure.
7. Add Hinge Observatory research ingestion with explicit calculation/source verification and separate symbolic annotation.

## Provenance and limits

These are Rowan/assistant conversation-origin design requirements, not evidence of code already deployed, working hardware, an independently verified eclipse maximum, or any consensus about AGI dates. Existing Wayglass identity, owner authority, Return Engine, and route-catalogue controls remain superior to this exploratory specification.

**Founding question:** *What else is here?*
