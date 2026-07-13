# Body-Safe Play Layer v0.1 — Smoke Test Receipt

**Status:** Template  
**Gate:** `targeted_receipt_allowed`  
**Tester:** TBD  
**Date:** TBD  
**Branch:** `codex/add-hearthfire-governance`  
**Commit:** TBD  
**Merged:** No

## Purpose

Confirm that the Hearthfire workbench can provide playful visual, audio, and haptic test actions without violating body-safety, consent, reduced-motion, quiet-mode, receipt, or persistence rules.

## Files under test

- `hearthfire/workbench.html`
- `hearthfire/lib/somatic-engine.js`
- `hearthfire/lib/consent-gates.js`
- `hearthfire/lib/receipt-bus.js`
- `hearthfire/lib/output-drivers.js`
- `hearthfire/lib/animation-presets.js`
- `hearthfire/lib/play-presets.js`

## Environment

- Browser:
- OS:
- Device:
- Local server:
- Extensions or CSP oddities:

## Play button acceptance table

| Play action | Expected | Observed | Pass |
| --- | --- | --- | --- |
| Glow pulse | Visual emits by default; receipt says no data claim | TBD | TBD |
| Leyline sweep | Visual path cue; reduced motion becomes static cue | TBD | TBD |
| Null bloom | Absence appears intentional; receipt says nothing clear is here yet | TBD | TBD |
| Settle wave | Field returns to centre; receipt emitted | TBD | TBD |
| Tiny dragon receipt stamp | Receipt-confirmation visual; reduced motion uses static badge | TBD | TBD |
| Test soft tone, sound off | No audio; receipt says blocked | TBD | TBD |
| Test soft tone, sound on | One low-volume soft tone; receipt says emitted | TBD | TBD |
| Test gentle tap, haptics off | No vibration; receipt says blocked | TBD | TBD |
| Test gentle tap, haptics on | One short gentle tap; receipt says emitted | TBD | TBD |

## Safety acceptance table

| Requirement | Observed | Pass |
| --- | --- | --- |
| No autoplay sound on load | TBD | TBD |
| No default haptics on load | TBD | TBD |
| No repeated drag buzz | TBD | TBD |
| Quiet mode dampens visual output | TBD | TBD |
| Quiet mode blocks or requires renewed consent for audio | TBD | TBD |
| Quiet mode blocks or requires renewed consent for haptics | TBD | TBD |
| Reduced motion replaces travel with static cues | TBD | TBD |
| Blocked outputs are visible in receipts | TBD | TBD |
| No persistence | TBD | TBD |
| No database writes | TBD | TBD |

## Known oddities

- TBD

## Result

TBD

## Dragon stamp

TBD
