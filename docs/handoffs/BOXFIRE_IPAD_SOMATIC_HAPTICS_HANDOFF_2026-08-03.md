# Boxfire Handoff: iPad Somatic Haptics

**Prepared:** 2026-08-03 America/New_York  
**Parent mathematics branch:** `feature/compression-release-mathematics-spine-v1`  
**Review branch:** `feature/ipad-somatic-haptics-v1`  
**Calibration authority:** Rowan  
**Independent QA:** Boxfire  
**Merge state:** BLOCKED pending automated and physical-device review

## Governing law

```text
compression
→ release
→ compression of the release
→ release
→ infinite continuation
```

There is no collapse.

## Hardware boundary

Apple documents iPad as hardware without a general Core Haptics actuator. This implementation therefore routes somatic feedback through:

1. an external body transducer selected as the iPad audio output;
2. Shokz selected as the iPad audio output;
3. a supported external haptic controller through a future WKWebView native message bridge.

The browser does not detect which audio device is selected. Receipts therefore record:

```text
internal_haptic_actuator = false
output_device_detected = false
output_confirmation = user-confirmed
```

A physical sensation is never inferred from Web Audio gain.

## Files

```text
apps/starwell/src/ipad-somatic-haptics.js
apps/starwell/world-tone-approval/index.html
apps/starwell/public/world-tone-approval/manifest.webmanifest
apps/starwell/public/world-tone-approval/service-worker.js
apps/starwell/public/world-tone-approval/hearthgate-somatic-icon.svg
apps/starwell/test/ipadSomaticHaptics.test.js
starwell/deep-observer/schemas/ipad-somatic-haptic-receipt.schema.json
docs/ipad/HEARTHGATE_IPAD_SOMATIC_HAPTICS.md
apps/starwell/public/modules/bifrost-arcsweep.module.json
docs/handoffs/BOXFIRE_IPAD_SOMATIC_HAPTICS_HANDOFF_2026-08-03.md
```

The branch also inherits every file and law from the compression–release mathematics parent.

## Device profiles

| ID | Intended device | Render band | Maximum code gain |
|---|---|---:|---:|
| `body-transducer` | Woojer or tactile audio transducer | 35–120 Hz | 0.06 |
| `shokz-bone-conduction` | Shokz | 90–360 Hz | 0.06 |
| `native-controller-bridge` | supported external controller | 35–180 Hz normalised source band | 0.55 |

The native-controller gain is a normalised haptic intensity input for the bridge. It is not Web Audio amplitude.

## Mathematical checks

For each world root:

```text
f_compression = f0 exp(lambda s)
f_release = f0 exp(-lambda s)
f_compression * f_release = f0^2
```

The rendered proxies are octave folds of the source branches. Source frequencies remain in the receipt.

Every bounded render window proves recursion through:

```text
compression_start_gain[n] = release_end_gain[n - 1]
```

The final release gain is retained as the seed of the next window.

## Automatic acceptance matrix

Mark every row PASS, FAIL, BLOCKED or NOT TESTED.

| Criterion | Initial state |
|---|---|
| iPad detection recognises iPadOS desktop-class user agent | NOT TESTED |
| Capability receipt always states no internal iPad haptic actuator | NOT TESTED |
| Body-transducer proxy stays inside 35–120 Hz | NOT TESTED |
| Shokz proxy stays inside 90–360 Hz | NOT TESTED |
| Controller proxy stays inside declared bridge band | NOT TESTED |
| Every gain remains below its device-profile ceiling | NOT TESTED |
| One to eight cycles are accepted | NOT TESTED |
| Zero, negative and more than eight cycles fail closed | NOT TESTED |
| Compression cycle n+1 starts from release cycle n | NOT TESTED |
| Ultrasonic source remains unplayed | NOT TESTED |
| Infrasonic source remains unplayed | NOT TESTED |
| Output confirmation fails closed | NOT TESTED |
| Placement confirmation fails closed for body transducers | NOT TESTED |
| Placement-clearance confirmation fails closed | NOT TESTED |
| Start-low confirmation fails closed | NOT TESTED |
| Native bridge fails closed when absent | NOT TESTED |
| Feather Stop closes Web Audio transport | NOT TESTED |
| Feather Stop emits native stop command | NOT TESTED |
| Approval requires completed audition | NOT TESTED |
| Approval requires felt-and-identified confirmation | NOT TESTED |
| Approval requires comfort confirmation | NOT TESTED |
| Decision receipt is SHA-256 addressed | NOT TESTED |
| Existing world-tone and compression-release tests remain green | NOT TESTED |
| Production build emits PWA manifest, service worker and icon | NOT TESTED |

## Physical iPad matrix

Record exact hardware and software versions.

| Physical test | Result |
|---|---|
| Safari route loads on iPad | NOT TESTED |
| Add to Home Screen installs standalone PWA | NOT TESTED |
| Safe-area layout works in portrait | NOT TESTED |
| Safe-area layout works in landscape | NOT TESTED |
| PWA relaunches after network removal | NOT TESTED |
| Page hide invokes Feather Stop | NOT TESTED |
| Body transducer is the selected audio output | BLOCKED pending device |
| Shokz are the selected audio output | BLOCKED pending device |
| Root is physically distinct | BLOCKED pending Rowan |
| Compression is physically distinct | BLOCKED pending Rowan |
| Release is physically distinct | BLOCKED pending Rowan |
| Compression of release is physically distinct | BLOCKED pending Rowan |
| Maximum tested strength remains comfortable | BLOCKED pending Rowan |
| Placement-clearance gate is followed | BLOCKED pending Rowan |
| Native haptic controller bridge | BLOCKED pending native shell and controller |

## Adverse tests

- switch audio route after confirmation;
- disconnect the external device during a window;
- lock iPad during playback;
- move Safari to the background during playback;
- rotate during playback;
- double-tap Play;
- tap Play then Feather Stop during attack, midpoint and release;
- corrupt local somatic receipts;
- fill local storage;
- install a service-worker update while the PWA is open;
- run at minimum and maximum supported gain;
- use roots below 20 Hz and above 20 kHz;
- use fold indices 0, entry threshold, 0.999999 and 1;
- verify reduced-motion, VoiceOver, larger text and Switch Control.

## Required Boxfire receipt

```text
reviewer
reviewed_commit
iPad model
iPadOS version
Safari version
PWA standalone state
external devices and firmware
body placement
criteria with PASS / FAIL / BLOCKED / NOT TESTED
exact automated pass counts
physical observations
screenshots or recordings
accessibility findings
security findings
open blockers
merge recommendation
```

A conversational approval does not clear this gate.
