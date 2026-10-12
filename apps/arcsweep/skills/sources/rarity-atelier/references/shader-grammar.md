# Shader, Markings & Material Bench

## Working distinction

- **Form shadow** describes volume turning away from the key light.
- **Contact / occlusion shadow** describes close forms blocking light from one another.
- **Broad light / highlight** describes illumination across a surface.
- **Shine / specular** describes material response.
- **Markings** describe inherent coat/scale pigmentation and remain independently editable.
- **Rim / biolume / glow** are optional effects, not substitutes for form.

## Default stack

1. Base surface colours.
2. Dark markings.
3. Light markings.
4. Broad form shadow, usually Multiply in the current Pern-template corpus.
5. Contact shadow, tighter and more local than the form pass.
6. Bounce/reflected light if the scene warrants it.
7. Broad light, often Overlay or Soft Light depending on source.
8. Highlights, broader/softer than hard shine.
9. Shine/specular, broken and tapered where the material is slick or hard.
10. Eye material/facets/reflections.
11. Optional rim, biolume, magical glow and final correction.

## Corpus observations

Across the reviewed Christina Weinman Firelizard files, light and shadow are already separated, commonly as Overlay light and Multiply shadow.

Across reviewed Jabberwoky shade/shine files, `shading`, `highlights` and `shiny` are separate jobs. In several files the shine and highlight passes use Overlay while shading uses Multiply. Preserve that separation even when changing colours.

## Anatomy-aware shading

Before shading:
- reduce the form to core volumes;
- establish a single key-light direction;
- place a clear terminator where major forms roll away;
- reserve hard contact shadows for overlaps and creases;
- let strokes/texture follow the directional structure of the form;
- add restrained bounce inside deep shadow;
- use rim light only where it clarifies silhouette or scene lighting.

Do not use shine to fake missing anatomy.

## Eye systems

When the species calls for faceted eyes:
- no pupil unless canon explicitly requires one;
- treat facets as a material/geometry system, not painted iris stripes;
- separate base colour, facet variation, internal reflection and external catchlight where possible;
- colour-shift can travel across facets without introducing a pupil-shaped dark centre.
