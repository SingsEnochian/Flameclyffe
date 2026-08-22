# Bifröst Cycle Envelope Export Sidecar

Status: review slice
Date: 2026-08-22
PR: #113

## Purpose

The prior pass defined `bifrost.cycle-receipt-envelope/v0.1` so a single compression-release cycle can prove its Bifröst selected source, bridge status and action policy.

This pass wires that contract into the browser export path without disturbing the legacy engine handler order.

## Files

- `apps/starwell/bifrost/bifrost-cycle-envelope-export-sidecar.js`
- `apps/starwell/bifrost/bifrost-runtime-bootstrap.js`
- `apps/starwell/test/bifrostCycleEnvelopeExportSidecar.test.js`

## Behaviour

The runtime bootstrap now installs `installBifrostCycleEnvelopeExportSidecar()` before the legacy Bifröst handlers run.

When `export-receipts` is clicked, the sidecar waits one browser tick so the native export action can update the last action receipt. It then reads the saved Bifröst session receipts and emits a second JSON export:

```text
bifrost-cycle-receipt-envelopes-<cycle>.json
```

Payload schema:

```text
bifrost.cycle-envelope-export-sidecar/v0.1
```

The payload contains:

- `cycle_envelope_count`
- `source_binding_receipt`
- `execution_policy`
- `runtime_state`
- `cycle_receipt_envelopes[]`
- authority flags for canon/tone/device boundaries

Each envelope uses:

```text
bifrost.cycle-receipt-envelope/v0.1
```

and is checked with `assertBifrostCycleEnvelopeLineage()` before export.

## Boundary

This pass makes the export path hand out cycle passports as a sidecar export.

It does not yet merge `cycle_receipt_envelopes` directly into the original `bifrost.current-interface-export/v0.4` payload. That can still be done in a later main.js payload-schema bump.

## Boxfire review

Check:

1. `bifrost-runtime-bootstrap.js` imports and installs the cycle envelope export sidecar.
2. `bifrost-cycle-envelope-export-sidecar.js` waits one tick after `export-receipts` before reading the native action receipt.
3. The payload contains `cycle_receipt_envelopes`.
4. Every envelope contains selected execution side, source state, bridge status, both shore IDs/fingerprints, source binding receipt and authority boundary.
5. No canon write, tone approval or physical-device claim is performed.

## Honest status

```text
Cycle envelope contract:        ADDED
Export sidecar:                 ADDED
Original main export payload:   NOT YET SCHEMA-BUMPED
CI/build:                       NOT RUN IN CHAT
Physical platform test:         NOT TESTED
```
