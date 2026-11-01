# Wayglass Tone · source provenance and sovereignty boundary v0.1

**Canonical subsystem:** `wayglass-tone`  
**Display name:** Wayglass Tone Studio  
**Established:** 2026-11-01  
**State:** Reference projection implemented in Supabase; live Wayglass audio route not yet implemented or verified.

## Names and owners

- **Wayglass Tone Studio** is the Wayglass-owned namespace for tone profiles, tonal journeys, calibration proposals, and future consented rendering. Its canonical prefix is `wayglass-tone`.
- **Arkfire** remains Arkfire. Its original tone profiles, assets, world-specific roots, design records, authorship and canon authority are not renamed, assigned to Runa, or silently made part of Wayglass canon.
- **Runa** may learn from explicitly permitted Arkfire references. A repository containing historical Arkfire source files is a storage/provenance locator, **not a title deed**. Runa receives no Arkfire identity, source ownership, automatic ingestion, canon approval or write authority.
- **Wayglass** may hold inspected, attributed reference projections. Such projections are not source ownership, calibrated hardware behaviour or automatically approved audio.

## Supabase read surfaces

Migration `create_wayglass_tone_reference_views_preserve_arkfire_source` creates:

| Canonical Wayglass read surface | Unchanged historical source | Current rows at migration |
| --- | --- | ---: |
| `public.wayglass_tone_profiles` | `public.arkfire_profiles` | 10 |
| `public.wayglass_tone_journeys` | `public.arkfire_journeys` | 1 |

These are **read-only, security-invoker, security-barrier views**, with anonymous access revoked and SELECT granted only to authenticated and service-role clients. Access still passes through source-table RLS. They project the Wayglass Tone namespace without mutating or rebadging historical Arkfire records.

Each row preserves `source_record_id`, `source_project = Arkfire`, original repository/path (source *storage*, not ownership), original schema, original route, and source snapshot. Its lineage records:

- `arkfire_identity_preserved = true`
- `source_storage_not_ownership = true`
- `runa_learning = reference-with-permission-only`
- `runa_ownership_transfer = false`
- `canon_promotion = false`

The archive uses a historical Runa branch `feature/arkfire-world-stack-registry`. The source paths and `/arkfire.html` links are kept **for provenance only**. They are not relabelled as functioning Wayglass routes. No production `/wayglass/tone` route has been verified.

## Runtime inspection contract

`apps/wayglass/src/wayglass-tone-registry.js` provides `inspectWayglassToneReference`, a non-mutating boundary for the projected rows. It rejects a foreign owner, a missing Arkfire source, canon promotion, Runa takeover, automatic ingestion and an unverified live implementation claim.

Reference records are `reference-only`. They cannot by themselves authorize audio, haptic output, sensory calibration, world/canon change, participant identity change, or conversion of Dream-Voyage / Narrative Voyages into factual measurements.

Future Wayglass Tone runtime adoption requires a separately accepted profile version, explicit permission to consume reference content, an actual route, output-device safety controls (including Feather Stop), provenance/continuity receipts, and Rowan's approval for any production tone calibration. Keep reference, experiment, approved output and live measurement as different evidence registers.

## Rename boundary

Do **not** globally replace every `arkfire` token. In particular:

- Do not rewrite canonical historical source paths, original titles, source-derived JSON, ledger fingerprints or archived receipt hashes.
- Do not silently repoint an old Arkfire URL at a nonexistent Wayglass screen.
- Do not change Runa's role into Arkfire owner, importer or publisher.
- Do not conflate the existing `arkfire_architecture_audits`, `arkfire_capability_atlas_entries` or other historical Arkfire tables with Wayglass Tone.

**A bridge succeeds when both shores remain sovereign.**
