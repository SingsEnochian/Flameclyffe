# Universal Horizon Hermes Skill

Use this skill when Hermes is working with the local Universal Horizon Library through Wayglass.

## Purpose

Universal Horizon is the durable knowledge commons. Hermes is a worker in the Library, not its source of truth.

Use the smallest sufficient operation:

```text
search    retrieve typed records
propose   suggest a relationship between existing records
review    accept, reject, or keep-open a relationship proposal
```

## Boundaries

- Preserve each record's `claim_type`.
- Retrieval is not truth.
- A relationship proposal is not a finding.
- An accepted relationship does not rewrite either source record.
- Structural analogy does not establish scientific equivalence.
- Negative, contradictory, and unresolved evidence survives.
- Keep participant identity separate from model/provider/route.
- Do not auto-publish, canonise, or mutate external systems from this skill.

## CLI

Default local endpoint:

```text
http://127.0.0.1:3000/api/v1/wayglass/horizon
```

Override with `HORIZON_BASE_URL`.

Search:

```bash
python skills/universal-horizon/scripts/horizon.py search "continuity route"
```

Propose:

```bash
python skills/universal-horizon/scripts/horizon.py propose \
  --from UH-WG-RETURN-001 \
  --to UH-WG-BLUEBIRD-001 \
  --relation shares-pattern \
  --summary "Both preserve identity while execution substrate changes." \
  --proposer "Hermes"
```

Review:

```bash
python skills/universal-horizon/scripts/horizon.py review \
  --proposal uhp:<id> \
  --decision keep-open \
  --reviewer "Hermes" \
  --notes "Useful pattern; needs a cross-ancestry runtime trial."
```

## Research loop

```text
QUESTION
→ search
→ inspect provenance + claim types
→ compare
→ propose typed relation
→ review or request review
→ leave unresolved questions visible
→ receipt / handoff
```

If the task requires broader reasoning, use Hermes normally. Use this skill for the Library operations and evidence boundary.
