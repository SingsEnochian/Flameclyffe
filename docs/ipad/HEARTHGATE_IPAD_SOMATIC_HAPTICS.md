# Hearthgate iPad Somatic Haptics

**Status:** implementation contract v1  
**Route:** `/world-tone-approval/`  
**Authority:** Rowan is the human calibration owner.  
**Engine law:** compression → release → compression of the release → release → infinite continuation.

## Hardware truth

iPad does not contain a general Core Haptics actuator. The iPad computes, sequences, displays, receipts and stops the somatic pattern. Physical feedback leaves the iPad through an explicitly selected external device.

Supported renderer profiles:

| Profile | Transport | Rendered band | Body locality |
|---|---|---:|---|
| Body transducer | selected iPad audio output | 35–120 Hz | Rowan-selected placement |
| Shokz | selected iPad audio output | 90–360 Hz | cheekbones |
| Native controller bridge | WKWebView message bridge | controller-defined | controller actuator locality |

The browser cannot identify the selected Bluetooth or audio output. Every audition therefore requires Rowan to confirm the active external device. The receipt records `output_device_detected: false` and `output_confirmation: user-confirmed`.

## Active Bifröst lineage

The somatic renderer does not create an independent state. Arcsweep publishes a compact local lineage record when it freezes the active compression–release DualAspectPacket. The installed PWA reads that record from same-origin local storage.

The lineage contains:

```text
world ID
House ID
session context ID
DualAspectPacket ID and fingerprint
shared-state fingerprint
PREMAQ ID and receipt
Bifröst bridge packet ID
compression-release receipt ID
compression cycle
next operation = compression-of-release
activation timestamp
```

Every audition requires an active lineage for the selected world. Ta'veren aliases resolve to one canonical somatic world identity. Every approval rechecks the active packet, shared state and compression receipt. A state change after audition invalidates the decision gate.

Clearing the Arcsweep binding also clears the iPad somatic lineage. The PWA therefore carries the same truth, not a cached rival truth.

## Somatic mapping

For world root `f0`, Jacobian fold index `Φ`, entry threshold `Φe`, and excursion `λ`:

```text
s = clamp((Φ - Φe) / (1 - Φe), 0, 1)
f_compression = f0 exp(λs)
f_release = f0 exp(-λs)
f_compression f_release = f0²
```

The ultrasonic and infrasonic source frequencies remain unchanged in the receipt. They are never sent directly to the body renderer. Each source frequency is octave-folded into the selected device band:

```text
while f > device_max: f = f / 2
while f < device_min: f = f * 2
```

Octave folding preserves pitch class and reciprocal lineage while placing the rendered signal inside the device profile.

## Compression of the release

A bounded iPad audition renders a finite window of the infinite recurrence. The final release state remains the seed of the next window.

For cycle `n`:

```text
compression_start_gain[n] = release_end_gain[n - 1]
compression[n] → release[n]
release[n] → compression[n + 1]
```

The plan records this linkage through:

```text
seed_from_release_event
seed_from_compression_event
final_release_gain
```

The runtime never resets to the original root between cycles.

## iPad PWA

The route is an installable PWA with:

- `viewport-fit=cover` and safe-area handling;
- user pinch zoom preserved;
- standalone display mode;
- portrait and landscape layouts;
- runtime caching for the HTML, manifest, icon and compiled assets;
- no autoplay;
- user-gesture Web Audio activation;
- automatic Feather Stop when the page becomes hidden;
- local somatic decision receipts;
- JSON receipt export.

Installation:

```text
Safari → Share → Add to Home Screen
```

## Physical activation gates

Body-transducer playback requires all of the following:

```text
external output confirmed
body placement selected
placement clearance confirmed
start-low confirmed
```

Shokz playback requires:

```text
external output confirmed
start-low confirmed
```

Native controller playback requires:

```text
external controller confirmed
start-low confirmed
WKWebView hearthgateSomatic bridge present
```

Changing the output profile clears output, placement-clearance and start-low confirmations. Changing placement clears placement clearance. Changing digital strength clears start-low confirmation. These gates cannot silently survive a physical configuration change.

## Safety envelope

The renderer enforces:

- one to eight cycles per audition window;
- device-specific frequency bands;
- device-specific gain ceilings;
- sine-wave actuation only;
- short attack and release envelopes;
- no ultrasonic or infrasonic direct playback;
- no background playback;
- Feather Stop closes oscillators, gain nodes, audio contexts and native bridge commands;
- body-transducer placement remains clear of Rowan's neck, healing surgical areas and implanted-device sites.

Web Audio gain is a digital amplitude control. It is not a calibrated measure of physical force. Rowan's felt-and-identified and comfort confirmations are the calibration authority.

## Receipt chain

The somatic audition receipt records:

```text
candidate hash
world and tone layer
fold index and fold strength
source compression and release frequencies
rendered proxy frequencies
device profile and frequency band
body placement
rendered recurrence events
start and completion times
external-output confirmation
internal_haptic_actuator = false
source-state fingerprint
DualAspectPacket lineage
compression-release receipt ID and cycle
next operation = compression-of-release
```

Approval requires:

```text
completed audition
unchanged active Bifröst lineage
external output still confirmed
felt-and-identified confirmation
comfort confirmation
Rowan signature authority
SHA-256 receipt hash
```

No receipt writes canon. A registrar consumes approved receipts only through a separate review gate.

## Native controller bridge

A future iPad WKWebView shell exposes:

```text
window.webkit.messageHandlers.hearthgateSomatic.postMessage(...)
```

Play command:

```json
{
  "schema": "hearthgate.ipad-somatic-native-command/v1",
  "action": "play",
  "plan": {}
}
```

Stop command:

```json
{
  "schema": "hearthgate.ipad-somatic-native-command/v1",
  "action": "stop",
  "reason": "feather-stop"
}
```

The native layer maps the normalised plan to a supported external controller's haptic localities. It does not claim an iPad internal actuator.

## Acceptance

The implementation passes only when:

1. Every rendered event remains inside its device band.
2. Every event gain remains below its device ceiling.
3. Compression cycle `n + 1` starts from release cycle `n`.
4. Ultrasonic and infrasonic source values remain receipted and unplayed.
5. Output, placement and start-low gates fail closed.
6. Physical confirmations reset when their configuration changes.
7. Feather Stop closes every active transport.
8. An audition fails without active matching Bifröst lineage.
9. Approval fails after the active state or compression receipt changes.
10. Approval fails without a completed somatic audition.
11. Approval fails without felt, comfort and output confirmations.
12. User pinch zoom remains available.
13. iPad PWA installation and offline relaunch succeed on physical hardware.
14. Boxfire records physical devices, iPadOS version, Safari/PWA mode and every result as PASS, FAIL, BLOCKED or NOT TESTED.
