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

## Configuration

- `ATOMIC_CHAT_BASE_URL`, default `http://127.0.0.1:1337/v1`
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

## Next frontier

1. Mount the provider inside the main Hearthgate server after v0.1 is proven.
2. Add streaming chat and tool-call transport.
3. Discover Atomic engine and extension metadata through declared capabilities.
4. Add a Rust process supervisor with persistent diagnostics.
5. Add model load/unload commands only after permission and path boundaries are designed.
6. Evaluate upstream llama.cpp and Atomic TurboQuant as separate engines.
7. Preserve upstream notices for every adopted component.
