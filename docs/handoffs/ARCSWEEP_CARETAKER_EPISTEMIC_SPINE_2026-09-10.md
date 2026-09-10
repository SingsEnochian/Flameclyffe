# ArcSweep Caretaker Epistemic Spine — implementation handoff

Date: 2026-09-10

Branch: `feat/arcsweep-caretaker-epistemic-spine`
Base: `feat/arcsweep-caretaker-v0-1` / PR #291
Draft PR: #292
Tracker: #293

## Already committed

- implementation contract for the next Caretaker slice;
- durable Caretaker action receipt schema;
- frontier-risk/governance epistemic ingest schema;
- specialist swarm synthesis receipt schema;
- contract invariant tests;
- proving-chamber fixture.

## Live code gates still required

1. Extend Caretaker plan validator to admit exactly `navigate` and `open_surface`.
2. Resolve `open_surface` against the actual registered House/creative-organ surface registry.
3. Capture pre-state and observed post-state for both action types.
4. Fingerprint the bounded read-only Caretaker context capsule with SHA-256.
5. Append `caretaker-action-receipted` through the existing server Runtime Braid persistence seam and read it back for verification.
6. Feed only bounded read-only session/context + Observer summaries to Caretaker prompts.
7. Add tests for unknown/disabled surface, malformed action, unavailable verification, receipt persistence failure, and context fingerprint stability.
8. Obtain one real configured Ollama navigation receipt and one real `open_surface` receipt.
9. Run the frontier-risk proving chamber with one primary warning plus two independent responses/analyses.
10. Keep PR #292 draft until the live receipts and normal ArcSweep CI are green.

## Non-goals / hard boundary

Do not arm arbitrary tools or mutation. No shell, deployment, file, canon, setting, brush, World, database, or repository write capability is granted to the Caretaker by this slice. The only new action is a typed focus/open operation over an already registered live surface.

## Promotion rule

Working-memory promotion requires a valid swarm synthesis receipt. Canonical World or theory promotion remains false under the ingest contract and must go through the separate governing acceptance contract.
