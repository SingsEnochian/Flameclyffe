# canon/taaveren-vaen/wot-fandom

Canon ingest from the [Wheel of Time Fandom wiki](https://wheeloftime.fandom.com) for the world **T'averen Vaen**.

## What lives here

| File | Tracked? | Purpose |
|------|----------|---------|
| `source-profile.json` | Yes | Source contract — API endpoint, license, PREMAQ guidance |
| `README.md` | Yes | This file |
| `BOXFIRE-RUNBOOK.md` | Yes | How to run and resume the ingest |
| `manifest.json` | Yes | Written on completion — page count, failure count, timestamp |
| `pages/*.json` | **No** (gitignored) | One JSON record per wiki page |
| `receipts/*.json` | **No** (gitignored) | One receipt per ingested page |
| `checkpoint.json` | **No** (gitignored) | Resume state for interrupted runs |
| `failures.json` | **No** (gitignored) | List of pages that failed to pull |

The bulk corpus is gitignored so the WoT wiki does not enter the repo wholesale.

## Data shape

Each file under `pages/` follows the `boxfire.wiki-page/v1` schema:

```json
{
  "schema": "boxfire.wiki-page/v1",
  "source": "wot-fandom-wiki",
  "world": "taaveren-vaen",
  "pulledAt": "<ISO 8601>",
  "pageId": 12345,
  "title": "Rand al'Thor",
  "slug": "rand-althor",
  "sha256": "<hex>",
  "wikitext": "…",
  "categories": ["Characters", "Ta'veren", "Male characters"],
  "links": ["Mat Cauthon", "Perrin Aybara", "Egwene al'Vere"],
  "media": ["Rand_alThor.jpg"],
  "revision": {
    "revid": 98765,
    "parentid": 98764,
    "timestamp": "2025-03-14T12:00:00Z",
    "user": "SomeEditor"
  }
}
```

With `--include-history`, a `revisionHistory` array is added containing all prior revisions (content hash only, not full wikitext, to control size).

## PREMAQ relationship

T'averen Vaen's Observer Ingest maps wiki data to PREMAQ axes. See `source-profile.json` → `premaq_guidance` for the full axis-by-axis mapping. Principle: **data sets atmosphere, not fate.**

## License

Wiki content is licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) per Fandom's terms. Bulk corpus is for private world-modelling use only and is not redistributed.
