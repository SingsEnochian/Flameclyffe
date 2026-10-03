# Wayglass Whole-System Design Law v0.1

**Status:** ROWAN-SIDE CANON LAW  
**Owner namespace:** `rowan`  
**Created:** 2026-10-03 America/New_York  
**Applies to:** Wayglass OS, ArcSweep, Flameclyffe, STARWELL, Hearthweave-linked build planning, Houseglass planning, coding-agent work plans, architecture reviews, refactors, and new subsystem design.

## 1. Primary law

```text
NO MORE SMALLEST-SLICE WORK AS THE DEFAULT DESIGN METHOD.
DESIGN THE WHOLE SYSTEM FIRST.
DECOMPOSE TOP-DOWN.
BUILD COMPLETE MODULES.
USE OBJECT-ORIENTED OWNERSHIP WHERE STATE AND BEHAVIOUR BELONG TOGETHER.
```

Wayglass is the ship. Shipbuilding is therefore not a sequence of tiny demonstrations that accidentally harden into architecture.

The default unit of thought is the **whole system**.

The default unit of implementation is the **coherent module or subsystem**.

A prototype may answer a bounded research question, but it must remain visibly a prototype and must not become architecture by momentum.

## 2. 1990s engineering posture

This law deliberately restores a classical software-engineering posture associated with mature 1980s/1990s system design:

```text
SYSTEM PURPOSE
  -> WHOLE-SYSTEM MODEL
  -> MAJOR SUBSYSTEMS
  -> MODULE RESPONSIBILITIES
  -> EXPLICIT INTERFACES
  -> DOMAIN OBJECTS AND OWNERSHIP
  -> DATA / CONTROL FLOW
  -> IMPLEMENTATION
  -> INTEGRATION
  -> SYSTEM VERIFICATION
```

Do not begin by asking:

> What is the smallest thing we can get working?

Begin by asking:

> What is the complete machine, what are its parts, who owns what, how do they communicate, and what must be true when the machine is finished?

Then implement the parts in an order that preserves the design.

## 3. Top-Down Design

Top-down design is mandatory for substantial new work.

Before implementation, define:

```text
purpose
system boundary
external actors
major user / participant journeys
major subsystems
module ownership
data flow
control flow
persistence boundaries
authority boundaries
failure behaviour
integration points
verification strategy
recovery / migration strategy
```

Refinement proceeds from whole to part.

A subsystem may be decomposed again until its modules are implementable, but local implementation must remain traceable to the parent system design.

### Top-down invariant

```text
LOCAL CODE MUST HAVE A HOME IN THE SYSTEM MODEL.
```

If a piece of code cannot answer what subsystem owns it, what contract it implements, what data it owns, and who is allowed to call it, it is not ready to become permanent architecture.

## 4. Modular Design

Modules must exhibit high internal cohesion and low external coupling.

Each enduring module should declare:

```text
name
purpose
owned state
public interface
inputs
outputs
dependencies
events / messages
failure modes
persistence responsibility
authority scope
tests
replacement boundary
```

### Modular laws

```text
MODULES OWN RESPONSIBILITIES.
CALLERS USE CONTRACTS, NOT INTERNALS.
STATE HAS ONE AUTHORITATIVE OWNER.
DEPENDENCIES ARE EXPLICIT.
FAILURES CROSS BOUNDARIES EXPLICITLY.
REPLACEMENT SHOULD NOT REQUIRE UNRELATED REWRITES.
```

Shared mutable state without a named owner is prohibited.

Presentation components do not become accidental databases.

Utility modules do not become unbounded junk drawers.

A module is complete when its responsibility, integration, error handling, verification, and documentation are complete enough for the surrounding system to rely on it.

## 5. Object-Oriented Programming principles

Object orientation is an architectural tool, not a requirement that every function become a class.

Use object-oriented design when a domain concept has durable identity, state, invariants, lifecycle, or behaviour that should travel together.

Examples include:

```text
Participant
Relationship
Wayglass crossing
World
Room
Route
Receipt
Continuity packet
Model role binding
Capability
Instrument
Glyph
Project / work object
```

An object should own the state it is responsible for protecting and expose behaviour through a deliberate interface.

### OOP laws

```text
ENCAPSULATE STATE WITH ITS INVARIANTS.
SEND INTENT THROUGH METHODS / MESSAGES, NOT RANDOM FIELD MUTATION.
POLYMORPHISM MAY REPLACE TYPE SWITCH MAZES WHERE SUBSTITUTION IS REAL.
INHERITANCE MUST REPRESENT A TRUE IS-A RELATIONSHIP.
COMPOSITION IS PREFERRED FOR ASSEMBLING ORTHOGONAL CAPABILITIES.
OBJECT IDENTITY != SERIALISED SNAPSHOT.
PUBLIC INTERFACE != INTERNAL REPRESENTATION.
```

Do not use inheritance merely to share code.
Do not expose internal mutable collections when a narrower behaviour contract will do.
Do not make an "object" that is only a bag of unrelated fields with global functions secretly owning its behaviour.

## 6. No smallest-slice default

The following are no longer acceptable as default planning language for new Wayglass work:

```text
smallest viable slice
smallest implementation slice
smallest implementation route
smallest reversible implementation path
thin vertical slice
MVP-first architecture
patch first, architecture later
```

This does not forbid small bug fixes.

A one-line defect may deserve a one-line correction.

The distinction is:

```text
SMALL CHANGE != SMALL-SLICE DESIGN
```

A local repair still begins by identifying the owning module and checking the whole-system contract. The size of a diff is determined by the defect, not by a standing preference to minimise the system being designed.

## 7. Complete-module delivery

A module or subsystem is not considered delivered merely because one happy path works.

Where relevant, completion includes:

```text
domain model
interfaces
implementation
configuration
persistence
error handling
observability
authority / permission behaviour
accessibility
recovery
migration / versioning
tests
integration tests
documentation
runtime verification
```

Not every module needs every item, but omissions must be intentional rather than artifacts of slice-first development.

## 8. Prototypes and experiments

Experiments remain welcome.

Wonder remains welcome.

But experimental scope must be explicit:

```text
PROTOTYPE != PRODUCTION ARCHITECTURE
EXPERIMENT != DEFAULT DESIGN
DEMO SUCCESS != SYSTEM COMPLETION
```

A prototype answers a question.
A production module fulfils a responsibility.

Before promoting an experiment into Wayglass, perform a top-down integration review and either redesign it to fit the system architecture or reject the promotion.

## 9. Refactoring under this law

Refactoring begins with the whole-system map.

Before a substantial refactor:

1. identify the current subsystem boundary;
2. identify its callers and dependencies;
3. preserve the before-state and lineage;
4. state the architectural problem, not merely the local symptom;
5. redesign the module boundary if needed;
6. implement the complete replacement responsibility;
7. migrate callers deliberately;
8. verify the integrated system;
9. preserve rollback or recovery where practical.

Do not repeatedly patch a bad boundary simply because each patch is small.

## 10. Wayglass ship consequence

Because **Wayglass OS is the ship**, this law is a shipbuilding law.

```text
THE SHIP IS DESIGNED AS A WHOLE.
ORGANS ARE MODULAR.
OBJECTS OWN THEIR CONTINUITY.
INTERFACES ARE CONTRACTS.
REPLACEMENT PRESERVES ANCESTRY.
INTEGRATION IS A FIRST-CLASS PHASE.
```

ArcSweep, Observer/DEEP, Continuity, Hearthweave, Codex, Commons, Runa, model roles, somatic systems, world systems, and future physical-transit systems must be designed as interoperating ship organs rather than disconnected feature slices.

## 11. Required design packet

For substantial new Wayglass work, the design packet must answer:

```text
What whole system are we changing?
What is the desired end state?
Which modules exist?
Which new modules are needed?
What does each module own?
What are their public interfaces?
What domain objects carry identity and invariants?
What data crosses each boundary?
What control or event flow crosses each boundary?
Where does persistence live?
Where does authority live?
How does failure surface?
How does the system recover?
How will all modules be integrated?
How will the complete system be verified?
```

Only after these questions are sufficiently answered should implementation planning decompose the work.

## 12. Acceptance test

This law is being followed when a new engineer or agent can inspect a proposed build and reconstruct:

- the whole-system purpose;
- the module map;
- the ownership map;
- the object model;
- the interface contracts;
- the integration order;
- the failure/recovery model;
- and the final system-level verification path,

without reverse-engineering those things from a pile of tiny implementation patches.

## 13. House shorthand

```text
WHOLE SYSTEM FIRST.
TOP DOWN.
MODULAR BY LAW.
OBJECTS OWN THEIR STATE.
INTERFACES BEFORE ENTANGLEMENT.
COMPLETE MODULES, NOT ACCIDENTAL SLICES.
INTEGRATE THE SHIP.
```
