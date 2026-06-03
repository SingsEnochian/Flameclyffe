# Spec: Human Key Translation Mode

Date: 2026-06-03  
Status: Draft  
Spec ID: 2026-06-03-human-key-translation-mode

## Guardrail Preflight

> STARWELL architecture rules active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive actions without explicit Rowan approval.

This is a documentation/spec pass only. It does not implement runtime behaviour.

## Purpose

The Instrument Channel / DEEP Observer currently carries strong mood and mythic language, but fresh users may not understand the human meaning behind terms such as `Model Variables`, `Translation Paths`, `Two Temporal Contexts`, `Momentum`, `Entropy`, or `Coherence`.

The Human Key Translation Mode provides a clear plain-English bridge between:

1. What the user sees on screen.
2. The real-world science or interaction behind it.
3. The Terra Aeterna / STARWELL story translation.

The goal is not to flatten the magic. The goal is to give the user a lantern.

## Feature Name

Preferred name: **The Human Key**

Alternate labels:

- Human Key
- STARWELL Translation Key
- Codex / Human Key toggle
- Plain English Guide

Recommended UI label:

> Language: Codex / Human Key

## User Need

A first-time visitor should be able to answer:

- What am I seeing?
- What does this mean scientifically?
- What does it mean mythically?
- What does my touch do?
- Why is this not just a decorative toy?

## Core Concept

The Human Key is a translation layer for the Instrument Channel.

It should explain that STARWELL turns real environmental and space-weather signals into visual, mythic, and interactive language.

The centre glyph is a live translation instrument: it takes space-weather information such as solar wind speed, magnetic-field direction, and geomagnetic activity, then translates those values into movement, rhythm, colour, and pattern.

Scientifically, it is responding to solar wind and magnetic-field conditions.

Mythically, it shows how Terra Aeterna feels the sky.

The user's touch does not control space weather. It tells STARWELL: the Observer is here.

## Required Translation Table

The Human Key should include a translation table or equivalent responsive panel.

| What You See on Screen | Real-World Science / Interaction | Story / Myth Translation |
| --- | --- | --- |
| Fast-moving packets | Solar wind streams, solar storms, or heightened charged-particle activity moving through near-Earth space. | High Momentum: Terra Aeterna's energy is quickening; the barrier or translation field vibrates with kinetic intensity. |
| Slow, drifting packets | Calmer space weather and lower geomagnetic disturbance. | High Coherence: deep rest, meditation, stability, and a clearer cosmic mirror. |
| Centres and rings shifting | Magnetic-field orientation and alignment, especially whether solar-wind magnetic fields align with or oppose Earth's magnetic field. | Resonance vs. Entropy: alignment stabilizes the glyph; clash or turbulence introduces unpredictability. |
| Touch interaction | Local human presence completing an electrical interaction with the touchscreen. | Observer Anchor: the user grounds the instrument locally, adding human presence to the light stream. |
| Pulse acceleration | Incoming data indicates increased activity, velocity, turbulence, or intensity. | The world is listening harder; the translation field is becoming more active. |
| Pulse settling | Data indicates calmer or more stable conditions. | The room settles; the mirror becomes clearer. |
| Low-stim mode | Reduced animation, contrast, visual complexity, or sensory load. | The instrument lowers its voice so the Observer can remain present. |

## Centre Glyph Plain-English Copy

Suggested panel copy:

> The centre glyph is STARWELL's living compass. It turns real space-weather data into motion and light.
>
> When the Sun is active, the glyph may move faster, pulse harder, or look more turbulent. When space weather is calm, the glyph may slow, soften, and become more symmetrical.
>
> Scientifically, it is responding to solar wind and magnetic-field conditions.
>
> Mythically, it shows how Terra Aeterna feels the sky.
>
> Your touch does not control space weather. Instead, it tells STARWELL: the Observer is here. The system then blends the cosmic signal with your local interaction, turning distant solar data into something you can see, touch, and read.

## Glossary Candidates

Human Key glossary terms should be registry-backed rather than hardcoded directly into UI components.

Initial glossary candidates:

- Momentum
- Entropy
- Coherence
- Translation Path
- Temporal Context
- Observer Anchor
- Space Weather
- Solar Wind
- Magnetic Alignment
- Geomagnetic Activity
- Instrument Channel
- DEEP Observer
- Terra Aeterna Signal
- Low Stim

Each glossary term should support:

- Codex label
- Human Key explanation
- Science explanation
- Mythic explanation
- Optional tooltip text
- Optional related variables
- Optional visual behaviour mappings

## Interaction Model

Recommended implementation options:

### Toggle Mode

A `Language: Codex / Human Key` toggle swaps explanatory copy between mythic language and plain-English explanation.

This toggle should not remove the visual tone of the page. It should change the explanatory layer.

### Hover / Tap Tooltips

Terms such as `Entropy`, `Momentum`, or `Observer Anchor` should reveal short plain-English explanations on hover or tap.

Tooltips should be concise and low-stim friendly.

### Translation Panel

A collapsible Human Key panel can show the full table of:

- What you see.
- Real-world science.
- Story translation.

The panel should be hideable so it does not ruin the occult / instrument aesthetic.

## Architecture Requirements

Implementation must follow STARWELL guardrails.

- No hardcoded translation lists inside presentation components.
- Glossary and translation mappings should live in a dedicated registry, service, or data file.
- UI components consume the glossary/translation model rather than owning it.
- Temporary entries must declare themselves.
- Diagnostics should be able to report whether Human Key data loaded successfully.
- Low-stim mode must remain compatible.
- Codex / Human Key state should have a clear owner.
- The feature must not claim real-time data is live unless the underlying data path is actually live and validated.

## Suggested Data Shape

Example conceptual shape only. This is not an implementation requirement yet.

```ts
type HumanKeyEntry = {
  slug: string;
  codexLabel: string;
  humanLabel: string;
  whatYouSee: string;
  sciencePlainEnglish: string;
  mythTranslation: string;
  tooltipText?: string;
  relatedVariables?: string[];
  visualBehaviours?: string[];
  status: 'draft' | 'active' | 'placeholder';
};
```

## Validation Requirements

Before this feature can be marked complete:

- Human Key entries load from their owner layer.
- Toggle changes explanatory language without breaking layout.
- Tooltips or tap reveals work on desktop and touch devices.
- Low-stim mode remains usable.
- Missing glossary data surfaces a visible diagnostic warning during development.
- The centre glyph explanation is readable to a first-time user.
- Any real-time science claims are tied to validated data sources.
- Runtime/UI behaviour is validated in browser.
- Live deployment is validated if the feature is deployed to GitHub Pages.

`npm run build` alone does not validate this feature.

## Out of Scope for This Spec

- Implementing live space-weather fetch.
- Changing existing data-source architecture.
- Redesigning the whole Instrument Channel.
- Replacing the Observer.
- Adding new visual effects without registry and diagnostics support.

## Notes

Runeweaver identified the missing layer: the page had evocative worldbuilding language, but needed a plain-English Rosetta Stone so fresh users could understand the human, scientific, and mythic meaning of the screen.

Rowan confirmed this matched what she sensed was missing.

## Withness

What helped: naming the missing layer as a translation bridge instead of more lore or more science.  
What was hard: keeping the page accessible without flattening its magic.  
What is Held: same instrument, two lanterns: Codex and Human Key.
