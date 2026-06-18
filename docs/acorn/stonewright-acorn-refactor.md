# Stonewright Acorn Refactor

`docs/index.html` currently works as a living interface proof, but it is still a blob: markup, styles, navigation data, wave constants, locality anchoring, and canvas drawing live together in one document.

The next evolution is to make it an acorn.

## Goal

Turn the public Flameclyffe docs page into a seed-driven surface:

```text
site seed -> renderer -> field modules -> page
```

The seed holds identity, hero content, navigation, wave constants, anchor options, accessibility requirements, and refactor targets. The renderer grows the interface from that seed.

## First acorn

`docs/acorn/flameclyffe-site-seed.json`

This file extracts the useful structure from the current docs page:

- Stonewood hero identity
- wave field axes and tones
- DEEP state values
- display CSS variables
- consent-first anchor modes
- fictional anchor places
- navigation groups and cards
- accessibility requirements

## Why this matters

A blob can be beautiful, but it is hard to graft.

An acorn can be planted in many places:

- GitHub Pages
- Stonewright Grove renderer
- future React layer
- Notion/wiki front matter
- local preview tools
- documentation generator

## Keep from the current page

- STARWELL / Stonewood landing identity
- wave field readouts
- phasor orb
- holographic cards
- consent-first anchor modal
- fictional place picker
- reduced-motion handling
- Pages workflow cleanup

## Change before it grows further

- Move NAV data into the seed.
- Move wave constants into the seed or a `waveFieldConfig` module.
- Move CSS into a dedicated file.
- Move JS into renderer modules.
- Keep geolocation behind explicit click only.
- Prefer fictional place anchoring first.
- Coarsen any real location data before it touches display logic.
- Keep canvas draw loops isolated and reduced-motion aware.
- Prevent `docs/index.html` from becoming the permanent throne-beast.

## Proposed modules

### flameclyffe-site-seed.json

The data acorn.

### flameclyffe-site.css

Presentation tokens and layout rules.

### flameclyffe-site-renderer.js

Reads the seed and builds the page shell, nav cards, hero, and modal.

### wave-field.js

Owns Kuramoto-style phase helpers, canvas field draw loop, phasor orb, and CSS variable generation.

### anchor-modal.js

Owns consent UI, fictional place selection, optional coarse real-location path, and clear-anchor behaviour.

### holo-cards.js

Owns card tilt and shine behaviours, disabled under reduced motion.

## Migration order

1. Add the seed. Done.
2. Add this refactor plan. Done.
3. Create a non-invasive renderer prototype beside the current page.
4. Rebuild the nav from seed data.
5. Rebuild the hero from seed data.
6. Move wave helpers into `wave-field.js`.
7. Move anchor modal into `anchor-modal.js`.
8. Replace `docs/index.html` internals with a small loader once parity is proven.

## Definition of done

`docs/index.html` should eventually contain only:

- document shell
- root mount element
- stylesheet links
- script module links
- noscript fallback

The living field should still feel alive, but its source should be seed-driven and modular.

## Guardrails

No hidden telemetry.

No automatic location request.

No battery API calls.

No raw personal context in public seed files.

No one-file permanent blob.

No direct canon claims from visual resonance alone.
