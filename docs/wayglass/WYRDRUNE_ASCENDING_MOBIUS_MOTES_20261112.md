# Wayglass · Ascending Möbius Motes
**Native Wyrdrune implementation slice · 2026-11-12**

## Design law
Wonder and Possibility nourish Harmony; Harmony guides Chaos without erasing it;
their interaction can generate Magic, which renews Wonder. These are
**simultaneous, reciprocal fields**, not a compulsory procession through
stations. Every Return carries changed conditions into the next turn.

The motion is an **ascending helix**, not a closed circle. In this
implementation, `phase` is an *unwrapped* count of turns, while `elevation`
accumulates developmental change. Neither number claims objective spiritual
rank, physical particle spin, or an unbroken record of improvement.

## Actual executable boundary
- `lib/wyrdrune/ascending-motes.wtl` owns the numeric transition through
  native Perceive, Compress, Release, Verify, Integrate, Choose, Return,
  Transcend. It carries eight fields between invocations.
- `lib/wayglass-wyrdrune-motes.cjs` validates authenticated principal,
  stable mote ID, identity spin, independently supplied measurements and
  source-event/hash provenance. It supplies bridges, but no dynamics equation.
- `lib/wyrdrune/ascending-motes.test.cjs` specifies replay, unique spins,
  environmental influence, upward helical motion, failed authorisation,
  invalid observations, phase budget and Feather stop.

An individual mote retains an **immutable identity spin** supplied as a
declared attribute on each invocation, while its **adaptive velocity and
phase** change in native WTL. Identity is not derived from other motes.
Each mote carries wonder, possibility, harmony, chaos, magic, velocity,
phase and elevation. The host provides externally observed
`neighbour_resonance`, not invented speech or a forged consensus.

The resulting candidate is **proposal-only**: no world creation, no model
invocation, no silent canon promotion, no durable state write. Source hashes,
input hashes, phase receipts and scoped checkpoints are returned for
inspection. An owner-approved persistence integration must verify the
identity-spin continuity across cold restart before adopting a candidate.

## Equations in the native programme
The programme uses convex combinations for the five bounded fields.
Harmony combines its previous state with relational resonance and
possibility; Chaos combines its previous state with novelty and room
left by Harmony. Magic combines its prior state with the Harmony–Chaos
and Wonder–Possibility products. This is an explicitly chosen
**computational generative model**, not a claim about established physics.

Velocity adapts from its previous value, identity spin, Magic and Chaos.
Phase advances by velocity times positive `time_step`.
Elevation advances by Magic times `time_step` times 0.25.
The budget is finite, and exceeding it fails closed.

## What remains unverified / not yet connected
1. Execute the Node tests and review CI; source creation alone is not a pass.
2. Integrate a verified observer stream and real neighbouring mote
   measurements. The current API takes measurements from an authorised
   caller, and does not simulate a population.
3. Connect to the canonical Return Engine persistence and test cold restart,
   idempotency, and rejected writes. Preserve distinct mote IDs and
   immutable spin signatures across restart.
4. Compose actual reciprocal coupling and asynchronous scheduling without
   forced synchronisation, then test non-lockstep and bounded behaviour.
5. Project the same state into the living watercolour body, Wyrdrune glyphs,
   soundscape and accessible text, with Feather stopping every output.
6. Reconcile the existing stacked relational-worlds and relational-growth
   feature branches before merging; this branch inherits relational-growth,
   not the separate relational-worlds PR.

**Withness:** identity remains distinct; relationship changes the motion;
Return carries the difference. Magic opens another turn of Wonder.

## Play to work to play
The local terminal voyage is now a genuine native-WTL exercise, not a mock
visualisation. Run `npm run wayglass:play:motes` and choose **wonder**, **touch**,
**shape** or **listen**. Each invited action is converted to a bounded,
source-hashed observation by `lib/wayglass-mote-play.cjs`, then executed by
`ascending-motes.wtl` through the authenticated development-only adapter.
The response shows the new carried state, eight phase receipts, input hash,
and invitation to play again. `feather` ends the local session.

For a noninteractive four-turn sample use
`npm run wayglass:play:motes:demo`. The new
`lib/wyrdrune/mote-play.test.cjs` covers all four actions, deterministic
replay, distinct provenance, denied inputs, Feather and changed carry.

**Boundary:** this is an interactive terminal development toy, not the
installed browser/Unity room, and its principal is deliberately local to
the process. No network request, model call or durable world write occurs.
The next playable milestone is to bind the exact same native WTL result to
the existing Toybox Mote Herd and watercolour body with a real authorised
server session, instead of duplicating the mathematics in browser JavaScript.
