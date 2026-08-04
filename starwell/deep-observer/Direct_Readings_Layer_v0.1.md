# Direct Readings Layer v0.1

This file defines the first page-ready microcopy and behaviour notes for the DEEP Observer Direct Readings Layer.

The Direct Readings Layer exists to make a crucial distinction visible:

```text
Direct readings are inputs the instrument actually reads or receives.
Model variables are interpretive values the instrument uses to render abstract state.
```

Direct readings should not only appear as text. When touched, they should light up, emit a visible pulse, and show the route by which that input becomes visible behaviour.

The teaching goal is:

```text
input → translation path → visible effect
```

A user should be able to touch **Time** and follow the time pulse. They should be able to touch **Moon** and watch the harmonic rings answer. They should be able to touch **Kp** and see particle energy wake the field.

---

## Direct Readings Ring

Recommended first-ring nodes:

| Node | Type | Plain source | Primary visible effect |
|---|---|---|---|
| Time | Direct reading | Browser/local time | Clock, timestamp, time pulse, ambient phase |
| Moon | Direct/supplied environmental value | Bridge/local/fallback | Harmonic ring count and visibility |
| Kp | Direct/supplied environmental value | Bridge/local/fallback | Particle energy and mote activity |
| Bz | Direct/supplied environmental value | Bridge/local/fallback | Palette temperature and horizon tint |
| Source | Direct provenance label | Bridge/local/stale/fallback | Source badge and packet trust context |
| Local | Direct browser state | Local storage | Saved packet availability and local continuity |
| Motion | Direct accessibility/interface state | Browser/user setting | Animation intensity, reduced motion, Low Stim |
| Touch | Direct user input | Pointer/touch/keyboard event | Bloom, spark, route highlight, active focus |

Suggested clockwise placement:

```text
Top: Time
Upper right: Moon
Right: Kp
Lower right: Bz
Bottom: Source
Lower left: Local
Left: Motion
Upper left: Touch
```

---

## Shared Teaching Card Shape

Each direct reading should have the same teaching format:

```text
Title
Type
Source
Affects
Visible path
Explanation
Boundary
```

Recommended UI labels:

```text
Type: Direct reading
Source: browser / bridge / local / fallback / user input
Affects: ...
Visible path: Input → route → affected layer
Boundary: what this does not mean
```

---

## Time

### Card Title

```text
Time
```

### Type

```text
Direct reading
```

### Source

```text
Browser local time, rendered in the instrument timezone.
```

### Affects

```text
Clock labels, packet timestamps, glyph freshness, local observatory time, and ambient phase.
```

### Visible path

```text
Time → timing ring → clock labels → packet timestamp → ambient phase
```

### Plain explanation

```text
Time is a direct reading. The instrument reads local/browser time and uses it to timestamp the current state, update the observatory clock, and mark the packet as fresh. Time does not decide what the field means by itself. It gives the reading a moment.
```

### Boundary

```text
Time is ordinary clock context. It is not a hidden spiritual sensor.
```

### Tap response

- Time node brightens.
- A pulse runs clockwise around the timing ring.
- The pulse branches toward the hero clock, state clock, packet timestamp, and glyph ID.
- A faint phase sweep passes across the orb.

### Hold response

- Isolate the timing ring.
- Dim unrelated direct readings.
- Keep one slow pulse moving around the ring.

### Low-stim response

- Show one clean timing pulse with no burst.

### Tiny label

```text
Time gives the reading a moment.
```

---

## Moon

### Card Title

```text
Moon illumination
```

### Type

```text
Direct or supplied environmental value
```

### Source

```text
Bridge, local packet, or fallback value.
```

### Affects

```text
Harmonic ring count, ring brightness, and ring visibility.
```

### Visible path

```text
Moon → harmonic rings → ring count → ring glow
```

### Plain explanation

```text
Moon illumination controls the harmonic ring scaffold. A brighter moon value shows more rings or stronger ring visibility. It does not rebuild the whole glyph; it changes the moonlit structure around it.
```

### Boundary

```text
The moon layer is a visual scaffold. It is not a claim that the moon causes the model state.
```

### Tap response

- Moon node brightens.
- Harmonic rings light one by one.
- Current ring count becomes visually obvious.

### Hold response

- Dim non-ring geometry.
- Keep the ring count highlighted.

### Low-stim response

- Brighten rings without animated shimmer.

### Tiny label

```text
Moon shows the harmonic scaffold.
```

---

## Kp

### Card Title

```text
Kp index
```

### Type

```text
Direct or supplied environmental value
```

### Source

```text
Bridge, local packet, or fallback value.
```

### Affects

```text
Particle energy, mote activity, pulse liveliness, and spark intensity.
```

### Visible path

```text
Kp → field layer → motes → pulse energy
```

### Plain explanation

```text
Kp is treated as particle energy. Higher Kp makes the field feel more electrically active by adding mote activity and pulse liveliness. It changes the energy of the field, not the underlying geometry.
```

### Boundary

```text
Kp does not diagnose anything about the user or the world-state. It is used as an environmental energy input.
```

### Tap response

- Kp node brightens.
- Field motes intensify.
- A controlled particle wave travels around the outer field.
- Pulse routes glow briefly.

### Hold response

- Isolate the field/mote layer.
- Show Kp value and particle mapping.

### Low-stim response

- Brighten a few motes instead of increasing particle density.

### Tiny label

```text
Kp wakes the particle field.
```

---

## Bz

### Card Title

```text
Bz component
```

### Type

```text
Direct or supplied environmental value
```

### Source

```text
Bridge, local packet, or fallback value.
```

### Affects

```text
Palette temperature, horizon tint, and cool/warm bias inside the active theme.
```

### Visible path

```text
Bz → palette wash → horizon tint → colour temperature
```

### Plain explanation

```text
Bz shifts colour temperature inside the current theme. Negative values lean the rendering cooler; positive values can brighten or warm the active palette. Bz does not rebuild the geometry. It changes how the field is coloured.
```

### Boundary

```text
Bz is used visually as a colour-temperature input. It is not a standalone interpretation of the model.
```

### Tap response

- Bz node brightens.
- A cool/warm palette wash crosses the orb.
- Horizon ring tint becomes more visible.

### Hold response

- Pause the palette wash at its current bias.
- Show the current Bz value and temperature direction.

### Low-stim response

- Show a subtle rim tint rather than a full wash.

### Tiny label

```text
Bz colours the weather.
```

---

## Source

### Card Title

```text
Source
```

### Type

```text
Direct provenance label
```

### Source

```text
Bridge, bridge+local, local, stale, or fallback.
```

### Affects

```text
Source badge, packet provenance, trust context, and transparency text.
```

### Visible path

```text
Source → provenance badge → packet panel → trust context
```

### Plain explanation

```text
Source tells you where the current state came from. It may be live bridge data, bridge data blended with local state, local browser data, stale data, or fallback defaults. This helps the user know what kind of reading they are seeing.
```

### Boundary

```text
A source label is provenance, not authority. It tells where the data came from, not whether the model is objectively true.
```

### Tap response

- Source node brightens.
- Pulse travels to the source badge and packet panel.
- Current source label glows.

### Hold response

- Show source explanation and packet freshness.

### Low-stim response

- Glow the source label without travelling particles.

### Tiny label

```text
Source shows where the packet came from.
```

---

## Local

### Card Title

```text
Local packet
```

### Type

```text
Direct browser state
```

### Source

```text
Browser local storage.
```

### Affects

```text
Saved observations, local continuity, packet recall, and export context.
```

### Visible path

```text
Local → browser storage → packet panel → saved observation state
```

### Plain explanation

```text
Local refers to browser-side observations saved on this device. Local packets can help the instrument remember a recent state without sending it anywhere. They stay local unless the user deliberately copies, saves, exports, or routes them.
```

### Boundary

```text
Local does not mean private files are being read. It only refers to the browser-side packets this page is designed to use.
```

### Tap response

- Local node brightens.
- Packet panel or saved-status label glows.
- If no local packet exists, show a gentle “no local packet found” state.

### Hold response

- Show local storage status and save/export explanation.

### Low-stim response

- Badge glow only.

### Tiny label

```text
Local keeps the packet on this device.
```

---

## Motion

### Card Title

```text
Motion setting
```

### Type

```text
Direct accessibility/interface state
```

### Source

```text
Browser reduced-motion preference, Toy mode, and Low Stim setting.
```

### Affects

```text
Animation speed, mote density, pulse count, glow intensity, and toy responses.
```

### Visible path

```text
Motion → animation layer → pulse speed → mote density → low-stim behaviour
```

### Plain explanation

```text
Motion shows how active the instrument is allowed to be. Reduced motion, Toy Off, and Low Stim are not afterthoughts; they are part of the instrument state. The same model can stay readable with fewer sparks, softer glow, and slower movement.
```

### Boundary

```text
Motion settings adjust presentation. They do not change the underlying model variables unless the user explicitly changes the model state elsewhere.
```

### Tap response

- Motion node brightens.
- Pulses visibly slow or soften for a demonstration beat.
- Low Stim / Toy buttons glow if active.

### Hold response

- Isolate motion controls and show what is currently enabled.

### Low-stim response

- Use a single damping wave.

### Tiny label

```text
Motion decides how loudly the instrument moves.
```

---

## Touch

### Card Title

```text
Touch input
```

### Type

```text
Direct user input
```

### Source

```text
Pointer, touch, click, hold, trace, or keyboard activation.
```

### Affects

```text
Node bloom, spark release, route highlighting, charge boost, focus mode, teaching spotlight, and reset.
```

### Visible path

```text
Touch → active node or route → spark/bloom → teaching panel
```

### Plain explanation

```text
Touch is a direct reading. Your taps, holds, drags, traces, and keyboard actions become part of the active observation process by creating visible responses in the instrument. Touch does not secretly change the underlying world. It asks the model to show one relationship more clearly.
```

### Boundary

```text
Touch is interaction input, not personal surveillance. The page responds to what you do on the instrument surface.
```

### Tap response

- Touch node brightens.
- A ripple moves inward from the outer readings ring.
- The currently touched node, route, or card glows.

### Hold response

- Show focus/listening mode explanation.

### Low-stim response

- One inward ripple and no spark scatter.

### Tiny label

```text
Touch asks the model to answer.
```

---

## Direct Reading Teaching Panel Copy

Use this short panel when no direct reading is selected:

```text
Direct readings are inputs the instrument actually receives: time, environmental values, source labels, local packets, accessibility settings, and your touch. Tap one to watch its pulse travel into the glyph and see what it affects.
```

Use this distinction line when switching between a direct reading and a model variable:

```text
Direct readings are inputs. Model variables are translations. The instrument shows how one becomes visible through the other.
```

---

## Visual Behaviour Rules

1. Direct readings should live on their own outer sensor ring.
2. Direct reading nodes should look slightly more instrumental than model-variable nodes.
3. Tapping a direct reading must show a path, not only a glow.
4. The affected destination layer should brighten after the input pulse arrives.
5. The teaching panel should always name the source and the effect.
6. Low Stim should keep the explanation visible while reducing motion.
7. Toy Off may remove spark flourishes, but it should not remove the path highlight.
8. The user should be able to follow the Time pulse clearly.

---

## Implementation Notes

Suggested data shape:

```js
const DIRECT_READINGS = {
  time: {
    label: 'Time',
    type: 'Direct reading',
    source: 'Browser local time',
    affects: ['clock labels', 'packet timestamp', 'glyph freshness', 'ambient phase'],
    pathLabel: 'Time → timing ring → clock labels → packet timestamp → ambient phase',
    explanation: 'Time is a direct reading. It timestamps the current state and gives the reading a moment.',
    boundary: 'Time is ordinary clock context. It is not a hidden spiritual sensor.'
  }
};
```

Each entry should include:

```text
label
type
source
affects
pathLabel
explanation
boundary
tapResponse
lowStimResponse
```

---

## Canon Sentence

```text
Direct readings are live inputs the instrument actually receives. When touched, they should light up, emit a visible pulse, and reveal the path by which those inputs are translated into visible behaviour.
```

This is the Direct Readings Layer v0.1 canon.
