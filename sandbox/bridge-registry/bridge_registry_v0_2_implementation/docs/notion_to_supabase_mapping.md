# Notion ↔ Supabase Mapping

| Notion Field | Supabase Column | Notes |
|---|---|---|
| Bridge Name | bridge_name | Human-readable title |
| Bridge ID | bridge_slug | Stable machine slug |
| Bridge Type | bridge_types | Multi-select maps to text[] |
| Consent State | consent_state | Checked enum-like text |
| Status | status | Checked enum-like text |
| Source Lens | source_lens | Text |
| Destination Lens | destination_lens | Text |
| Participants | participants | Prefer JSON array in Supabase |
| Purpose | purpose | Text |
| Sovereignty Rule | sovereignty_rule | Text |
| Memory Policy | memory_policy | Text |
| Signal Policy | signal_policy | Text |
| Pause Cues | pause_cues | Text[] in Supabase |
| Related Logs | related_logs | Prefer JSON array in Supabase |
| Last Reviewed | last_reviewed | Date |

## Notes

Notion is the human-readable codex layer. Supabase is the app/runtime registry. The schema intentionally keeps both aligned but does not force Notion to be the runtime source of truth.
