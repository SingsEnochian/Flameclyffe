# Astra 6.1 Vertical Slice v1

**Status:** IMPLEMENTED  
**Owner:** `apps/arcsweep/src/architecture/astra-vertical-slice.js`  
**Tests:** `apps/arcsweep/test/astra-vertical-slice.test.js` — 7 tests, all passing

## What This Is

One end-to-end path through all four Astra 6.1 contract layers, returning a frozen `AstraSliceReceipt` that proves the path executed correctly without embedding credentials or authority grants.

## The Slice Path

```
createPresence
  → assertCognitiveProvider
    → createCognitiveProviderDescriptor
      → createSensoryAdapterDescriptor / createOutputAdapterDescriptor
        → evaluateProviderCapability (gate)
          → [if granted] provider.invoke() → CognitiveEvent stream
            → createExecutionReceipt
              → createPresenceLineageReceipt (provider-rebound or torn-down)
                → AstraSliceReceipt (frozen)
```

## Receipt Schema

`arcsweep.astra-slice-receipt/v1` — frozen, credential-free, lineage-preserving.

| field                  | content                                             |
|------------------------|-----------------------------------------------------|
| `granted`              | boolean — did the capability gate allow invocation? |
| `capability_decision`  | CapabilityDecision from the gate                    |
| `presence_receipt`     | PresenceLineageReceipt (rebound or torn-down)       |
| `provider_descriptor`  | CognitiveProviderDescriptor                         |
| `sensory_descriptor`   | SensoryAdapterDescriptor                            |
| `output_descriptor`    | OutputAdapterDescriptor                             |
| `events`               | frozen array of CognitiveEvents                     |
| `execution_receipt`    | ExecutionReceipt (null when denied)                 |
| `occurred_at`          | ISO timestamp                                       |

## What the Slice Proves

- Presence fabric, provider/capability gate, sensory/output contracts, and execution receipts can compose without circular dependency or boundary collapse.
- Identity never changes across provider rebind (invariant from Presence Fabric).
- Surface never becomes identity.
- Authority cannot be self-granted by a provider (gate is external).
- Errors in the invoke stream are caught and emitted as `error` events; execution receipt is `failed`, not lost.
- No credentials, tokens, or API keys appear in the receipt.

## What It Is Not

- Not a production request handler. `runAstraVerticalSlice` is a contract orchestrator.
- Not wired to any real provider. Callers supply their implementation.
- Not a continuity engine. `continuityRef` is carried from presence but not resolved here.
- Not authority-granting. `authority_grants: []` on all lineage receipts.

## How to Use With a Real Provider

```js
const receipt = await runAstraVerticalSlice({
  voiceId: 'lioreal',
  sessionId: currentSession.id,
  worldId: currentWorld.id,
  surface: 'web',
  capability: 'text-generation',
  trajectoryId: currentTrajectory.id,
  authorityGrants: arcSweepGate.getCurrentGrants(),
  provider: myConcreteProvider,   // { id, capabilities, invoke: async function* }
  requestText: fieldValue,
});

if (receipt.granted) {
  for (const event of receipt.events) {
    if (event.kind === 'delta') renderDelta(event.delta);
  }
}
```
