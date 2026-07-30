# Ta’veren Vaen — A Wheel of Time Wiki Canon Ingest

This package captures the complete `wot.fandom.com` MediaWiki corpus as an attribution-preserving archive, then promotes canon-relevant material into the Ta’veren Vaen / Arcsweep knowledge model.

## Source boundary

The source is a secondary canon reference, not the primary text of the novels. Main-namespace lore pages are eligible for normalisation. Talk, user, forum, administration, and community pages remain archived as provenance/support material and are never promoted as canon facts.

The television adaptation is a separate continuity. Links to the TV wiki are preserved as external references but are not merged into book canon by default.

## Run

```bash
node scripts/canon-ingest-wot-fandom.mjs
```

The crawler is resumable. It discovers every MediaWiki namespace, enumerates every page, captures the latest revision content and identity, categories, links, images, redirects, page properties, and source URL, then writes an NDJSON archive with a crawl receipt.

## Output layers

```text
data/raw/pages.ndjson             complete archive
data/index/pages.json             page and namespace index
data/normalised/entities.ndjson   canon entities
data/normalised/relationships.ndjson
\data/normalised/timeline.ndjson
\data/dossiers/                    dossier-per-entity exports
\data/receipts/                    crawl, transform, and import receipts

dist/taaveren-vaen-wot-canon.bundle.json
```

## Canon promotion rules

1. Preserve the source revision, URL, contributor identity, retrieval date, and CC BY-SA attribution on every imported record.
2. Treat the wiki as a secondary reference layer. Never overwrite a primary-text citation with an unsourced wiki assertion.
3. Keep uncertainty and disagreement. Conflicting dates, identities, spellings, or interpretations become separate claims with source receipts.
4. Separate book canon, companion/reference canon, deleted material, adaptation canon, fan inference, and community metadata.
5. Redirects become aliases, not duplicate entities.
6. Categories seed entity type candidates but do not determine type without content checks.
7. Spoilers are marked full-series unless a page can be reliably bounded to a book/chapter horizon.
8. Notion stores knowledge links and editorial state; it is not the telemetry bus.

## Target dossier shape

Each normalised dossier should include:

- canonical name and aliases
- entity type
- source continuity
- summary
- attributes and abilities
- affiliations
- locations
- relationships
- appearances and book/chapter evidence
- timeline claims with confidence
- quotations only as short, attributed excerpts
- source page and revision receipt
- Ta’veren Vaen adaptation notes kept in a separate `project_overlay` field

## Arcsweep import

The final bundle uses `world_key: taaveren-vaen`. Source records remain classified `secondary-canon-reference`; Ta’veren Vaen-specific changes are stored as project overlays rather than silently rewriting Wheel of Time canon.
