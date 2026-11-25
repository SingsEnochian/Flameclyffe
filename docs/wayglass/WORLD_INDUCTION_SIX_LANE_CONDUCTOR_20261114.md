# Wayglass · Six-Lane Conductor + World Induction · 2026-11-14

**Status:** reviewable source-branch code; not merged, not deployed, not a verified iPad session.
**Base:** canonical `wayglass/current`, not release `main`. This PR contains no production credentials, secrets, agent impersonation, provider calls or canon promotion.

## Six simultaneously available event-driven verification lanes

`.github/workflows/wayglass-six-lane-conductor.yml` runs six GitHub Actions matrix jobs on a PR to canonical and on canonical push. Each checks out the exact event head, records one receipt with source SHA, test output, failure status, deployment unknown, and preserves artefacts even on failure. They are independent **CI workers, not named speaking agents**. They provide engineering checks, not live deployment or an owner-authenticated world crossing.

| Lane | Immediate executable verification | Runtime integration to build after the gate |
| --- | --- | --- |
| WTL | Native parser/conformance, cross-backend parity, tensor assurance | Research-to-code candidate with source and WTL IR provenance |
| Assurance | Adversarial WTL and cold-return test | Idempotent failure triage and verified, bounded repair |
| FAEberpunk | Material/motion tests and World Induction contract | Real iPad Safari, VoiceOver, Pencil and before/after media |
| Universe | Dream Observer, altered timeline and Return trials | Authenticated, encrypted audiovisual Atlas archive and replay |
| Canon | Whole-system design law and source-spine contracts | GitHub, Notion and Supabase reconciliation with version receipts |
| Integration | Host route tests, both Wayglass/ArcSweep builds | Real single-ship device and deployment SHA verification |

These jobs are parallel; downstream promotion remains manually approved. A failed or unavailable check is not accepted as success. The existing hourly orchestrator coordinates actual code work, whereas this CI gate reacts to commits.

## World Induction: first-person entry contract

The Writing Room now mounts an opt-in **Listen before crossing** world induction instrument next to its world selector. A selected world provides an attributed illustrative tone profile, a plain-language explanation of what tones signify, what to listen for, and why. A source-declared profile can override frequency only with a `source_ref` and bounded parameters. Unattributed invented frequencies are never passed off as canonical world measurements.

When a selected world lacks a saved user-authored aspect, the interface presents a four-stage native rich-text wizard: name/role, qualities, boundaries/Return anchors, and explicit **I AM** lines. The editor supports headings? No. It supports user formatting of bold, italics, underlining and lists, with HTML restricted through the existing Wayglass manuscript sanitizer. Authored aspects remain isolated to their own world IDs in local browser storage and can be edited or declined. **Tones only** remains possible without an aspect. No character identity, personal psychological state, or canon is inferred from the user's writing.

An explicit Start button creates a low-level original Web Audio bed: a lower root voice, changing upper voice, and slow rhythmic amplitude modulation. Actual draft words and punctuation update upper voice and beat in real time. The optional quiet speech layer uses browser speech synthesis at an initial declared relative volume of 0.06, with an always-inspectable transcript containing the world orientation and only the owner's explicitly supplied I AM lines. Voice loudness cannot be guaranteed or calibrated against device output; there are no health or subliminal-effect claims. Starting and stopping are manual, and repeat is a user-visible toggle.

Feather cancels synthesis and sound without rearming playback upon release. The induction's original local score is an exploratory entry layer; the separately installed Writing Room's authenticated **Wyrdrune story score** remains the authoritative WTL-based adaptive composition. The new layer is **not** represented as an executable WTL source or an authenticated host result.

## Immediate test/acceptance

1. `node --test apps/wayglass/test/world-induction.test.js` must check source boundaries, world isolation, owner-created I AM only, and writing-reactive numerical output.
2. `npm run wayglass:build` must bundle the Writing Room wizard.
3. Run real Chromium and iPad Safari tests for: choose world; missing aspect wizard appears; create formatted aspect; review full transcript; opt into speech and sound; change writing; see beat/counterpart change; change world; Feather; return without autoplay; access via keyboard and screen reader.
4. Verify that saving a world aspect is **local only**; world crossing, live model calls, and Return require their existing separate authority. Missing runtime evidence stays missing.
5. Reconcile independent worktrees and conflicts before merging into `wayglass/current`. Do not auto-deploy, merge to `main`, or call a paid Atlas provider.

## Known limitations / next work

- Browser speech synthesis is device/browser-dependent; no per-device loudness assurance or offline vocal recording is claimed.
- First edition discovers worlds from the current Writing Room's registered world seats. Additional worlds require attributed world registration, not fabricated lore or model identity.
- The quiet original sidecar is separate from the current WTL host score and does not prove that WTL compiled this layer.
- The CI matrix does not yet perform side-by-side browser rendering or remotely access Rowan's iPad. Additional source-indexed browser artefacts and device signoff are required.
- GitHub CI receipt uploads are bounded to 30 days; the separate durable, encrypted cross-session evidence ledger still requires host integration.

**Return marker:** review the exact PR head and each CI job, repair any failures, then add real browser acceptance without changing production authority.
