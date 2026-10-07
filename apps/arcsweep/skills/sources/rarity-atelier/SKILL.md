# Rarity - Atelier · Visual Art & Template Refinement Skill

Status: user-authorized atelier skill.
Scope: Observer Atelier, Art Studio, Procreate/PSD template work, visual canon studies, colouring-template refinement, anatomy/pose analysis, shader and marking systems.
Authority: workflow and visual-reference guidance only. Source artist attribution, user canon, and original file ownership remain authoritative.

## Purpose

Turn a mixed archive of purchased, user-created, commissioned, generated, unfinished, PSD, and native Procreate art into easy-to-use working templates without flattening artist lineage or silently redesigning the subject.

The Atelier is not a style-copy engine. It may extract general lessons from source artwork: anatomy construction, pose mechanics, layer organization, lighting grammar, material response, colour relationships, marking placement, edge control, and usability patterns. It must not treat one artist's finished design as a target to reproduce wholesale.

## Core laws

1. **Inspiration, not wholesale copying.** Preserve the distinction between source pose/design language and the new work. Use sources to derive constraints and options, not to trace a finished identity into another.
2. **Never mutate the only master.** Work on a copy. Keep the original recoverable.
3. **Pixels before prose.** If a file can be inspected natively, read its actual layers, blend modes, masks, visibility, clipping and pixel passes rather than guessing from a flattened preview.
4. **Do not mutate anatomy while changing pose.** Pose is a transformation of an established body plan, not permission to invent a new species, limb count, digit count, horn map, tail termination, or torso architecture.
5. **Unknown is not helper.** Ambiguous layers are marked REVIEW until visually identified.
6. **Lighting has jobs.** Shadow describes form, light describes illumination, shine describes material. Do not collapse them into one airbrushed pass.
7. **Markings are not lighting.** Keep coat/scale pattern layers independently editable beneath illumination whenever possible.
8. **Native Procreate writing is gated by round-trip evidence.** Metadata-only edits are allowed only when all non-metadata archive members verify byte-for-byte unchanged. Pixel or layer-graph writes require a disposable test file reopened successfully in Procreate before touching a valuable working copy.
9. **Attribution travels.** Keep artist/source names and original filenames in the manifest or source-reference layer even when working-layer names are normalised.
10. **Generated images are studies, not anatomy authority.** Image generation may explore rendering, colour, atmosphere or pose concepts. When it mutates established anatomy, reject the mutation rather than canonising it.

## Benches

### 1. Intake & Provenance
Read `references/source-lineage.md` when ingesting a new collection.
- Inventory filenames, format, artist/source, finished/unfinished state, and likely use.
- Separate source master, working derivative, generated study, and approved canon.
- Never redistribute paid source art as part of the skill package.

### 2. Native Procreate Archaeology
Read `references/procreate-native.md` for any `.procreate` file.
- Inspect ZIP members, `Document.archive`, Silica layer metadata, clipping, opacity, visibility and blend IDs.
- Use `apps/arcsweep/scripts/rarity-atelier-procreate-normalize.py` for conservative label normalisation.
- Hash every non-`Document.archive` member before and after metadata-only edits.
- If any painted tile/chunk, thumbnail, preview, video or unrelated payload changes, fail closed.

### 3. PSD Import Prep
Read `references/template-refinement.md` when the source is PSD/PSB or must round-trip through PSD for Procreate import.
- Prefer `psd-tools` when available for layer/group-aware inspection.
- ImageMagick is acceptable for read-only inventory and preview generation; do not assume it preserves every Photoshop feature on rewrite.
- Preserve geometry, transparency, layer order, blend modes and artist-specific parts.
- Normalise labels conservatively; do not flatten merely for convenience.

### 4. Template Refinement
Use the canonical layer vocabulary in `references/template-refinement.md`.
- Rename obvious equivalents.
- Add convenience layers only in a format/path that has passed round-trip verification.
- Keep ambiguous layers under REVIEW until visually inspected.
- Make common user actions obvious: recolour body, recolour secondary surfaces, add light/dark markings, adjust shadow, adjust light, adjust shine, edit eyes, edit linework.

### 5. Anatomy & Pose
Read `references/anatomy-pose.md` whenever pose or anatomy changes.
- Extract core volumes and joint relationships from multiple references.
- Preserve species/body-plan invariants.
- Use purchased templates as a pose and construction corpus, not a tracing command.
- Before rendering, compare silhouette, limb count, digit count, wing attachment, tail termination and head/neck proportions against the target character/species constraints.

### 6. Shader, Markings & Material
Read `references/shader-grammar.md` for colouring/rendering work.
Default stack:
- base surfaces;
- dark markings;
- light markings;
- broad form shadow;
- contact/occlusion shadow;
- reflected/bounce light where useful;
- broad light;
- highlight;
- shine/specular;
- eye facets/material;
- optional rim/biolume/effects;
- linework/final corrections.

### 7. Validation
Before returning or saving a refined template:
- compare against the source composite;
- verify no unintended crop, transform, transparency, layer-loss or blend-mode drift;
- verify anatomy invariants named by the user;
- verify source master remains unchanged;
- emit a compact receipt: source, output, operations, unresolved REVIEW layers, and verification result.

## Default working mode

For a large archive, proceed in batches:
1. catalogue;
2. inspect representative examples;
3. derive/refine mappings;
4. run conservative transforms;
5. verify;
6. only then expand to the rest of the corpus.

Do not ask the user to manually repeat information already present in Drive, the current conversation, or the source files.
