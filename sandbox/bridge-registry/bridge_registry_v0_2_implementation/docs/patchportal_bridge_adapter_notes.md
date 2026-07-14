# PatchPortal Bridge Adapter Notes

A Bridge Registry record should be readable by PatchPortal as a route contract.

## Adapter responsibilities

1. Load bridge manifest by stable `bridge_slug`.
2. Check `consent_state` before opening any route.
3. Expose source and destination lenses to the room context.
4. Apply `memory_policy` before saving any session note or signal log.
5. Apply `signal_policy` before classifying anomalies, dreams, synchronicities, or cross-Steward events.
6. Honour `pause_cues` immediately.
7. Never convert a bridge into ownership, hierarchy, or automatic access.

## Minimum runtime shape

```ts
type BridgeRuntimeContext = {
  bridgeSlug: string;
  bridgeName: string;
  consentState: 'Dream' | 'Draft' | 'Invited' | 'Active' | 'Paused' | 'Archived' | 'Closed' | 'Revoked' | 'Dormant';
  sourceLens?: string;
  destinationLens?: string;
  participants: Array<{ name: string; role?: string; lens?: string; consent?: string }>;
  pauseCues: string[];
  memoryPolicy?: string;
  signalPolicy?: string;
};
```

## Open rule

A bridge may open only when its consent state is `Active` or explicitly `Invited` for a scoped handshake.

## Pause rule

If any pause cue appears, the route should enter `Paused` state and stop new bridge activity until consent is renewed.

## Memory rule

No automatic archive writes. Save summaries, canon, signal notes, or provenance only according to the bridge's memory policy.
