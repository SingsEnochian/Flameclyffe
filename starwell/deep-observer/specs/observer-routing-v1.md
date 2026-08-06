# Observer Routing Specification v1

**Status:** FROZEN — 2026-08-05  
**Applies to:** `hearthgate/observation-envelope/v1`  
**Owner:** Observer Intake API (`apps/starwell-server/routes/observer-intake.js`)

---

## Core invariant

**Sources do not choose their destination.**

A source (Arcsweep, Runa, a news digest, a glyph cast) emits a typed observation envelope. The Observer reads the classification axes and assigns the destination datasets. This prevents any source from quietly becoming a database writer wearing its own hat.

The intake API executes this policy. It does not invent it.

---

## Classification axes

Every observation envelope is classified along eight axes before routing:

| Axis | Values | Notes |
|---|---|---|
| `source_kind` | `canon_event`, `temporal_reading`, `pattern_analysis`, `glyph_cast`, `news_digest`, `arcsweep_temporal`, `daily_event`, `theory_update`, `world_update`, `external` | What kind of system produced the observation |
| `evidence_class` | `established`, `active_research`, `speculative`, `mythic`, `subjective`, `unknown` | Epistemic standing of the evidence |
| `content_kind` | `event`, `trajectory`, `analysis`, `digest`, `cast`, `update`, `contradiction`, `discovery` | What the content is, independent of source |
| `temporal_extent` | `{ utc_start, utc_end?, ongoing }` | Whether the observation has a defined time window |
| `canon_effect` | `additive`, `corrective`, `contradictory`, `interpretive`, `none` | Whether and how canon changes |
| `consent_scope` | `local_only`, `excluded`, `review_required`, `shared`, `public` | Consent model from Hearthfire |
| `confidence` | `[0, 1]` | Source's stated confidence |
| `destination_datasets` | Computed by Observer | Never set by source |

---

## Routing table

| Observation | Destination datasets |
|---|---|
| Canon event | `DEEPStory` |
| Canon event with publication chronology | `DEEPStory`, `DEEPTime` |
| Canon contradiction or correction | `DEEPStory`, `DEEPTheory` |
| Canon event that closes a prior arc | `DEEPStory`, `DEEPTheory` |
| PREMAQ trajectory (temporal reading) | `DEEPTime` |
| Arcsweep temporal glyph cast | `DEEPTime` |
| Recurrence or correlation discovered | `DEEPTheory` |
| Glyph interpretation or emerged pattern | `DEEPTheory` |
| Glyph causing a canon event | `DEEPStory`, `DEEPTime` |
| Daily event (singular) | `DEEPStory` |
| Daily event with temporal tracking | `DEEPStory`, `DEEPTime` |
| Monthly news digest | Routed per-item by content; never dumped wholesale into `DEEPTime` |
| New theory or pattern analysis | `DEEPTheory` |
| World update (non-narrative) | `DEEPTheory` |
| World update (narrative consequence) | `DEEPStory`, `DEEPTheory` |
| External signal (evidence class: established) | Routed by `content_kind` |
| External signal (evidence class: speculative/unknown) | Held for human review; routed only after `consent_scope: review_required` clears |

---

## Routing algorithm (pseudocode)

```
function route(envelope):
  destinations = []

  // Consent gate — hard block
  if envelope.consent_scope == 'excluded':
    return BLOCKED

  // Review gate — hold, don't route
  if envelope.consent_scope == 'review_required':
    return HELD_FOR_REVIEW

  // Story destinations
  story_triggers = [
    'canon_event',
    'daily_event',
    'world_update' with canon_effect in ['additive', 'corrective', 'contradictory']
  ]
  if envelope.source_kind in story_triggers OR envelope.content_kind in ['event', 'update', 'contradiction']:
    if envelope.canon_effect != 'none':
      destinations += ['DEEPStory']

  // Time destinations
  time_triggers = [
    'temporal_reading',
    'arcsweep_temporal',
    'glyph_cast' with canon_effect in ['additive', 'corrective']
  ]
  if envelope.source_kind in time_triggers:
    destinations += ['DEEPTime']
  if envelope.source_kind == 'canon_event' AND envelope.temporal_extent.utc_start is not null:
    destinations += ['DEEPTime']  // canon with known chronology
  if envelope.source_kind == 'daily_event' AND envelope.temporal_extent.ongoing == true:
    destinations += ['DEEPTime']

  // Theory destinations
  theory_triggers = [
    'pattern_analysis',
    'theory_update',
    'world_update'
  ]
  if envelope.source_kind in theory_triggers OR envelope.content_kind in ['analysis', 'discovery']:
    destinations += ['DEEPTheory']
  if envelope.canon_effect == 'contradictory':
    destinations += ['DEEPTheory']  // contradictions always generate theory work

  // Digest handling — never bulk-route
  if envelope.source_kind == 'news_digest':
    return DECOMPOSE_AND_REROUTE  // each item in the digest routes independently

  // Low-confidence hold
  if envelope.confidence < 0.3 AND envelope.evidence_class == 'unknown':
    return HELD_FOR_REVIEW

  return unique(destinations)
```

---

## Routing receipt

After routing, the Observer emits a `hearthgate/routing-receipt/v1` record containing:

- `envelope_id` — the original observation ID
- `received_at` — intake timestamp
- `destinations` — list of DEEP datasets the observation was sent to
- `routing_version` — this spec version (`v1`)
- `held` — boolean, true if held for review
- `blocked` — boolean, true if consent_scope was excluded
- `notes` — any routing notes

The receipt is immutable. If routing is later revised (e.g., after review), a new receipt is issued — the original is not modified.

---

## Invariants

1. **Sources do not choose destinations.** Any envelope containing `destination_datasets` is rejected at intake.
2. **Consent is a hard gate.** `excluded` envelopes are blocked before classification. `review_required` envelopes are held and not written until cleared.
3. **Digests are not bulk-routed.** A `news_digest` source_kind triggers decomposition: each item in the digest is assessed and routed independently.
4. **Every routing decision is receipted.** No observation silently enters a DEEP dataset.
5. **Low-confidence unknown observations are held.** `confidence < 0.3` AND `evidence_class == 'unknown'` triggers a review hold, not a write.
6. **DEEPTime receives temporal observations only.** Canon events route to DEEPTime only when a real `utc_start` timestamp is present — not when a date is speculative or inferred.
7. **Theory receives contradictions.** Any `canon_effect: contradictory` observation routes to DEEPTheory regardless of source_kind — contradictions always generate understanding work.
