# Wayglass Spell Studio v0.2

Mobile-first, local-only Spell Wizard and WTL Program Viewer.

## What works in the prototype
- Draft an eight-phase WTL `mobius` program from a spell intention, locus, observations, verification statement and open question.
- Choose Wonder, record transformation or Return-themed draft.
- Edit source, inspect phase content with source line numbers, and check brace balance, missing/repeated/out-of-order phases, source size and presence of `bridge()`.
- Import/export `.wtl` and copy source. Feather stops editing activity.

## Boundaries
The structural viewer is **not** a compiler, type checker, executor, sandbox, or capability authoriser. In particular, a Verify-phase `emit` is descriptive and does not enforce a security gate. Generated programs must be compiled and tested against the actual WTL runtime before use. No remote execution or persistence is implemented.

## Run
Open `index.html` in a modern browser. No installation or network requests are required. Mobile Safari may restrict file download or clipboard access.

## Next integration
Expose the shared Wyrdrune compiler through a browser-compatible adapter, return structured diagnostics with source spans, and route approved world plans through a capability-checked runtime with genuine Verify and Return receipts.
