# Crow Writer Harvest v0.1

This is the consent-and-provenance seam between co-writing sessions and Crow training.

## Flow

1. **Candidate**
   A useful writing interaction is copied into a harvest record. Nothing becomes training data merely because it appeared in chat.

2. **Rowan review**
   Each record must be explicitly marked `author_decision: keep`, `reject`, or `mixed`.
   Only `keep` records can be exported to SFT or preference data.

3. **Export**
   `crow-harvest.py export` converts approved records into:
   - `sft.approved.jsonl`
   - `preferences.approved.jsonl`
   - `heldout.approved.jsonl`

4. **Held-out sealing**
   The exporter deterministically places 15–20% of approved records in held-out data.
   Held-out rows are never passed to the trainer.

5. **Private persistence**
   Approved exports can be mirrored to the private Hugging Face dataset repository:
   `singsenochian/Crow-Writer-Rowan-Harvest`

## Non-negotiables

- Conversation text is **not** automatically training data.
- Rejected examples remain useful as preference negatives, but only when Rowan approves the pair.
- Canon promotion and writing preference are separate decisions.
- Secrets, API keys, medical data, private third-party material, and credentials must never enter this dataset.
- Source references identify provenance without embedding private transcripts.
- "No revision needed" is a valid approved example.
- One project should not exceed 35% of a promotion-oriented corpus without an explicit reason.

## Review fields

Each record includes:
- `mode`: DRAFT / DIAGNOSE / DRILL / VARIANTS / REVISE / COMPARE / CANON / HARVEST
- `prompt`
- `candidate`
- `author_decision`
- `author_note`
- `preferred_text`
- `rejected_text`
- `tags`
- `project`
- `source_ref`
- `canon_status`

The author decision is the gate. Everything else is bookkeeping.
