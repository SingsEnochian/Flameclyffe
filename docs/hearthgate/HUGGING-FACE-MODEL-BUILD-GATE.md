# Hugging Face Model Build Gate

**Status:** Required for Hearthgate: Bifröst / Runa / STARWELL  
**Rule:** A model is not considered installed merely because its weight files exist.

## Complete-install invariant

Every approved Hugging Face model build must include, where applicable:

- model configuration (`config.json`)
- generation configuration (`generation_config.json`)
- tokenizer files and tokenizer configuration
- chat template
- processor / feature extractor
- all weight shards and the shard index
- architecture-specific Python modules required by the model
- adapter configuration and adapter weights
- quantisation configuration
- special-token maps
- licence and model-card provenance
- pinned runtime dependencies
- local cache snapshot metadata

Custom model code must be reviewed and pinned to an immutable revision before
`trust_remote_code=True` is permitted.

## Required runtime modules

The runtime manifest must explicitly pin the modules actually required by each
model. The baseline candidate set is:

- torch
- transformers
- accelerate
- safetensors
- huggingface_hub
- tokenizers
- sentencepiece and/or tiktoken when required
- peft when adapters are used
- bitsandbytes, optimum, auto-gptq, autoawq, or quanto only when required by the selected build
- einops when required
- numpy
- pydantic
- soundfile, scipy, and librosa for audio-capable models
- torchaudio when required by the selected audio pipeline

Do not install every optional backend blindly. Record each dependency against
the model that needs it.

## Model registry requirement

Each model entry must declare:

```yaml
id: author/model
revision: immutable-commit-sha
purpose: text-generation | embeddings | audio | vision | routing
loader: transformers | sentence-transformers | diffusers | custom
trust_remote_code: false
quantisation: none
required_modules: []
required_files: []
adapters: []
offline_verified: false
licence_reviewed: false
```

## Acceptance tests

A build passes only when all of the following succeed:

1. Snapshot is complete at the pinned revision.
2. Required files are present and non-empty.
3. Python imports for declared modules succeed.
4. Tokenizer / processor loads locally.
5. Model configuration loads locally.
6. Model or a lightweight metadata load succeeds with network disabled.
7. Adapter and base-model compatibility is verified.
8. One deterministic smoke-test prompt or audio fixture succeeds.
9. Runa / Wardenclyffe can discover the model through the model registry.
10. Failure messages identify the missing file, module, or incompatible version.

## Bifröst integration

Models must be registered by capability, not hard-coded by vendor name.

Runa may request:

- semantic desired-state parsing
- suggestion generation
- world-profile interpretation
- audio or music generation
- embeddings and historical-receipt retrieval

The routing layer selects an installed, verified model with the required
capability. Runa must degrade gracefully when a model is unavailable and must
never silently substitute an unverified build.

## Boxfire QA checklist

- Reject weights-only directories.
- Reject floating `main` revisions.
- Reject undocumented `trust_remote_code=True`.
- Reject adapters without their exact base-model revision.
- Reject model entries that cannot load with the network disabled.
- Reject dependency lists that omit architecture-specific modules.
- Record VRAM, RAM, disk use, load time, and inference smoke-test result.
- Confirm Windows support for every required native dependency.
- Confirm CPU fallback or an explicit unsupported-hardware message.
