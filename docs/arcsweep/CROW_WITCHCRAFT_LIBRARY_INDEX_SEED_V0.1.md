# Crow Witchcraft Library Index Seed v0.1

Status: source-index seed only  
Date: 2026-10-01  
Purpose: begin a provenance-first index for Rowan's Google Drive witchcraft/occult corpus without copying raw copyrighted book text into training.

## Collections located

- `Witchcraft Books`
- `651 witchcraft books`
- `[COVEN] Entirely Too Many Witchcraft Books`
- `OCCULTISM` (multiple Drive collections)
- `Occult Library Two`

## Representative records located

| Title | Initial class | Raw training posture |
|---|---|---|
| Historical Dictionary Of Witchcraft | historical/reference | no raw ingest by default |
| Encyclopedia of Witchcraft | reference | no raw ingest by default |
| Natural Magick [1658] | historical primary / early modern natural magic | public-domain eligibility requires exact-edition verification |
| The philosophy of witchcraft (1839) | historical primary/secondary | public-domain eligibility requires exact-edition verification |
| A Popular History of Witchcraft (1937) | historical interpretation | no raw ingest without rights verification |
| The Pagan Religions of the Ancient British Isles | modern historical/religious study | no raw ingest by default |
| Dictionary Of Occult Hermetic Alchemical Sigils Symbols | symbolic/reference | structured extraction candidate; retain symbol provenance |
| The Book Of Occult Philosophy, Books 1-4 | historical/esoteric source family | edition-level rights/provenance review first |
| Exploring Wicca | modern practitioner/reference | principle/retrieval only by default |
| Self-Initiation for the Solitary Witch | modern practitioner | principle/retrieval only by default |
| The Witch's Magical Handbook | modern practitioner | principle/retrieval only by default |
| A Witch's Beverages and Brews | modern practitioner / recipe material | reference only until safety review for ingestible/herbal instructions |
| The Cyber Spellbook: Magick in the Virtual World | modern practitioner / digital-magick history | principle/retrieval only by default |
| Exposing Spiritual Witchcraft | theological/polemical | contextual evidence only; not neutral authority |
| Witchcraft And The Illuminati | conspiratorial/polemical | contextual evidence only; claims require independent verification |
| Psychic Self Defense | occult/practitioner | principle/retrieval only by default |

## Index schema

Every future indexed item should record at least:

- title
- author/editor if known
- publication date
- edition/translator where applicable
- Drive file ID or stable locator in a private provenance ledger
- tradition/context tags
- epistemic mode
- insider/outsider/academic/polemical stance
- copyright/right-to-use status
- safety flags
- whether raw text, structured facts, short quotation, principle extraction, retrieval-only, or synthetic transformation is allowed
- source-quality notes

## Epistemic modes

- historical_primary
- historical_secondary
- academic_reference
- practitioner_tradition
- symbolic_correspondence
- ritual_text
- folklore_or_myth
- theological_or_polemical
- conspiratorial_claim
- modern_personal_practice
- fiction_worldbuilding_reference
- unknown_needs_review

## Crow training rule

Drive possession is not a training licence.

Crow should learn from the corpus through provenance-safe abstraction:

`book -> classify -> source-criticise -> extract attributed principle or structured fact -> Rowan-authored synthetic case -> eval -> approval`

## Mythience boundary

Formalism, measurement, myth, and magic may speak to one another but may not impersonate one another.

Therefore:

- practitioner metaphysics may be represented faithfully without being relabelled scientific fact
- historical accusation is not evidence that an accused person practised what the accusation alleged
- scientific uncertainty does not erase cultural or narrative meaning
- symbolic systems remain attributed systems rather than universal laws
- conflicting traditions may remain unresolved

## Runa / Glyph Forge extraction seam

For sigils, diagrams, correspondences and symbolic tables, prefer structured records such as:

```json
{
  "symbol_id": "source-local-id",
  "source_title": "...",
  "tradition": "...",
  "date_or_period": "...",
  "visual_features": ["..."],
  "attributed_meanings": [
    {"meaning": "...", "source": "...", "confidence": "..."}
  ],
  "cross_source_matches": [],
  "equivalence_asserted": false
}
```

Visual resemblance creates a comparison candidate, never an automatic semantic merge.

## Safety flags for later indexing

Mark practical instructions for review when they involve:

- ingestion/herbal dosing
- toxic or unidentified plants/fungi
- drugs
- blood or self-injury
- fire or combustion
- hazardous chemicals
- weapons
- coercion/harassment
- illegal entry/grave disturbance/property damage
- medical-treatment claims

Descriptive/historical use may still be appropriate even when operational instruction is not promoted.

## Next index pass

Prioritise metadata extraction and categorisation before full-text reading. High-value first buckets:

1. historical witchcraft scholarship
2. early primary texts
3. sigil/symbol dictionaries
4. correspondence tables
5. ritual structure
6. folklore and myth
7. modern Wicca and practitioner voices
8. polemical/hostile representations
9. magical-tech / cyber-magick material
10. source conflicts and historical mythmaking
