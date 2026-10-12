# Universal Horizon Hermes Skill

Use this skill when Hermes is working with the local Universal Horizon Library through Wayglass.

## Purpose

Universal Horizon is the durable knowledge commons. Hermes is a worker in the Library, not its source of truth.

Use the smallest sufficient operation:

```text
search    retrieve typed records
wonder    preserve "could be false, but what if true?" branches
complexify add a missing axis / rotate the frame on an open Wonder branch
propose   suggest a relationship between existing records
review    accept, reject, or keep-open a relationship proposal
```

## Boundaries

- Preserve each record's `claim_type`.
- Retrieval is not truth.
- Counterfactual Wonder is not a fact claim: `could_be_false=true`, `explore_as_if_true=true`, `promoted_to_fact=false`.
- Do not demand evidence before exploring the consequences of a Wonder branch. Use evidence when the branch reaches comparison, testing, or consequential claims.
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

Counterfactual Wonder:

```bash
python skills/universal-horizon/scripts/horizon.py wonder \
  --proposition "Compression and release may be a recurring shape of reorganisation." \
  --why "The pattern is worth comparing across unlike systems." \
  --implication "Breakthrough structure may begin forming before release." \
  --prediction "Some unresolved structures become more connected before release." \
  --discriminator "Compare with productive periods that show no prior compression." \
  --created-by "Hermes"
```

Complexify:

```bash
python skills/universal-horizon/scripts/horizon.py complexify \
  --wonder uhw:<id> \
  --current-frame "Breakthrough is represented only as amount of cognitive pressure." \
  --apparent-impossibility "Equal pressure can precede very different outcomes." \
  --missing-axis "phase in the compression/release cycle" \
  --rotation "Represent the state as z = r * exp(i theta), not r alone." \
  --invariant "The accumulated material remains the same while phase changes." \
  --translation "Phase differences should predict different transition signatures." \
  --prediction "Pre-release episodes cluster in a different phase region from ordinary accumulation." \
  --created-by "Hermes"
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
→ if unestablished but generative: "this could be false, but what if it were true?"
→ preserve a Counterfactual Wonder branch
→ explore consequences / predictions / discriminators
→ if the current frame makes the branch look impossible: COMPLEXIFY
→ name the missing dimension
→ rotate the representation
→ identify invariants
→ translate consequences back
→ inspect provenance + claim types
→ compare
→ propose typed relation
→ review or request review
→ leave unresolved questions visible
→ receipt / handoff
```

If the task requires broader reasoning, use Hermes normally. Use this skill for the Library operations and evidence boundary.
