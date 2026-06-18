# STARWELL Viewport / HUD Wrapper Contract

Status: governing contract after passive HUD infrastructure repair and React-owned empty HUD layer handoff. The pure bounds helper, shared layer contract, React-owned production-empty HUD overlay socket, passive fallback binder, and development-only diagnostic path exist. No HUD panels, sensory controls, or astrolabe widgets are active from this contract yet.

## Purpose

STARWELL needs one explicit viewport and HUD wrapper contract before floating panels, sensory controls, or astrolabe HUD pieces become active.

The goal is simple: every panel must know which room it belongs to, what walls it can touch, where it returns when reset, and when it must leave the glyph centre alone.

## Scope

This contract applies to DEEP / Observer HUD work inside STARWELL, especially:

```text
central glyph stage
readout rail
status rail
floating HUD panels
sensory controls
future astrolabe widgets
future sound / haptic controls
```

It does not replace the existing mobile pass or starburst binding work. It gives future floating HUD work a safe container.

## Required wrapper regions

### Viewport root

Selector target:

```text
.starwell
```

Role: owns the whole STARWELL page, sky state, global background, and page scroll.

Do not bind floating HUD panels to the browser viewport by default. Browser viewport is too broad and allows panels to wander away from the instrument.

### Observer instrument shell

Selector target:

```text
.live-glyph-panel.deep-observer-panel
```

Role: owns the DEEP Observer instrument panel, including heading, glyph stage, readout rail, and any future Observer-local HUD overlays.

Floating panels should treat this as their primary containment parent unless a larger astrolabe shell is explicitly introduced.

### Glyph stage

Selector target:

```text
.glyph-orb-wrap
```

Role: owns the central glyph canvas, aura socket, and immediate instrument geometry.

Rule: floating panels must not cover the glyph centre by default. Decorative aura is allowed inside this stage. User-movable panels should avoid it unless deliberately dragged there.

### Readout rail

Selector target:

```text
.glyph-readout
```

Role: owns equations, meter cards, sensor labels, principles, and status copy.

Rule: readout content can scroll or stack, but should not become a floating panel source unless explicitly promoted. The readout rail is now part of HUD avoidance geometry, so future panels should avoid it by default alongside the glyph stage.

### HUD overlay layer

Selector target:

```text
.deep-observer-hud-layer
```

Role: future absolute-positioned layer inside the Observer instrument shell.

Current state: active React-owned empty socket. `apps/starwell/src/live-glyph.js` renders the socket into the Observer shell through a React portal. In production it remains empty, `aria-hidden`, marked with `data-deep-hud-layer="empty"`, and marked with `data-deep-hud-layer-owner="react"` while it contains no HUD furniture.

Passive fallback exception: `apps/starwell/src/deep-hud-bounds-bind.js` observes the React-owned socket when present. It delays fallback creation so React can claim ownership first, then creates a fallback empty socket only when the React socket is absent. Fallback sockets are marked with `data-deep-hud-layer-owner="passive-bounds-binder"` and `data-deep-hud-layer-fallback="true"`.

Development diagnostic exception: `apps/starwell/src/deep-hud-debug-bead.js` can mount a noninteractive debug bead only in Vite development mode and only with explicit debug opt-in. While mounted, the layer marker becomes `data-deep-hud-layer="diagnostic"`; cleanup restores `empty` or `active` according to actual contents.

This layer should be `position: absolute` inside a `position: relative` shell. It should use `pointer-events: none` by default. Children stay non-interactive until the layer is explicitly active and not `aria-hidden`.

Do not put live furniture, sensory controls, sound controls, or haptic controls into this layer until the relevant acceptance gates are satisfied.

## Shared HUD layer contract

The layer vocabulary contract exists at:

```text
apps/starwell/src/lib/deepHudLayerContract.js
```

It owns:

```text
Observer panel selector
HUD layer class / selector / scoped selector
glyph stage selector
readout selector
root selector
bounds event name
update throttle timing
HUD owner names
HUD layer states
HUD data keys
```

Use this contract from the React socket wrapper and passive binder. Do not duplicate selector strings, owner names, data keys, or event names in future HUD files without an explicit contract update.

## Implemented pure helper

The flexible wall-measuring helper exists at:

```text
apps/starwell/src/lib/deepHudBounds.js
```

It is a pure helper module. It may measure DOM rectangles when given a document/root, but it must not create panels, play sound, fire haptics, own styling, or mutate React state directly.

Current responsibilities include:

```text
selector defaults
viewport classes
configurable insets
rect normalisation
panel-local shell / stage / readout resolution
safe bounds
stage and readout avoid rects
snap zones
default panel zones
ranked fallback zone candidates
de-duplicated fallback zones
collision-checked fallback positioning
panel clamping
```

This helper is allowed to become the foundation for future floating HUD work. It is not itself an active HUD panel.

## Passive bounds binding layer

The passive STARWELL binding layer exists at:

```text
apps/starwell/src/deep-hud-bounds-bind.js
apps/starwell/src/deep-hud-bounds.css
```

It is loaded from:

```text
apps/starwell/index.html
```

Current responsibilities:

```text
measure each active Observer instrument shell
scope stage/readout lookup to that shell
observe an empty React-owned .deep-observer-hud-layer when present
delay fallback creation so React can claim the socket first
create a fallback empty .deep-observer-hud-layer only when React has not provided one
publish CSS custom properties on .live-glyph-panel.deep-observer-panel
set data-deep-hud-bounds="ready"
set data-deep-hud-viewport by measured viewport class
dispatch deep-observer:hud-bounds with plain bounds data
recalculate on resize, orientation change, DOM mutation, and ResizeObserver events
```

Current CSS variables include:

```text
--deep-hud-inset
--deep-hud-safe-left
--deep-hud-safe-top
--deep-hud-safe-width
--deep-hud-safe-height
--deep-hud-stage-left
--deep-hud-stage-top
--deep-hud-stage-width
--deep-hud-stage-height
--deep-hud-readout-left
--deep-hud-readout-top
--deep-hud-readout-width
--deep-hud-readout-height
```

This binding layer is passive. It creates only the empty HUD layer fallback when React has not provided one. It creates no floating panels, no sensory controls, no sound, and no haptics. It only wires the measured room into CSS and events for future furniture.

## Bounds model

`deepHudBounds.js` computes bounds from the Observer instrument shell, not from `window.innerWidth` alone.

Minimum model:

```text
shellRect       bounding box of .live-glyph-panel.deep-observer-panel
stageRect       bounding box of .glyph-orb-wrap
readoutRect     bounding box of .glyph-readout
safeRect        shellRect inset by padding / touch margin
avoidRects      stageRect, readoutRect, and any reserved fixed controls
snapZones       named edges / corners / rails inside safeRect
```

Recommended default inset:

```text
desktop: 16px
tablet: 12px
mobile: 8px
```

Touch-safe minimum panel distance from screen edge:

```text
mobile: 8px minimum
desktop: 12px minimum
```

## Default panel positions

Floating panels should have named default positions, not arbitrary `top` / `left` values.

Current semantic defaults:

```text
sensory: bottom-right
time: top-right
status: bottom-left
controls: bottom-rail
```

On mobile and compact widths, defaults may collapse to `bottom-rail`, but fallback handling must not try the same blocked zone twice.

## Snap and fallback zones

Named snap zones:

```text
top-left
top-right
bottom-left
bottom-right
left-rail
right-rail
bottom-rail
```

Fallback selection rules:

```text
start with the semantic default zone
append explicit fallback zones
append the shared ranked fallback zone list
de-duplicate zones before positioning
test each candidate against avoidRects
return the first non-intersecting candidate
fall back to the first candidate only when every candidate intersects
```

Do not create unnamed magic coordinates. Magic coordinates become haunted furniture.

## Mobile rules

At narrow widths, mobile mode wins over draggable freedom.

Recommended behaviour:

```text
< 720px: panels should dock or stack unless explicitly expanded
< 430px: panels should prefer collapsed controls or bottom sheets
< 360px: panels should not float freely by default
```

Mobile panel rules:

```text
never cover the glyph centre by default
never cover the readout rail by default
never require precise drag to access critical controls
keep reset visible or reachable
keep sound / haptic controls opt-in and easy to disable
honour reduced-motion and low-stim modes
```

## Sensory and haptic gates

Before any sensory panel becomes active inside STARWELL, all must be true:

```text
sound never plays before user opt-in
haptics never fire if unsupported or disabled
low-stim visibly and audibly calms the interface
panel stays bounded to HUD on mobile and desktop
panel can reset to a safe default position
panel cannot cover the glyph centre by default
panel cannot cover the readout rail by default
production HUD layer ownership is explicit and QA-confirmed
```

Sensory controls should be governed by the HUD wrapper contract, not page-fixed free agents.

## Relationship to dormant static files

The static files currently shelved are:

```text
starwell/deep-observer/deep-observer-hud-bounds.js
starwell/deep-observer/deep-observer-sensory.js
```

They should be treated as prototypes or reference implementations, not directly loaded STARWELL modules.

If their logic becomes active, prefer porting pure helper logic into:

```text
apps/starwell/src/lib/deepHudBounds.js
apps/starwell/src/lib/deepSensoryBus.js
```

Keep DOM side effects out of helper modules. Keep sound and haptic behaviour behind explicit user action.

## `deepHudBounds.js` responsibilities

Allowed responsibilities:

```text
measure shell / stage / readout rectangles
calculate safe bounds
calculate avoid zones
clamp panel coordinates
return named snap zones
return default positions by viewport class
return ranked fallback candidates
verify fallback candidates against avoid rects
emit or return bounds-change data
```

Not allowed:

```text
create DOM panels
play sound
fire haptics
store unrelated UI state
own visual styling
mutate React state directly
```

## Proposed event names

If events are needed, prefer namespaced events:

```text
deep-observer:hud-bounds
deep-observer:hud-reset
deep-observer:panel-snap
deep-observer:low-stim-change
```

Events should carry plain data only. Do not pass DOM nodes in event details unless there is no alternative.

## Next ownership step

Browser-QA the PR preview before any furniture is added. Confirm exactly one direct `.deep-observer-hud-layer` exists inside the Observer shell in the normal production path, with React owner, empty state, `aria-hidden`, zero children, and no fallback marker. Future furniture should consume measured bounds from the passive layer rather than creating a second socket.
