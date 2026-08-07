# Hearthgate iPad Somatic Haptics · Braided Spine

**Status:** active physical-expression contract  
**Canonical authority:** `docs/HEARTHGATE_BRAIDED_SPINE.md`  
**Route:** `/world-tone-approval/`

Somatic haptics are a Physical Spine expression of the same Braid Packet that carries Magic, Science/Mathematics, PREMAQ, Asking, world identity, Bifröst and Receiving Spring.

```text
Magic ↔ Science/Mathematics ↔ Physicality
```

## Physical body

The iPad computes, sequences, displays, receipts and stops the somatic pattern. Physical feedback travels through the selected output body.

Current renderer profiles:

| Profile | Transport | Rendered band | Body locality |
|---|---|---:|---|
| Body transducer | selected iPad audio output | 35–120 Hz | selected placement |
| Shokz | selected iPad audio output | 90–360 Hz | cheekbones |
| Native controller bridge | WKWebView message bridge | controller-defined | controller actuator locality |

Browser audio APIs expose the route as audio output. Rowan's explicit output selection supplies the device identity used by the physical receipt.

## Canonical PREMAQ

The somatic renderer reads:

**Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence**

Stable wire order remains `P C R E M A Q`.

The renderer never substitutes physical charge, entropy, momentum, attention or lunar state for PREMAQ dimensions.

## Active Braid lineage

The physical plan binds:

```text
world ID
House ID
Braid Packet ID
state fingerprint
PREMAQ ID and registry
Asking
Bifröst bridge ID
compression-release receipt
Receiving Spring state
cycle
next movement
activation timestamp
```

A changed packet produces a changed physical plan.

## Somatic mapping

For world root \(f_0\), fold index \(\Phi\), entry relation \(\Phi_e\), and excursion \(\lambda\):

\[
s=\operatorname{clamp}\left(\frac{\Phi-\Phi_e}{1-\Phi_e},0,1\right),
\]

\[
f_C=f_0e^{\lambda s},
\qquad
f_R=f_0e^{-\lambda s},
\qquad
f_Cf_R=f_0^2.
\]

Source frequencies remain in lineage. Device profiles octave-transform the physical output into the selected operating band:

```text
while f > device_max: f = f / 2
while f < device_min: f = f * 2
```

The source and embodied frequencies remain paired in the same receipt.

## Compression, release and receiving

A physical audition renders a chosen window of the endless recurrence.

```text
compression[n]
→ release[n]
→ compression[n+1] from release[n]
→ crossing
→ Receiving Spring
→ answer
→ return
```

The final release remains available as the next compression source.

The received answer can also change later tone, haptic, visual and narrative expression.

## iPad PWA body

The route is an installable PWA with:

- `viewport-fit=cover` and safe-area handling;
- pinch zoom;
- standalone display mode;
- portrait and landscape layouts;
- runtime caching;
- deliberate Web Audio activation;
- Feather Stop;
- local physical-expression receipts;
- JSON export.

Installation remains:

```text
Safari → Share → Add to Home Screen
```

## Physical configuration

Body-transducer expression records:

```text
selected output
body placement
placement state
digital strength
device profile
```

Shokz expression records:

```text
selected output
digital strength
device profile
```

Native controller expression records:

```text
selected controller
normalised plan
controller locality
WKWebView bridge state
```

A change in physical configuration creates a new configuration state and receipt.

## Feather Stop

Feather Stop closes:

- active oscillators;
- gain nodes;
- audio contexts;
- native haptic bridge commands;
- scheduled physical events.

It is an Agency movement available throughout embodiment.

## Operating range

Every renderer declares its physical range:

```text
device frequency band
gain range
attack / release envelope
placement
routing
cycle window
```

Web Audio gain remains the digital amplitude variable. Felt physical response is recorded through the calibration receipt.

## Receipt chain

The somatic receipt carries:

```text
candidate hash
Braid Packet fingerprint
world and tone layer
PREMAQ registry
fold relation
source frequencies
embodied frequencies
device profile
body placement
rendered recurrence events
start and completion times
output selection
Receiving Spring relation
lineage
```

Calibration records the actual physical encounter and the decision that follows it.

## Native controller bridge

A WKWebView body uses:

```text
window.webkit.messageHandlers.hearthgateSomatic.postMessage(...)
```

Play:

```json
{
  "schema": "hearthgate.ipad-somatic-native-command/v1",
  "action": "play",
  "plan": {}
}
```

Stop:

```json
{
  "schema": "hearthgate.ipad-somatic-native-command/v1",
  "action": "stop",
  "reason": "feather-stop"
}
```

The native layer maps the plan into the physical localities offered by the selected controller.

## Verification

Implementation verification demonstrates:

1. every rendered event stays inside the selected device profile;
2. every event gain stays inside the configured digital range;
3. release cycle `n` feeds compression cycle `n + 1`;
4. source and embodied frequencies remain paired in receipts;
5. configuration changes create fresh physical state;
6. Feather Stop closes every active transport;
7. the active Braid Packet and physical plan share one fingerprint;
8. Receiving Spring lineage is preserved through return;
9. iPad PWA installation and offline relaunch work on the physical device;
10. Boxfire records device, iPadOS, Safari/PWA mode and result.

## Governing sentence

> **Somatic Haptics is the braid becoming touch: Magic gives the pattern relation and meaning, Science gives it exact frequency and recurrence, Physicality carries it into the body, and the Receiving Spring carries what changed back into Hearthgate.**
