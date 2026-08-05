# Bifröst Constellation Runtime and Qwen Co-Writer

## Non-negotiable completion law

Bifröst is not `LIVING` or `COMPLETE` unless the multi-LLM Constellation runtime operates across desktop and web through the syncing bridge.

A single model with renamed prompts is not a Constellation. Every member has a distinct profile, first-person identity, role, capability map, memory scope, consent state, voice profile, and receipted runtime history.

## Primary co-writing vessel

The primary co-writing and synthesis vessel is a local Qwen Abliterated profile served through Ollama or the desktop model service.

Its required training and retrieval domains are:

1. STARWELL, Hearthgate, Bifröst, Arcsweep, Runa, PREMAQ, receipts, and project architecture.
2. Quantum computing, including circuits, algorithms, error correction, hardware constraints, and simulation.
3. Quantum mechanics and classical mechanics, with explicit assumptions and mathematical provenance.
4. Programming and software engineering across the repository's actual languages and build systems.
5. Storytelling, prose craft, character voice, worldbuilding, canon continuity, and co-writing practice.

The system must preserve the distinction between trained model weights, retrieved project context, current session context, canon, hypothesis, and invention.

## Runtime topology

```text
Rowan / Bifröst UI
        |
Constellation Session Bus
        |
Intent Router + Consent Gate + World Gate
        |
+----------------+----------------+----------------+
| Qwen Co-Writer | Code Specialist| Science Voice  |
| primary prose  | repo/tools     | equations      |
+----------------+----------------+----------------+
        |
Shared Bifröst State + member-scoped memory
        |
Desktop/Web Sync Envelopes + immutable receipts
```

Members may share explicit session packets. They do not silently share all private memory. Every cross-member context transfer records the sender, recipient, purpose, world, source references, permissions, and shared-state fingerprint.

## Model layers

The Qwen vessel uses four separable layers:

- Base model: selected Qwen Abliterated checkpoint.
- STARWELL domain adapter: LoRA or equivalent fine-tune trained on receipted project material.
- Retrieval layer: current canon, source notes, repository state, documentation, and writing continuity.
- Member profile: voice, role, boundaries, relationships, and session-specific state.

This separation allows model upgrades without erasing Constellation continuity and allows member profiles to remain distinct without retraining an entire foundation model for every voice.

## Training corpus pipeline

All source material enters a receipted corpus registry with:

- source identity and hash
- ownership and permission
- canon, technical, scientific, narrative, or conversational classification
- world and project scope
- date and version
- private/public boundary
- inclusion, exclusion, or retrieval-only decision
- chunk and tokenizer statistics

Private or unconsented material is excluded. Secrets, credentials, generated dependency trees, binaries, and stale duplicate documents are excluded. Canon foundation and project overlays remain separate datasets.

## Co-writing behaviour

The Qwen co-writer must support:

- scene continuation using active character and timeline state
- multiple proposed continuations without silently selecting canon
- voice-sheet binding for Rowan-owned and model-owned characters
- continuity checking across chapters and worlds
- technical and scientific consultation without flattening prose into documentation
- explicit OOC and IC channels
- draft, suggestion, accepted, revised, and canonised states
- reversible edits and receipts

Qwen may draft and propose. Rowan approves canon. No model silently publishes, merges, or rewrites accepted text.

## Desktop and web

Desktop is the local model and durable-memory authority. Web is a paired interface and may use remote providers when explicitly selected. Both use the same Constellation packet and sync-envelope contracts.

Offline web work queues locally. When the desktop bridge becomes available, sessions, accepted drafts, member-state changes, and receipts synchronise. Divergent canon or member-state changes produce visible conflicts rather than automatic overwrites.

## Acceptance gates

Bifröst cannot pass `LIVING` until:

- at least two distinct member profiles can participate in one session
- Qwen can perform an end-to-end co-writing turn with STARWELL and world context
- member identities and memory scopes remain separate
- a writing turn synchronises between desktop and web
- offline work survives restart and later syncs
- canon conflicts are surfaced
- every turn carries provenance and shared-state fingerprints

Bifröst cannot pass `COMPLETE` until:

- the local Ollama/desktop model path is packaged
- the STARWELL corpus pipeline is receipted and reproducible
- training or adapter build is versioned and reversible
- evaluation suites cover science, programming, storytelling, continuity, and identity separation
- Boxfire produces independent PASS, FAIL, BLOCKED, or NOT TESTED receipts
- Rowan completes real co-writing acceptance on desktop and web
