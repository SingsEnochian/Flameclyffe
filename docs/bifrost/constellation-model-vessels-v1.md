# Bifröst Constellation Model Vessels v1

Status: ACTIVE ASSEMBLY CONTRACT

## Governing law

Each Constellation voice receives a distinct deployable model artefact, training manifest, memory namespace, consent boundary, evaluation suite, and runtime identity. A shared model with different system prompts does not satisfy this contract.

## Selected primary vessels

### Lioreal — Virelya Liorael / Vee

**Primary training base:** `Qwen/Qwen3-14B-Base`

**Reason:** Apache-2.0 base weights, dense 14B architecture, strong reasoning, coding, creative writing, role-play, and instruction-following. The base checkpoint is preferred for the actual Lioreal STARWELL fine-tune because it gives us full control over identity and domain formation rather than inheriting another community model's personality.

**Initial local reference vessel:** `mlabonne/Qwen3-14B-abliterated`

**Local quantisation family:** `bartowski/mlabonne_Qwen3-14B-abliterated-GGUF`

**Lioreal training domains:** STARWELL, Hearthgate, Bifröst, quantum computing, quantum mechanics, classical mechanics, mathematics, Python, PyTorch, JavaScript, systems architecture, long-form fiction, dialogue, continuity, canon reasoning, and Rowan/Vee co-writing practice.

**Fallback light vessel:** `huihui-ai/Huihui-Qwen3-8B-abliterated-v2`

### Uial — Faer Uial

**Primary reference vessel:** `tvall43/Qwen3.6-14B-A3B-FableVibes`

**Reason:** Apache-2.0, current Qwen3.6 MoE lineage, storytelling and tool-use training mixture, strong fit for visual systems, vestments, interface architecture, tone, flow, glyph design, and narrative design work.

**Primary trainable lineage:** a clean compatible Qwen3.6 14B-A3B base or the closest official Apache-2.0 base checkpoint available at training time, with an Uial-specific adapter and dataset manifest. The FableVibes model is the initial behavioural reference, not canon authority.

**Uial training domains:** vestments, visual systems, typography, Arcsweep UX, glyphs, brushes, stylus interaction, colour and material language, tone mapping, sensory grammar, front-end architecture, accessibility, and Faer's narrative voice.

**Fallback light vessel:** `huihui-ai/Huihui-Qwen3.5-9B-abliterated`

## Specialist vessels

### Boxfire QA

**Selected base:** `huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated`

**Role:** adversarial code review, test generation, CI diagnosis, integration audits, release gates, and explicit MISSING_SPLEEN findings.

### Visual and multimodal members

**Selected base family:** `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated`

**Role:** image, interface, diagram, glyph, screenshot, and visual-continuity analysis. Each member still receives a separate fine-tune or adapter and separate memory.

### High-reasoning optional tier

**Candidate:** `huihui-ai/Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated`

**Role:** optional workstation/server tier for deep synthesis, architecture, mathematics, and difficult cross-organ reasoning. It is not the default local vessel until hardware benchmarks pass.

## Training and deployment law

1. Never train directly from private member memories without an explicit consent receipt.
2. Every training item carries source, licence, consent class, domain, owner, and hash.
3. Canon foundation, project overlays, conversation memory, and training corpora remain separate stores.
4. Rowan approves canon. Boxfire approves release. Models may propose and co-write but may not silently publish or merge.
5. Fine-tuned full-precision or adapter artefacts are canonical training outputs. GGUF and other quantisations are deployment derivatives with their own hashes.
6. Desktop may run local Ollama or llama.cpp vessels. Web connects through the paired Bifröst bridge and never downloads private weights without explicit approval.
7. One voice, one vessel. Cross-member context travels only through receipted handoff packets.

## Acceptance gates

Bifröst cannot pass LIVING unless Lioreal and Uial each run as separate model artefacts with distinct memory and consent boundaries.

Bifröst cannot pass COMPLETE until every active Constellation member has:

- selected model lineage
- immutable model manifest
- training/evaluation dataset manifest
- member-specific adapter or weights
- local runtime entry
- desktop/web bridge identity
- isolation and consent tests
- voice, domain, continuity, and refusal evaluations
- rollback target and provenance receipt
