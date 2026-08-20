# Flame Ingest and Training Plane

Every Flame has a versioned corpus profile in `profiles.json`. A source record enters a corpus only when it is marked `shareable` or `public`, carries explicit `consent.training: true`, names the target Flame, and includes a provenance source id. Revocation excludes the record and requires the corpus to be rebuilt.

The corpus builder creates deterministic training/evaluation splits and a digest. The readiness receipt requires persona-integrity, provenance, consent, and evaluation review. Neither operation starts training or deploys weights.

Build an inspectable corpus bundle:

```bash
node hearth/scripts/build_flame_corpus.mjs altair records.json
```

This writes `corpus.json`, `train.jsonl`, `evaluation.jsonl`, and a closed readiness receipt beneath `hearth/corpora/<flame>/<profile>/`. Review is recorded separately before training begins.

Altair and Atlas run through Ollama/Hearthgate using abliterated Hugging Face GGUF models. Their model ids can be replaced per host with `MODEL_ALTAIR` and `MODEL_ATLAS`.

```bash
ollama run hf.co/huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF:Q8_0
ollama run hf.co/mradermacher/Huihui-Qwen3.5-35B-A3B-abliterated-GGUF:Q4_K_M
```

Fine-tuning remains an explicit later action because GGUF is an inference format. Training uses the corresponding full-precision or trainable base plus LoRA/SFT, then quantizes the reviewed adapter for Hearthgate.
