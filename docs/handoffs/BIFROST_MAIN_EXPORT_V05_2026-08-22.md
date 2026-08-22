# Bifrost Main Export v0.5 Handoff

Date: 2026-08-22
Branch: feature/bifrost-arcsweep-current-ui-v0.4
PR: #113

## Purpose

Fold the cycle receipt passports into the primary Bifrost export path.

The prior pass added a companion sidecar export for `cycle_receipt_envelopes[]`. This pass installs a main export cut-over so the user-facing export button emits:

```text
bifrost.current-interface-export/v0.5
```

instead of allowing the legacy `v0.4` export click to proceed unmodified.

## Files changed

```text
apps/starwell/bifrost/bifrost-main-export-v05.js
apps/starwell/bifrost/bifrost-runtime-bootstrap.js
apps/starwell/test/bifrostMainExportV05.test.js
docs/handoffs/BIFROST_MAIN_EXPORT_V05_2026-08-22.md
```

## Runtime behaviour

The bootstrap now installs `installBifrostMainExportV05()` before the legacy page handler can complete.

When `export-receipts` is clicked:

```text
capture click
→ prevent legacy v0.4 export
→ enforce export-receipts through native action guard
→ read current Bifrost session
→ build bifrost.current-interface-export/v0.5
→ include cycle_receipt_envelopes[] inline
→ download v0.5 JSON
→ dispatch bifrost:main-export-v05
```

The companion sidecar remains available as a backup and independent review artefact.

## v0.5 payload additions

```text
schema: bifrost.current-interface-export/v0.5
source.selected_execution_side
source.execution_source
source.source_binding_receipt
bifrost_runtime.runtime_state
bifrost_runtime.execution_policy
bifrost_runtime.native_action_receipt
cycle_receipts[]
cycle_receipt_envelopes[]
cycle_envelope_count
compatibility.replaces_legacy_export_schema = bifrost.current-interface-export/v0.4
```

Each cycle envelope is still governed by:

```text
bifrost.cycle-receipt-envelope/v0.1
```

and validates with `assertBifrostCycleEnvelopeLineage()`.

## Review checklist for Boxfire

```text
- Does bifrost-main-export-v05.js emit bifrost.current-interface-export/v0.5?
- Does it prevent the legacy v0.4 export click from completing first?
- Does the v0.5 payload include cycle_receipt_envelopes[] inline?
- Does each envelope include selected_execution_side and source_binding_receipt?
- Does it preserve authority boundaries: no canon write, no tone approval, no physical-device test claim?
- Does the bootstrap receipt show main_export_v05_cutover_installed: true?
- Does the sidecar remain available as a companion artefact?
```

## Honest boundary

This pass installs the v0.5 browser export cut-over and tests the payload builder. It does not claim CI/build has passed.

The PR body verification matrix is still stale until CI/build evidence regenerates it against the current head.

## Next recommended pass

Promote the export schema into a stable schema file and acceptance fixture:

```text
starwell/deep-observer/schemas/bifrost-current-interface-export-v0.5.schema.json
apps/starwell/test/fixtures/bifrost-current-interface-export-v0.5.sample.json
apps/starwell/test/bifrostCurrentInterfaceExportSchema.test.js
```
