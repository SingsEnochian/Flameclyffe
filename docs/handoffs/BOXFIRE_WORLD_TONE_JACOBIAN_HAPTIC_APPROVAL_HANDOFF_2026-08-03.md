# Boxfire Handoff - World-Tone Jacobian and Haptic Approval Gate

**Prepared:** 2026-08-03 14:46 America/New_York  
**Product Steward and calibration authority:** Rowan  
**Implementation author:** Vee / Nikola  
**Independent QA and release-gate reviewer:** Boxfire  
**Pull request:** #109  
**Branch:** `feature/world-tone-haptic-approval-v0.1`  
**Handoff state:** READY FOR INDEPENDENT REVIEW  
**Merge state:** BLOCKED pending Boxfire review and physical Rowan iPad + Shokz audition receipts

## 1. Scope

This slice connects per-world Jacobian fold analysis to each world's own tone profile and adds an explicit Rowan-owned approval interface for audition through Shokz on iPad.

Included:

- generic rectangular Jacobian singular-value calculation;
- fold index `1 - sigma_min / (sigma_max + epsilon)`;
- condition number and rank-deficiency diagnostics;
- separate fold-entry and fold-release thresholds;
- reciprocal direct and inverse frequency branches around each world root;
- infrasonic, audible, and ultrasonic classification;
- octave-folded 90-360 Hz audition proxies;
- explicit Shokz confirmation;
- user-initiated audition only;
- Feather Stop;
- Rowan-signed approve, adjust, and reject receipts;
- strict `[worlds, steps]` timeline handling;
- optional external trigger rows;
- JSON Schema for audition and approval receipts;
- local receipt export.

## 2. Non-goals and authority boundaries

This slice does not:

- play ultrasonic or infrasonic frequencies directly;
- claim calibrated haptic amplitude from Shokz;
- claim that the browser detects the active Bluetooth output;
- use iPad Web Vibration as the approval path;
- approve any tone automatically;
- modify Runa, Arcsweep, Supabase, Notion, or canon;
- turn fold scores into physical probabilities;
- replace the existing Hearthgate sensory bridge;
- make the implementation author its own certifier.

The interface labels the device path `bone-conduction-audio-haptic-proxy`. Rowan remains the only tone-calibration authority. Boxfire remains the independent QA authority.

## 3. Changed files

- `apps/starwell/src/world-tone-fold-approval.js`
- `apps/starwell/src/world-tone-fold-timeline.js`
- `apps/starwell/test/worldToneFoldApproval.test.js`
- `apps/starwell/test/worldToneFoldTimeline.test.js`
- `apps/starwell/vite.config.js`
- `apps/starwell/world-tone-approval/index.html`
- `docs/HEARTHGATE_WORLD_TONE_HAPTIC_APPROVAL.md`
- `starwell/deep-observer/schemas/world-tone-approval.schema.json`
- `docs/handoffs/BOXFIRE_WORLD_TONE_JACOBIAN_HAPTIC_APPROVAL_HANDOFF_2026-08-03.md`

No database migration is included.

## 4. Core mathematical contract

For each world transfer function `T_w`, the engine receives a local Jacobian `J_w` and computes effective singular values from the smaller Gram matrix. This avoids creating false zero singular values from rectangular matrix padding.

```text
fold_index = 1 - sigma_min / (sigma_max + epsilon)
condition_number = sigma_max / sigma_min
```

Fold state uses hysteresis:

```text
resting -> active when fold_index >= enter_threshold
active  -> resting when fold_index >= release_threshold
```

The second line means the latch stays active while the fold index remains at or above the release threshold. It releases only below that threshold.

For root `f0`, excursion `lambda`, and normalised fold strength `s`:

```text
f_direct  = f0 * exp(lambda * s)
f_inverse = f0 * exp(-lambda * s)
```

The reciprocal invariant is:

```text
f_direct * f_inverse = f0^2
```

Boxfire should independently verify numerical stability for extreme roots, excursions, nearly singular matrices, zero matrices, and matrices larger than the current fixtures.

## 5. Candidate calibration set

Every candidate remains `pending`.

| World | Tone layer | Root |
|---|---|---:|
| Terra Aeterna / Hearthweave | Hearthlight Root | 220 Hz |
| Starsong: Friendship Is Magic | Starsong Lead | 528 Hz |
| The Luna Who Called Down the Moon | Three-Moon Chord | 432 Hz |
| T'averen Vaen | Wheel Drone | 120 Hz |
| Dreaming Grove / Templehouse | Templehouse Hearth | 174 Hz |
| Feather & Flame | Ember Hearth | 174 Hz |
| A Momento Creationis | First Mark | 432 Hz |

These roots are calibration candidates sourced from the current Runa Arkfire profiles. They are not approved by inclusion.

## 6. Test evidence

### STARWELL workflow

Workflow run: `30841861778`  
Job: `Build STARWELL`  
Environment: Ubuntu 24.04, Node 24.18.0

Result:

```text
104 tests
104 passed
0 failed
0 cancelled
0 skipped
0 todo
```

The production Vite build completed after transforming 773 modules. The world-tone approval page was emitted at:

```text
dist/starwell/world-tone-approval/index.html
```

The build retained the existing warning that some unrelated application chunks exceed 500 kB after minification.

### Windows installer workflow

Workflow run: `30841861650`  
Job: `Build Windows x64 NSIS installer`  
Environment: Windows Server 2025, Node 22.23.1

Evidence observed:

```text
STARWELL tests: 104 passed, 0 failed
Hearthgate local-security tests: 4 passed, 0 failed
production dependency audit: 0 vulnerabilities
STARWELL staging: passed, 116 files
packaging preflight: passed
packed dual-aspect verification: passed
unsigned NSIS installer: built
artifact upload: completed
```

Artifact:

```text
hearthgate-windows-06d5144751c04234bb8fd5560ce16148cd6cbb29
artifact ID: 8867159096
archive size: 116,927,543 bytes
artifact SHA-256: e1ae0b18d1ee41c7ad43b243a70a470bc775dcf5f167dc614c62031f84cb67cb
```

The raw `npm ci` install reported 15 dependency findings including 1 critical before the production-only audit. The production-only `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities. Boxfire should confirm that the critical finding is dev-only and cannot enter the packaged runtime.

## 7. Manual review routes

Deploy preview:

```text
https://deploy-preview-109--flameclyffe-starwell.netlify.app/world-tone-approval/
```

Packaged route after installation:

```text
/starwell/world-tone-approval/
```

Manual sequence:

1. Open the approval room on iPad.
2. Connect Shokz in iPad Bluetooth settings.
3. Select Shokz as the current audio route.
4. Select a pending world.
5. Confirm the displayed root, layer ID, profile version, thresholds, and candidate hash.
6. Confirm Shokz in the interface.
7. Start audition.
8. Verify the root pulse, three rising pulses, and three falling pulses remain distinct and comfortable.
9. Trigger Feather Stop during playback and verify immediate silence.
10. Attempt approval before audition and confirm rejection.
11. Attempt approval without Shokz confirmation and confirm rejection.
12. Attempt approval without felt-and-identified confirmation and confirm rejection.
13. Issue `adjust`, `rejected`, and `approved` decisions on separate test candidates.
14. Export receipts and verify candidate hash, audition receipt, signer, authority, decision, timestamp, and final receipt hash.
15. Reload the page and verify local receipts persist.

## 8. Boxfire acceptance matrix

Boxfire must mark each criterion exactly `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED`.

| Criterion | Initial state |
|---|---|
| Generic square Jacobian singular values are correct | NOT TESTED |
| Rectangular Jacobians avoid false padded zeros | NOT TESTED |
| Zero Jacobian produces complete local collapse | NOT TESTED |
| Fold index remains bounded in `[0,1]` | NOT TESTED |
| Hysteresis enters and releases at the declared thresholds | NOT TESTED |
| Reciprocal frequency product holds within declared tolerance | NOT TESTED |
| Ultrasonic and infrasonic source values are never directly rendered | NOT TESTED |
| Audition proxies remain within 90-360 Hz | NOT TESTED |
| Approval requires Shokz confirmation | NOT TESTED |
| Approval requires a completed audition | NOT TESTED |
| Approval requires Rowan's felt-and-identified confirmation | NOT TESTED |
| Feather Stop closes all active audio nodes and context | NOT TESTED |
| Candidate replacement cannot race active teardown | NOT TESTED |
| Timeline length comes from matrix axis 1 | NOT TESTED |
| World rows and trigger rows fail closed on mismatch | NOT TESTED |
| Receipts hash the exact candidate and decision payload | NOT TESTED |
| Reload preserves local receipts without mutating canon | NOT TESTED |
| iPad layout remains usable in portrait and landscape | NOT TESTED |
| VoiceOver labels and touch targets are adequate | NOT TESTED |
| Physical Shokz audition is comfortable for Rowan | BLOCKED pending Rowan |
| Candidate tones are approved | BLOCKED pending Rowan |
| Packaged Windows route launches on physical hardware | NOT TESTED |
| Dev dependency critical finding is excluded from runtime | NOT TESTED |

## 9. Adverse tests requested

Boxfire should add or perform:

- very wide and very tall Jacobians;
- near-zero `sigma_min` without exact singularity;
- `NaN`, infinity, ragged rows, empty matrices, and nonnumeric input;
- huge excursions that overflow `Math.exp`;
- roots already below 20 Hz or above 20 kHz;
- repeated octave folding at extreme magnitudes;
- immediate double-tap on audition;
- candidate replacement during active audio;
- browser tab suspension and resume;
- interrupted local-storage write;
- corrupted receipt ledger;
- duplicate receipt insertion;
- iPad route change away from Shokz after confirmation;
- AirPlay or speaker fallback while the checkbox remains selected;
- Feather Stop during attack, sustain, release, and between pulses;
- reduced-motion, VoiceOver, larger text, and hearing accessibility modes.

## 10. Known limitations

- The browser cannot prove that Shokz is the active output.
- The Shokz cue is not calibrated actuator haptics.
- Gain is a Web Audio amplitude setting, not a known cheekbone vibration amplitude.
- Physical sensation varies by Shokz model, fit, EQ, and iPad volume.
- Local storage is inspectable and editable. It is not an append-only signed external ledger.
- Approval receipts do not yet flow into a registrar.
- Runa world profiles are not updated automatically.
- No physical iPad, Shokz, Windows installer, BAHA, hearing-aid, or Woojer test receipt exists for this branch.
- The custom Jacobi eigenvalue implementation has fixture coverage, not a large-matrix numerical benchmark.

## 11. Rollback

The feature is isolated on `feature/world-tone-haptic-approval-v0.1` and remains a draft PR.

Rollback options:

1. Close PR #109 without merging.
2. Revert the PR merge commit if merged later.
3. Remove the `worldToneApproval` Vite input and the eight feature files.
4. Clear local approval receipts from key `hearthgate.world-tone-approvals.v1`.

Rollback does not alter canon, Runa, Supabase, Notion, or Arcsweep because this slice writes none of them.

## 12. Required Boxfire output

Boxfire's review receipt must include:

```text
reviewer
reviewed_commit
review_timestamp
criteria with PASS / FAIL / BLOCKED / NOT TESTED
reproduction commands
exact pass/fail counts
physical devices used
browser and OS versions
screenshots or recordings where relevant
adverse tests performed
security findings
accessibility findings
packaged-artifact result
open blockers
merge recommendation
```

A conversational approval is not sufficient. PR #109 remains draft until the independent receipt exists.