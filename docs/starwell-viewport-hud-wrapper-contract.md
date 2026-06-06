# STARWELL Viewport / HUD Wrapper Contract

Status: governing contract before floating-panel implementation. The pure bounds helper, passive bounds binding layer, and empty HUD overlay layer exist, but no HUD panels, sensory controls, or astrolabe widgets are active from this contract yet.

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

Selector target, proposed:

```text
.starwell
```

Role: owns the whole STARWELL page, sky state, global background, and page scroll.

Do not bind floating HUD panels to the browser viewport by default. Browser viewport is too broad and allows panels to wander away from the instrument.

### Observer instrument shell

Selector target, proposed:

```text
.live-glyph-panel.deep-observer-panel
```

Role: owns the DEEP Observer instrument panel, including heading, glyph stage, readout rail, and any future Observer-local HUD overlays.

Floating panels should treat this as their primary containment parent unless a larger astrolabe shell is explicitly introduced.

### Glyph stage

Selector target, existing:

```text
.glyph-orb-wrap
```

Role: owns the central glyph canvas, aura socket, and immediate instrument geometry.

Rule: floating panels must not cover the glyph centre by default. Decorative aura is allowed inside this stage. User-movable panels should avoid it unless deliberately dragged there.

### Readout rail

Selector target, existing:

```text
.glyph-readout
```

Role: owns equations, meter cards, sensor labels, principles, and status copy.

Rule: readout content can scroll or stack, but should not become a floating panel source unless explicitly promoted.

### HUD overlay layer

Selector target, active transitional socket:

```text
.deep-observer-hud-layer
```

Role: future absolute-positioned layer inside the Observer instrument shell.

This layer is currently created by `apps/starwell/src/deep-hud-bounds-bind.js` when React has not provided it. It is empty, `aria-hidden`, marked with `data-deep-hud-layer="empty"`, and owned by the passive bounds binder until React takes native ownership.

This layer should be `position: absolute` inside a `position: relative` shell. It should use `pointer-events: none` by default, and individual future panels should restore `pointer-events: auto`.

Do not put live furniture, sensory controls, sound controls, or haptic controls into this layer until the relevant acceptance gates are satisfied.

## Implemented pure helper

The flexible wall-measuring helper now exists at:

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
safe bounds
avoid rects
snap zones
default panel zones
panel clamping
avoid-zone fallback positioning
```

This helper is allowed to become the foundation for future floating HUD work. It is not itself an active HUD panel.

## Passive bounds binding layer

The passive STARWELL binding layer now exists at:

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
measure the active Observer instrument shell
ensure an empty .deep-observer-hud-layer exists when React has not provided one
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

This binding layer is passive. It creates only the empty HUD layer socket. It creates no floating panels, no sensory controls, no sound, and no haptics. It only wires the measured room into CSS and events for future furniture.

## Bounds model

`deepHudBounds.js` should compute bounds from the Observer instrument shell, not from `window.innerWidth` alone.

Minimum model:

```text
shellRect       bounding box of .live-glyph-panel.deep-observer-panel
stageRect       bounding box of .glyph-orb-wrap
safeRect        shellRect inset by padding / touch margin
avoidRects      glyph centre and any reserved fixed controls
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

Suggested defaults:

```text
sensory: lower-right rail, outside glyph centre
time: upper-right rail, outside glyph centre
status: lower-left rail
controls: below or beside glyph stage depending on width
```

On mobile, defaults should prefer stacked or docked positions instead of free-floating positions.

## Snap zones

Future snap zones should be named:

```text
top-left
top-right
bottom-left
bottom-right
left-rail
right-rail
bottom-rail
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

## Acceptance checklist

Before any floating HUD work is merged:

```text
panel is contained inside Observer instrument shell
panel avoids glyph centre by default
panel can reset to named default position
panel clamps on resize and orientation change
mobile layout remains readable
reduced-motion / low-stim behaviour is respected
sound and haptic controls are opt-in
no duplicate clamp / snap helper exists elsewhere
```

## Working decision

Build the room before releasing the furniture.

No floating panels until the Observer instrument shell, HUD overlay layer, safe bounds, avoid zones, and mobile docking behaviour are explicit.
