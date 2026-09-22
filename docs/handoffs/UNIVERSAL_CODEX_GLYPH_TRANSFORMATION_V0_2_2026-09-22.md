# Universal Codex Glyph Transformation v0.2

**Date:** 2026-09-22  
**Branch:** `codex/universal-codex-generator-atelier-v0-1`  
**Status:** implementation complete; live local-generator acceptance remains pending  
**Surface:** Magic Book → Glyph Forge → Transform current glyph

## Result

The Universal Codex can now carry the visible Glyph Forge canvas into the Steward's local ComfyUI forge as a real image-to-image source.

The path is explicit and recoverable:

1. the Book exports the current visible glyph canvas at its native dimensions;
2. transparent space is flattened onto a parchment ground so the source remains legible;
3. the PNG is uploaded to ComfyUI through `/upload/image` as an input artifact;
4. the returned ComfyUI filename—not browser memory or an invented path—is bound into the request;
5. the bridge builds a Z-Image image-to-image graph using `LoadImage`, `ImageScale`, `VAEEncode`, `KSampler`, `VAEDecode`, and `SaveImage`;
6. transformation strength is bounded through `denoise` from `0` to `1`;
7. the existing prompt queue, history polling, and output-address flow returns the rendered image to the Book;
8. upload, request, completion, and failure receipts retain glyph and generation lineage.

Text-to-image remains available through the same bridge and request/result envelopes.

## Provenance boundary

| Receipt | Evidence retained |
|---|---|
| `generator-source-upload` | Glyph ID, stored stroke count, active brush ID, ComfyUI source reference, source MIME/type |
| `generator-request` | Mode, source reference, prompt controls, denoise, seed, glyph lineage |
| `generator-complete` | Prompt ID, resolved models, output references, source and glyph lineage |
| `generator-failed` | Bounded error message and all lineage known at the failure boundary |

Receipts do not copy image bytes or stroke coordinates. The browser's glyph project remains the drawing authority; ComfyUI receives one flattened rendering for transformation.

## Graph boundary

The image-to-image graph differs from text-to-image only at the latent source:

- text-to-image: `EmptySD3LatentImage`;
- image-to-image: `LoadImage` → `ImageScale` → `VAEEncode`.

Both paths use the same resolved Z-Image diffusion model, Lumina-compatible text encoder, VAE, sampling controls, output polling, and result schema. This keeps one generator bridge rather than creating a second image-edit authority.

## Verification

- focused Generator Bridge tests: **8 passed**; they cover request refusal without a source, PNG flattening, multipart upload, exact image-to-image graph wiring, denoise, queueing, history, result addressing, and Magic Book exposure;
- complete ArcSweep suite: **1,305 passed, 0 failed**;
- canonical spine: **valid, 13 nodes / 12 edges**;
- production build: **passed**;
- live ComfyUI image transformation is not claimed because the workspace has no running ComfyUI/TJ Studio process or model files;
- automated browser visual verification remains a separate environment gate.

## Next gates

1. Run a local transformation with TJ Studio Z-Image and inspect the upload/request/completion receipt chain.
2. Confirm the installed ComfyUI build exposes the standard `ImageScale` and `VAEEncode` node signatures used by the API graph.
3. Add an explicit Steward action for promoting a selected generated output into Canon Studio.
4. Add Qwen Image Edit behind the same request/result and provenance boundary.

## Seal

**The hand-drawn mark crosses the forge as an image. The binding remembers both forms. The Steward alone names either one canon.**
