# UI Boundary Contract

Status: required before further DEEP/Observer visual expansion.

The current DEEP/Observer interface has grown faster than its layout contract. This document defines the containment rules before more floating panels, glyph controls, sacred geometry, sound widgets, or responsive elements are added.

## Core rule

Every visual element must belong to a named region.

No element may float freely across the page unless it is assigned to a layer, container, breakpoint rule, and overflow behaviour.

## Required regions

### Root shell

Owns the full viewport or page width. It should set the global background, base padding, and top-level scroll behaviour.

### Instrument stage

Owns the central glyph or instrument. It should define a stable aspect ratio, maximum width, minimum width, and clipping boundary.

The glyph must stay inside the instrument stage.

### Readout rail

Owns direct readings, source notes, watch-state cards, and translation notes. It may sit beside the glyph on wide screens and stack below it on smaller screens.

### Control rail

Owns toggles, buttons, pulse/field/geometry/horizon/moon controls, low-stim mode, and toy-on/off states.

### Status rail

Owns compatibility labels, instrument mode labels, timestamps, API status, stale/local/error states, and claim labels.

## Breakpoints

Define explicit behaviour for at least these widths:

```text
mobile:      < 640px
tablet:      640px to 899px
laptop:      900px to 1199px
wide:        >= 1200px
```

At mobile width, panels should stack and scroll. The glyph should not be overlapped by floating cards.

At laptop and wide widths, side panels may dock beside the instrument stage, but they must not invade the glyph boundary.

## Layering rules

Use named z-index bands:

```text
0  background fields
1  instrument geometry
2  glyph labels and direct instrument controls
3  docked panels
4  sticky headers or bottom bars
5  modal/dialog overlays
```

Avoid arbitrary z-index values. Arbitrary layers become invisible soup.

## Overflow rules

Every panel must choose one:

```text
overflow: visible only inside decorative/internal glyph geometry
overflow: hidden for clipped instrument wells
overflow: auto for text-heavy cards and rails
```

Do not allow text cards to spill over the glyph stage.

## Responsiveness rules

Use `clamp()` for large titles, glyph sizes, and spacing.

Use CSS grid or flex layouts for regions. Avoid fragile absolute positioning for content cards unless the element is decorative or anchored to the instrument stage.

Any absolute-positioned element must define:

```text
parent container
anchor point
max width
collision behaviour
mobile fallback
```

## Visual QA checklist

Before merging a DEEP/Observer visual pass, capture or test at:

```text
390px mobile
768px tablet
1024px laptop
1440px wide
```

Check:

```text
glyph remains centered or intentionally docked
text remains readable
cards do not overlap the glyph
buttons remain tappable
status labels remain visible
scroll behaviour is predictable
low-stim mode still works
```

## Development boundary

Do not add new visual density to DEEP/Observer until the current layout obeys this contract. The next UI pass should be containment first, ornament second.

The glyph may be alive. The room still needs walls.
