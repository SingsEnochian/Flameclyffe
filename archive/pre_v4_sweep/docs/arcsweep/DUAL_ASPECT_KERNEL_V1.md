# Hearthweave Dual-Aspect Kernel v1

**Status:** Implemented vertical slice  
**Date:** 2026-08-02  
**Applies to:** Arcsweep, Bifröst, PREMAQ, DEEP Observer, House profiles, glyph, Runa tone, visual, haptic, narrative, receipts, and replay

## Governing law

Hearthgate receives one frozen temporal state and expresses it through two aspects:

- **Observable:** measurement, chronology, telemetry, canon source, provenance, uncertainty, confidence, and receipts.
- **Experiential:** story, symbol, memory, tone, image, haptic pattern, relationship, cultural meaning, and lived continuity.

Neither aspect may silently overwrite the other. Every derived expression carries the same `shared_state_fingerprint`.

## Authority boundary

```text
Arcsweep
  chooses, requests, accepts, rejects, rolls back, and receipts

Hearthweave Kernel
  snapshots, assembles, validates, seals, and publishes

Renderers
  derive only; they do not refetch state after activation
```

## Activation sequence

```text
reviewed Arcsweep continuity
        │
        ▼
freeze one DEEP snapshot
        │
        ▼
derive PREMAQ v2 from that exact snapshot
        │
        ▼
create Hearthside and Targetside temporal states
        │
        ▼
create Bifröst bridge packet
        │
        ▼
apply sovereign House transfer functions
        │
        ▼
seal DualAspectPacket
        │
        ▼
hearthweave:dual-aspect-activation
        │
        ├── glyph
        ├── Runa tone contract
        ├── visual
        ├── haptic
        └── narrative
```

## Core invariant

For every packet-bound expression `x`:

```text
source(x) = packet_id
state(x)  = shared_state_fingerprint
```

A renderer acknowledgement is rejected when its packet or shared-state fingerprint differs from the active activation.

## DualAspectPacket

The packet contains:

- identity and House
- canon foundation and overlay as separate records
- observation and activation timestamps
- continuity context
- frozen DEEP snapshot
- PREMAQ v2
- Hearthside temporal state
- Targetside temporal state
- Bifröst bridge packet
- glyph descriptor
- Runa tone descriptor
- visual descriptor
- paired haptic descriptor
- traveller and host narrative descriptors
- uncertainty
- degraded-mode declarations
- history
- receipt references
- per-capability verification claims

Canonical schema:

```text
starwell/deep-observer/schemas/dual-aspect-packet-v1.schema.json
```

## Joined receipt

One receipt follows the packet through activation, rendering, and replay. Each renderer records:

- `packet_id`
- `shared_state_fingerprint`
- output fingerprint
- render timestamp
- degraded flag
- claim status: `Verified`, `Failed`, or `Not Yet Tested`

Runa, haptics, and narrative remain `Not Yet Tested` until the consuming service explicitly acknowledges the packet-bound output.

Canonical schema:

```text
starwell/deep-observer/schemas/dual-aspect-receipt-v1.schema.json
```

## Degraded mode

Defaults are permitted only as declared substitutions. A degraded DEEP snapshot must contain:

```json
{
  "mode": "DEGRADED",
  "substitutions": [
    {
      "field": "state.A",
      "reason": "SOURCE_FIELD_MISSING_OR_INVALID",
      "source": "DEFAULT_DEEP_STATE"
    }
  ]
}
```

A `DEGRADED` snapshot with an empty substitution ledger is rejected as silent degradation.

## House sovereignty

Every House declares a canon foundation and an authored overlay as distinct objects. They may correspond, but they may not silently merge.

The first completed House path in this slice is:

```text
The Wheel of Time canon
↔ Ta'veren Vaen authored overlay
```

Ta'veren Vaen provides its own temporal, harmonic, visual, and cultural transfer identity. Unknown worlds resolve to an explicit `unregistered-house` profile and enter degraded mode rather than receiving invented canon.

## Sensory activation

The packet publishes these events:

```text
hearthweave:dual-aspect-activation
runa:dual-aspect-tone-activation
hearthweave:haptic-activation
hearthweave:narrative-activation
```

The glyph renderer consumes the frozen packet timestamp and packet-bound DEEP snapshot. The Runa event carries the same packet and shared-state fingerprint. Runa may mark tone rendering `Verified` only by acknowledging that exact activation.

## Replay

Replay returns the stored glyph, tone, visual, haptic, and narrative descriptors from the sealed packet. It does not refetch DEEP, recompute continuity, or consult the wall clock.

## QA failure condition

The highest-priority failure remains:

> One layer appears coherent while secretly running from a different state.

The kernel rejects mismatched correspondence bindings as `hidden-state-divergence`. Installer verification confirms the packet schema, receipt schema, activation event, Runa event, House contract, and renderer no-refetch law survived packaging.
