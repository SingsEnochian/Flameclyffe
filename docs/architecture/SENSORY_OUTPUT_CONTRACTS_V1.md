# Sensory/Output Adapter Contracts v1

**Status:** IMPLEMENTED  
**Owner:** `apps/arcsweep/src/architecture/sensory-output-contracts.js`  
**Tests:** `apps/arcsweep/test/sensory-output-contracts.test.js` — 25 tests, all passing

## Purpose

These three contracts define the minimum shape that future Banuba, Maverick, Cochl, bone-conduction, haptic, and assistive surface implementations must satisfy. They are descriptors and shape validators only — no vendor integrations exist here.

## SensoryAdapter

The **input side** of a surface. Receives and normalises sensory input before it enters the ArcSweep processing chain.

**Descriptor:** `arcsweep.sensory-adapter/v1`  
**Runtime contract:** `{ id: string, modalities: string[], receive: function }`

Canonical modalities: `text`, `audio`, `image`, `video`, `haptic`, `spatial`, `semantic-sound`

`semantic-sound` exists because Cochl/hearing-research distinguishes auditory event types (glass breaking, voice, footsteps) from raw audio streams — the adapter must be able to name what it observed, not just pass bytes.

## OutputAdapter

The **output side** of a surface. Renders cognitive output to a channel.

**Descriptor:** `arcsweep.output-adapter/v1`  
**Runtime contract:** `{ id: string, channels: string[], render: function }`

Canonical channels: `text`, `audio-air`, `audio-bone`, `haptic`, `ar-overlay`, `tts-stream`, `subtitle`, `braille`, `assistive`

`audio-air` and `audio-bone` are separated because bone-conduction rendering requires different encoding, latency budgets, and accessibility considerations.

## AuditoryRenderTarget

A **specialised output contract** for auditory surfaces. Exists as a first-class type (rather than a generic output channel) because bone-conduction, spatial, and assistive audio require separate capability negotiation and latency constraints.

**Descriptor:** `arcsweep.auditory-render-target/v1`  
**Runtime contract:** `{ id: string, renderModes: string[], renderAudio: function }`

Canonical render modes: `air-conduction`, `bone-conduction`, `spatial`, `assistive`, `subtitle-only`

The `assistive: boolean` flag on the descriptor lets ArcSweep prioritise fallback paths for users who depend on assistive audio.

## Architecture Boundaries

```
surface != identity
observation != interpretation
```

- `surface_hint` on a descriptor is routing metadata, not an identity.
- Descriptors carry no `identity_id`, `credentials`, `api_key`, or `authority` fields.
- Unknown modalities, channels, and render modes are stripped silently — the descriptor stays clean.
- Shape validators (`assertSensoryAdapter`, `assertOutputAdapter`, `assertAuditoryRenderTarget`) check the runtime object structure only; they do not execute, gate, or register anything.

## Invariants

1. All descriptor records are deeply frozen.
2. Unknown modalities/channels/render modes are stripped, not promoted.
3. No authority, credential, or session fields exist on any descriptor.
4. `surface_hint` and `id` are always distinct.
5. `AuditoryRenderTarget.max_latency_ms` is `null` for non-finite input rather than a silent coercion.
6. `assertive` flag drives priority routing, not capability escalation.
7. Runtime shape validators check structure without executing the adapter.

## Extension Points

When implementing a live Banuba AR adapter:
- Create an `OutputAdapter` with `channels: ['ar-overlay', 'haptic']` and a `render(event)` function.
- If it has an audio path, also create an `AuditoryRenderTarget` with `render_modes: ['spatial']`.
- Validate with `assertOutputAdapter` and `assertAuditoryRenderTarget` at startup.
- Pass `createOutputAdapterDescriptor(...)` to the capability gate before any invoke.

No code in this module changes when new vendors are added.
