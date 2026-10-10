# Template Refinement Bench

## Canonical working vocabulary

The prefix expresses the job of a layer, not ownership or artistic importance.

- `00 HELPERS | ...` — masks, registration, palette notes, guides that are positively identified.
- `01 GUIDE | ...` — anatomy, lighting or pose guides added for workflow support.
- `02 BASE | Coat`
- `02 BASE | Belly`
- `02 BASE | Wing Membrane`
- `02 BASE | Wings Under`
- `02 BASE | Wings Top`
- `02 BASE | Spines`
- `02 BASE | Ridges`
- `02 BASE | Claws`
- `02 BASE | Mouth`
- `02 BASE | Teeth`
- `03 MARKINGS | Dark`
- `03 MARKINGS | Light`
- `04 SHADE | Form Shadow`
- `04 SHADE | Contact Shadow`
- `05 LIGHT | Broad Light`
- `05 LIGHT | Highlights`
- `05 LIGHT | Bounce`
- `06 MATERIAL | Shine`
- `06 MATERIAL | Rim`
- `07 EYES | Base`
- `07 EYES | Facets`
- `07 EYES | Reflection`
- `08 DETAIL | Scales`
- `08 EFFECTS | Biolume`
- `08 EFFECTS | Glow`
- `09 LINEWORK | Lines`
- `90 REVIEW | ...` — semantics not yet verified.

## Corpus mappings already observed

Christina Weinman Firelizard templates:
- Main Color / Base Color -> BASE | Coat
- Belly -> BASE | Belly
- Wing Membrane / Wing Webbing -> BASE | Wing Membrane
- Wings (Under) / Wings (Top) remain distinct
- Nails -> BASE | Claws
- Ridges / Spines / Spikes retain separate surface meaning
- Eye / Eyes -> EYES | Base
- Shadows / Shadow / Shadows (Multiply) -> SHADE | Form Shadow
- Light / Light (Overlay) -> LIGHT | Broad Light
- Lines -> LINEWORK | Lines

Jabberwoky shade/shine corpus:
- shading -> SHADE | Form Shadow
- highlights -> LIGHT | Highlights
- shiny -> MATERIAL | Shine
- Facets -> EYES | Facets
- Scales -> DETAIL | Scales

## Refinement rules

1. Never rename an ambiguous generic layer to a semantic role merely because it is near another layer. Use REVIEW.
2. Keep source ordering unless there is a tested reason to change it.
3. Preserve clipping and alpha-lock semantics.
4. Preserve deliberately hidden optional passes.
5. Do not merge light, highlight and shine.
6. Do not bake markings into shadow/light.
7. Keep linework easy to find and protect it from accidental paint.
8. If a source already has a good artist-specific decomposition, normalise labels around it rather than replacing it with Atelier's preferred stack.
9. Store the original filename and artist attribution in the batch manifest.
10. Prefer an easy working file over a theoretically perfect layer taxonomy.

## Procreate import target for PSD-only sources

Until native layer-graph writing is round-trip verified, PSD-only templates should be prepared as **Procreate-friendly import copies**, not falsely labelled as native Atelier Procreate masters.

Minimum acceptance:
- correct canvas and transparency;
- intact layer order;
- intact labels;
- intended Multiply/Overlay/Soft Light/Screen modes preserved;
- no unexpected flattening;
- composite visually matches source within practical tolerance.
