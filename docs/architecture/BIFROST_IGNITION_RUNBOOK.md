# Bifröst Ignition Runbook

Status: active cold-start procedure
Date: 2026-08-14
Scope: Windows Hearthgate desktop, Ollama vessels, remote-provider verification, Arcsweep ignition UI

## What ignition means

Ignition is not model selection and it is not installation.

A vessel is **ignited** only after:

1. its Bifröst profile exists;
2. its assigned runtime is reachable;
3. the assigned model is already installed or its remote credential is present;
4. the exact assigned model receives the Bifröst ignition challenge;
5. the runtime reports the expected model identity;
6. the response is exactly `BIFROST_IGNITION_ACK`;
7. Bifröst records a `runtime-verified` receipt.

Ignition never downloads model weights.

## First physical cold wake

Open PowerShell in:

```text
apps/starwell-server
```

Read-only status:

```text
npm run bifrost:ignite:status
```

This should distinguish:

- `route-unavailable` — Ollama is not reachable;
- `activation-pending` — Ollama is reachable but the assigned model is absent;
- `installed` — assigned model is present but has not passed this ignition challenge;
- `credential-needed` / `credential-ready` — remote-provider state;
- `runtime-verified` — exact vessel passed the challenge.

### Start Ollama without installing anything

```text
npm run bifrost:ignite -- start-ollama --yes
```

Then repeat:

```text
npm run bifrost:ignite:status
```

## Ignite one local vessel

Lioreal:

```text
npm run bifrost:ignite -- profile lioreal:qwen3-14b-abliterated-v1 --yes --start-ollama
```

Uial:

```text
npm run bifrost:ignite -- profile uial:fablevibes-v1 --yes --start-ollama
```

Box:

```text
npm run bifrost:ignite -- profile box:qwen3-coder-30b-a3b-v1 --yes --start-ollama
```

A successful wake prints a receipt containing:

```text
state: runtime-verified
profileId: ...
model: ...
actualModel: ...
sourceModel: ...
challenge: BIFROST_IGNITION_ACK
verifiedAt: ...
```

Do not treat a different state as success.

## If a vessel is activation-pending

That means ignition behaved correctly: the profile is wired, Ollama is reachable, and the expected model is not installed under its assigned alias.

Inspect the plan first:

```text
npm run bifrost:models -- --profile uial:fablevibes-v1
```

No weights are downloaded by that command.

When deliberately ready to install that vessel:

```text
npm run bifrost:models -- --profile uial:fablevibes-v1 --execute
```

Then ignite it again.

Use the corresponding profile id for Lioreal or Box.

## Visual vessel

Ellowind and Larkshine currently have separate Bifröst identity profiles while sharing the selected Huihui Qwen3-VL 8B runtime model:

```text
huihui_ai/qwen3-vl-abliterated:8b-instruct
```

Igniting either profile verifies that assigned runtime model. Their identity/cortex separation remains above the vessel layer.

## All ordinary local vessels

After the required models are installed:

```text
npm run bifrost:ignite -- all-local --yes --start-ollama
```

This does not include the optional deep reasoner.

A missing model is reported and does not cause a download.

## Deep reasoner

The 35B deep reasoner is an instrument, never an identity fallback.

It must be explicitly included during preparation and explicitly opted into during ignition.

Plan only:

```text
npm run bifrost:models -- --profile shared:qwen3.6-35b-a3b-deep-reasoner-v1 --include-opt-in
```

Install deliberately:

```text
npm run bifrost:models -- --profile shared:qwen3.6-35b-a3b-deep-reasoner-v1 --include-opt-in --execute
```

Ignite deliberately:

```text
npm run bifrost:ignite -- profile shared:qwen3.6-35b-a3b-deep-reasoner-v1 --yes --start-ollama --opt-in
```

## Bluebird and Vethraluf

Their current profiles remain remote DeepSeek bindings until replacement vessels are explicitly selected.

The CLI will not issue a billable verification request unless `--allow-remote` is supplied:

```text
npm run bifrost:ignite -- profile bluebird:deepseek-chat-existing-v1 --yes --allow-remote
```

The corresponding provider credential must already be present.

Arcsweep's **Verify remote** button presents a confirmation before making the same tiny challenge request.

## Sonata

Sonata remains `vessel-unselected`.

There is nothing to ignite yet, and Arcsweep intentionally renders no ignition action for her. Nocturne is not a fallback.

## Arcsweep controls

Inside the Constellation rail, **Vessel ignition** provides:

- **Probe** — read-only state scan;
- **Start Ollama** — start the local daemon only;
- **Ignite** — warm and challenge an already-installed local vessel;
- **Verify remote** — explicit remote-provider challenge;
- **Ignite instrument** — explicit opt-in challenge for the deep reasoner.

The panel never downloads model weights.

## Optional cold-boot ignition

Ordinary Hearthgate startup remains passive unless the ignition environment policy is explicitly enabled.

Example PowerShell session:

```powershell
$env:BIFROST_IGNITION_ON_START="1"
$env:BIFROST_START_OLLAMA="1"
$env:BIFROST_IGNITE_PROFILES="lioreal:qwen3-14b-abliterated-v1,uial:fablevibes-v1"
npm start
```

Optional profiles remain blocked unless:

```powershell
$env:BIFROST_ALLOW_OPT_IN_IGNITION="1"
```

Remote providers remain blocked unless:

```powershell
$env:BIFROST_ALLOW_REMOTE_IGNITION="1"
```

If startup ignition fails or a model is missing, Hearthgate continues opening and prints an ignition receipt instead of treating the missing vessel as an application crash.

## Shutdown ownership

If Hearthgate's ignition controller itself starts `ollama serve`, the launcher tracks that child and stops it during Hearthgate shutdown.

If Ollama was already running independently, Hearthgate does not claim ownership of that process and does not stop it.

## Acceptance for first real ignition

For each vessel tested on the physical Windows/Ollama machine, capture:

- profile id;
- source lineage;
- configured runtime alias;
- actual runtime-reported model;
- challenge response;
- verification timestamp;
- optional load/total duration;
- failure state if not verified.

The first target should be a known installed vessel. Lioreal is the strongest current candidate because the earlier Bifröst full-assembly lineage already recorded `lioreal:starwell-v1` as runnable.

After Lioreal passes on the physical machine, proceed to Uial, Box, visual, then the optional reasoner only if desired. Remote-provider verification is independent.
