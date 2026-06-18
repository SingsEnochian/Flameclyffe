# Stonewood Manifest Engine v0.1

The Stonewood Manifest Engine grows a room interface from a room seed manifest. A room is not hardcoded HTML; it is a typed seed that a renderer, runtime, and service adapter can interpret.

## Core principle

Poetry chooses the room. Schema protects the room. Renderer grows the room. Runtime lets it breathe.

## Source pieces

- `starwell/rooms/schemas/starwell-room-seed.schema.json` defines the room contract.
- `starwell/rooms/examples/moonroot-writing-chamber.json` is the first prototype room seed.

## Modular boundaries

### StarwellRoomSeed

Data only. It names the room, purpose, theme, nodes, signals, consent defaults, storage rules, renderer hints, and accessibility defaults.

A seed may define a portal node, but portal nodes must include a target. A seed may choose renderer hints, but it must not fetch telemetry or own runtime behaviour.

### StonewoodRoomRenderer

Consumes a room seed and emits a visual room surface. The renderer may create panels, tendrils, blooms, lanterns, glyphs, cards, windows, and root paths according to renderer hints.

The renderer receives display parameters such as `leaf_growth`, `phase_angle`, `glow_level`, and `active_node`. It does not decide model truth and does not request private inputs.

### StonewoodRuntime

Receives room events and consented signals. Examples:

- `node_select`
- `draft_update`
- `save_event`
- `portal_traverse`
- `consent_update`
- `low_stim_toggle`

The runtime composes signals into display-safe values for the renderer.

### StonewoodStreamService

Optional service adapter for live rooms. It may use FastAPI/WebSocket, but it should remain a shell over packets, not the room itself.

The service should validate incoming packets, debounce live writing events, and return display-safe outputs. It must not hardcode coordinates, battery values, room nodes, or model parameters.

### Consent portal

Consent is explicit, separate, revocable, and local-first.

Initial consent gates:

- live text
- interaction rhythm
- coarse local context
- sound
- haptics

Defaults should be false unless a room is a private/local tool and the user has explicitly opted in.

## Packet shape

A service packet should be sparse and explicit. Raw text is sent only when live text is enabled.

```json
{
  "room_id": "moonroot-writing-chamber",
  "action": "draft_update",
  "node_id": null,
  "text": "",
  "consent": {
    "live_text": false,
    "interaction_rhythm": false,
    "local_context": false
  },
  "signals": {
    "wpm_band": null,
    "local_hour": null,
    "coarse_region": null
  }
}
```

## Display output shape

The renderer should receive UI-safe values.

```json
{
  "story_text": "The room is quiet. The writing desk is ready.",
  "leaf_growth": 0.42,
  "phase_angle": 0.8,
  "glow_level": 0.5,
  "active_node": "writing-desk"
}
```

## Hardcoding prohibitions

Do not hardcode location coordinates in a room engine.

Do not call battery or geolocation APIs automatically.

Do not mutate learned model parameters from runtime signals.

Do not stream raw text on every keystroke unless the user has explicitly enabled live text.

Do not merge renderer, runtime, and service into one permanent monolith.

## FastAPI demo extraction

A FastAPI prototype is acceptable as a lab shell if it follows these constraints:

- load the room seed at runtime
- validate the seed before serving
- generate layout from seed nodes and renderer hints
- receive typed packets through WebSocket
- debounce or throttle draft updates
- send display-safe outputs
- keep consent gates visible and revocable

The prototype should be treated as an adapter, not as the canonical room system.
