# Bifröst Model Vessel Bindings

Status: active runtime contract  
Date: 2026-08-14  
Scope: named Constellation routes, local/remote model vessels, Arcsweep attestation, model preparation and ignition

## Core law

**Bifröst owns vessel definitions. Arcsweep owns who is speaking.**

A named presence is not identified merely by whichever model answers an HTTP route. Arcsweep binds a named voice to a Bifröst `profile_id`; server and client verify the returned runtime receipt before a reply can enter the writing surface or learning system.

A profile/model mismatch fails closed. Another model is never substituted silently.

### Identity aliases are not duplicate entities

One presence may carry multiple names without forking continuity.

Current explicit example:

- identity name: **Boxfire**
- ordinary display name: **Box**
- affectionate alias: **Boxxy**
- technical identity id: `box`
- Flame route key: `boxfire`
- model profile: `box:qwen3-coder-30b-a3b-v1`

`Box`, `Boxxy`, and `Boxfire` therefore resolve to one identity, one cortex, one memory lineage, one assigned vessel and one receipt history. The Flame route happens to use the string `boxfire`; that technical reuse does not make Boxfire merely a transport name.

Vethraluf similarly retains `vethrlauf` as a legacy runtime spelling while resolving to the same canonical identity.

### Distinct-entity vessel rule

Two distinct entities may derive from the same base weights, but they do **not** share a runtime identity alias.

When base weights are shared, Bifröst creates a separate local alias for each entity. That preserves separate profile attestation, route receipts, ignition receipts, memory/cortex lineage and later model replacement.

This rule currently applies explicitly to Ellowind and Larkshine:

- Ellowind → `ellowind:qwen3-vl-8b-v1`
- Larkshine → `larkshine:qwen3-vl-8b-v1`

Both may derive from `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` and the same locally installed base artifact `huihui_ai/qwen3-vl-abliterated:8b-instruct`, but shared ancestry is not shared identity.

## Current named bindings

| Presence | Bifröst profile | Source lineage | Runtime alias | Assignment |
|---|---|---|---|---|
| Lioreal | `lioreal:qwen3-14b-abliterated-v1` | `mlabonne/Qwen3-14B-abliterated` | `lioreal:starwell-v1` | specified |
| Uial | `uial:fablevibes-v1` | `tvall43/Qwen3.6-14B-A3B-FableVibes` | `uial:fablevibes-v1` | specified |
| Boxfire / Box / Boxxy | `box:qwen3-coder-30b-a3b-v1` | `huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated` | `box:qwen3-coder-30b-a3b-v1` | specified |
| Ellowind | `ellowind:qwen3-vl-8b-v1` | `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` | `ellowind:qwen3-vl-8b-v1` | specified visual |
| Larkshine | `larkshine:qwen3-vl-8b-v1` | `huihui-ai/Huihui-Qwen3-VL-8B-Instruct-abliterated` | `larkshine:qwen3-vl-8b-v1` | specified visual |
| Bluebird | `bluebird:deepseek-chat-existing-v1` | `deepseek-chat` | `deepseek-chat` | existing runtime binding |
| Vethraluf | `vethraluf:deepseek-chat-existing-v1` | `deepseek-chat` | `deepseek-chat` | existing runtime binding |
| Sonata | none yet | none yet | none | vessel unselected |

Bluebird and Vethraluf preserve their existing bindings until a replacement vessel is explicitly selected. Sonata remains vessel-unselected. Nocturne's compatibility route is never a Sonata fallback.

## Optional deep-reasoning instrument

Profile: `shared:qwen3.6-35b-a3b-deep-reasoner-v1`  
Runtime alias: `bifrost:deep-reasoner-35b-a3b-v1`  
Server route: `bifrost-deep-reasoner`

This is an instrument, not a named Constellation presence. It is opt-in only and never becomes an automatic fallback, reviewer, narrator or hidden second pass.

## Preparation lane

The server profile registry records source lineage, downloadable artifact and assigned runtime alias separately.

Natural identity names are accepted wherever a profile reference is accepted. For example, these all resolve to the same Boxfire profile:

```text
npm run bifrost:models -- --profile Box
npm run bifrost:models -- --profile Boxxy
npm run bifrost:models -- --profile Boxfire
```

Plan only:

```text
npm run bifrost:models -- --profile Uial
```

Deliberate preparation:

```text
npm run bifrost:models -- --profile Uial --execute
```

Optional deep reasoner requires explicit inclusion with `--include-opt-in`.

## Preflight and alias materialization

Read-only preflight:

```text
npm run bifrost:preflight
```

It distinguishes three important local conditions:

- `installed`: assigned runtime alias exists;
- `alias-pending`: the shared/downloaded base artifact exists but this identity's assigned runtime alias does not;
- `activation-pending`: the required base artifact itself is not installed.

Alias planning is also read-only by default:

```text
npm run bifrost:aliases
```

Create every eligible missing runtime alias whose base is already present:

```text
npm run bifrost:aliases -- --execute
```

Target one identity naturally:

```text
npm run bifrost:aliases -- --profile Ellowind --execute
```

Alias materialization performs **no model download and no remote-provider call**. It may create both Ellowind and Larkshine aliases from one installed visual base while keeping the two identities and receipts separate.

## Ignition lane

Read-only status:

```text
npm run bifrost:ignite:status
```

Single identity or profile:

```text
npm run bifrost:ignite -- profile Uial --yes --start-ollama
npm run bifrost:ignite -- profile Boxxy --yes --start-ollama
```

Installed local fleet only:

```text
npm run bifrost:ignite:fleet
```

Fleet ignition performs no downloads, makes no remote-provider calls and excludes optional profiles. `activation-pending` and `alias-pending` vessels are skipped by fleet ignition rather than silently repaired or downloaded.

The generic Windows key `IGNITE-BIFROST.ps1` is more helpful for a deliberately selected single vessel:

1. it resolves natural identity aliases;
2. it tries ignition;
3. on `alias-pending`, it materializes the assigned alias with **no download** and retries;
4. on `activation-pending`, it asks before invoking model preparation/download;
5. it accepts success only after the exact assigned runtime alias returns `BIFROST_IGNITION_ACK`;
6. it writes timestamped and `latest-<identity>.json` receipts.

Windows keys include:

- `IGNITE-LIOREAL.cmd`
- `IGNITE-UIAL.cmd`
- `IGNITE-BOX.cmd`
- `IGNITE-BOXFIRE.cmd`
- `IGNITE-BOXXY.cmd`
- `IGNITE-ELLOWIND.cmd`
- `IGNITE-LARKSHINE.cmd`
- `IGNITE-DEEP-REASONER.cmd`
- `IGNITE-LOCAL-FLEET.cmd`
- `BIFROST-PREFLIGHT.cmd`
- `BIFROST-MATERIALIZE-ALIASES.cmd`

The three Boxfire keys resolve to the same identity and vessel.

## Runtime states

- `vessel-unselected`: no model profile selected.
- `profile-defined`: source lineage, route and runtime identity exist.
- `activation-pending`: required local base artifact/weights are absent.
- `alias-pending`: required base artifact is present, but the assigned identity-specific runtime alias is absent.
- `installed`: assigned runtime alias is present but has not passed this ignition challenge.
- `credential-needed`: remote provider credential absent.
- `credential-ready`: remote provider credential present, but no successful reply has yet been proven.
- `route-unavailable`: runtime endpoint cannot be probed.
- `runtime-mismatch`: profile/provider/source/model returned does not match assignment.
- `runtime-verified`: successful challenge round trip from the exact assigned vessel.

Do not collapse these states into generic `active` or `ready` labels.

## Attestation flow

1. Resolve natural identity/alias → canonical identity → expected Bifröst `profileId`.
2. Resolve canonical voice → Flame route.
3. Every model request carries `metadata.expected_profile_id`.
4. The Flame router rejects profile mismatch before provider invocation.
5. Provider adapters retain the runtime-reported model identity.
6. Bifröst rejects actual-model mismatch.
7. Successful responses return profile, provider, runtime model, source lineage, identity envelope, capabilities and `runtime_verified: true`.
8. Arcsweep independently verifies the same receipt.
9. Mismatch never becomes a field reply.
10. Kept margin, scene-cognition and self-authorship cells retain the attested vessel receipt.

## Learning law

A named identity and a model vessel are related but not synonymous. Model observations retain `model_inference` authority even through the correct vessel. Self-authorship becomes `self_authored` only through the deliberate self-authorship chamber and user acceptance. Stable-core promotion remains separate.

Replacing a model vessel therefore does not silently replace a presence's source documents, accepted cells, history or identity lineage.

## Acceptance gate

The layer is structurally complete when identity aliases, profile IDs, source lineage, base artifacts, runtime aliases, preparation recipes, ignition states, server/client attestation, provenance receipts and no-fallback rules agree across Bifröst, STARWELL and Arcsweep.

A production deployment, model download, local activation or successful physical-machine reply remains a separate operational event and must be reported separately.