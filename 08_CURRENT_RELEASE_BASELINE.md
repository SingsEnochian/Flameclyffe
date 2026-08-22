# 08 — Current Release Baseline

**Repository:** `SingsEnochian/Flameclyffe`  
**Canonical integration branch:** `codex/arcsweep-feedback-loop`  
**Observed baseline SHA:** `b5bdfd1bea6c9fd4206707e9ef004258c2a0344d` (current base SHA reported by PR #140 when inspected on 2026-08-22)  
**Status:** integration baseline, not declared RELEASED by this file

## What this baseline means

This branch is the current integration shore against which Forge verification is performed. Descendant feature branches may contain stronger or newer organs, but they do not silently redefine the release baseline.

## Current evidence

- PR #140 is an open draft descendant of this branch and currently reports `mergeable: false`; therefore its additional BSENG/RSE and Project Zero Companion work is not treated as part of this baseline until integrated.
- PR #112 remains an open draft hardware/PWA line and explicitly records unresolved physical-device and fresh-CI gates.
- PR #111 remains an open draft mathematics line with independent review/calibration gates.
- PR #107, #116 and other older branches contain functional organs that may be harvested only through explicit integration and verification.
- Issue #120 remains the accepted full-Arcsweep LIVE gate and is used as the primary organ-level verification contract for the next milestone.

## CI / build truth

The connector did not return commit-attached combined statuses or pull-request workflow runs for the observed baseline SHA during this bootstrap. Therefore this file does **not** claim the baseline CI matrix is currently green.

Known project history contains successful workflow evidence on descendant heads, but descendant evidence is not promoted to the baseline without a matching SHA.

**Required before any RELEASED claim:**

1. identify exact candidate SHA;
2. run/confirm clean install and build on that SHA;
3. run named STARWELL/Arcsweep test suites;
4. run production-style runtime smoke;
5. verify persistence after restart;
6. verify packaging/install path where applicable;
7. record deployment URL and exact deployed commit;
8. update `04_FEATURE_VERIFICATION_MATRIX.md` with evidence.

## Known-good behavioural laws

These are architectural authority, not release evidence:

- `A = Agency`; `Q = Qualia`; Alignment is derived.
- sealed packets are not mutated;
- Arcsweep consumes Spiral/Harmonic State rather than raw DEEP datasets;
- source canon and project overlays remain separate;
- no subsystem silently promotes canon;
- receipts preserve provenance and replay lineage;
- user activation/consent precedes sound, haptics and private-source transmission;
- `observation ≠ interpretation ≠ model projection ≠ software receipt ≠ canon ≠ external-world claim`.

## Current known limitations / blockers

- Baseline-wide Arcsweep v1 LIVE verification has not been re-run under the new Forge status vocabulary.
- Open descendant PR #140 is not merge-clean at inspection time.
- Several older functional branches remain unintegrated or superseded and need harvest/reconciliation rather than blind merge.
- Physical iPad/Shokz/transducer acceptance remains explicitly unverified on PR #112.
- Release evidence is fragmented across historical PRs and must be normalised into the verification matrix.

## Release promotion rule

A build may become the next release baseline only when:

- its SHA is explicit;
- required organs are `VERIFIED` in the matrix;
- failure paths are exercised;
- persistence/restart is verified where relevant;
- packaging/deployment evidence matches that SHA;
- known limitations are recorded;
- Rowan authorises promotion.

Until then, call this branch the **integration baseline**, not production-ready.

## Next safe task

Run **M1 — Arcsweep Core Verification Baseline** from `03_ACTIVE_ROADMAP.md`, update the matrix organ by organ, and only then open the repair milestone for defects actually observed.
