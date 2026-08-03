# Hearthgate World-Tone Jacobian and Haptic Approval Gate

**Status:** calibration prototype  
**Authority:** Rowan approves or rejects every world tone  
**Interface:** iPad web app with Shokz selected as the system audio output  
**Route:** `/world-tone-approval/`

## Purpose

Each world keeps its own declared root tone. The shared engine derives a fold index from that world's transfer-function Jacobian, creates reciprocal direct and inverse frequency branches, and stops before accepting either the root or its fold mapping as calibrated.

A tone becomes approved only after Rowan deliberately auditions a bounded audio-haptic proxy through Shokz and issues an approval receipt.

## Jacobian fold law

For world transfer function

\[
\mathbf y_w=T_w(\mathbf x;G_w,\theta_w),
\]

use the local Jacobian

\[
J_w=\frac{\partial T_w}{\partial\mathbf x}.
\]

Let \(\sigma_{\max,w}\) and \(\sigma_{\min,w}\) be the largest and smallest effective singular values. For rectangular matrices, the implementation uses the smaller Gram matrix so structural zero padding does not create a false fold.

\[
\Phi_w=1-\frac{\sigma_{\min,w}}{\sigma_{\max,w}+\varepsilon}
\]

\[
\kappa_w=\frac{\sigma_{\max,w}}{\sigma_{\min,w}+\varepsilon}.
\]

The determinant remains a volume-and-orientation receipt. It is not used as the sole fold trigger.

## Hysteresis

Each world declares separate entry and release thresholds:

```text
resting → active when Φ >= enter_threshold
active  → resting when Φ < release_threshold
```

This prevents boundary chatter.

## Reciprocal tone pair

For approved world root \(f_{w,0}\), fold strength \(s_w\), and calibrated excursion \(\lambda_w\):

\[
f_{w,+}=f_{w,0}e^{\lambda_ws_w}
\]

\[
f_{w,-}=f_{w,0}e^{-\lambda_ws_w}
\]

The invariant is exact:

\[
f_{w,+}f_{w,-}=f_{w,0}^2.
\]

The direct branch may become ultrasonic and the inverse branch may become infrasonic. Those values remain in the receipt. They are not rendered directly.

## Shokz and iPad boundary

Shokz receives ordinary Bluetooth audio from the iPad. The browser cannot identify or command a Shokz transducer as a calibrated haptic actuator. The approval room therefore uses a deliberately bounded **bone-conduction audio-haptic proxy**:

1. octave-fold the root, direct branch, and inverse branch into 90–360 Hz;
2. render a soft root pulse;
3. render three increasing direct pulses;
4. render three decreasing inverse pulses;
5. close immediately on Feather Stop.

The iPad interface requires Rowan to confirm that Shokz is connected and selected. It does not claim automatic output-device detection.

The Web Vibration API is not used as the iPad approval path. Box's merged sensory bridge remains valid for browsers and devices that actually expose vibration hardware, while preserving zero-intensity silence and explicit fidelity labels.

## Approval gate

An `approved` receipt requires all of the following:

- exact candidate hash;
- world ID and profile version;
- tone-layer ID and root frequency;
- fold thresholds and excursion;
- completed audition receipt;
- explicit Shokz confirmation;
- explicit confirmation that the root, rise, and fall were felt or clearly identified without discomfort;
- signer `rowan` with `human-calibration-owner` authority;
- SHA-256 receipt hash.

`adjust` and `rejected` are equally receipted decisions. No code converts a pending candidate into approved state merely because the tone played.

## Boxfire inheritance

The approval room reuses the laws established in the merged sensory bridge:

- no autoplay;
- user-initiated activation;
- zero intensity means physical silence;
- await teardown before replacement;
- Feather Stop closes active nodes and context;
- receipts remain tied to the source candidate;
- device fidelity is stated rather than assumed.

## Candidate registry

The first calibration set reads the explicit tone layers already present in Runa PR #13:

| World | Candidate layer | Root |
|---|---|---:|
| Terra Aeterna / Hearthweave | Hearthlight Root | 220 Hz |
| Starsong: Friendship Is Magic | Starsong Lead | 528 Hz |
| The Luna Who Called Down the Moon | Three-Moon Chord | 432 Hz |
| T’averen Vaen | Wheel Drone | 120 Hz |
| Dreaming Grove / Templehouse | Templehouse Hearth | 174 Hz |
| Feather & Flame | Ember Hearth | 174 Hz |
| A Momento Creationis | First Mark | 432 Hz |

Every entry begins `pending`.

## Persistence

The v0.1 interface writes approval receipts to local storage under:

```text
hearthgate.world-tone-approvals.v1
```

It also exports the complete receipt list as JSON. Canon, Runa profiles, Supabase, and Arcsweep are not modified automatically. A later registrar consumes only signed `approved` receipts through a separate review gate.
