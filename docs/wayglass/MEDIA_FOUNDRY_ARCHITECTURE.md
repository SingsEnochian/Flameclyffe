# Wayglass Media Foundry: applets, models, and the source-to-route seam

**Status:** curated model and applet catalogue with interactive local UI and owner-invoked metadata inspection. Model weights, voice samples, image pipelines and authenticated live invocations are **not** included.

## Whole-system design

| Deck | Existing owner / new work | Authority | Proof still needed |
| --- | --- | --- | --- |
| Sensorium | ArcSweep Harmonic Observatory, existing SpessaSynth SoundFont engine | Local user-selected sound only; no remote send | Live SF2 device listening and Osia calibration |
| Atelier | STARWELL Glyph Studio, Brush Panel, and Image/Video Atelier | Existing source owner; Media Foundry is catalogue, not renderer | Real output and export provenance |
| Model Foundry | New `apps/arcsweep/media-foundry/` applet | Reviewed *candidate* metadata, requirements and proposal-only trial receipts | Authorised model install, performance, licence evaluation |
| Crew | Wayglass Writing Room PR #465 and dedicated route client | Only Wayglass host can declare configured/verified routes | Authenticated route read-back and a real reply |
| Memory | STARWELL continuity gate and Return Engine | Explicit authored stop point and next owner | Durable owner-bound receipt service |

**Boundary:** the ArcSweep Model Foundry never stores API keys, fetches weights automatically, or sends prompts. Its explicit `GET /api/v1/wayglass/routes` read, when requested by the owner, displays provider metadata only. It does not infer real connectivity from a model page. The separate Wayglass host and PR #465's stacked lineage must be integrated before claiming native host navigation.

## Source studies (2026-10-17)

- [`hexgrad/kokoro`](https://github.com/hexgrad/kokoro) / [`hexgrad/Kokoro-82M`](https://huggingface.co/hexgrad/Kokoro-82M): Apache 2.0, 82M-parameter TTS. Python `KPipeline` produces example 24 kHz WAV. `kokoro.js` documents `kokoro-js`, an ONNX model `onnx-community/Kokoro-82M-v1.0-ONNX`, WASM/WebGPU options and voice listing. **Integration adapter proposal:** explicit local model acquisition, `af_heart` example, export to WAV and attach waveform hash plus voice ID. Consent before playback, no unauthorised imitation.
- [`ResembleAI/chatterbox`](https://huggingface.co/ResembleAI/chatterbox): MIT-labelled text-to-speech alternative, with voice-cloning capability; requiring voice permissions. Not installed.
- [`Nekodeus/neko-hollywood-golden-sdxl-v1`](https://huggingface.co/Nekodeus/neko-hollywood-golden-sdxl-v1): Apache 2.0-labelled **LoRA**. It requires a compatible SDXL image pipeline and independent licence/source review. It is not a standalone model endpoint.
- [`stabilityai/stable-diffusion-xl-base-1.0`](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0): OpenRAIL++-labelled SDXL base. A separate, potentially heavy model acquisition. Laptop 6 GB VRAM must be benchmarked rather than assumed enough.
- [`vishu01a/shunya-3B-UIUX-master_v1.0`](https://huggingface.co/vishu01a/shunya-3B-UIUX-master_v1.0): MIT-labelled Qwen 2.5 Coder 3B GGUF derivative; candidate for local UI implementation and critique. Neither this catalogue nor Hugging Face's tags demonstrate it is currently served via Ollama.
- [`drowzeys/DeepSeek-V4.1-Flash-Abliterated-Cybersecurity-Unleashed`](https://huggingface.co/drowzeys/DeepSeek-V4.1-Flash-Abliterated-Cybersecurity-Unleashed): gated, MIT-labelled cybersecurity-oriented model; research candidate pending permitted access, hardware and a bounded defensive evaluation. No claim of live route.
- [`yatin-superintelligence/Audio-Video-Engineering-Agentic-Tasks-1M`](https://huggingface.co/datasets/yatin-superintelligence/Audio-Video-Engineering-Agentic-Tasks-1M): MIT-labelled dataset of approx. 1,029,459 synthetic engineering tasks. Useful for a *reviewed subset* of media QA scenarios, not as an executable model or peer-reviewed acoustics reference.
- Discovery filters: [Hugging Face TTS](https://huggingface.co/models?pipeline_tag=text-to-speech&inference_provider=all&sort=trending) and [image](https://huggingface.co/models?pipeline_tag=text-to-image&inference_provider=all&sort=trending). Search ranking is dynamic and not approval.

## Operational acceptance

1. Open Media Foundry through ArcSweep's creative applet catalogue or direct local Vite path `/media-foundry/`.
2. Filtering speech returns Kokoro + Chatterbox. Selecting Neko exposes the SDXL base dependency.
3. Export a Kokoro trial plan and confirm `proposal-only`, `provider_route_id=null`, `authorised=false`, `live_invocation=false`.
4. Click inspect host routes. Without a host, display an unavailable state and make no inference call. With a live host, show its claimed configured/connection-verified booleans without upgrading them.
5. Existing SF2/Harmonic Observatory links open their original instrument. No newly invented sound engine or GPT endpoint.
6. Run Node tests then ArcSweep Vite build; follow with real desktop/mobile/browser, TTS generation, image output and Osia playback trials before signoff.

**Next owner:** Wayglass integration steward. **Stop point:** native host mount into PR #465 lineage and a real Kokoro-generated, owner-approved audio receipt; no remote audio/model send without explicit authorisation.