# PyTorch Application Research & Engine Roadmap

**Research snapshot:** 2026-06-12  
**Scope:** Flameclyffe, STARWELL, DEEP Observer, Terra Aeterna Wiki, Observer Atelier, Lantern systems, Living Liturgy, Waking World Concordance Lens, and future accessibility hardware.

## Position in the architecture

PyTorch is the project’s training forge and analytical laboratory. It does not replace the React/Vite interface or Notion’s editorial authority.

```text
Notion editorial canon
        ↓ approved sync
Supabase structured data and provenance
        ↓ snapshots / feature jobs
PyTorch laboratory or secured inference service
        ↓ suggestions, embeddings, scores, explanations
Supabase ML review tables
        ↓ reviewed results only
STARWELL / DEEP / Wiki React interfaces
```

No model writes directly to canon tables. Results enter reviewable suggestion tables with model version, source snapshot, confidence, explanation, and reviewer state.

## Current toolchain

- **PyTorch 2.12:** tensors, training, `torch.compile`, `torch.export`, ONNX export, MPS, and profiling.
- **ExecuTorch 1.3:** edge inference for mobile, desktop, embedded, and microcontroller targets, including Core ML and MPS.
- **torchao 0.17:** quantisation, quantisation-aware training, sparsity, and lower-precision optimisation after profiling identifies a real bottleneck.
- **Torchaudio 2.10:** maintenance mode. New media I/O should use TorchCodec rather than building around APIs being removed or consolidated.
- **Transformers.js:** ONNX-backed browser inference through WASM or WebGPU for local-first STARWELL features.

## Engine applications

### STARWELL Codex and Terra Aeterna Wiki

Highest-value first production target:

- semantic and hybrid search;
- related-page recommendations;
- duplicate and near-duplicate detection;
- continuity-link suggestions;
- unresolved-thread retrieval for the Writing Room;
- source-grounded context packets;
- editorial classification and tagging queues.

Start with compact sentence embeddings rather than a generative model. Benchmark `sentence-transformers/all-MiniLM-L6-v2` against newer small embedding models. Store vectors in Supabase `pgvector`, or calculate private embeddings locally through Transformers.js.

Semantic similarity proposes neighbours. It never declares two records identical or canonically related.

### DEEP Pattern Laboratory

Best first custom PyTorch project:

- anomaly scoring across observation channels;
- clustering similar readings;
- historical-neighbour retrieval;
- change-point and state-transition detection;
- compact representations of time windows;
- calibrated uncertainty and abstention;
- channel attribution with Captum.

Model ladder:

1. deterministic and statistical baselines;
2. small tabular MLP;
3. denoising or variational autoencoder;
4. one-dimensional CNN or temporal convolutional network;
5. gated multimodal fusion for genuinely separate modalities;
6. transformers only when data volume and sequence length justify them.

The linked **MLP Fusion** paper concerns compressing dense and mixture-of-experts MLP blocks by decomposing and clustering sub-MLPs. It may matter later for adapting a local language model. It is not the first mechanism for combining DEEP sensor modalities.

Model results remain descriptive. They are not metaphysical proof, diagnosis, prophecy, or safety authority.

### Observer Atelier and Visual Asset Library

- image-text semantic search;
- lineage and revision clustering;
- duplicate detection;
- character-consistency drift warnings;
- pose, expression, costume, and location tagging;
- focal-point and crop suggestions;
- segmentation and background isolation;
- alt-text and caption drafts;
- visual-canon review queues.

A CLIP-family encoder is a practical baseline. `openai/clip-vit-base-patch32` and ONNX/Transformers.js variants can support initial experiments.

Similarity is not authorship proof or canon approval. Preserve provenance, source hash, prompt lineage, version, and licence.

### Caption Lantern, Voice Lantern, and Living Liturgy

- speech recognition and live captions;
- voice activity detection;
- forced alignment and timestamped transcripts;
- acoustic event classification;
- source separation and noise reduction;
- pitch, onset, tempo, timbre, and spectral analysis;
- searchable audio embeddings;
- accessible command recognition and read-back.

A Whisper-family model is a practical baseline. Benchmark model sizes on target latency, battery, accuracy, and noise conditions. Use TorchCodec for durable media I/O.

Do not treat vocal-emotion classification as ground truth. Emergency commands require deterministic controls and explicit confirmation paths.

### Sentinel Lantern and Waking World Concordance Lens

- gaze gesture classification;
- dwell-versus-pass discrimination;
- accidental activation detection;
- head and eye movement sequence classification;
- adaptive target sizing and command ranking;
- local OCR, object recognition, and captions;
- personal calibration without uploading raw eye or camera data.

Prototype in PyTorch, export through ONNX for browser/desktop tests, and deploy through ExecuTorch/Core ML on Apple devices. Investigate vendor NPU backends only after Maverick hardware APIs and chip details are confirmed.

Safety actions must retain deterministic paths. A model may rank intent but cannot silently suppress an alert, call, or room-control action.

### Beacon Network and Wardenclyffe Engine

When real telemetry exists:

- network and sensor anomaly detection;
- drift monitoring;
- signal denoising;
- predictive maintenance;
- missing-value reconstruction;
- stale, duplicate, or impossible-packet detection;
- confidence-aware state summaries.

Lore labels may dress the interface, but training labels and evaluation metrics remain operationally defined.

### Kelyran, Moonwrit, Merewit, and language tools

Rules first, models later:

- semantic glossary search;
- transliteration assistance;
- morphological segmentation;
- pronunciation scoring;
- cognate retrieval;
- dictionary deduplication;
- sequence-to-sequence models only after a reviewed parallel corpus exists;
- grapheme-to-phoneme and TTS experiments after pronunciation canon stabilises.

Unreviewed generated conlang text must never feed later training data.

### Writing Room and continuity

Use models as librarians and continuity scouts:

- retrieve relevant canon during drafting;
- surface candidate timeline conflicts;
- identify unresolved promises and character threads;
- match scenes to themes, locations, POVs, and arcs;
- retrieve earlier voice samples;
- build citation-bearing context packets.

Rowan remains the authorial centre. The model points to sources rather than replacing prose.

### Constellation and Living Memory

- private semantic retrieval;
- project and continuity clustering;
- duplicate memory detection;
- retrieval of prior decisions and consent boundaries;
- local-only embeddings for sensitive archives.

Do not train models to infer personhood, diagnosis, loyalty, emotional truth, or relationship validity. Opacus-style differential privacy may matter only if sensitive-data training is ever justified. Retrieval without training is preferable now.

## Deployment lanes

### Batch intelligence

Embeddings, duplicate detection, image indexing, transcript generation, and scheduled data-quality checks. This is the simplest, cheapest, and easiest lane to reproduce.

### Secured inference service

Heavy image, audio, or custom models that do not fit browser or edge constraints. Require authentication, payload limits, queues, private/public separation, and model-version metadata on every result.

### Browser and edge inference

Private search, compact vision/audio models, captions, and accessibility interactions. Use Transformers.js and ONNX Runtime for web, ExecuTorch for edge, and torchao only after measuring a real latency or memory problem.

## Proposed Supabase boundary

### `ml_models`

Model name, task, version, framework, source URI, licence, SHA-256, intended use, prohibited use, limitations, data card, deployment lane, status.

### `ml_runs`

Model and code revision, input snapshot hash, parameters, random seed, device, precision, runtime, memory, metrics, and artefact references.

### `ml_embeddings`

Entity type, entity ID, model ID, content hash, vector, privacy class, created timestamp, invalidated timestamp.

### `ml_predictions`

Task, entity, model version, label/value, confidence, uncertainty, explanation JSON, source snapshot, and reviewer state: pending, accepted, edited, rejected.

### `ml_feedback`

Prediction, reviewer action, correction, notes, and explicit permission status for later training use.

RLS must prevent private embeddings and predictions from entering public search surfaces.

## Evaluation contract

Every project begins with a non-neural baseline. Adoption requires improvement on a named metric without unacceptable privacy, latency, memory, battery, accessibility, or maintenance cost.

Minimum evaluation bundle:

- train, validation, and held-out test split;
- leakage check;
- class balance or anomaly-prevalence statement;
- precision, recall, calibration, and abstention where relevant;
- latency and memory on the actual target device;
- false-positive and false-negative review;
- accessibility test where relevant;
- model card and data card;
- environment lock, seeds, device, and code revision.

Complete reproducibility is not guaranteed across PyTorch versions, platforms, or CPU/GPU execution, so store artefacts and environment locks rather than relying on seeds alone.

## Security and provenance

- Never load arbitrary `.pt` or pickle checkpoints from untrusted sources.
- Prefer safetensors or controlled weight-only loading where available.
- Record licence, exact revision, hash, and conversion path.
- Review repositories that require custom model code.
- Keep models out of the public web bundle unless browser deployment is deliberate.
- Treat output as untrusted structured input and validate before writes.
- Do not send private text, art, audio, gaze, or health-adjacent data to third-party endpoints without explicit consent.

## Build order

1. **ML laboratory foundation:** separate `ml-lab/`, pinned Python environment, synthetic fixtures, privacy classes, model cards, data cards, and review-only writes.
2. **Codex semantic search:** approved records, Supabase vectors, hybrid search, source citations, privacy separation.
3. **DEEP Pattern Laboratory:** statistical baselines, tiny MLP/autoencoder, synthetic data, Captum explanations, abstention.
4. **Visual asset intelligence:** embeddings, deduplication, lineage, draft tags, alt-text queue.
5. **Caption and audio laboratory:** ASR benchmark, VAD, alignment, correction workflow, Living Liturgy signal tools.
6. **Edge accessibility:** ExecuTorch/Core ML profiling, battery and latency tests, false-activation studies.
7. **Advanced research only when justified:** GNNs, conlang sequence models, multimodal DEEP fusion, local-LLM fine-tuning, MLP Fusion, differential privacy.

## Primary references

- [PyTorch 2.12](https://docs.pytorch.org/docs/2.12/index.html)
- [PyTorch compiler](https://docs.pytorch.org/docs/2.12/user_guide/torch_compiler/torch.compiler.html)
- [PyTorch export](https://docs.pytorch.org/docs/2.12/user_guide/torch_compiler/export.html)
- [PyTorch ONNX exporter](https://docs.pytorch.org/docs/2.12/onnx.html)
- [ExecuTorch 1.3](https://docs.pytorch.org/executorch/stable/index.html)
- [torchao 0.17](https://docs.pytorch.org/ao/stable/index.html)
- [Torchaudio 2.10](https://docs.pytorch.org/audio/stable/index.html)
- [Transformers.js](https://huggingface.co/docs/transformers.js/index)
- [MLP Fusion](https://arxiv.org/abs/2307.08941)
- [Captum](https://arxiv.org/abs/2009.07896)
- [Opacus](https://arxiv.org/abs/2109.12298)
- [PyTorch Geometric](https://arxiv.org/abs/1903.02428)
- [Sentence-BERT](https://arxiv.org/abs/1908.10084)
- [Temporal convolutional networks](https://arxiv.org/abs/1803.01271)
- [Gated multimodal units](https://arxiv.org/abs/1702.01992)

No production ML authority or canon-writing path is approved by this document.