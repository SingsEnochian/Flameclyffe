# Bifröst Cycle Receipt Envelope Pass

Status: source-lineage hardening slice
Date: 2026-08-22
Branch: feature/bifrost-arcsweep-current-ui-v0.4
PR: #113

## Purpose

The engine and PREMAQ song now bind their first execution source through Bifröst runtime source selection, but individual compression-release cycle receipts remain raw compression receipts. A raw cycle receipt proves `from_state_id -> to_state_id`; it does not, by itself, prove which Bifröst shore selected that source, what the bridge status was, or whether the action was native-policy guarded.

This pass adds a reviewable cycle envelope contract so a single exported cycle can carry its own Bifröst source proof.

## Added

```text
apps/starwell/bifrost/bifrost-cycle-receipt-envelope.js
apps/starwell/test/bifrostCycleReceiptEnvelope.test.js
```

## New schema

```text
bifrost.cycle-receipt-envelope/v0.1
```

## Envelope contains

```text
cycle_receipt
source_binding_receipt
native_action_receipt
execution_policy
selected_execution_side
source_kind
source_state_id
source_fingerprint
bridge_status
crossing_ready
packet_id
shared_state_fingerprint
hearthside_state_id
hearthside_fingerprint
targetside_state_id
targetside_fingerprint
authority boundary
```

## Tests added

```text
cycle envelope carries selected source, both shores and runtime policy
cycle envelope lineage check rejects missing source binding
cycle envelopes preserve per-cycle release lineage across a window
```

## Honest boundary

This pass adds the cycle-envelope contract and tests. It does not yet wire `main.js` export to emit `cycle_receipt_envelopes` alongside raw `cycle_receipts`. That is the next cut-over.

## Next pass

Update `main.js` export path so `bifrost.current-interface-export/v0.4` includes:

```text
cycle_receipt_envelopes: buildBifrostCycleReceiptEnvelopes({
  cycleReceipts,
  runtimeState,
  executionPolicy,
  nativeActionReceipt,
  sourceBindingReceipt,
  actionId: 'export-receipts'
})
```

Then update tests so Boxfire can verify that exported engine cycles are individually source-provable.

## Authority boundary

No canon write. No tone approval. No physical-device test claim. No claim that CI has passed until CI/build evidence exists.
