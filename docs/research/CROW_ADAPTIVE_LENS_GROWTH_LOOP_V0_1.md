# Crow Adaptive Lens Growth Loop v0.1

Status: implementation doctrine  
Scope: Crow Trainer / project-local training / analytical self-improvement  
Authority: Rowan-directed House adaptation, 2026-10-01

## Core loop

Crow should not merely accumulate answers. It should accumulate evidence about **which analytical lenses were used, what they revealed, and what they failed to inspect**.

```text
TASK A
→ generate task-specific lens
→ analyze / build / test
→ emit findings
→ emit constraint report
→ persist project-local blind spots

TASK B
→ read prior project blind spots
→ avoid repeating exhausted lens by default
→ generate a lens that covers an under-examined dimension
→ analyze / build / test
→ persist the new constraint report

TASK C
→ repeat
```

The growth mechanism is project-local and append-only by default.

This is not model-weight training. It is **strategy learning through persistent analytical history**.

## Why this matters

A strong analysis can still be narrow. If Crow only stores findings, it may repeatedly solve the same visible layer while never noticing what its own method systematically omits.

Store both:

```text
what the pass found
what the pass was optimized to find
what the pass sacrificed
what should be examined next
```

Then future training can choose a different lens.

## Project-local state

Crow Trainer writes its own history under:

```text
.crow-trainer/constraint-history.md
.crow-trainer/state.json
```

If an external `.prism-history.md` exists, Crow may read it as an external analytical-history source, preserving provenance. Crow Trainer does not silently overwrite another system's history file.

## Constraint entry

```markdown
### <timestamp> — <artifact / task>
- Maximized: <what this pass was designed to reveal>
- Sacrificed: <what it under-examined>
- Next: <specific lens, test, or dimension to inspect>
- Source: crow-trainer
```

## Lens generation contract

Before substantial work, generate a compact lens with four fields:

```text
FOCUS
What must this pass reveal or improve?

CONSTRUCTION
What can be built, compared, inverted, simulated, transplanted, reduced, or pressure-tested to expose structure?

EVIDENCE
What observation would falsify the working hypothesis?

BLIND SPOTS
What dimensions will this lens probably under-examine?
```

A useful lens changes the procedure. `Think harder`, `analyze deeply`, and `consider all angles` are not lenses.

## Adaptation rule

At the beginning of a new complex task:

1. inspect project-local constraint history
2. identify recurring sacrificed dimensions
3. compare them with the current task
4. prefer a lens that covers a relevant under-examined dimension
5. do not force irrelevant old blind spots onto a new problem
6. record the new pass afterward

Repeated omission is a **curriculum signal**, not proof that the omitted defect exists.

## Complementary lens families

Crow may generate original procedures using families such as:

- construction: build an alternative and observe what breaks
- simulation: run state forward through time
- archaeology: trace present behaviour back through layers and prior decisions
- inversion: negate a key assumption and inspect what survives
- destruction: remove a subsystem/constraint and inspect dependency
- transplantation: move a mechanism into a different context
- miniaturization: reduce to the smallest case that preserves the problem
- adversarial review: attack the current conclusion
- epistemic audit: classify what is observed, derived, assumed, retrieved, or unverified
- provenance audit: trace each important claim to its source

These are operation families, not mandatory named prisms.

## Trust pass

For high-impact conclusions, add an epistemic pass after the structural pass:

```text
OBSERVED
supported directly by inspected state

DERIVED
follows from explicit premises or state transitions

RETRIEVED
comes from a source and remains source-bound

ASSUMED
working assumption not yet verified

UNKNOWN
not established
```

A deep structural claim is not automatically a factual claim about the world.

## The Crow training consequence

Crow Trainer should learn not only:

> Did Crow get this exercise right?

but also:

> Which method did Crow use, what did that method make visible, and what did it hide?

Over time, training selection should respond to both failed drills and recurring blind spots.

## Non-equivalence boundary

This doctrine is a House implementation inspired by the public mechanism described in Super Hermes / AGI in md. It does not assert architectural equivalence, copy their prism corpus, or import their benchmark claims as House-verified facts.

External files remain external. House lenses are generated and evaluated under Crow's own provenance, authority, and canon rules.
