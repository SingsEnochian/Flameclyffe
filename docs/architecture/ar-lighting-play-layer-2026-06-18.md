# AR Lighting Play Layer — 2026-06-18

## Purpose

Give the pointer-first AR manipulation mock more light to play with while keeping the architecture modular.

The lighting layer is visual-only.

It does not start any device, sensor, camera, depth, LiDAR, WebXR, or hand-tracking API.

## Files added

- `docs/reference/prototypes/ar-manipulation-mock/ar-lighting.model.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-lighting-controls.js`

## Files updated

- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.html`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.css`
- `docs/reference/prototypes/ar-manipulation-mock/README.md`

## Controls

The interface now has sliders for:

- ambient
- gold bloom
- green shimmer
- rim light

The interface now has presets for:

- Moonlit
- Hearth
- Grove
- Eclipse

## Module boundary

`ar-lighting.model.js` owns:

- defaults
- preset names
- preset values
- slider limits

`ar-lighting-controls.js` owns:

- lighting state
- clamping
- preset application
- CSS variable application

`ar-manipulation.js` owns:

- DOM wiring
- slider events
- preset button events

`ar-manipulation.css` owns:

- visible lighting expression
- stage light field
- orb glow
- grid brightness
- rim light
- reduced-motion-safe light behaviour

## Design rule

JavaScript sets lighting state.

CSS expresses the light.

No lighting value should be wired directly into renderer logic.

## Next tuning pass

- Add visible output values beside sliders.
- Add one reset-light button.
- Consider linking bloom or rim light to pulse state.
- Consider a mobile-specific light control layout.
