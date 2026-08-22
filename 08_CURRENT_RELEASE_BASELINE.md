# 08 — Current Release Baseline

**Repository:** `SingsEnochian/Flameclyffe`  
**Canonical integration branch:** `codex/arcsweep-feedback-loop`  
**Observed baseline SHA:** `b5bdfd1bea6c9fd4206707e9ef004258c2a0344d` (current base SHA reported by PR #140 when inspected on 2026-08-22)  
**Stage:** integration baseline

## What this baseline means

This branch is the current integration shore against which Forge verification is performed. Descendant feature branches may contain stronger or newer organs; their evidence remains attached to those lineages until explicit integration brings it into this baseline.

## Current evidence

- PR #140 is an open draft descendant of this branch and currently reports `mergeable: false`; its additional BSENG/RSE and Project Zero Companion work remains descendant-line evidence pending integration.
- PR #112 remains an open draft hardware/PWA line with physical-device and fresh-CI gates still to run.
- PR #111 remains an open draft mathematics line with independent review/calibration gates still to run.
- PR #107, #116 and other older branches contain functional organs available for explicit harvest, reconciliation, and verification.
- Issue #120 remains the accepted full-Arcsweep LIVE gate and is the primary organ-level verification contract for the next milestone.

## CI / build state

The connector returned no commit-attached combined statuses or pull-request workflow runs for the observed baseline SHA during this bootstrap. The current baseline CI state is therefore **UNMEASURED in this control file**.

Known project history contains successful workflow evidence on descendant heads. That evidence stays with its matching SHA until integration or a baseline-matched run supplies equivalent evidence here.

**Evidence packet for a RELEASED state:**

1. exact candidate SHA;
2. clean install and build result for that SHA;
3. named STARWELL/Arcsweep test suites;
4. production-style runtime smoke;
5. persistence-after-restart evidence;
6. packaging/install-path evidence where applicable;
7. deployment URL paired with exact deployed commit;
8. corresponding evidence entries in `04_FEATURE_VERIFICATION_MATRIX.md`.

## House invariants

These are architectural authority; release evidence is recorded separately:

- `A = Agency`; `Q = Qualia`; Alignment is derived.
- sealed packets remain immutable;
- Arcsweep consumes Spiral/Harmonic State rather than raw DEEP datasets;
- source canon and project overlays remain distinct;
- canon promotion is explicit and receipted;
- receipts preserve provenance and replay lineage;
- sound, haptics and private-source transmission begin through explicit user activation;
- `observation ≠ interpretation ≠ model projection ≠ software receipt ≠ canon ≠ external-world claim`.

## Current integration work

- Arcsweep v1 LIVE verification is scheduled under the new Forge status vocabulary.
- Open descendant PR #140 requires merge reconciliation before its organs join this baseline.
- Older functional branches are candidates for harvest/reconciliation according to the recover-before-replace rule.
- PR #112 carries the remaining physical iPad/Shokz/transducer acceptance work.
- Historical release evidence is being normalised into the verification matrix.

## Release promotion rule

A build becomes the next release baseline when its promotion packet contains:

- explicit SHA;
- required organs at `VERIFIED` in the matrix;
- exercised failure paths;
- persistence/restart evidence where relevant;
- packaging/deployment evidence matching that SHA;
- recorded limitations and open edges;
- Rowan's promotion authorisation.

The present branch remains the **integration baseline** while M1 gathers that evidence.

## Next dependency-ordered task

Run **M1 — Arcsweep Core Verification Baseline** from `03_ACTIVE_ROADMAP.md`, update the matrix organ by organ, then open M2 with the defects and integration work actually observed.
