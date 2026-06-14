# Codex Snapshot Adapter

This adapter converts explicit, reviewed offline snapshot records into `CanonDocument`
objects for the Codex search baseline.

It does not fetch Notion, call Supabase, write indexes, or publish anything.

## Gate rules

Public search records must satisfy all of these conditions:

- `public = true`
- `reviewed = true`
- `privacy_class = PUBLIC`

Internal search records may include `PUBLIC` and `INTERNAL` records. `PRIVATE` and
`RESTRICTED` records are excluded from shared adapter output.

## Provenance

`SnapshotBatch.snapshot_hash` produces a deterministic hash from the ordered records,
snapshot name, and creation date. Future live export jobs should store that hash beside any
baseline metrics or vector indexes.

## Next step

The next safe layer is a fixture export using approved public Terra Aeterna wiki records. Live
workspace ingestion should wait until review and privacy fields are normalised.