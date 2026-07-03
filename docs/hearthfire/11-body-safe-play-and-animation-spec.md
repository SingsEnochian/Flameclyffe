# Body-Safe Play and Animation Spec

**Status:** Draft v0.1  
**Gate:** `targeted_receipt_allowed`  
**Scope:** Play presets, animation presets, consent-gated body outputs, and receipt requirements for Hearthfire workbench surfaces.  
**Non-scope:** Broad UI overhaul, database writes, autoplay sound, default haptics, hidden persistence, or animation without declared meaning.

## Core rule

Hearthfire is allowed to be beautiful, playful, and strange.

It is not allowed to startle, flood, coerce, or overrule the body.

Play is permitted when it is meaningful, consentful, dampable, and receipt-backed.

## Plain law

Fun gets safety rails.

Animation must mean something.

The body gets veto power.

## What play means here

Play is not decoration by default.

A play action is a small deliberate surface event that helps the user test, feel, or understand a state without pretending that the state is more certain than it is.

Each play action must declare:

- what triggered it
- what state it represents
- which output channels it requests
- which consent gates apply
- what should happen in quiet mode
- what should happen with reduced motion
- what receipt should say

## Required workbench buttons

### Glow pulse

Purpose: visual-only confirmation that the field is responsive.

Default channel:

- visual

Meaning:

- the surface received a deliberate user play action
- no data claim is made

Reduced motion:

- replace pulse travel with a soft static glow

Quiet mode:

- lower brightness and shorten duration

Receipt language:

> Glow pulse requested. Visual response emitted. No data claim was made.

### Leyline sweep

Purpose: show a slow travelling route through the field.

Default channel:

- visual

Meaning:

- a path was drawn for orientation and play
- it does not imply fate, certainty, or instruction

Reduced motion:

- replace sweep with two softly lit endpoint nodes

Quiet mode:

- reduce brightness, speed, and visual spread

Receipt language:

> Leyline sweep requested. The path is an interface cue, not a claim about destiny or certainty.

### Null bloom

Purpose: make `pattern:absent` feel valid instead of broken.

Default channel:

- visual

Meaning:

- nothing clear is here yet
- absence is being held as a valid result

Reduced motion:

- use a still candle-glow state

Quiet mode:

- use the same still candle-glow with lower brightness

Receipt language:

> Null bloom requested. Nothing clear is here yet. Quiet is a valid result.

### Settle wave

Purpose: return the field to centre.

Default channel:

- visual
- optional spatial plan

Meaning:

- the surface is intentionally lowering force
- the session may pause or end

Reduced motion:

- replace wave with a slow fade to centre

Quiet mode:

- shorten and soften all motion

Receipt language:

> Settle wave requested. The field is returning to centre.

### Tiny dragon receipt stamp

Purpose: celebrate that a receipt landed.

Default channel:

- visual

Meaning:

- receipt emitted
- audit trail exists

Reduced motion:

- show a static small dragon mark or badge

Quiet mode:

- lower contrast and avoid bounce

Receipt language:

> Dragon stamp requested. A receipt exists for this action.

### Test soft tone

Purpose: test the audio driver after explicit sound consent.

Default channel:

- audio
- visual fallback

Consent:

- sound must be enabled

Audio constraints:

- low volume
- no sudden attack
- no high-frequency tone
- short duration
- visual fallback always present

Quiet mode:

- block audio unless the user explicitly re-enables sound after quiet mode

Receipt language:

> Soft tone requested. Audio emitted only if sound consent was active.

### Test gentle tap

Purpose: test the haptic driver after explicit haptic consent.

Default channel:

- haptic
- visual fallback

Consent:

- haptics must be enabled

Haptic constraints:

- one short pattern only
- no drag repetition
- no continuous buzz
- no escalation by repeated click
- visual fallback always present

Quiet mode:

- block haptics unless the user explicitly re-enables haptics after quiet mode

Receipt language:

> Gentle tap requested. Haptic output emitted only if haptic consent was active.

## Animation preset requirements

Every animation preset must provide:

- `id`
- `label`
- `meaning`
- `channels`
- `default_duration_ms`
- `intensity`
- `motion`
- `quiet_variant`
- `reduced_motion_variant`
- `receipt_language`
- `boundary`

## Play preset requirements

Every play preset must provide:

- `id`
- `label`
- `result_state`
- `source_event`
- `effects`
- `consent_required`
- `accessibility_behaviour`
- `plain_language`
- `boundary`

## Safety constraints

A body-safe play action must not:

- autoplay
- use haptics without explicit haptic consent
- use sound without explicit sound consent
- use sudden high-volume sound
- use high-frequency tones
- flicker rapidly
- strobe
- vibrate repeatedly during pointer drag
- imply fate, prophecy, command, diagnosis, or proof
- persist data unless export is explicitly enabled
- hide blocked outputs from the receipt log

## Quiet mode behaviour

Quiet mode lowers force across all channels.

In quiet mode:

- visual intensity is reduced
- travel motion becomes slower or static
- audio requests are blocked by default
- haptic requests are blocked by default
- receipts must say which effects were damped or blocked

## Reduced-motion behaviour

Reduced motion does not make the surface dead.

It changes motion into other cues:

- travel becomes static endpoint glow
- sweep becomes still path highlight
- bloom becomes steady candlelight
- stamp becomes a static badge
- wave becomes a slow fade

## Receipt requirements

Every play action must emit a receipt with:

- play preset id
- source event
- result state
- requested channels
- emitted channels
- blocked channels
- consent state
- accessibility state
- quiet state
- reduced-motion state
- plain-language meaning
- boundary statement
- persistence state

## Definition of done

Body-Safe Play Layer v0.1 is done when:

- the workbench exposes all required play buttons
- visual play works by default in low-force form
- sound test is blocked until sound consent is enabled
- haptic test is blocked until haptic consent is enabled
- quiet mode dampens or blocks body outputs
- reduced motion replaces travel with static cues
- every play action emits at least one receipt
- null bloom makes absence feel intentional, not broken
- no persistence or database writes occur
- manual smoke test confirms no autoplay, no default haptics, and no repeated drag buzz

## Closing doctrine

Play is part of the bridge.

Wonder is allowed.

The body keeps the keys.
