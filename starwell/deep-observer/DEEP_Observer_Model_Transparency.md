# DEEP Observer Model Transparency

This note explains what the DEEP Observer is doing in plain language.

The short version:

> DEEP Observer is an interactive visual model. It does not claim to detect hidden spiritual states or private information. It takes a small set of known inputs and model variables, then translates them into visible geometry, motion, glow, colour, and teaching text.

The point is not to prove Terra Aeterna as a physical place. The point is to make the model inspectable: users can touch a node, highlight a variable, trace a route, change a theme, or compare a packet and see how the instrument responds.

The shiny is not decoration. The shiny is the teaching method.

---

## Why this is not just a fun toy

It is fun, deliberately. The fun is part of the interface design.

But it is not *only* a toy because it has a consistent translation system:

1. A value enters the model.
2. The value maps to a visible behaviour.
3. The user can interact with that behaviour.
4. The teaching text explains what changed.
5. The packet shows the current state in inspectable form.

A decorative toy responds because it is pretty.

DEEP Observer responds because a specific signal or model variable has been mapped to a specific visual behaviour.

That makes it a teaching tool, a data-visualisation experiment, and a worldbuilding interface.

---

## What is actually read or measured

Some inputs are direct readings from the browser, device, or optional data source.

| Input | What it is | Why it is used |
|---|---|---|
| Local time | Browser/local time rendered in the chosen timezone | Sets STARWELL time, clock labels, timestamps, and time-based glyph IDs. |
| Screen size | Browser layout information | Keeps the orb readable on phone, tablet, and desktop. |
| Reduced-motion preference | Browser accessibility preference | Slows or softens nonessential animation. |
| Pointer/touch input | Tap, drag, hold, trace, click, keyboard activation | Lets the user inspect the model by touching it. |
| Local storage packets | Optional saved browser-side DEEP state | Lets the page read locally created observations when available. |
| Bridge pulse endpoint | Optional public/shared JSON pulse | Lets the page use a live shared state instead of only fallback defaults. |
| Moon illumination | Optional environmental value when present | Controls harmonic ring count and ring visibility. |
| Kp index | Optional geomagnetic-style value when present | Adds particle energy and field activity. |
| Bz component | Optional magnetic-field-style value when present | Shifts palette temperature inside the current theme. |
| Sky / weather label | Optional contextual value when present | Can tint mood, field, or teaching context. |

These are ordinary interface and data-visualisation inputs. They are not secret sensors.

---

## What is modelled or assigned

Some values are not direct measurements. They are interpretive model variables.

| Variable | Plain meaning | What it changes visually |
|---|---|---|
| `P` Presence | How inhabited or structurally present the state feels | Outer node count and outer structure. |
| `C` Coherence | How well the structure holds together | Edge clarity, route density, connective strength. |
| `R` Resonance | How rhythmic or harmonically active the state is | Ring emphasis, route rhythm, pulse cadence. |
| `E` Entropy | How loose, noisy, or asymmetrical the state is | Wobble, jitter, organic irregularity. |
| `M` Momentum | How much motion is moving through the state | Spark speed, pulse traffic, trace response. |
| `A` Alignment | How centred or organised the inner structure is | Mid-ring body, inner centring, alignment glow. |
| `Q` / charge | How awake the centre is | Core glow, bloom, centre pulse. |
| `H` Horizon | A derived edge-condition signal | Outer boundary activity and horizon behaviour. |

These values let the instrument ask:

> What would this abstract state look like if we made it visible?

That is the useful question.

---

## What we are seeing

The glyph is a translation layer.

It turns abstract state into visible relationships:

```text
P → more or fewer outer nodes
C → clearer or weaker geometry
R → stronger harmonic routes and pulse rhythm
E → more or less wobble
M → faster or slower spark travel
A → tighter or looser inner structure
Q → brighter or quieter centre glow
H → calmer or more active horizon edge
moonIllum → more or fewer harmonic rings
Kp → more or less particle energy
Bz → cooler or warmer palette temperature
```

The instrument does not say, "this state is objectively true."

It says, "given this packet and this model, here is how the state renders."

That difference matters.

---

## The scientific layer

Scientifically, this is a visualisation prototype.

It combines:

- browser/device readings,
- optional environmental or bridge data,
- local model variables,
- derived calculations,
- interactive event handling,
- accessible rendering controls,
- and explanatory text.

The scientific question is:

> Can abstract relational states become easier to understand when they are represented as touchable geometry, motion, and feedback?

DEEP Observer explores that question.

It does not prove metaphysics. It demonstrates a model.

---

## The mythic layer

Mythically, the same model becomes a reading surface for Terra Aeterna.

The mythic layer does not replace the mechanism. It gives the mechanism meaning.

In that reading:

- Presence fills the outer ring.
- Coherence binds the bones.
- Resonance sings through the routes.
- Entropy loosens the weave.
- Momentum moves the sparks.
- Alignment centres the chamber.
- Charge wakes the hearth.
- Horizon shows the edge of the field.
- Moonlight lays down harmonic rings.

This is symbolic language for orientation, not a claim that the browser has secret access to a hidden world.

The mythic layer makes the model emotionally and narratively legible.

The scientific layer keeps the mechanism honest.

Both are allowed to stand beside each other, but they must not impersonate each other.

---

## Why measure or model these variables

We use these variables because they are useful dimensions for understanding complex states.

A person, story, conversation, system, or world-state can feel:

- present or absent,
- coherent or fragmented,
- resonant or flat,
- stable or noisy,
- moving or stalled,
- aligned or scattered,
- charged or quiet,
- bounded or edge-active.

Those qualities are hard to inspect when they stay only as words.

DEEP Observer turns them into a visible instrument so the user can ask better questions:

- What changed?
- Which part of the structure moved?
- Did coherence drop or momentum rise?
- Is the centre charged but the outer field unstable?
- Is the field beautiful but visually too busy?
- Does Low Stim preserve the meaning while reducing motion?

That is why the model matters.

---

## How the user interacts with it

The user learns by touching the model.

| Interaction | What happens | What it teaches |
|---|---|---|
| Tap a variable card | Matching geometry brightens and teaching text updates | Which visual layer belongs to that variable. |
| Tap a node | Node blooms and connected routes spark | How local structure connects to the model. |
| Tap a route | Sparks travel along the selected relationship | How variables are linked. |
| Drag the orb | The astrolabe rotates | The structure can be inspected physically. |
| Hold a node or route | The selected structure isolates | Focus mode helps the user study one part. |
| Trace near a route | A spark follows the route | Exploration creates visible cause and effect. |
| Tap the centre | Charge blooms | The centre glow represents charge. |
| Double-tap centre or empty field | Reset | The user can safely return to full view. |
| Toggle layers | Pulse, field, geometry, horizon, or moons appear/disappear | The user can simplify the model. |
| Switch theme | Palette changes while the maths remain stable | Same model, different emotional/elemental skin. |
| Toy Off | Extra spark play quiets down | Keeps the instrument readable. |
| Low Stim | Motion and glow reduce | Accessibility is part of the model, not an afterthought. |

The interaction is not fluff. It is how the model teaches.

---

## What it does not process by default

DEEP Observer does not use these by default:

- microphone,
- camera,
- GPS,
- contacts,
- private files,
- messages,
- health data,
- hidden personal data,
- or silent data transmission.

Public STARWELL pages should not silently transmit local packets.

Packets remain local unless the user deliberately copies, saves, exports, or routes them.

---

## Clean public wording

A concise public explanation can read:

> DEEP Observer is an interactive visual model. Some inputs are direct readings, such as time, touch gestures, accessibility settings, optional bridge data, and optional environmental values. Other inputs are model variables, such as presence, coherence, resonance, entropy, momentum, alignment, charge, and horizon.
>
> The instrument translates those inputs into geometry, motion, glow, colour, and teaching text. It does not claim to detect hidden spiritual states or private information. The point is to make an abstract state visible and inspectable: touch a node, tap a card, trace a route, or change the theme and see what the model does.
>
> The mythic layer gives the model meaning. The scientific layer explains the mechanism. The shiny is the teaching method.

---

## Canon boundary

DEEP Observer may be mythic, beautiful, and playful.

It must also remain honest.

The correct claim is not:

```text
This instrument proves Terra Aeterna.
```

The correct claim is:

```text
This instrument visualises a Terra Aeterna model so its variables, relationships, and behaviours can be inspected.
```

That is enough. That is useful. That is the work.
