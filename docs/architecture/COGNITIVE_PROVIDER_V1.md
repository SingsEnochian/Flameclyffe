# CognitiveProvider Contract v1

**Status:** IMPLEMENTED  
**Owner:** `apps/arcsweep/src/architecture/cognitive-provider.js`  
**Companion:** `apps/arcsweep/src/architecture/capability-negotiation.js`  
**Tests:** `apps/arcsweep/test/cognitive-provider.test.js` — 21 tests, all passing

## What CognitiveProvider IS

A CognitiveProvider is a **runtime object** that satisfies the minimal contract:

```ts
interface CognitiveProvider {
  id: string;
  capabilities: string[];         // subset of COGNITIVE_CAPABILITIES
  invoke(request: unknown): AsyncIterable<CognitiveEvent>;
}
```

It may be a remote API client (OpenAI, Anthropic, OpenRouter), a local GGUF inference runner, a Crow literary engine, or a stub. The contract is the same regardless of provider family.

## What CognitiveProvider IS NOT

- It is not an identity (`provider != persona`).
- It is not a continuity store.
- It is not an authority source (`cognition != authority`).
- It carries no credentials, sessions, or API keys.
- It cannot self-grant capability or authority. The gate is external.

## Descriptor Record

`createCognitiveProviderDescriptor({ id, capabilities, displayName, providerFamily })` returns a frozen `arcsweep.cognitive-provider/v1` record that documents what a provider IS. Used as input to the capability gate.

Unknown capability names are silently stripped — the canonical list is `COGNITIVE_CAPABILITIES`.

## Capability Gate

Before calling `invoke()`, the caller must pass through the gate:

```js
const decision = evaluateProviderCapability(descriptor, capability, {
  trajectoryId,
  requestId,
  requestedAuthority: 'read-only',
  authorityGrants,   // comes from ArcSweep, not from the provider
});
if (!decision.granted) return; // stop — do not call invoke
```

`evaluateProviderCapability` delegates to `capability-negotiation.js`'s `evaluateCapabilityRequest`. The provider cannot bypass or escalate this gate.

## Event Stream

`createCognitiveEvent({ kind, providerId, requestId, ... })` produces frozen `arcsweep.cognitive-event/v1` records.

| kind       | payload field | meaning                                    |
|------------|---------------|--------------------------------------------|
| `delta`    | `delta`       | incremental text output                    |
| `thinking` | `thinking`    | reasoning trace (surface controls display) |
| `done`     | `receipt`     | stream complete; optional execution receipt |
| `error`    | `reason`      | unrecoverable provider failure             |

Only the payload field for the active kind is non-null. All others are `null`.

## Canonical Capabilities

| capability        | meaning                                    |
|-------------------|--------------------------------------------|
| `text-generation` | can produce natural-language text          |
| `streaming`       | supports incremental delta events          |
| `thinking`        | supports extended reasoning trace          |
| `function-call`   | can invoke structured tool/function calls  |
| `vision`          | can process image input                    |
| `audio-input`     | can process audio input                    |
| `long-context`    | supports context > 32k tokens             |

## Invariants

1. Provider descriptors are deeply frozen.
2. Descriptors carry no `authority`, `credentials`, `session`, or `api_key` fields.
3. Unknown capability names are stripped, not promoted.
4. The capability gate (`evaluateProviderCapability`) is the only path from descriptor to decision — providers cannot self-grant.
5. Authority must come from `authorityGrants` (ArcSweep-controlled), not from the provider's declared capabilities alone.
6. `assertCognitiveProvider` validates shape only — it does not execute or gate the provider.
7. Events are frozen and kind-exclusive: only one payload field is non-null per event.

## Architecture Boundaries

```
identity != model
provider != persona
cognition != authority
possibility != execution
```

The CognitiveProvider seam exists to let Crow, OpenAI, Qwen, Claude, local GGUFs, and future providers differ in capability while remaining subordinate to ArcSweep's authority and capability gates. No provider implementation details belong in this contract.
