# BIFRÖST CURRENT INTERFACE EXPORT v0.5 SCHEMA

**Date:** 2026-08-22  
**Branch:** `feature/bifrost-arcsweep-current-ui-v0.4`  
**PR:** #113  
**Status:** schema/fixture hardening slice

---

## Purpose

Promote the primary Bifröst current-interface export from a runtime-only contract into a stable Deep Observer schema contract.

This hardening slice freezes the expected `bifrost.current-interface-export/v0.5` shape with:

```text
starwell/deep-observer/schemas/bifrost-current-interface-export-v0.5.schema.json
apps/starwell/test/fixtures/bifrost-current-interface-export-v0.5.sample.json
apps/starwell/test/bifrostCurrentInterfaceExportSchema.test.js
```

---

## Contract sealed

The schema requires the v0.5 export to carry:

```text
schema
exported_at
source
bifrost_runtime
current_state
source_state
cycle_receipts
cycle_receipt_envelopes
cycle_envelope_count
authority
compatibility
```

The important promotion is `cycle_receipt_envelopes[]`: cycle passports are now part of the primary export contract instead of only a sidecar proof.

---

## Required source binding

The export must preserve the active execution side and source receipts:

```text
source.selected_execution_side
source.execution_source
source.source_binding_receipt

bifrost_runtime.runtime_state
bifrost_runtime.execution_source
bifrost_runtime.source_binding_receipt
bifrost_runtime.execution_policy
bifrost_runtime.native_action_receipt
```

The fixture pins the current certified two-shore path:

```text
selected_execution_side: targetside
source_kind: temporal-state
source_state_id: target-state
bridge.status: TWO_SHORE_PREMAQ_VISIBLE
```

---

## Cycle envelope requirements

Every cycle receipt envelope in the fixture must preserve:

```text
bifrost.cycle-receipt-envelope/v0.1
cycle_receipt_id
from_state_id
to_state_id
next_operation: compression-of-release
selected_execution_side
source_state_id
source_binding_receipt
native_action_receipt
execution_policy
authority
```

The test asserts that:

```text
cycle_envelope_count === cycle_receipt_envelopes.length
cycle_receipts.length === cycle_receipt_envelopes.length
each envelope mirrors its matching cycle receipt lineage
```

---

## Authority boundary

The schema and fixture preserve the existing boundary:

```text
canon_write_performed: false
tone_approval_performed: false
physical_device_test_performed: false
```

Compatibility remains explicit:

```text
replaces_legacy_export_schema: bifrost.current-interface-export/v0.4
legacy_export_click_prevented: true
sidecar_export_still_available: true
```

This is not a canon write, tone approval, physical proof, browser-audio audition, or device/transducer test.

---

## Acceptance test

Run:

```bash
npm run starwell:test
```

Relevant new test file:

```text
apps/starwell/test/bifrostCurrentInterfaceExportSchema.test.js
```

Expected checks:

```text
schema root contract pinned
source/runtime required objects pinned
fixture carries inline cycle_receipt_envelopes[]
authority flags remain false
compatibility flags remain explicit
lineage mirrors cycle_receipts[]
```

---

## Next gates

```text
CI/build release gate: required after push
Live hosted PR preview: still not verified
Physical browser-audio audition: not tested
Physical iPad/Shokz/transducer audition: not tested
Rowan promotion decision: required
```
