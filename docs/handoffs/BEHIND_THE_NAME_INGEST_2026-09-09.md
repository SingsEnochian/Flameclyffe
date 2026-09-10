# Behind the Name / Behind the Surname Ingest Handoff

**Prepared:** 2026-09-09

**Status:** SPECIFIED

## Purpose

Prepare a provenance-bound onomastics registry for ArcSweep from Behind the Name and Behind the Surname. The registry is intended for character creation, naming assistance, worldbuilding, search, filtering, and relationship-aware name suggestions.

## Source boundary

Do not crawl, scrape, snapshot, mirror, or copy the live name-definition pages.

The website copyright notice prohibits scraping/copying site content without permission. The current robots content signal declares `search=yes, ai-train=no, use=reference`. The public API/data-access section separately provides authorised data lanes.

The ingest therefore has two permitted acquisition modes:

1. **Official downloadable data** from `https://www.behindthename.com/api/download.php`. The data-access page states that available downloads are licensed under CC BY-SA 4.0. For this ingest request the desired downloads are:
   - given names + genders + related names;
   - surnames.
2. **Optional API enrichment** using `BEHINDTHENAME_API_KEY`, limited to documented fields such as given-name gender, usage and related names. The API does not provide meaning/history text, and the ingest must not scrape live pages to synthesize that missing field.

The official download form currently includes a human verification challenge. Acquisition of the files is therefore intentionally manual; ArcSweep must not automate around it.

## Explicit exclusions

Exclude meaning/history prose, articles, namesakes prose, comments, message boards, submitted-name databases, and HTML snapshots. These may be linked as references but are not corpus payload.

## Normalized record

Every accepted record becomes `arcsweep.onomastics-record/v1` with a stable kind (`given-name` or `surname`), display name, optional flat name, optional gender/usage/related-name fields, source dataset, source URL, source licence, retrieval timestamp and source hash.

Preserve diacritics and source terminology. In particular, source `usage` is not silently rewritten as linguistic `origin`, and source gender labels remain source data rather than ArcSweep inference.

## Output

Default working directory:

```text
ingests/behind-the-name/
  raw/licensed/
  records/onomastics.jsonl
  indexes/given-names.json
  indexes/surnames.json
  indexes/related-names.json
  source-index.json
  ingest-receipt.json
```

## Receipt gate

The ingest is not VERIFIED until the actual licensed input files have been acquired, hashed, normalized, counted and replayed. A successful receipt must record every source hash, retrieval time, licence/attribution, normalized record count, rejection count, duplicate count and any API-call count.

No source hashes means no successful receipt.

## Immediate next execution step

Download the two authorised datasets through the official data-access page and place them in `ingests/behind-the-name/raw/licensed/`. Once the exact file format is present, implement or bind the format adapter, normalize to `arcsweep.onomastics-record/v1`, produce indexes, and seal `ingest-receipt.json`.

The live pages remain useful as human-facing reference destinations for deeper etymology and history, but they are not copied into ArcSweep.
