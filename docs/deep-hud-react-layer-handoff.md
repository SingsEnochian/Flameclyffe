# DEEP HUD React Layer Handoff

Status: implementation addendum for PR #11. Created 2026-06-18.

This note records the completed React-owned empty HUD layer handoff for STARWELL / DEEP. It exists because the pull-request body could not be updated through the connector, and the Thread Ledger needs this current state preserved in-repo.

## Current state

The production HUD overlay socket is now React-owned and empty by default.

```text
apps/starwell/src/live-glyph.js
```

The React entry wraps the existing `live-glyph.jsx` viewer and renders a portal into `.live-glyph-panel.deep-observer-panel`. The portal creates one direct `.deep-observer-hud-layer` only when no direct layer already exists.

Expected production socket markers:

```text
class="deep-observer-hud-layer"
data-deep-hud-layer="empty"
data-deep-hud-layer-owner="react"
aria-hidden="true"
childElementCount === 0
```

## Shared contract

HUD layer vocabulary now lives in:

```text
apps/starwell/src/lib/deepHudLayerContract.js
```

The contract owns the panel selector, layer class/selector, scoped layer selector, glyph stage selector, readout selector, root selector, bounds event name, throttle timing, owner names, layer states, and data keys.

Do not re-create private copies of these constants in future HUD files.

## Passive binder role

The passive binder remains active:

```text
apps/starwell/src/deep-hud-bounds-bind.js
```

Its role is observer/fallback only:

```text
measure each Observer shell
publish --deep-hud-* CSS variables
dispatch deep-observer:hud-bounds
observe the React-owned socket when present
delay fallback creation so React can claim ownership first
create a fallback empty socket only when the React socket is absent
```

Fallback sockets must be marked:

```text
data-deep-hud-layer-owner="passive-bounds-binder"
data-deep-hud-layer-fallback="true"
```

## CSS gate

The passive CSS socket remains inert:

```text
apps/starwell/src/deep-hud-bounds.css
```

Children stay non-interactive by default. Children may receive pointer events only when the layer is explicitly active and not `aria-hidden`.

## Regression coverage

The handoff has focused Node-test coverage in:

```text
apps/starwell/test/deepHudLayerContract.test.js
```

The test checks:

```text
shared owner/state/data-key vocabulary
React entry uses the shared contract
React socket remains empty and hidden
binder uses the shared contract instead of private selector constants
passive CSS keeps children non-interactive until explicit active state
```

## Scope boundaries

This handoff introduces no visible HUD furniture, no sensory controls, no sound, no haptics, no draggable panels, no bridge polling changes, and no mobile layout changes.

## Browser QA gate

Before adding any HUD furniture, confirm the normal production path has exactly one direct `.deep-observer-hud-layer` inside the Observer shell, with React owner, empty state, `aria-hidden`, zero children, and no fallback marker.

Then test mobile, tablet, laptop, and wide widths to confirm safe rects and readout avoidance still behave.
