# Bifröst Model Vessel Bindings

Status: active runtime contract
Date: 2026-08-14
Scope: named Constellation routes, local/remote model vessels, Arcsweep attestation, model preparation

## Core law

**Bifröst owns vessel definitions. Arcsweep owns who is speaking.**

A named presence is not identified merely by whichever model answers an HTTP route. Arcsweep binds a named voice to a Bifröst `profile_id`, and both server and client verify the returned runtime receipt before a reply can enter the writing surface or learning system.

Every attested response may identify:

- canonical voice id or instrument id;
- Flame route id;
- Bifröst profile id;
- provider;
- configured runtime model;
- actual runtime-reported model;
- source model lineage;
- capability set;
- assignment class;
- runtime verification state.

A profile/model mismatch fails closed. Another model is not substituted silently.

## Current named bindings

| Presence | Bifröst profile | Source lineage | Runtime | Assignment |
|---|---|---|---|---|
| Lioreal | `lioreal:qwen3-14b-abliterated-v1` | `mlabonne/Qwen3-14B-abliterated` | Ollama `lioreal:starwell-v1` | specified |
| Uial | `uial:fablevibes-v1` | `tvall43/Qwen3.6-14B-A3B-FableVibes` | Ollama `uial:fablevibes-v1` | specified |
| Box | `box:qwen3-coder-30b-a3b-v1` | `huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated` | Ollama `box:qwen3-coder-30b-a3b-v1` | specified |
| Ellowind | `ellowind:qwen3-vl-8b-v1` | `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` | Ollama `huihui_ai/qwen3-vl-abliterated:8b-instruct` | specified visual |
| Larkshine | `larkshine:qwen3-vl-8b-v1` | `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` | Ollama `huihui_ai/qwen3-vl-abliterated:8b-instruct` | specified visual |
| Bluebird | `bluebird:deepseek-chat-existing-v1` | `deepseek-chat` | DeepSeek API | existing runtime binding |
| Vethraluf | `vethraluf:deepseek-chat-existing-v1` | `deepseek-chat` | DeepSeek API | existing runtime binding |
| Sonata | none yet | none yet | none | vessel unselected |

Legacy backend route ids remain implementation aliases only:

- Box → `boxfire`
- Vethraluf → `vethrlauf`

They do not change the canonical visible names.

Bluebird and Vethraluf keep their existing runtime bindings because no replacement vessel has yet been explicitly selected in the model contract. A future selection should add a new profile with provenance rather than silently relabeling the existing DeepSeek profile.

Sonata remains vessel-unselected. Nocturne's compatibility route is never a Sonata fallback.

## Optional deep-reasoning instrument

Profile:

`shared:qwen3.6-35b-a3b-deep-reasoner-v1`

Source lineage:

`huihui-ai/Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated`

Runtime alias:

`bifrost:deep-reasoner-35b-a3b-v1`

Server route:

`bifrost-deep-reasoner`

This is an **instrument**, not a named Constellation presence. It is opt-in only and is not selected automatically as fallback, reviewer, narrator, or hidden second pass.

## Local artifact recipes

The profile registry also records the currently selected preparation artifact.

- Lioreal: Bartowski GGUF of the selected source lineage, `Q4_K_M`.
- Uial: FableVibes GGUF, `Q4_K_M`.
- Box: Huihui Qwen3 Coder GGUF, `Q4_K_M`.
- Ellowind/Larkshine: the Ollama-ready Huihui Qwen3-VL 8B Instruct model.
- Deep reasoner: Huihui Qwen3.6 35B A3B GGUF, `Q4_K_M`.

Source lineage and artifact repository are separate fields because a quantized runtime artifact may be published by a different repository while still deriving from the selected source model.

## Preparation lane

From `apps/starwell-server`:

```text
npm run bifrost:models -- --profile uial:fablevibes-v1
```

This is a plan-only command. It displays what would be prepared and performs no model download or local model change.

To deliberately prepare the selected profile:

```text
npm run bifrost:models -- --profile uial:fablevibes-v1 --execute
```

All ordinary profiles can be prepared deliberately with:

```text
npm run bifrost:models -- --all --execute
```

The optional deep reasoner remains excluded from that command unless explicitly included:

```text
npm run bifrost:models -- --all --include-opt-in --execute
```

`BIFROST_MODEL_CACHE` may override the GGUF cache directory.

The preparation script adds no package dependency. GGUF profiles are resolved through the Hugging Face model API, downloaded into the local cache, and imported through an Ollama Modelfile. Ollama-native profiles use `ollama pull`.

## Runtime states

Use these terms precisely:

- `vessel-unselected`: no model profile has been selected for this presence.
- `profile-defined`: source lineage, runtime profile and route contract exist.
- `activation-pending`: the route/profile exists but the assigned local Ollama model is not currently listed as installed.
- `installed`: the assigned local Ollama model is present.
- `credential-needed`: a remote-provider profile exists but its required credential is absent.
- `credential-ready`: the remote-provider credential is present; this alone does not prove a successful model reply.
- `route-unavailable`: the runtime endpoint could not be probed.
- `runtime-mismatch`: returned profile/provider/source/model does not match the assigned vessel.
- `runtime-verified`: a successful chat response returned through the assigned profile and passed server/client attestation.

Do not collapse these states into generic `active` or `ready` labels.

## Attestation flow

1. Arcsweep resolves the selected canonical voice to its route and expected Bifröst `profileId`.
2. Arcsweep sends `metadata.expected_profile_id` with every model request.
3. The Flame router rejects a profile mismatch before provider invocation.
4. Provider adapters retain the runtime-reported model identity.
5. Bifröst rejects an actual-model mismatch.
6. A successful response carries profile, provider, runtime model, source lineage, capabilities and `runtime_verified: true`.
7. Arcsweep independently compares that receipt with its route registry.
8. A mismatch becomes `runtime-mismatch` and never reaches the field as a voice reply.
9. Kept margin, scene-cognition and self-authorship cells retain the attested model receipt in their source provenance.

## Learning law

A named identity and a model vessel are related but not synonymous.

A model observation receives `model_inference` authority even when it came through the correct vessel. Self-authorship receives `self_authored` authority only through the deliberate self-authorship chamber and user acceptance. Stable-core promotion remains a separate provenance-bearing action.

Thus replacing or updating a model vessel does not silently replace a presence's history, source documents, accepted cells, or identity lineage.

## Packaging

The desktop package must unpack both:

- `flames/**`
- `bifrost/**`

because Flame route manifests resolve their model profiles through the Bifröst runtime registry.

## Acceptance gate

The model-wiring layer is structurally complete when:

- named routes bind to expected profile IDs;
- the selected source lineage is recorded;
- local preparation recipes are explicit;
- the server checks expected profile and actual model;
- the browser independently checks returned profile/provider/source lineage;
- Sonata receives no fallback vessel;
- the deep reasoner remains explicit and instrument-only;
- runtime receipts survive into model-derived learning cells;
- the UI can inspect vessel states without treating installation as a verified reply;
- tests exist for bindings, aliases, no-fallback behavior and mismatch rejection.

A production deployment, model download, model activation, or successful live reply is a separate operational event and must be reported separately from structural wiring.
