# Universal Codex Physical Three Renderer v0.1

**Date:** 2026-09-22  
**Status:** implementation design  
**Rule:** DOM owns reading; Three.js owns embodiment.

## Intent

Replace the stage-wide holographic HUD treatment with page-bound physical magic.

The renderer uses one transparent Three.js canvas but renders the left and right page scenes through independent scissor rectangles derived from the actual DOM page bounds. Effects therefore cannot cross the gutter during ordinary idle, attention, interaction, or event motion.

## Rendering law

- Ordinary text remains DOM content: selectable, accessible, crisp, and outside WebGL.
- Three.js renders material response, latent ink, page light, particulate ink, and exceptional spatial events.
- Left and right pages have independent scenes and effect state.
- Global effects are reserved for explicit revelation events.
- Reduced-motion keeps the functional book and disables realtime animation.
- The default animation state is quiet: no orbit rings, no scanlines, no permanent holographic panel.

## Motion hierarchy

The renderer consumes the shared Codex motion tiers:

- idle: 0.05
- attention: 0.15
- interaction: 0.35
- event: 0.60
- revelation: 1.00

The tier determines temporary energy; the user's light/intensity setting remains a ceiling rather than a command to keep every effect loud.

## Page material model

Each page scene contains:

1. a subdued parchment-response plane with physically based roughness and clearcoat values;
2. a procedural latent-ink shader that reveals irregular marks rather than scanlines or HUD grids;
3. page-local ink particles emitted from glyph brush samples;
4. warm material response used sparingly for interaction and events.

## Gutter law

`WebGLRenderer.setScissorTest(true)` is used each frame. The page DOM rectangles are converted into canvas-relative scissor boxes and each page scene is rendered only inside its own rectangle.

Revelation is the only tier permitted to request a deliberately cross-page/global layer in later revisions.

## Follow-on

- bind artefact meshes from Codex Working Pages;
- add page-turn deformation as a dedicated mesh transition;
- add pointer/stylus proximity to latent reveal strength;
- add optional physically based texture maps for leather, gilt, parchment and vellum;
- add world-fragment / glyph lift transitions with explicit page ownership.

## Seal

Make the magic belong to the page.

If the reader notices the rendering engine before the artefact, the renderer is too loud.
