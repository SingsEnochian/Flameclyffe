# Universal Codex Generator Bridge v0.1

**Date:** 2026-09-21  
**Branch:** `codex/universal-codex-generator-atelier-v0-1`  
**Status:** implementation candidate; local generator hardware not present in CI workspace  
**Surface:** Magic Book → Glyph Forge → Render a Page Vision

## Result

The Universal Codex can now speak to a Steward-owned local ComfyUI forge without making that forge a canon authority.

The first complete provider path is **TJ Studio Z-Image text-to-image**:

1. the Steward enters or retains a loopback ComfyUI endpoint;
2. the Book probes ComfyUI core, TJ Studio configuration, and installed Z-Image models;
3. the bridge resolves the exact diffusion model, text encoder, and VAE;
4. the Book builds a bounded ComfyUI API graph with prompt, negative prompt, dimensions, steps, CFG, shift, sampler, scheduler, and seed;
5. ComfyUI accepts the graph through `/prompt`;
6. the bridge polls `/history/{prompt_id}` until an image or an explicit failure exists;
7. the returned `/view` artifact appears on the page;
8. ArcSweep stores bounded receipts for probe, request, completion, or failure.

There is no fake-ready state. A reachable ComfyUI server without the TJ Studio Z-Image route or required models reports the missing boundary instead of exposing a decorative Generate button as success.

## Authority boundary

| Concern | Owner |
|---|---|
| Pixel generation | Local ComfyUI + installed TJ Studio node/model stack |
| Request normalisation | ArcSweep Generator Bridge |
| Model, seed, and output provenance | ArcSweep Magic Book receipts |
| Canon promotion | Human Steward; unchanged |
| Provider availability | Observed at request time; never inferred from UI presence |

The provider renders. ArcSweep receipts. The Steward decides.

## Contracts

- `arcsweep.generator-bridge/v0.1`
- `arcsweep.generator-request/v0.1`
- `arcsweep.generator-result/v0.1`
- existing `arcsweep.magic-book-receipt/v0.1`

The endpoint preference is browser-local under:

`hearthgate.arcsweep.generator-bridge.endpoint.v0.1`

No API key or embedded URL credential is accepted or stored.

## Network boundary

ArcSweep's Content Security Policy admits image and fetch traffic only to loopback HTTP origins:

- `http://127.0.0.1:*`
- `http://localhost:*`

This deliberately does not open arbitrary remote HTTP or HTTPS providers. A future remote forge should use a same-origin authenticated proxy or receive a separate reviewed CSP change.

ComfyUI must enable CORS for the ArcSweep origin. Hosted HTTPS ArcSweep may still be prevented by browser mixed-content or Private Network Access rules from reaching a plain HTTP local process. The intended v0.1 path is local/desktop ArcSweep beside local ComfyUI.

## Upstream reference

Implementation semantics were checked against the MIT-licensed `designloves2/ComfyUI-TJ_NODE_STUDIO_ONE` repository at commit:

`8f70798f08a56ff4d94e8e3694964a7355fc2e54`

The ArcSweep interface and adapter were implemented natively. The separate `designloves2/AI-ONE-STUDIO` web front end is not copied or modified.

## Verification

- focused Generator Bridge + Magic Book contract tests: **16 passed**;
- complete ArcSweep suite: **1,302 passed, 0 failed**;
- canonical spine: **valid, 13 nodes / 12 edges**;
- production build: **passed**;
- generated bundle contains the Generator Atelier surface and adapter;
- live ComfyUI generation: **not run** because this workspace has no ComfyUI/TJ Studio process or model files;
- automated visual browser check: **not run** because the environment's prescribed browser executables were unavailable after the dev server started.

## Next gates

1. Run the Book locally beside ComfyUI with `ComfyUI-TJ_NODE_STUDIO_ONE` installed and CORS enabled.
2. Test one 1024×1024 Z-Image render and inspect the emitted request/completion receipts.
3. Add glyph-canvas export + `/upload/image` for a true Glyph Forge → image-to-image transformation.
4. Add Qwen Image Edit as the second provider path, preserving the same request/result envelope.
5. Promote generated outputs into Canon Studio only through an explicit Steward action.

## Seal

**The forge makes an image. The binding remembers how. Neither decides what becomes true.**
