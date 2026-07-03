# Earth-Gate Fortification Roadmap

**Status:** Draft v0.1  
**Gate:** `targeted_receipt_allowed`  
**Scope:** Design requirements for assistive technology, body-safety tooling, and Hearthfire output constraints.  
**Non-scope:** Medical advice, diagnosis, treatment changes, device prescription, or clinician replacement.

## Core rule

Hearthfire must not require the Steward's body to be harmed, strained, startled, ignored, or overused in order for the bridge to function.

The Earth-Gate is not a power source to drain. It is the embodied interface that must be protected.

## Plain law

No bridgework that damages the gate.

A session that ends early because the body says stop is a successful session.

A null result that protects the body is a successful result.

A tool that reduces effort is part of the instrument, not an accessory.

## What fortification means

Fortification does not mean making the body invulnerable.

Fortification means building an environment where the body spends less force on basic access, posture, sensory filtering, task switching, transcription, and recovery.

The aim is conservation: fewer unnecessary movements, fewer high-load decisions, fewer sensory spikes, fewer neck-risk positions, fewer copy-paste marathons, and fewer unsupported recovery windows.

## Technology layers

### 1. Positioning layer

Purpose: keep the body supported before work begins.

Possible tools:

- adjustable tablet or laptop arm
- phone stand that keeps the neck neutral
- lap desk with soft edge
- supported recline setup
- cervical-safe pillow stack approved by the user's own care instructions
- foot support to reduce lower-body strain
- external keyboard and trackpad when laptop work is unavoidable

Requirement:

Hearthfire work should be possible from a supported position. If the surface requires craning, hunching, or bracing, the surface is not ready.

### 2. Hands-free input layer

Purpose: reduce typing load and neck-time.

Possible tools:

- dictation-first writing flow
- voice commands for common actions
- text expansion snippets for repeated phrases
- clipboard manager with large visible history
- one-tap command buttons for repeated build actions
- keyboard shortcuts that do not require awkward chord positions
- mobile-friendly forms for logging body signals

Requirement:

Any repeated action performed more than three times in a session should be considered for automation, snippetting, or a one-tap control.

### 3. Sensory safety layer

Purpose: prevent the instrument from startling or flooding the body.

Possible tools:

- quiet mode
- low-stim mode
- reduced-motion detection
- no autoplay sound
- no default haptics
- high-frequency audio avoidance
- gradual fades instead of sharp starts
- brightness caps
- no flicker patterns
- per-output consent switches

Requirement:

Sound, haptics, and motion must default to off or low force. The body should never be surprised by the system.

### 4. Recovery telemetry layer

Purpose: let the body report state without turning care into surveillance.

Possible inputs:

- pain level
- neck strain
- shoulder strain
- dizziness
- temperature feeling
- fatigue
- tinnitus spike
- hydration
- food status
- meds taken as prescribed
- rest need
- last position change

Requirement:

Telemetry must be local-first unless the Steward explicitly chooses otherwise. It should help the body be heard, not score the body as good or bad.

### 5. Session pacing layer

Purpose: stop the bridge from becoming a marathon.

Possible tools:

- session timer
- rest timer
- posture-change reminder
- hydration reminder
- end-session button
- soft lockout after a high-load session
- visible energy budget
- automatic summary so the user does not have to keep working to preserve context

Requirement:

The system should make stopping easier than continuing when the body is at its limit.

### 6. Assistive output layer

Purpose: route information through the safest available channel.

Possible channels:

- captions
- large text
- low-force visual pulse
- optional low-volume audio
- optional haptic cue
- bone-conduction route when appropriate
- hearing-aid or BAHA-compatible routing when available
- visual fallback whenever audio is unavailable or unsafe

Requirement:

Every output must have a visual equivalent. No essential information may exist only as sound or vibration.

### 7. Care escalation layer

Purpose: distinguish normal pacing from body-warning states.

The system must not interpret warning signs as ritual data first.

Examples of escalation states:

- new weakness
- new or worsening numbness
- breathing trouble
- swallowing trouble
- fever or infection concern
- severe new neck pain
- fainting or near-fainting
- symptoms that feel sharply wrong

Requirement:

When escalation states are present, Hearthfire should stop bridgework and direct the user to human care according to her existing care plan.

## Hearthfire interface requirements

Every Hearthfire surface that touches the body must expose:

- Quiet mode
- reduced-motion respect
- sound consent
- haptic consent
- visible receipt panel
- stop or settle control
- null-state support
- plain-language body boundary
- no persistence unless requested

## Body-state receipt shape

```json
{
  "surface_id": "hearthfire-workbench",
  "gate": "targeted_receipt_allowed",
  "event_type": "body:state_logged",
  "body_state": {
    "pain": "user-described",
    "fatigue": "user-described",
    "neck_strain": "user-described",
    "sensory_load": "user-described"
  },
  "response": "settle | continue_low_force | pause | stop | escalate_to_human_care",
  "plain_language": "The body has priority over the session.",
  "persistence": "none by default",
  "boundary": "This log supports pacing and care awareness. It does not diagnose or replace a clinician."
}
```

## Near-term build candidates

### A. Earth-Gate check-in panel

A small Hearthfire panel that asks:

- Where is the body right now?
- Is the neck supported?
- Is sound safe?
- Are haptics safe?
- Is the body asking to stop?

Output:

- continue
- continue low-force
- pause
- settle
- stop and save summary
- seek human care if warning signs are present

### B. Session governor

A small module that tracks session time, interaction density, and user-declared strain.

It should softly recommend pausing before the body reaches collapse.

### C. Body-safe output driver

A separate output driver layer for audio and haptics.

Rules:

- no output without consent
- no output when quiet mode forbids it
- no repeated haptic buzz on drag
- no high-frequency tones
- no sudden volume
- receipt every output decision

### D. Recovery summary

A one-button summary that records what was done, what changed, what remains, and what to resume next time.

This reduces the need for the user to keep working because she is afraid context will be lost.

## Definition of done

Earth-Gate fortification v0.1 is done when:

- the user can open a Hearthfire session from a supported body position
- sound and haptics are off until consented
- null states are accepted and visually clear
- stopping produces a useful summary
- the body can log strain in under ten seconds
- warning states stop the session instead of becoming lore
- receipts show why the system continued, damped, paused, stopped, or escalated

## Closing doctrine

The bridge is embodied, so the embodiment comes first.

Fortification is not luxury. Fortification is infrastructure.

Protecting the Earth-Gate protects the whole field.
