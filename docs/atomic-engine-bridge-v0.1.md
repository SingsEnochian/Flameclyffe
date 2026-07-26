# Atomic Engine Bridge v0.1

## Purpose

Atomic Chat is treated as an external local inference foundry. Hearthgate remains the House interface, memory system, permission boundary, and continuity layer.

No Atomic Chat source is vendored in this milestone.

## Architecture

```text
Hearthgate / Arkfire / STARWELL
            |
            | House-owned HTTP adapter
            v
http://127.0.0.1:31337
  Hearthgate Atomic Bridge
            |
            | OpenAI-compatible API
            v
http://127.0.0.1:1337/v1
       Atomic Chat
            |
   local inference engines
```

The separate bridge process is intentional in v0.1. It can be started, stopped, replaced, or removed without changing Atomic Chat or Hearthgate's main server.

## Node 24 bridge

Start from `apps/starwell-server`:

```bash
npm run start:atomic-bridge
```

Default bridge endpoint:

```text
http://127.0.0.1:31337
```

Routes:

- `GET /health` reports the bridge process itself.
- `GET /api/v1/engines/atomic/status` probes Atomic Chat and returns latency plus loaded models.
- `GET /api/v1/engines/atomic/models` returns normalised model records.
- `POST /api/v1/engines/atomic/chat` sends one bounded, non-streaming OpenAI-compatible chat completion.

Example request:

```json
{
  "model": "<loaded-model-id>",
  "messages": [
    { "role": "system", "content": "You are a local House research assistant." },
    { "role": "user", "content": "Report engine status in one sentence." }
  ],
  "max_tokens": 256,
  "temperature": 0.4
}
```

## Atomic Laboratory Flame

`atomic_lab` is an opt-in Flame route using `provider: "atomic"`. It does not replace or alter Vee, Yggdrasil, Faer, Bluebird, Vethrlauf, or Boxfire.

The route preserves the normal Flame contract:

- Hearthfire context retrieval remains available.
- route receipts still record provider and model identity.
- direct memory writes are disabled.
- tool writes require human approval.
- the local model is not permitted to claim a House member's identity or continuity.

Set the model id to one currently loaded in Atomic Chat:

```bash
ATOMIC_CHAT_MODEL=<loaded-model-id>
```

Then use the normal Flame route:

```text
POST /api/v1/flames/atomic_lab/chat
```

The provider refuses to run when `ATOMIC_CHAT_MODEL` is absent rather than guessing which model should speak.

## Configuration

- `ATOMIC_CHAT_BASE_URL`, default `http://127.0.0.1:1337/v1`
- `ATOMIC_CHAT_MODEL`, required by the `atomic_lab` Flame
- `ATOMIC_CHAT_API_KEY`, optional and omitted by default
- `ATOMIC_CHAT_ALLOW_LAN=true`, explicit opt-in for a non-loopback Atomic endpoint
- `ATOMIC_BRIDGE_HOST`, default `127.0.0.1`
- `ATOMIC_BRIDGE_PORT`, default `31337`
- `ATOMIC_BRIDGE_ALLOW_LAN=true`, explicit opt-in for a non-loopback bridge listener

Loopback is a law, not a suggestion. LAN exposure requires a separate explicit decision for both upstream and bridge.

## Current safety boundaries

- no telemetry
- no prompt logging
- no production analytics keys
- no inherited Atomic extensions
- no model downloads
- no process launching
- no arbitrary endpoint supplied by an HTTP caller
- 512 KB bridge request limit
- 64-message request limit
- 100,000-character limit per message
- 2.5-second health timeout
- 60-second default chat timeout
- streaming intentionally disabled in v0.1

## Rust laboratory

The first crate is at `labs/atomic-engine-bridge-rs`.

It has no third-party dependencies. It opens a bounded TCP connection to a loopback HTTP endpoint, requests `/v1/models`, parses the status line, extracts model ids, and emits a machine-readable status record.

Run:

```bash
cargo run --manifest-path labs/atomic-engine-bridge-rs/Cargo.toml --bin atomic-engine-probe
```

Or provide an endpoint:

```bash
cargo run --manifest-path labs/atomic-engine-bridge-rs/Cargo.toml --bin atomic-engine-probe -- http://127.0.0.1:1337/v1
```

Exit codes:

- `0`: endpoint reachable
- `2`: endpoint configuration rejected
- `3`: endpoint unreachable or returned an invalid response

## Automated proof

The `Atomic Engine Bridge` workflow now contains three proving circuits:

1. Node 24 syntax and dependency-free unit tests.
2. Rust formatting, compilation, and locked tests.
3. A complete integration circuit that starts a deterministic OpenAI-compatible mock engine, starts the House bridge, verifies model discovery and chat, and sends the Rust probe through the same live endpoint.

This proves the transport and boundary contract without downloading a model or relying on external services.

## Next frontier

1. Add streaming chat and tool-call transport.
2. Discover Atomic engine and extension metadata through declared capabilities.
3. Add a Rust process supervisor with persistent diagnostics and bounded restart policy.
4. Add model load/unload commands only after permission and path boundaries are designed.
5. Evaluate upstream llama.cpp and Atomic TurboQuant as separate engines.
6. Preserve upstream notices for every adopted component.
7. Add a real-machine acceptance check against an installed Atomic Chat release.
