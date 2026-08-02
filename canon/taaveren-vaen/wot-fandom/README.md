# Ta’veren Vaen — A Wheel of Time Wiki Canon Ingest

This package captures the complete `wot.fandom.com` MediaWiki corpus as an attribution-preserving archive, normalises its canon-reference graph, and binds that foundation to the separately classified **Ta’veren Vaen** project overlay.

## Source boundary

The wiki is a secondary canon reference, not the primary text of the novels. Main-namespace lore pages are eligible for normalisation. Talk, user, forum, administration, and community pages remain archived as provenance/support material and are never promoted as canon facts.

The television adaptation is a separate continuity. Links to adaptation material may be retained as references but are not merged into book continuity by default.

Ta’veren Vaen never overwrites the source canon. It is stored as a later-Turning project overlay with explicit correspondence back to the Wheel of Time foundation.

## One-command local run

```bash
npm run canon:wot:ingest
```

Equivalent explicit sequence:

```bash
node scripts/canon-ingest-wot-fandom.mjs
node scripts/normalise-wot-fandom.mjs
node scripts/verify-wot-fandom-ingest.mjs
```

The crawler is resumable. Use `--reset` only when a partial archive must be discarded deliberately.

Useful bounded forms:

```bash
node scripts/canon-ingest-wot-fandom.mjs --namespace=0 --max-pages=25 --reset
node scripts/normalise-wot-fandom.mjs --allow-partial
```

## GitHub Actions

`.github/workflows/wot-canon-ingest.yml` performs the complete pipeline on the ingest branch:

1. restore resumable crawl state;
2. discover stored MediaWiki namespaces and all pages;
3. capture the latest revision, contributor identity, categories, links, images, redirects, page properties and source URL;
4. write the raw NDJSON archive and crawl receipt;
5. normalise canon entities, relationships, timeline candidates, categories, redirects and dossiers;
6. bind the Ta’veren Vaen overlay without merging it into source canon;
7. run Box’s integrity verification;
8. upload a checksummed archive artefact.

A failed run uploads partial crawl evidence. A successful run is not considered complete until `verification-latest.json` reports `VERIFIED`.

## Output layers

```text
data/raw/pages.ndjson                 complete source archive
data/raw/crawl-state.json             resumable state
data/index/pages.json                 page and namespace index
data/index/categories.json            category membership index
data/index/redirects.json             alias and redirect index
data/normalised/entities.ndjson       canon-reference entities
data/normalised/relationships.ndjson  internal-link relationship graph
data/normalised/timeline.ndjson       review-gated timeline candidates
data/dossiers/                        dossier-per-entity exports
data/receipts/                        crawl, transform and verification receipts

dist/taaveren-vaen-wot-canon.bundle.json
```

Generated corpus files are artefacts, not source code, and remain outside Git history.

## Canon promotion rules

1. Preserve the source revision, URL, contributor identity, retrieval date and CC BY-SA attribution on every imported record.
2. Treat the wiki as a secondary reference layer. Never overwrite a primary-text citation with an unsourced wiki assertion.
3. Keep uncertainty and disagreement. Conflicting dates, identities, spellings or interpretations become separate claims with source receipts.
4. Separate book canon, companion/reference canon, deleted material, adaptation canon, fan inference and community metadata.
5. Redirects become aliases, not duplicate entities.
6. Categories seed entity-type candidates but do not determine type without review.
7. Timeline candidates remain review-gated until primary-text evidence supplies chronology.
8. Spoilers are marked full-series unless a page can be reliably bounded to a book/chapter horizon.
9. Notion stores knowledge links and editorial state; it is not the telemetry bus.
10. Ta’veren Vaen remains a project overlay and may not silently mutate the canon foundation.

## Dual-aspect bind

The generated Arcsweep bundle records both voices:

```text
observable anchor: Wheel of Time canon-reference archive
experiential answer: Ta’veren Vaen project canon
Hearthweave bind: preserve both and make correspondence explicit
```

The same bundle points to the Ta’veren Vaen tone profile so canon, overlay, glyph and sound can be verified against one shared state rather than private parallel truths.

## Verification boundary

A complete ingest requires all of the following:

- complete crawl receipt;
- raw archive count equal to the page index count;
- no duplicate page IDs;
- matching SHA-256 receipts;
- completed normalisation receipt;
- non-empty entity and relationship outputs;
- canon foundation and Ta’veren Vaen overlay still separate;
- dual-aspect tone identity present;
- final status `VERIFIED`.
