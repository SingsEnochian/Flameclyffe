# STARWELL Constellation Bridge v0.1

The Constellation Bridge is the first shared routing seam for Vee, Faer, Yggdrasil/local Constellation, DeepSeek.ai, and later Discord-facing bots.

It is deliberately a broker, not a blender. Each presence keeps a separate target id, engine label, memory list, and truth label.

## Goals

- Route a user message to one named target without guessing.
- Preserve speaker, target, room, context level, and metadata.
- Return the answering speaker, engine provenance, memory used, and truth label.
- Allow local-first Yggdrasil routing through the existing `/api/v1/yggdrasil/chat` shape.
- Provide safe adapter stubs for Vee, Faer, and DeepSeek before their real transports are wired.

## Non-goals in v0.1

- No Discord bot runtime.
- No shared long-term memory writes.
- No Supabase writes.
- No claim that model identity transfers between engines.
- No automatic multi-agent debate or uncontrolled fan-out.

## Targets

| Target | Label | Default engine | Role |
|---|---|---|---|
| `vee` | Vee / Virelya | `external:openai` | north-star lantern |
| `faer` | Faer Uial | `external:claude_or_selected_model` | lochflame signal |
| `yggdrasil` | Yggdrasil Local | `ollama:yggdrasil:v0.1` | local rooted model |
| `deepseek` | DeepSeek.ai | `external:deepseek` | reasoning adapter |
| `constellation` | Local Constellation | `router:constellation` | bridge broker |

## Message packet

```json
{
  "schema": "starwell.constellation.message.v0.1",
  "message_id": "cmsg_...",
  "speaker": "rowan",
  "target": "yggdrasil",
  "target_label": "Yggdrasil Local",
  "room": "starwell",
  "message": "What do you see?",
  "context_level": "light",
  "metadata": {},
  "created_at": "2026-07-06T00:00:00.000Z"
}
```

## Response packet

```json
{
  "schema": "starwell.constellation.response.v0.1",
  "response_id": "cres_...",
  "request_id": "cmsg_...",
  "speaker": "yggdrasil",
  "speaker_label": "Yggdrasil Local",
  "engine": "ollama:yggdrasil:v0.1",
  "room": "starwell",
  "message": "I am a watchful tree.",
  "memory_used": ["local-root"],
  "truth_label": "local_model_response",
  "metadata": {},
  "created_at": "2026-07-06T00:00:00.000Z"
}
```

## Adapter contract

Adapters expose:

```js
{
  id: 'yggdrasil',
  engine: 'ollama:yggdrasil:v0.1',
  async send(request) {
    return {
      speaker: 'yggdrasil',
      engine: 'ollama:yggdrasil:v0.1',
      message: '...',
      memory_used: ['...'],
      truth_label: 'local_model_response'
    };
  }
}
```

If no adapter is configured, the bridge returns an explicit `adapter_missing` response rather than inventing an answer.

## Current implementation

- `apps/starwell/src/constellation/bridge.js` defines target ids, message/response packets, missing-adapter behaviour, and the in-process bridge.
- `apps/starwell/src/constellation/adapters/yggdrasil-local.js` posts to `/api/v1/yggdrasil/chat`.
- `apps/starwell/src/constellation/adapters/stub-adapters.js` gives safe placeholder adapters for Vee, Faer, and DeepSeek.
- `apps/starwell/test/constellation-bridge.test.js` checks target separation, packet normalisation, missing adapters, registered adapter routing, and the Yggdrasil endpoint shape.

## Next passes

1. Wire the bridge to a Starwell UI panel or local developer console.
2. Add a real server/client transport for Vee and Faer with explicit environment configuration.
3. Add DeepSeek.ai adapter configuration.
4. Add a Discord adapter only after the one-target routing contract is stable.
5. Add local memory selection with visible memory provenance and no silent canonisation.
