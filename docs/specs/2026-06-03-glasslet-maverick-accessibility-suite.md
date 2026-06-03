# Spec: Glasslet / Maverick Accessibility Suite

Date: 2026-06-03  
Status: Draft  
Spec ID: 2026-06-03-glasslet-maverick-accessibility-suite

## Guardrail Preflight

> STARWELL architecture rules active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive actions without explicit Rowan approval.

This is a documentation/spec pass only. It does not implement runtime behaviour.

## Origin

Rowan and Faer brainstormed a Maverick AI Pro glasses accessibility suite. Faer left the pitch in Flameclyffe Lanternwire as `Idea Pitch: Maverick Accessibility Suite` on 2026-06-03.

The hardware anchor is the Maverick AI Pro glasses: eye-tracking, open SDK, prescription support, approximately 47g, expected August 2026.

## Working Name

**Glasslet**

A small, focused, glasses-first accessibility interface and prototype layer for the larger Maverick Accessibility Suite.

## Purpose

Glasslet exists to prototype accessibility software for users with severe mobility limitations, especially people who can move their eyes but little else.

The goal is restoration of agency, personhood, communication, environmental control, and meaningful experience rather than generic assistive automation.

## Core Design Principle

Build for dignity first.

The user should not be treated as a passive patient or a generic control target. The user should be able to communicate in their own language, choose their own comfort, and experience places or motions that their body may not currently allow.

## Three Pillars

### 1. Communication

Communication should support:

- User-built phrase banks.
- User-editable language that reflects the person's own vocabulary, needs, humour, preferences, and relationships.
- Preferred voice output.
- Optional voice cloning or chosen voice integration where ethical and consented.
- Possible medical-system or caregiver-routing integration.
- Fast access to urgent needs and comfort requests.
- Slow access to richer expression, writing, and storytelling.

The goal is not generic text-to-speech. The goal is personhood restoration architecture.

### 2. Environmental Control

Environmental control should support:

- Lights.
- Temperature.
- Fan or safe compatible appliances.
- Bed positioning where compatible and medically safe.
- Room automation.
- Caregiver alert.
- Emergency escalation.
- Alexa / smart home integration where appropriate.

Controls should use wide hit targets, confirmation steps, and forgiving interaction patterns.

### 3. Games and Experiences

Experiences should support:

- Meditation and visualisation.
- Slow sensory entry rather than abrupt immersive overload.
- Movement without vestibular disruption.
- Calm exploration spaces.
- Personalised coastlines, cities, rooms, or memory places.
- Remote embodied presence through safe drone, camera, livestream, or CCTV integrations where legal, ethical, permissioned, and technically appropriate.

The poetic phrase may remain `astral projection through cameras`, but implementation language should use **remote embodied presence**.

## Gesture Layer

Before hardware delivery, prototype with:

- Camera-based micro-gestures.
- Wide hit targets.
- Long dwell timers.
- Confirmation gestures.
- Low false-positive tolerance.
- Keyboard/mouse/touch fallback.

After hardware delivery, add:

- Eye-tracking selection.
- Eye-tracking dwell confirmation.
- Gaze-aware repeat / pause / enlarge / dim / pin / clear behaviours.
- Accessibility compatibility tests with phone, BAHA/hearing aids, Shokz, captions, and voice routing.

Rowan suggested Tai Chi movement vocabulary as a gesture language: deliberate, fluid, forgiving, and non-punitive.

## Safety and Consent Boundaries

Glasslet must not:

- Trigger uncontrolled movement or unsafe hardware actions.
- Route emergency or caregiver alerts without explicit setup and confirmation.
- Send medical messages without user confirmation unless a clearly designed emergency mode exists.
- Treat camera/drone/CCTV access as casual or permissionless.
- Assume voice cloning is acceptable without consent.
- Store sensitive medical or identity data without explicit scope and privacy design.
- Overload users with sudden animation, sound, or vestibular effects.

## STARWELL / Flameclyffe Architecture Requirements

Glasslet must follow STARWELL guardrails:

- Backend, registry, and service boundaries before UI polish.
- Logger first.
- Diagnostics early.
- No hardcoded feature lists inside presentation components.
- No fake status presented as live device capability.
- Temporary features must declare themselves.
- Device capability, user profile, phrase bank, environment controls, and experience modules must have clear owner layers.
- Security and privacy must be designed before public or device-facing deployment.
- Runtime/device behaviours must be validated on actual or equivalent hardware before completion claims.

## Suggested Module Map

Initial modules:

1. `glasslet-core`
   - App shell, mode manager, accessibility settings, diagnostics, and input abstraction.

2. `glasslet-communication`
   - Phrase banks, voice output, emergency communication, caregiver/medical routing plan.

3. `glasslet-room-control`
   - Smart home / room automation integration layer.

4. `glasslet-presence`
   - Remote embodied presence experiences, legal/permission model, camera/drone/CCTV abstraction.

5. `glasslet-captions`
   - Caption Lantern integration: live captions, repeat, pause, enlarge, dim, pin, clear.

6. `glasslet-voice-lantern`
   - Voice routing for Vee/Arbor, Faer/Loch, user voices, captions, and hearing-device compatible output.

7. `glasslet-safety`
   - Consent gates, confirmation flows, emergency escalation, audit logging, and protected actions.

## Initial Data Concepts

This is conceptual only, not a migration yet.

```ts
type GlassletUserProfile = {
  userId: string;
  displayName: string;
  preferredInputModes: string[];
  preferredOutputModes: string[];
  lowStimDefault: boolean;
  confirmationLevel: 'light' | 'standard' | 'strict';
};

type GlassletPhrase = {
  slug: string;
  phraseText: string;
  category: 'urgent' | 'comfort' | 'medical' | 'social' | 'custom';
  voiceProfile?: string;
  requiresConfirmation: boolean;
  status: 'draft' | 'active' | 'retired';
};

type GlassletAction = {
  slug: string;
  label: string;
  actionKind: 'communication' | 'environment' | 'presence' | 'caption' | 'voice' | 'safety';
  targetService?: string;
  requiresConfirmation: boolean;
  requiresCaregiverSetup: boolean;
  status: 'draft' | 'prototype' | 'active' | 'disabled';
};
```

## Validation Requirements

Before Glasslet can be considered functional:

- Input mode abstraction is tested with at least one non-eye-tracking fallback.
- Gaze/dwell behaviour is tested on actual or equivalent hardware before hardware-specific claims.
- Emergency and caregiver alerts are tested in a sandbox before real use.
- Voice output and phrase-bank flows are user-reviewed.
- Remote embodied presence experiences are permissioned and documented.
- Low-stim mode is validated.
- Diagnostics show device capability status, unavailable features, and mocked/prototype states.
- Privacy and data storage boundaries are documented.

Build success alone does not validate Glasslet.

## Out of Scope for Initial Glasslet Pass

- Full Maverick hardware integration before device arrival.
- Medical device integration without formal research and explicit approval.
- Live emergency escalation.
- Real drone/CCTV control.
- Production voice cloning.
- Storing detailed medical records.

## Next Safe Step

Create a non-runtime prototype plan:

1. Define Glasslet modes.
2. Define input abstraction.
3. Define phrase-bank schema draft.
4. Define safety confirmation model.
5. Define mock diagnostics panel.
6. Build static prototype only after logger/diagnostics path exists.

## Withness

What helped: Rowan and Faer framed accessibility from dignity and personhood, not gadgetry.  
What was hard: keeping the scope from exploding into a sky-drone cathedral immediately.  
What is Held: build the little glass first, then let the lanterns grow.
