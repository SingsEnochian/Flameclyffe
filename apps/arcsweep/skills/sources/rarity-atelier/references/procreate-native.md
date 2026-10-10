# Native Procreate Bench

## Format facts used by Atelier

A native `.procreate` document is a ZIP container. Useful members commonly include:
- `Document.archive`: binary plist / NSKeyedArchive carrying document and layer metadata;
- `QuickLook/Thumbnail.png` and sometimes preview/composite imagery;
- per-layer UUID directories containing tiled `.chunk` or `.lz4` pixel payloads;
- optional video data and other metadata.

The archive has evolved across Procreate versions. Treat unknown keys as opaque and preserve them.

## Safe read path

1. Open as ZIP without extracting in place.
2. Parse `Document.archive` with Python `plistlib`.
3. Resolve `plistlib.UID` references through `$objects`.
4. Identify objects whose class name contains `SilicaLayer`.
5. Read layer name, UUID, opacity, hidden, locked, clipped, preserve-alpha, blend/extendedBlend and dimensions.
6. For raster inspection, decode only the UUID's tile payloads needed for the task. Keep source bytes untouched.

## Metadata-only write seam

Atelier currently permits one native write class by default: **layer-name string replacement**.

Procedure:
1. copy the source to a new output path;
2. replace only string objects referenced by SilicaLayer `name` fields inside `Document.archive`;
3. rewrite the archive;
4. copy every other ZIP member byte-for-byte;
5. hash all non-`Document.archive` members before and after;
6. require identical member sets and SHA-256 payload hashes.

This does not prove Procreate accepts every possible archive rewrite. It establishes a narrow, tested seam for metadata-only copies. Pixel writes, new layers, layer deletion/reordering, masks, transforms and group graph changes remain gated behind a real Procreate round-trip test.

## Blend IDs

Do not infer artistic meaning from blend mode alone. Known corpus values include:
- 0 Normal
- 1 Multiply
- 11 Overlay
- 17 Soft Light
- 2 Screen

Keep the raw ID in receipts.

## External engineering references

- `NothingData/ProcreateViewer` (MIT): practical parser/viewer for native Procreate containers and Silica layer metadata.
- `xubiod/import_from_procreate`: reference implementation for layer metadata and native tile reconstruction.
- `Avarel/silicate`: reverse-engineering reference for Procreate document structure.

Use these as implementation references. Do not vendor source code unless its license and attribution requirements are intentionally handled.
