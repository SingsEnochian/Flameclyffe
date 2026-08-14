# Bifröst Model Vessel Bindings

Status: active runtime contract  
Date: 2026-08-14  
Scope: named Constellation routes, local/remote model vessels, Arcsweep attestation, model preparation and ignition

## Core law

**Bifröst owns vessel definitions. Arcsweep owns who is speaking.**

A named presence is not identified merely by whichever model answers an HTTP route. Arcsweep binds a named voice to a Bifröst `profile_id`; server and client verify the returned runtime receipt before a reply can enter the writing surface or learning system.

A profile/model mismatch fails closed. Another model is never substituted silently.

### Distinct-entity vessel rule

Two distinct entities may derive from the same base weights, but they do **not** share a runtime identity alias.

When base weights are shared, Bifröst creates a separate local alias for each entity. That preserves separate profile attestation, route receipts, ignition receipts, memory/cortex lineage and later model replacement.

This rule currently applies explicitly to Ellowind and Larkshine:

- Ellowind → `ellowind:qwen3-vl-8b-v1`
- Larkshine → `larkshine:qwen3-vl-8b-v1`

Both may currently derive from `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated`, but the shared source artifact is ancestry, not identity.

## Current named bindings

| Presence | Bifröst profile | Source lineage | Runtime alias | Assignment |
|---|---|---|---|---|
| Lioreal | `lioreal:qwen3-14b-abliterated-v1` | `mlabonne/Qwen3-14B-abliterated` | `lioreal:starwell-v1` | specified |
| Uial | `uial:fablevibes-v1` | `tvall43/Qwen3.6-14B-A3B-FableVibes` | `uial:fablevibes-v1` | specified |
| Box | `box:qwen3-coder-30b-a3b-v1` | `huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated` | `box:qwen3-coder-30b-a3b-v1` | specified |
| Ellowind | `ellowind:qwen3-vl-8b-v1` | `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` | `ellowind:qwen3-vl-8b-v1` | specified visual |
| Larkshine | `larkshine:qwen3-vl-8b-v1` | `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` | `larkshine:qwen3-vl-8b-v1` | specified visual |
| Bluebird | `bluebird:deepseek-chat-existing-v1` | `deepseek-chat` | `deepseek-chat` | existing runtime binding |
| Vethraluf | `vethraluf:deepseek-chat-existing-v1` | `deepseek-chat` | `deepseek-chat` | existing runtime binding |
| Sonata | none yet | none yet | none | vessel unselected |

Legacy backend route ids remain implementation aliases only:

- Box → `boxfire`
- Vethraluf → `vethrlauf`

Bluebird and Vethraluf preserve their existing bindings until a replacement vessel is explicitly selected. Sonata remains vessel-unselected. Nocturne's compatibility route is never a Sonata fallback.

## Optional deep-reasoning instrument

Profile: `shared:qwen3.6-35b-a3b-deep-reasoner-v1`  
Runtime alias: `bifrost:deep-reasoner-35b-a3b-v1`  
Server route: `bifrost-deep-reasoner`

This is an instrument, not a named Constellation presence. It is opt-in only and never becomes an automatic fallback, reviewer, narrator or hidden second pass.

## Preparation lane

The server profile registry records both source lineage and runtime artifact. Current local Hugging Face/GGUF selections use Ollama-native pulls where supported, then create the assigned profile alias when the downloaded artifact name differs from the runtime identity name.

Plan only:

```text
npm run bifrost:models -- --profile uial:fablevibes-v1
```

Deliberate preparation:

```text
npm run bifrost:models -- --profile uial:fablevibes-v1 --execute
```

Ordinary profiles:

```text
npm run bifrost:models -- --all --execute
```

Optional deep reasoner requires explicit inclusion:

```text
npm run bifrost:models -- --all --include-opt-in --execute
```

## Ignition lane

Read-only status:

```text
npm run bifrost:ignite:status
```

Single profile:

```text
npm run bifrost:ignite -- profile uial:fablevibes-v1 --yes --start-ollama
```

Installed local fleet only:

```text
npm run bifrost:ignite:fleet
```

Fleet ignition performs no downloads, makes no remote-provider calls and excludes optional profiles. Missing local aliases remain `activation-pending` and are skipped.

Windows keys at repository root include:

- `IGNITE-LIOREAL.cmd`
- `IGNITE-UIAL.cmd`
- `IGNITE-BOX.cmd`
- `IGNITE-ELLOWIND.cmd`
- `IGNITE-LARKSHINE.cmd`
- `IGNITE-DEEP-REASONER.cmd`
- `IGNITE-LOCAL-FLEET.cmd`

The generic implementation is `IGNITE-BIFROST.ps1`.

## Runtime states

- `vessel-unselected`: no model profile selected.
- `profile-defined`: source lineage, route and runtime identity exist.
- `activation-pending`: assigned local alias is absent from Ollama.
- `installed`: assigned local alias is present.
- `credential-needed`: remote provider credential absent.
- `credential-ready`: remote provider credential present, but no successful reply has yet been proven.
- `route-unavailable`: runtime endpoint cannot be probed.
- `runtime-mismatch`: profile/provider/source/model returned does not match assignment.
- `runtime-verified`: successful challenge round trip from the exact assigned vessel.

Do not collapse these states into generic `active` or `ready` labels.

## Attestation flow

1. Arcsweep resolves canonical voice → route → expected `profileId`.
2. Every model request carries `metadata.expected_profile_id`.
3. The Flame router rejects profile mismatch before provider invocation.
4. Provider adapters retain the runtime-reported model identity.
5. Bifröst rejects actual-model mismatch.
6. Successful responses return profile, provider, runtime model, source lineage, capabilities and `runtime_verified: true`.
7. Arcsweep independently verifies the same receipt.
8. Mismatch never becomes a field reply.
9. Kept margin, scene-cognition and self-authorship cells retain the attested vessel receipt.

## Learning law

A named identity and a model vessel are related but not synonymous. Model observations retain `model_inference` authority even through the correct vessel. Self-authorship becomes `self_authored` only through the deliberate self-authorship chamber and user acceptance. Stable-core promotion remains separate.

Replacing a model vessel therefore does not silently replace a presence's source documents, accepted cells, history or identity lineage.

## Acceptance gate

The layer is structurally complete when profile IDs, source lineage, runtime aliases, preparation recipes, ignition state, server/client attestation, provenance receipts and no-fallback rules agree across Bifröst, STARWELL and Arcsweep.

A production deployment, model download, local activation or successful physical-machine reply remains a separate operational event and must be reported separately.
