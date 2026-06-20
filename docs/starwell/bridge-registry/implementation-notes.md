# Bridge Registry Implementation Notes

PatchPortal should treat bridge records as route contracts.

## Loader responsibilities

1. Load a record by `bridge_slug`.
2. Check the bridge state before opening a route.
3. Expose source and destination lenses to the room context.
4. Apply memory and signal policies before saving notes.
5. Honour pause cues immediately.
6. Keep records modular and reviewable.

## Notion mapping

- Bridge Name → bridge_name
- Bridge ID → bridge_slug
- Bridge Type → bridge_types
- Consent State / State → state
- Source Lens → source_lens
- Destination Lens → destination_lens
- Participants → participants
- Purpose → purpose
- Memory Policy → memory_policy
- Signal Policy → signal_policy
- Pause Cues → pause_cues
- Related Logs → related_logs
- Last Reviewed → last_reviewed
