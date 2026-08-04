# Bending Light Paths Compatibility v0.1

This note records the STARWELL / DEEP Observer plan for adapting organic bending-line techniques into a browser-compatible production layer.

## Source credit

Inspiration / reference demo provided by Rowan:

- CodePen URL: https://codepen.io/t_afif/pen/yyVPKzb
- CodePen user path: `t_afif`
- Related concept link: https://css-tip.com/bending-line/

Credit note: this record credits the CodePen user path `t_afif` because the URL provided by Rowan identifies that user. Vee could not fetch the live CodePen contents directly from the current environment during this session, so this document does **not** claim to have inspected, copied, or verified the Pen internals. The Pen is treated as a technique reference / inspiration source, not as production code to paste blindly.

## Compatibility warning

Rowan observed that the CodePen appears to be Chrome-only.

STARWELL must therefore **not** rely on the Pen’s exact implementation as a hard dependency. The technique should be adapted through feature detection and progressive enhancement so the instrument still runs in:

- Chrome / Chromium
- Safari / Mobile Safari
- Firefox
- Edge
- Opera
- Android browsers
- embedded in-app browsers when feasible

If a browser cannot support the fanciest bending-line implementation, the instrument must fall back to a simpler curved connector without breaking the page.

## Purpose inside STARWELL

Bending Light Paths are not decoration only. They are visual explanations.

They show how a direct reading travels into the model:

```text
input jewel → bending light path → affected instrument layer / hologram / panel
```

The user should be able to see cause-and-effect:

- Time jewel emits two paths into the dual-time hologram.
- Moon jewel bends a path toward harmonic rings.
- Kp jewel bends a path toward particle field activity.
- Bz jewel bends a path around the horizon / palette wash.
- Source and Local bend provenance threads toward packet readout.
- Motion and Touch bend paths toward interface response state.

## Production rule

The production rule is:

```text
Use the idea, credit the source, and implement browser-safe equivalents.
```

Do not copy Chrome-only demo behaviour into STARWELL without fallbacks.

## Preferred implementation ladder

Use this compatibility ladder from most supported to most experimental.

### Tier 1: SVG path fallback

Use an inline SVG overlay with `<path>` connectors.

- Works broadly across major browsers.
- Easy to animate with `stroke-dasharray` and `stroke-dashoffset`.
- Easy to update when draggable panels move.
- Good for Time → dual-time hologram tethers.

This should be the baseline implementation.

### Tier 2: Canvas connector fallback

Use canvas drawing for dynamic curves when SVG layout becomes expensive.

- Good for many live particle / pulse paths.
- Already compatible with the DEEP Observer glyph canvas.
- Good for low-level glow and pulse effects.

This can be used when paths belong inside the instrument itself.

### Tier 3: CSS custom-property bending / advanced masks

Use CSS variables, gradients, masks, or newer CSS shape tricks as a progressive enhancement only.

- Useful for elegant organic panels and edge ribbons.
- Must be gated by `CSS.supports()` checks.
- Must fall back to SVG/canvas paths in Safari/Firefox/older browsers if unsupported.

This tier may borrow the spirit of the CodePen / CSS Tip technique, but must not be the only rendering path.

## Browser feature checks

The compatibility guard should test at least:

```js
const supports = {
  svg: !!document.createElementNS,
  cssSupports: !!(window.CSS && CSS.supports),
  maskImage: CSS.supports('mask-image', 'linear-gradient(#000,#000)') || CSS.supports('-webkit-mask-image', 'linear-gradient(#000,#000)'),
  offsetPath: CSS.supports('offset-path', 'path("M0,0 L1,1")'),
  backdropFilter: CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
  pointerEvents: 'PointerEvent' in window
};
```

If feature checks fail, the visual system should downgrade gracefully.

## Dual-time hologram use case

The first production use case should be the dual-time hologram.

When the Time jewel is selected:

1. The dual-time glass panel appears.
2. A bending light path connects Time → Waking World Time.
3. A second bending light path connects Time → Terra Aeterna Local Time.
4. If the hologram is dragged, both paths update live.
5. If the hologram snaps to a corner, the paths settle with a soft glow and a tactile glass-set sound.
6. If the hologram is minimised, paths collapse into a small rune-chip.
7. If the hologram is pinned, paths remain active while other readings are inspected.

## Sensory integration

Bending paths should be tied to the Sensory Engine.

Suggested sound / haptic mappings:

| Event | Visual | Sound | Haptic |
|---|---|---|---|
| Path begins | Light trace leaves jewel | soft gem-click | tiny tap |
| Dragging panel | Path stretches / bends | soft glass-on-glass scrape | none or very light |
| Snap to corner | Path settles | quiet glass-set chime | two small ticks |
| Minimise | Path collapses into rune-chip | soft bloom-down shimmer | one small tick |
| Pin | Path brightens and holds | tiny lock chime | one small tick |

Sound must remain optional and local to the browser.

## Accessibility rule

Bending lines must never be the only way information is conveyed.

Each path must also have readable teaching text:

```text
Time → Waking World clock + Terra Aeterna realm clock
```

Low Stim mode should keep the path visible but reduce animation, shimmer, and movement audio.

## Anti-beige rule

The fallback should still look intentional.

A fallback is not allowed to become sterile beige soup. If advanced bending CSS is unavailable, use:

- simple SVG curves,
- soft glow,
- readable labels,
- reduced motion,
- and stable glass-panel positioning.

The instrument may simplify, but it should not visually collapse.

## Canon sentence

```text
Bending Light Paths are browser-safe visual explanations: curved signal strands that show how a direct reading travels into the STARWELL model, credited to the CodePen/CSS technique reference but implemented through progressive enhancement and fallbacks.
```

## Status

- Credit recorded: yes.
- Supabase log requested: yes.
- Production implementation: pending.
- First target: draggable frosted-glass dual-time hologram with snap/minimise/pin controls and Time bending tethers.
