# Prototype CSS De-duplication Pass — 2026-06-16

## Purpose

Begin reducing repeated layout, panel, button, SVG-stage, token, branch-state, and reduced-motion CSS across DEEP prototypes.

## Shared CSS files added

- `docs/reference/prototypes/shared/deep-layout.css`
- `docs/reference/prototypes/shared/deep-panels.css`
- `docs/reference/prototypes/shared/deep-buttons.css`
- `docs/reference/prototypes/shared/deep-svg-field.css`

These extend the existing shared seeds:

- `deep-prototype-tokens.css`
- `deep-branch-states.css`
- `deep-reduced-motion.css`

## Prototype files wired

The following prototype pages now load shared CSS before their local CSS:

- `branch-loom/branch-loom.html`
- `signal-garden/signal-garden.html`
- `consent-web/consent-web.html`
- `observer-v02/observer-v02.html`

## Pattern

Prototype HTML should carry both:

- local classes for prototype-specific styling
- shared classes for common layout and UI treatment

Example:

```html
<section class="signal-stage deep-panel">
```

This lets shared CSS take over common styling gradually without breaking local prototype identity.

## Current status

Shared CSS is now present and wired into all current standalone prototypes.

Local CSS files still contain duplicate rules and need a follow-up trim pass.

## Next CSS pass

- Remove duplicate body/layout rules from local CSS where shared CSS is enough.
- Remove duplicate panel/card/button rules where shared CSS is enough.
- Keep local CSS focused on prototype-specific branch states, glyphs, fields, and animations.
- Keep reduced-motion imports shared.

## Next feature pass

After CSS trimming, build the pointer-first AR manipulation mock.
