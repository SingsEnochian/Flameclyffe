# DEEP Prototype Hardening Scaffold

Date: 2026-06-29

Scope: recent DEEP, AR Manipulation Mock, Observer v0.2, Branch Loom, Signal Garden, and Consent Web prototype files.

## Landed scaffold

- Added `docs/reference/prototypes/shared/deep-consent-state.js`.
- The shared module provides a small in-page consent registry with `makeConsentState`, `getConsentState`, `setConsentState`, `setConsentBranchState`, `hasConsent`, `requireConsent`, and `subscribeConsentState`.
- It is intentionally dependency-free and safe for standalone static prototypes.

## Direct follow-up patch targets

### 1. Consent Web defaults

Set these defaults in `docs/reference/prototypes/consent-web/consent-web.model.js`:

- `visual`: `off`
- `logging`: `off`

Keep blocked branches blocked. This preserves the rule that every capability-like branch begins inactive until invited.

### 2. Consent Web state publishing

In `consent-web.js`, import the shared consent state module and publish the current branch map whenever a branch toggles.

Recommended flow:

1. Build a fallback consent state from `CONSENT_BRANCHES`.
2. Read shared state on load.
3. Force default-blocked branches to remain blocked.
4. Write the branch map after toggle and all-off actions.
5. Subscribe to consent events so other embedded prototype panels can mirror state.

### 3. AR consent gates

In `ar-manipulation.js`, gate all object manipulation paths behind the shared `gesture` branch:

- pointer drag start
- pointer drag move while active
- keyboard manipulation
- axis buttons
- rotate / scale / anchor / pulse / dismiss / reset
- synthetic gesture buttons

Gate audio behind the shared `sound` branch:

- enable sound should set `sound` to `on`
- mute should set `sound` to `off`
- sound pads and sound patterns should call `requireConsent('sound')` before playing

Add local AR buttons for `Enable Gesture Controls` and `Lock Gesture Controls` so the standalone mock still has an explicit invitation path without requiring the Consent Web page to be open.

### 4. Data-action wiring

Replace selector-heavy AR button wiring with a command map:

- add `data-action` to each AR control button
- add `data-consent-required="gesture"` or `data-consent-required="sound"` where appropriate
- bind all buttons through one action map
- keep a `requireElement()` helper for critical stage/status nodes

### 5. Reduced-motion JS behaviour

CSS already guards animation duration. JS should also guard temporary motion cues:

- Branch Loom `breathe()` should use a static fallback
- Observer `breathe()` should use a static fallback
- Signal Garden should not schedule auto-settle timers when the user requests less motion
- Consent Web should list enabled branches without temporary pulse activity under less-motion preferences
- AR object pulse should settle immediately/static under less-motion preferences
- AR sound patterns should collapse to a single cue instead of delayed multi-cue patterns when paired sensory sequencing is too much input

### 6. SVG accessibility

For generated SVG branch and node groups, add generated `title` and `desc` children and connect them with `aria-labelledby`.

Apply to:

- Observer metric branches and nodes
- Branch Loom branch groups and nodes
- Signal Garden branches and nodes
- Consent Web branches and nodes

### 7. DOM builder cleanup

Replace trusted-but-brittle `innerHTML` rendering with DOM construction in:

- Branch Loom readout
- Observer metric pills
- Consent Web toggle buttons

This keeps future user-authored or imported labels from turning into tiny glass-toothed gremlins.

## Notes

The shared consent module is the first safe landing stone. The next commit should wire it into the current prototype files once direct file replacement is available in the working environment.
