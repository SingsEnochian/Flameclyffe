# Bifröst PREMAQ Song Source Binding · 2026-08-22

## Status

Strengthening pass added on PR #113.

This pass binds the full 35-cycle PREMAQ song to the same Bifröst source-selection law used by the native engine guard.

## Problem corrected

The song action was already guarded by `enforceBifrostNativeAction()`, but the song plan still took its first compression source from the visible/session state path without embedding the Bifröst source-binding receipt into the plan itself.

That meant the song could be action-authorised while the source of the song remained less explicit than the engine source.

## Change

`apps/starwell/bifrost/premaq-song.js` now:

1. Uses `ACTIVE_EXECUTION_SIDE = 'targetside'` to match the current Bifröst engine default.
2. Passes `active_execution_side` into `enforceBifrostNativeAction()`.
3. Resolves the song source through `readBoundSongSource(nativeActionReceipt)`.
4. Prefers `nativeActionReceipt.execution_source.source_state` when present.
5. Carries `source_binding_receipt` into the song plan.
6. Upgrades the song plan schema to `bifrost.premaq-full-song-plan/v0.5`.
7. Upgrades the song receipt schema to `bifrost.premaq-full-song-receipt/v0.5`.
8. Exports `export_source_binding_receipt` alongside the export-native action receipt.

## Receipt fields added

The song plan and receipt now include:

```text
source_origin
selected_execution_side
source_kind
source_binding_receipt
```

The exported song receipt also includes:

```text
export_source_binding_receipt
```

## Tests added

`apps/starwell/test/bifrostPremaqSongSourceBinding.test.js`

Covers:

- song plans carrying `bifrost.source-binding-receipt/v0.1`
- first song cycle beginning from the receipted source state
- source binding being read from native action receipt before planning
- removal of the old unreceipted `readCurrentSourceState()` planning path

## Boundary

This does not claim browser-audio audition, Shokz test, transducer test, tone approval, canon write, or physical effect.

This does not run CI by itself. CI/build evidence and the PR body matrix still need regeneration.

## Reviewer focus

Boxfire should verify:

```text
premaq-song.js source plan
→ native action receipt
→ execution source
→ source binding receipt
→ first compression source
→ song plan
→ song receipt
→ export receipt
```

No hidden song-source raccoon remains in the wall.
