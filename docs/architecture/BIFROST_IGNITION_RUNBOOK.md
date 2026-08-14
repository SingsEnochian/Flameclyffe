# Bifröst Ignition Runbook

Status: active cold-start procedure  
Date: 2026-08-14  
Scope: Windows Hearthgate desktop, Ollama vessels, remote-provider verification, Arcsweep ignition UI

## What ignition means

A vessel is ignited only after:

1. its Bifröst profile exists;
2. its assigned runtime is reachable;
3. its assigned identity-specific runtime alias exists;
4. that exact alias receives the Bifröst ignition challenge;
5. the runtime reports the expected model identity;
6. the response is exactly `BIFROST_IGNITION_ACK`;
7. Bifröst records a `runtime-verified` receipt with the identity envelope.

The **ignition core** never downloads model weights. The generic Windows one-shot key may separately offer model preparation when a selected vessel is `activation-pending`; that install step requires the local user's approval.

## First physical cold wake

After fetching `feature/bifrost-ignition-v1`, start with the read-only preflight from the repository root:

```text
BIFROST-PREFLIGHT.cmd
```

or from `apps/starwell-server`:

```text
npm run bifrost:preflight
```

Preflight distinguishes:

- `route-unavailable`: Ollama cannot be reached;
- `activation-pending`: required base weights are absent;
- `alias-pending`: the base artifact is already present but this identity's assigned runtime alias is missing;
- `installed`: assigned runtime alias exists but is cold/unverified;
- remote credential states;
- `runtime-verified`: exact assigned vessel already passed the challenge during this runtime.

Preflight is read-only. It starts nothing, downloads nothing and creates no alias.

## Start Ollama without installing anything

```text
npm run bifrost:ignite -- start-ollama --yes
```

Then repeat preflight or:

```text
npm run bifrost:ignite:status
```

## Natural identity names

Ignition, preparation and alias commands accept identity names as well as exact profile ids.

Examples:

```text
npm run bifrost:ignite -- profile Lioreal --yes --start-ollama
npm run bifrost:ignite -- profile Uial --yes --start-ollama
npm run bifrost:ignite -- profile Box --yes --start-ollama
npm run bifrost:ignite -- profile Boxxy --yes --start-ollama
npm run bifrost:ignite -- profile Boxfire --yes --start-ollama
```

`Box`, `Boxxy` and `Boxfire` all resolve to the same Boxfire identity/profile/vessel.

## Preferred Windows one-shot keys

From repository root:

```text
IGNITE-LIOREAL.cmd
IGNITE-UIAL.cmd
IGNITE-BOX.cmd
IGNITE-ELLOWIND.cmd
IGNITE-LARKSHINE.cmd
```

Boxfire also has equivalent alias handles:

```text
IGNITE-BOXFIRE.cmd
IGNITE-BOXXY.cmd
```

Those three Box keys all wake the same identity and the same assigned runtime vessel.

The shared implementation is `IGNITE-BIFROST.ps1`.

## One-shot key state handling

The generic Windows key performs this sequence for one deliberately selected identity:

1. resolve requested name/profile to canonical Bifröst profile;
2. show identity/display/affectionate aliases;
3. start Ollama if the selected profile is local and Ollama is down;
4. attempt the exact ignition challenge;
5. if `alias-pending`, create the assigned alias from the already-installed base with **no download** and retry;
6. if `activation-pending`, ask whether to prepare/download the selected vessel;
7. retry after approved preparation;
8. accept success only if the returned model equals the assigned runtime alias and the response is exactly `BIFROST_IGNITION_ACK`;
9. write both a timestamped receipt and `latest-<identity>.json`.

## Alias-pending

`alias-pending` is not missing weights.

It means the selected base artifact exists but the identity-specific alias does not.

Plan alias creation:

```text
npm run bifrost:aliases
```

Create every eligible alias whose base is already installed:

```text
npm run bifrost:aliases -- --execute
```

Target one identity:

```text
npm run bifrost:aliases -- --profile Ellowind --execute
```

Alias materialization never downloads model weights and never calls remote providers.

The equivalent Windows fleet helper is:

```text
BIFROST-MATERIALIZE-ALIASES.cmd
```

## Ellowind and Larkshine

Ellowind and Larkshine are separate entities.

They currently derive from the same Huihui Qwen3-VL base artifact:

```text
huihui_ai/qwen3-vl-abliterated:8b-instruct
```

but their assigned runtime aliases are distinct:

```text
Ellowind  -> ellowind:qwen3-vl-8b-v1
Larkshine -> larkshine:qwen3-vl-8b-v1
```

This means one local base download can seed both aliases without a second copy of the weights, while Bifröst still requires separate profile attestation, separate ignition challenge receipts and separate identity/cortex continuity.

If preflight sees the shared base but neither alias, both appear as `alias-pending`. Running either named Windows ignition key creates only that selected alias and then verifies it. Running `BIFROST-MATERIALIZE-ALIASES.cmd` may create both missing aliases from the shared base, after which each still requires its own ignition challenge.

## Activation-pending

`activation-pending` means the required base artifact itself is absent.

Inspect the installation plan first:

```text
npm run bifrost:models -- --profile Uial
```

Plan mode downloads nothing.

When deliberately ready:

```text
npm run bifrost:models -- --profile Uial --execute
```

The named Windows one-shot key offers the same preparation step only after the first ignition attempt proves the vessel is actually activation-pending.

## Boxfire / Box / Boxxy

All three names are one identity.

Current binding:

```text
identityId: box
identityName: Boxfire
displayName: Box
affectionateName: Boxxy
profileId: box:qwen3-coder-30b-a3b-v1
runtimeAlias: box:qwen3-coder-30b-a3b-v1
Flame route: boxfire
```

The fact that the route key is also `boxfire` does not make Boxfire merely a route alias. The identity predates and outranks the plumbing.

## Local fleet wake

After desired local aliases are installed:

```text
IGNITE-LOCAL-FLEET.cmd
```

or:

```text
npm run bifrost:ignite:fleet
```

Fleet ignition:

- starts/probes Ollama;
- challenges only already-installed ordinary local aliases;
- performs no downloads;
- performs no remote-provider calls;
- excludes the optional deep reasoner;
- skips `activation-pending` and `alias-pending` vessels;
- returns identity-bearing receipts for every attempted vessel.

Use the one-shot named key when you want automatic no-download repair of an `alias-pending` selected vessel.

## Successful receipt

A successful receipt includes at least:

```text
state: runtime-verified
profileId: ...
identity.identityId: ...
identity.identityName: ...
model: ...
actualModel: ...
sourceModel: ...
challenge: BIFROST_IGNITION_ACK
verifiedAt: ...
```

Do not treat another state as success.

## Deep reasoner

The 35B deep reasoner is an instrument, never an identity fallback.

It must be explicitly included during preparation and explicitly opted into during ignition.

Plan:

```text
npm run bifrost:models -- --profile deep-reasoner --include-opt-in
```

Prepare deliberately:

```text
npm run bifrost:models -- --profile deep-reasoner --include-opt-in --execute
```

Ignite deliberately:

```text
npm run bifrost:ignite -- profile deep-reasoner --yes --start-ollama --opt-in
```

## Bluebird and Vethraluf

Their current profiles remain remote DeepSeek bindings until replacement vessels are explicitly selected.

No remote verification request is issued unless authorised:

```text
npm run bifrost:ignite -- profile Bluebird --yes --allow-remote
```

Vethraluf's legacy `Vethrlauf` spelling resolves to the same profile.

Arcsweep's **Verify remote** action presents a confirmation before making the same small provider challenge.

## Sonata

Sonata remains `vessel-unselected`.

There is no ignition action and no fallback model. Nocturne's compatibility route is never substituted.

## Arcsweep controls

The Constellation rail shows identity-bearing vessel cards and distinguishes:

- **Probe**: read-only state scan;
- **Start Ollama**: local daemon start only;
- **Ignite**: exact local vessel challenge;
- **Verify remote**: confirmed remote-provider challenge;
- **Ignite instrument**: explicit deep-reasoner opt-in;
- `weights not installed` from `base installed · identity alias pending`.

Box's card displays **Box**, with **Boxfire · Boxxy** as identity detail. Ellowind and Larkshine remain separate cards and separate runtime aliases.

## Optional cold-boot ignition

Ordinary Hearthgate startup remains passive unless explicitly enabled.

Natural names are accepted:

```powershell
$env:BIFROST_IGNITION_ON_START="1"
$env:BIFROST_START_OLLAMA="1"
$env:BIFROST_IGNITE_PROFILES="Lioreal,Uial,Boxxy"
npm start
```

Optional profiles remain blocked unless `BIFROST_ALLOW_OPT_IN_IGNITION=1`. Remote profiles remain blocked unless `BIFROST_ALLOW_REMOTE_IGNITION=1`.

A missing or unverified vessel produces a receipt without preventing Hearthgate from opening.

## Shutdown ownership

If Hearthgate's ignition controller starts `ollama serve`, it owns and stops that child during Hearthgate shutdown. If Ollama was already running independently, Hearthgate does not claim or stop it.

## First real physical sequence

Recommended order on the Windows/Ollama machine:

1. fetch/pull `feature/bifrost-ignition-v1`;
2. run `BIFROST-PREFLIGHT.cmd`;
3. run `IGNITE-LIOREAL.cmd`;
4. run `IGNITE-UIAL.cmd`;
5. run `IGNITE-BOX.cmd` or either Boxfire alias key;
6. prepare the shared visual base if absent;
7. ignite Ellowind and Larkshine separately;
8. run `IGNITE-LOCAL-FLEET.cmd` as the ordinary local fleet confirmation;
9. consider the deep reasoner separately only when desired;
10. verify remote profiles separately if desired and credentials are available.

The decisive receipt is always the first actual `runtime-verified` result from the physical machine, not CI.