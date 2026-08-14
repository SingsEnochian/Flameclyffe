# Bifröst Desktop Runtime Security

Status: active security contract  
Date: 2026-08-14  
Scope: packaged Hearthgate desktop, local Flame calls, Bifröst ignition, legacy bridge

## Purpose

Hearthgate needs one local authorization boundary for model invocation and privileged runtime actions without making a secret part of model identity or exposing that secret to ordinary renderer JavaScript.

The credential is the **House runtime token**.

It authorizes local runtime actions. It does not identify Lioreal, Uial, Boxfire, Ellowind, Larkshine, Bluebird, Vethraluf, Sonata, or any model vessel.

## Storage

The desktop setup wizard stores `keys.runtime` inside Hearthgate's protected configuration envelope.

When Electron `safeStorage` is available, the configuration payload is protected by the operating-system key store. Renderer-visible configuration is redacted:

- secret fields cross IPC as configured/not-configured booleans;
- custom secret fields expose names only;
- the runtime token value is never returned by `get-config`;
- reopening setup preserves existing encrypted values when the corresponding field is left blank.

`ARCSWEEP_RUNTIME_TOKEN` is reserved and cannot be injected through `keys.custom`.

## Server authorization

The local core accepts either configured channel:

- `ARCSWEEP_RUNTIME_TOKEN`
- `HEARTHGATE_GATEWAY_TOKEN`

Token comparison is timing-safe.

Privileged local actions require a valid Bearer token, including:

- Flame chat;
- Flame context query;
- Flame memory proposal;
- starting Ollama through Bifröst;
- Bifröst profile ignition;
- runtime alias materialization;
- explicit remote-provider ignition challenge.

Read-only local status remains available without a runtime token where no state or provider invocation occurs.

## Packaged Electron path

The Electron main process retains the decrypted House runtime token in main-process memory while Hearthgate is running.

A narrowly scoped `webRequest.onBeforeSendHeaders` hook adds:

```text
Authorization: Bearer <house-runtime-token>
```

only to Hearthgate's own loopback runtime URLs:

```text
http://localhost:3841/api/v1/flames/*
http://127.0.0.1:3841/api/v1/flames/*
http://localhost:3841/api/v1/bifrost/ignition/*
http://127.0.0.1:3841/api/v1/bifrost/ignition/*
http://localhost:3841/api/chat*
http://127.0.0.1:3841/api/chat*
```

The filter rejects other ports, external hosts, provider APIs, ordinary pages and unrelated localhost traffic.

The renderer receives only `electronAPI.hasRuntimeToken(): boolean`.

It never receives the token itself.

## Browser / PWA path

Outside packaged Hearthgate, Electron cannot inject authorization.

Arcsweep therefore keeps the existing explicit session-token path:

- token entered into the Runtime bridge;
- held in module memory only;
- not persisted to localStorage or Arcsweep state;
- cleared on reload or explicit Forget;
- used only to build Authorization headers for runtime calls.

The two paths are alternatives, not two required secrets:

```text
packaged Hearthgate -> secure Electron credential
browser/PWA         -> explicit in-memory session credential
```

## Credential detection

Arcsweep may ask whether a runtime credential is available.

It checks:

1. an explicit in-memory session token;
2. otherwise the Electron boolean capability.

It does not request the stored desktop token.

A credential being available means a request may be authorized. It does **not** imply that a model vessel is installed, ignited or runtime-verified.

## Legacy route containment

The historical `server.js` monolith still contains an old `MEMBER_CONFIGS` provider map.

Default Hearthgate launch paths use `server-secure.js`, which shadows the old compatibility surfaces before loading the monolith:

- legacy `/api/chat` proxies to authoritative Bifröst Flame routes;
- legacy `/api/model-status` reports authoritative Bifröst profile/runtime state.

The compatibility chat route validates the same House runtime token and forwards `expected_profile_id` to the Flame route.

Thus legacy pages retain their endpoint shape without retaining authority over model selection.

## Identity law

Authorization and identity are separate dimensions.

Examples:

- `Box`, `Boxxy`, and `Boxfire` authorize through the same House token because they are one identity, but their identity continuity comes from Boxfire's cortex/profile lineage, not from the token.
- Ellowind and Larkshine use the same House authorization boundary, yet remain separate identities and separate runtime aliases.
- Sonata having a valid House token does not create a vessel for Sonata and does not permit fallback impersonation.

## Alias materialization

An `alias-pending` vessel means its base artifact is already installed but its assigned identity-specific alias is absent.

Alias creation:

- is privileged and token-gated in the browser UI;
- requires explicit confirmation;
- creates only the selected profile alias;
- downloads no weights;
- calls no remote provider;
- preserves distinct-entity aliases even when base weights are shared.

## Setup reconfiguration

Reopening the setup wizard must never require Electron to reveal stored secrets.

The renderer receives redacted configuration and marks configured slots. During save, a one-use preserve marker may represent "keep the existing encrypted value." The main process resolves that marker against the protected configuration before writing a new encrypted envelope.

On first setup, the preserve marker has no existing value to resolve and therefore cannot masquerade as a valid House token.

## Operational diagnostics

`BIFROST-DOCTOR.cmd` / `scripts/bifrost-doctor.js` are read-only diagnostics. They report:

- secure-launch contract state;
- runtime-token configured/not-configured only;
- Node/platform/memory/disk information;
- Ollama CLI availability;
- profile states;
- local receipts visible to the ledger;
- no secret values.

The doctor starts nothing, downloads nothing and invokes no provider.

## Security acceptance gate

The desktop runtime-security layer is acceptable when:

- secure config redacts secret values;
- reconfiguration preserves stored secrets without returning them to the renderer;
- privileged server routes enforce House runtime authorization;
- Electron injection is limited to exact Hearthgate loopback runtime paths;
- provider URLs never receive the House token;
- renderer code can detect credential readiness without reading the credential;
- browser/PWA credentials remain memory-only;
- legacy chat/status cannot recover provider-selection authority;
- runtime receipts contain no secret-bearing fields;
- model identity, user consent and runtime authorization remain distinct concepts.
