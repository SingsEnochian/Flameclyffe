# House Commons stability redesign v6

**Status:** PARTIAL

## Problem observed

The Steward reports that House Commons hangs.

Repository inspection found two independent mechanisms capable of producing that symptom:

1. finite House requests had no hard deadline, so a stalled session, Commons, room-registry, observation, Flame-status, or recovery request could remain pending indefinitely;
2. the authoritative House chat sidecar replaced the entire ArcSweep room content even though `main.js` still owns that room shell and can re-render it, creating competing DOM ownership and repeated remount work.

A third architecture debt remains after this slice: core `main.js` and House Chat v5 both initiate Commons reads. That duplicate data ownership is deliberately not hidden by this receipt and should be removed in the next narrow slice after browser proving.

## Changes in this slice

### Finite request deadlines

`house-runtime.js` now gives finite House HTTP requests an 8 second deadline and session exchange requests a 5 second deadline when the caller has not supplied its own signal.

The long-lived Runtime Braid SSE stream is intentionally excluded. It retains its own AbortController and reconnect policy.

The deadline applies to:

- House session restore/exchange;
- Flame status reads;
- Commons reads and appends;
- Kelyran report reads/invites;
- observation reads and commands;
- House room reads and writes;
- the Ox Alpha recovery probe.

A caller-supplied abort signal always wins.

### Chat-compartment ownership

`house-chat-authoritative-surface.js` advances to `house-chat-authoritative-surface/v3`.

It no longer calls `page.replaceChildren(surface)` against the whole ArcSweep content area. It replaces only the legacy `.commons-layout` chat compartment. The ArcSweep shell, room heading, runtime status, and observation panels remain owned by core `main.js`.

The visible room is again named **House Commons**. Its refresh control now carries the existing `data-action="commons-refresh"` contract instead of dispatching an otherwise unconsumed custom refresh event.

## Acceptance for this slice

Code-level acceptance requires:

1. ArcSweep tests pass;
2. STARWELL/ArcSweep build and release gates pass;
3. the House authoritative-surface test proves compartment-only replacement;
4. the House Runtime test proves finite deadline creation and preservation of caller signals.

Runtime acceptance still requires a real browser session demonstrating:

1. opening House Commons no longer hangs indefinitely when one finite House endpoint stalls;
2. Refresh room either completes or returns a visible error within the request bound;
3. sending a message does not duplicate the turn;
4. incoming Runtime Braid activity does not cause a destructive whole-room remount loop;
5. leaving and returning to Commons preserves a usable composer and readable log.

Until that browser receipt exists, this redesign remains **PARTIAL**.

## Next slice after browser proof

Remove duplicate Commons-read ownership from `main.js` so House Chat v5 becomes the sole chat-data refresh owner. Core ArcSweep should own room navigation and shell state only. House Chat v5 should own Commons rooms, entries, composer state, refresh scheduling, and turn rendering.

Do not add Telegram transport, new visual effects, or broader House features before this stability receipt is closed.
