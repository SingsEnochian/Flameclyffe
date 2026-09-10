# Behind the Name / Behind the Surname Ingest Handoff

**Prepared:** 2026-09-09

**Status:** PARTIAL

Local ingest execution against the three Steward-supplied licensed exports is VERIFIED. Repository integration remains PARTIAL because the licensed source bytes and generated 38,405-row payload are not yet stored as durable repository or Hub artefacts.

## Purpose

Prepare a provenance-bound onomastics registry for ArcSweep from Behind the Name and Behind the Surname. The registry is intended for character creation, naming assistance, worldbuilding, search, filtering, and relationship-aware name suggestions.

## Source boundary

Do not crawl, scrape, snapshot, mirror, or copy the live name-definition pages.

The website copyright notice prohibits scraping/copying site content without permission. The current robots content signal declares `search=yes, ai-train=no, use=reference`. The public API/data-access section separately provides authorised data lanes.

The ingest therefore has two permitted acquisition modes:

1. **Official downloadable data** from `https://www.behindthename.com/api/download.php`. The data-access page states that available downloads are licensed under CC BY-SA 4.0. For this ingest the supplied files are:
   - `btn_givennames.txt`;
   - `btn_givennames_synonyms.txt`;
   - `btn_surnames.txt`.
2. **Optional API enrichment** using `BEHINDTHENAME_API_KEY`, limited to documented fields such as given-name gender, usage and related names. The API does not provide meaning/history text, and the ingest must not scrape live pages to synthesize that missing field.

## Verified source snapshot

The 2026-09-09 local ingest verified these exact inputs:

| File | Export timestamp | Rows | SHA-256 |
| --- | --- | ---: | --- |
| `btn_givennames.txt` | 2026-05-27 00:49:19 -0700 | 29,815 | `aad7d788cc1e521769d259affc41eb1f3cb61bafa846759bcccaf478b7db28d8` |
| `btn_surnames.txt` | 2026-05-27 00:51:19 -0700 | 8,590 | `c34734a34898a906effe20df1d287ec48ee16bdc999ed4631d54356e379d39be` |
| `btn_givennames_synonyms.txt` | 2026-05-27 00:51:31 -0700 | 29,815 | `3633abd9633df29c3a3bfcf6b510b3166ceb8ac1bf5d643b77a32fe883f8f82b` |

The plain given-name export and synonym export contain the same 29,815 name/gender pairs in the same order. The synonym export contributes 46,633 related-name edges across 14,008 names. Surnames are unique in the supplied file.

## Explicit exclusions

Exclude meaning/history prose, articles, namesakes prose, comments, message boards, submitted-name databases, and HTML snapshots. These may be linked as references but are not corpus payload.

## Normalized record

Every accepted record becomes `arcsweep.onomastics-record/v1` with stable kind (`given-name` or `surname`), display name, flat search form, optional gender/usage/related-name fields, source dataset, source URL, source licence, source export timestamp and source hash.

Preserve diacritics and source terminology. Source `usage` is not silently rewritten as linguistic `origin`, and source gender labels remain source data rather than ArcSweep inference.

## Implemented adapter

`apps/arcsweep/scripts/behind-the-name-ingest.mjs` validates both given-name exports against one another, rejects duplicate name/surname rows, normalizes text to Unicode NFC, produces deterministic IDs, creates the relationship index and writes a provenance receipt.

Local verified output:

```text
38,405 total records
29,815 given names
 8,590 surnames
46,633 related-name edges
14,008 given names with at least one related-name edge
```

The sealed local receipt is `apps/arcsweep/skills/sources/behind-the-name/ingest-receipt.2026-09-09.json`.

## Output

Default working directory:

```text
ingests/behind-the-name/
  records/onomastics.jsonl
  indexes/given-names.json
  indexes/surnames.json
  indexes/related-names.json
  ingest-receipt.json
```

## Hugging Face Dataset Viewer route

The canonical normalized `records/onomastics.jsonl` is deliberately tabular/JSONL-friendly so a Hub dataset can expose it through Hugging Face Dataset Viewer without changing ArcSweep authority.

Once published as a dataset repository, Dataset Viewer becomes an inspection surface for:

- inferred column/schema checks;
- row preview and pagination;
- text search;
- structured filters;
- statistics and row/byte size;
- server-generated Parquet access.

The Hub copy is an inspectable derivative, not a new source of truth. Its dataset card must preserve Behind the Name attribution, CC BY-SA 4.0, the three source hashes, the ArcSweep ingest receipt hash, and an explicit `training_allowed: false` statement for this corpus.

## Receipt gate

No source hashes means no successful receipt. A future Hub or repository publication must retain the current input hashes and output digest so the published view can be reconciled with the ArcSweep ingest run.

## Next execution step

Durably stage the licensed source snapshot or the normalized derivative in an approved repository/Hub location, run the committed adapter against that durable snapshot, compare the generated output hashes with the sealed local receipt, then promote repository status from PARTIAL to VERIFIED.

The live name pages remain human-facing reference destinations for deeper etymology and history; they are not copied into ArcSweep.
