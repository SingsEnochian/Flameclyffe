# Consent Web Prototype

Standalone DEEP prototype for explicit sensory consent controls.

Open `consent-web.html` beside `consent-web.css` and `consent-web.js` to review the prototype.

## Purpose

This prototype turns sensory permissions into visible branches around the DEEP core.

It does not activate camera, microphone, haptics, audio, or gaze systems. It is a visual and interaction prototype only.

## Consent principle

A sensory branch may be visible without being active.

Disabled does not mean erased. It means present, named, and waiting for permission.

## Branches

- visual bloom
- sound
- sub-bass
- haptics
- camera
- gaze
- location
- export/logging

Each branch has a toggle and a visible state.

## States

- off: visible but inactive
- on: consent granted
- blocked: unavailable or deliberately blocked
- activity: a temporary pulse that only occurs on enabled branches

## Implementation notes

- JavaScript owns branch state and controls.
- CSS owns branch expression.
- No real sensor API is called.
- Motion is guarded by `prefers-reduced-motion`.
- Controls are real buttons with `aria-pressed` and live status text.

## Future bridge

A production version should become contained modules such as:

- DeepConsentWeb
- ConsentBranch
- ConsentBranchControls
- deepConsentState
- useConsentGate
