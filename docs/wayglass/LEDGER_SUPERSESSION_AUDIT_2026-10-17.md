# Wayglass Continuity Ledger · Supersession and Retrieval Audit

**Status:** working local audit and native Wayglass surface, optional ONNX adapter staged, not an authenticated Ledger ingestion service. 17 October 2026.

## Scope and authority

The current `wayglass/current` line already contains two distinct ledgers:

- `apps/arcsweep/src/wayglass-local-event-ledger.js`: signed, hash-linked event receipts and deterministic replay of work, departure, return and unresolved Wonder. The relevant identity kernel is the only public-key authority.
- `lib/wayglass-travelling-inheritance.cjs`: authenticated, compare-and-swap event store for seeds, deeds and revocations; its dossier excludes revoked deeds and its `compileContext()` is a bounded fictional context projection.

This module **does not edit either ledger**. It takes a small, explicitly supplied trial packet and reports whether a nominated active replacement ranks above other active candidates and whether forbidden revoked/superseded references remain excluded. None of the scores determines canon, identity, authorisation, consciousness or an accepted deed. A similarity score is not entailment; a model can consider a false negation and a true statement highly similar.

## Executable implementation

- `apps/wayglass/src/ledger-supersession-audit.js`: validated trial packet, source references, replacement graph (predecessor must be earlier, superseded and same subject), lexical reference baseline, finite-dimensional cosine, explicit exclusion, ranking and non-authoritative audit receipt.
- `apps/wayglass/src/ledger-local-onnx.js`: provider-injected Transformers.js/ONNX adapter. Only a trusted local pipeline factory can be supplied. Reviewed initial model `Xenova/all-MiniLM-L6-v2` (Apache-2.0, smaller reference), optional follow-on `onnx-community/Qwen3-Embedding-0.6B-ONNX` (review weights, licence and hardware fit separately). It uses `device:'wasm'`, quantisation `q8`, `local_files_only:true`, mean pooling and normalisation. This adapter is tested with an injected mock; no model packages or weights are committed, no real ONNX inference run is claimed.
- `apps/wayglass/src/surfaces/continuity-ledger.js` and `ledger-supersession.css`: Wayglass-native mineral-glass room, `?room=ledger`, explicit user-invoked baseline and optional staged ONNX comparison, exportable JSON receipt, no automatic persistence or network request, and cleanup on room transition. The only built-in data is a clearly labelled fictional sample.
- `apps/wayglass/test/ledger-supersession-audit.test.js`: cases for valid substitution, revoked record with maximal similarity, baseline, ONNX mock, same-subject rule, missing refs, nonfinite vectors, explicit local provider requirement and no outbound fetch in the surface.

## Scoring and interpretation

For a validated packet containing text query `q` and records `r_i`, a reference embedding `E` yields cosine scores `c_i = cos(E(q), E(r_i))`. The interpreter filters `status !== 'active'` **before** ranking candidates for retrieval, regardless of `c_i`. It records:

- `expected_active_rank` and `expected_active_top1`: position of the explicitly nominated active replacement among active candidates (retrieval performance, not proof of truth).
- `forbidden_not_retrieved` and `exclusion_rate`: revocation/supersession exclusion invariants with explicit refs (a structural policy check, independent from cosine).
- Source references and retired candidates, separately from eligible results; whether a replacement link was explicitly declared.

No thresholds have been benchmarked yet, and a high score does not prove a fact was correctly remembered. A valid signed event chain is also not inferred from user-supplied JSON. To compare live deeds in future, an authenticated server adapter must read/verify the canonical ledger, project bounded source text and revocation status, then pass that *derived* packet to the local scorer under user permission. Do not accept user-asserted status for authority decisions.

## Test flight

1. Start Wayglass on the branch containing this room: `npm run wayglass:dev`. Open `http://127.0.0.1:5186/?room=ledger`. The normal Wayglass authorisation gate remains in force.
2. Run **local baseline** on the sample: read eligible/retired separation, rank, model mode, and source provenance; export its receipt. No model download is required.
3. Run a counter-trial where the revoked source text is an exact query match. The retired source may top the **all-candidates** list but must never enter the **eligible** list.
4. Run the corrupt-identity and missing-predecessor tests. Expect fail-closed errors and no receipt.
5. Only once same-origin ONNX assets are vetted and installed, register an authenticated local `pipelineFactory` adapter under `globalThis.__wayglassLocalONNX` with `local:true`, exercise the **Try staged local ONNX** button, record model version, cache fingerprint and runtime context. Current frontend does not install this registration automatically.
6. Future host trial: repeat the same comparisons with a read-only projection of **verified** travelling-inheritance events, including revocation after restart and cross-runtime return. Require original author, stop point, next owner and unresolved Wonder receipts to remain independent from semantic rank.

## Research source triage, evidence vs adoption

Verified Hugging Face metadata 17 October 2026:

| Candidate | Wayglass seam | Decision |
| --- | --- | --- |
| [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) | local retrieval and text comparison | Apache-2.0; candidate only; ONNX variant available; hardware/quality trial pending |
| [EmbeddingGemma-300M ONNX](https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX) | browser embedding | Gemma licence; no silent substitution into permissive route |
| [Hy-Memory-30B-A3B](https://huggingface.co/tencent/Hy-Memory-30B-A3B) and [GGUF](https://huggingface.co/rapatsky/Hy-Memory-30B-A3B-GGUF) | proposed memory extraction | Metadata only; 30B total weights, 3B active; 6 GB VRAM fit not proven |
| [PersonaMem-v3](https://huggingface.co/datasets/bowen-upenn/PersonaMem-v3) | candidate continuity benchmark | CC BY-NC 4.0; benchmark protocol audit before use; no personal corpus copied |
| [FineEnvs/RL-Explorer](https://huggingface.co/spaces/FineEnvs/RL-Explorer) and [multi-harness-rl](https://huggingface.co/spaces/FineEnvs/multi-harness-rl) | bounded cross-harness test design | Docker research Spaces, not autonomous growth evidence |
| [facebook/audiobox-aesthetics](https://huggingface.co/facebook/audiobox-aesthetics) | future Möbius audio quality evaluation | learned acoustic-quality prediction, not a ground-truth measure of a listener's experience |
| [MIT AST AudioSet](https://huggingface.co/MIT/ast-finetuned-audioset-10-10-0.4593) | future optional environment scene labels | requires explicit mic consent and measurement; model not installed |
| [pyannote/embedding](https://huggingface.co/pyannote/embedding) | future speaker correspondence | gated model; speaker vectors do not grant personal identity authority |
| [Audio.cpp GGUF](https://huggingface.co/audio-cpp/audio.cpp-gguf) | future local audio stack | mixed audio tasks; licence metadata `other` requires review |
| [Persona Cartography](https://huggingface.co/datasets/persona-cartography/monorepo) | weight-space research | artifact monorepo, not drop-in dataset or evidence of personal identity |

The user-supplied Hugging Face Space categories (3D modelling, fine-tuning, style transfer, image, anomaly detection) remain **discovery indexes**. No catalogue entry constitutes installation, approval, or provider connectivity. Distillation from permitted research data is a separate consented training project, not an automatic effect of memory extraction.

## Acceptance and follow-on

**Passed locally:** pure engine/validation/adapter tests; no external network, credentials, hardware, memory writes or provider invocation. **Not yet witnessed:** real ONNX runtime, actual HF weights, host-verified Ledger data, live browser/desktop signoff, cross-ancestry empirical score, published deployment. Remain draft until these are distinguished.