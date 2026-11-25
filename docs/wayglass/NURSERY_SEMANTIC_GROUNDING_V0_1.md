# Nursery Semantic Grounding v0.1 · One Ship

**Status:** source candidate on PR #661, not merged into `wayglass/current`, not deployed or demonstrated on owner hardware.

**Owner research question (23 Nov 2026):** Can a cell explain what it did, why it did it, and what changed afterward? Mamma correctly observed that the earlier combinatorial phrases weren't coherent event descriptions.

## One source of truth

Selectively port the existing Nursery ecology and Wyrdrune modules from candidate PR #668 (commit `c466d281979dbd4b73274a5ae88ee170770d7e9e`) to the existing #661 reconciliation train. Retain the original source branch and historical receipts. Do **not** launch the Nursery's independent loopback server as a second ship. The existing House-authenticated `/api/v1/wayglass/cell-garden/nursery` subroute is the only new host access point.

The server owns the Nursery state; multiple browser tabs read the same instance. Explicit, owner-confirmed single-cycle calls advance it, with a one-turn lock and expected-generation concurrency check. Browsers do not independently tick clones. Client-side Run requests discrete server cycles only while that room is open. Global Feather stops the host-side colony and the local loop. Resume requires a fresh deliberate owner choice. No provider calls, filesystem writes, model agents or physical audio are granted.

## Grounded language contract

`apps/wayglass/src/wtl-cell-semantic-grounding.js` is a pure formatter that requires an **accepted tissue signal receipt**, a matching deterministic neighbour/channel selection, and verified before/after signal counters. It emits `wayglass.wtl.cell-grounding/v0.1` with:
- speaker, generation, simulation source receipt (tick, sender, receiver, signal type);
- what was queued, why the deterministic selector chose this recipient/channel, and which acceptance counters changed;
- a labelled `observation_kind: simulated`, no physical hearing, model consciousness or external effect claim;
- optional **poetry** retained as a separate expressive channel.

An undelivered/queue-full/blocked signal must not produce a grounded event. Acceptance of a queued signal does not prove a cell actually processed or understood the message. Because the sender's deterministic twist is not a human intention, `why` names the algorithmic selection rule rather than inventing motives.

## Canonical WTL language reconciliation

The earlier Nursery source #668 used WTL `when`, `%`, `pick`, and a numeric operator named `wonder`. The current #661 WTL runtime already owns `if ... then ... else` and reserves `wonder(question)` for semantic inquiry. Reconciliation therefore translates Nursery source `when` to canonical `if`, renames the unrelated numeric voice operator to `singVoice`, and extends the **one canonical runtime**, not a second interpreter, with bounded modulo `%` and deterministic `pick(list,index)`. The Python reference backend and typed-IR call preflight receive the same semantics. Divide-by-zero and empty-list selection fail closed. Dedicated portability tests guard these contracts.

## Nursery interface

The existing native Living Cell Garden includes a Nursery Language panel. Observe is explicit; it never starts automatic ticking by merely opening a room. Controls: one cycle, Run/Stop, Feather/Release, Grounded/Poetry. All output is DOM `textContent` from a House-authenticated source. Source-bound receipts remain inspectable after mode changes.

## Boundaries / unresolved questions

The host Nursery presently lives in memory and does **not** claim a process-cold durable Return. The Cell Garden's separate lineage checkpoint must not be confused with Nursery persistence. A new host restart resets this local Nursery prototype. Grounded event counts are bounded to the newest 256; it is a working preview, not an immutable audit ledger. The existing source branch's larger feature set and independent server remain historical development candidates, not a second deployed execution authority.

Next: wire a single canonical persistent Return ledger, reconcile all existing Nursery capabilities and execute a cold-restart proof without multiplying runtimes.

## Acceptance

1. A four-cycle two-cell fixture produces receipts whose senders, receivers and channels match actual accepted tissue signal events.
2. Counter changes are exact, and invalid receipts, incorrect causes or fabricated values fail closed.
3. Feather prevents new events, and previously recorded speech is retained.
4. Original expressive poetry is unchanged and clearly labelled as ungrounded.
5. The same authenticated House route rejects unauthorised calls, stale generation, a step without explicit confirmation, and Feather-bypassing steps.
6. Native Cell Garden carries the viewing, execution and stop controls; no second server/PR is introduced.
7. Required exact-head CI, integration checks and any source reconciliation conflicts are recorded rather than presumed passed.

**Return marker:** One Ship #583, train #661. Built: source-grounding code and host/room connection. Verified: pending exact-head CI. Held: durable Nursery cold Return and owner hardware acceptance.
