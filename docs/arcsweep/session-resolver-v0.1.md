# Arcsweep Session Resolver v0.1

## Purpose

The Session Resolver turns durable, human-reviewed Arcsweep continuity into a bounded supplemental context for one browser session.

It does not promote continuity to canon, rewrite source records, or persist the resolved context into Codex, Supabase, or another durable archive.

## Route

```text
CROSS → RETURN → LAMINATE → REVIEW → CARRY → INGEST → RESOLVE → LOAD
```

Canon promotion is not part of this route.

## Durable and ephemeral layers

| Layer | Storage | Lifetime | Authority |
| --- | --- | --- | --- |
| Continuity store | `localStorage` | Durable on this browser profile | Reviewed continuity only |
| Resolved preview | Memory | Until page refresh or replacement | Preview only |
| Loaded session context | `sessionStorage` | Current browser tab/session | Supplemental session context only |
| Load/unload receipts | `sessionStorage` | Current browser tab/session | Operational receipt only |
| Canon | Not written | Unchanged | Separate explicit future act required |

## Resolver input law

The resolver accepts an item only when all of the following remain true:

- its Arcsweep state is `active-continuity`
- its canon state is `not-promoted`
- its authority scope is `reviewed-continuity`
- `canon_commit` is `false`
- its parent packet is active
- its parent packet is `continuity-only`
- its parent packet also has `canon_commit: false`
- the item fingerprint matches its parent packet
- the item belongs to the selected world

Malformed, orphaned, promoted, or fingerprint-mismatched active continuity causes resolution to fail rather than silently degrading the boundary.

## Selection

A human may select:

- one world
- zero or one continuity route filter
- zero or one epistemic-register filter
- a maximum item count from 1 to 100

The resolver reports both the available and selected counts and marks a context as truncated when the explicit maximum excludes matching items.

## Session context

Schema:

```text
arcsweep.session-context/v0.1
```

A resolved context carries:

- context ID and deterministic source signature
- world scope
- resolver and resolution time
- selected reviewed-continuity items
- layer, route, and epistemic register for every item
- source packet, review, source-session, and fingerprint provenance
- browser-session lifetime
- explicit `canon_commit: false`
- instructions forbidding narrative-to-evidence upgrades and silent persistence

## Loading and clearing

Loading requires an explicit **Load for this session** gesture.

The active context is written to:

```text
sessionStorage: arcsweep:session-context:active:v1
```

Loading and clearing produce session-only receipts. Re-loading the same context signature is idempotent and does not create duplicate receipts.

If the durable source continuity is rolled back or no longer satisfies the active reviewed-continuity contract, the loaded session context is cleared automatically.

## STARWELL consumption contract

The STARWELL root reads the active context on page load and provides:

- a deeply frozen `window.arcsweepSessionContext` snapshot
- an `arcsweep:session-context-ready` event containing non-sensitive summary fields
- a visible active-context indicator
- a **Copy session packet** action

The portable prompt schema is:

```text
arcsweep.session-prompt-envelope/v0.1
```

The prompt envelope preserves provenance and epistemic registers. It states that the context is supplemental reviewed continuity, is not durable, cannot commit canon, cannot be saved to Codex automatically, and cannot upgrade target-world narrative into external evidence.

## Non-goals

v0.1 does not:

- choose continuity automatically
- load context without a human gesture
- write to Supabase
- write to Notion
- mutate source packets or review receipts
- infer canon from continuity
- keep a context after the browser session ends
- inject context into a model without an explicit consuming action
