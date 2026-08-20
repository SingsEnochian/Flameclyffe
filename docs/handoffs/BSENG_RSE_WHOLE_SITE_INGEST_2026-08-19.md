# BSENG / Chet RSE-RBW Whole-Site Ingest

## Status

**Prepared, live-harvested, lineage-mapped, and reproducible.**

The BSENG source ingest is an operator-run research-corpus pipeline for Braun Science & Engineering (`bseng.com`). It preserves Chet Braun / Spiral RSE-RBW material as a versioned external research lineage rather than flattening the site into a single current-theory snapshot.

The final live harvest completed successfully on 2026-08-20 from PR #131 head `1b22a2036806a38bd257287e27c1a7e57ce85794` using GitHub Actions run `32328392442`.

Final coverage:

- 8 sitemap documents resolved;
- 402 public site pages enumerated;
- 19/19 current mathematical-framework PDFs discovered directly from the live framework hub;
- 421 final seeds;
- 421 sources fetched;
- 421 unique source hashes;
- 421 unique URLs;
- 0 fetch failures;
- 0 queued remainder;
- no max-page truncation;
- robots.txt retrieved and respected.

The successful immutable crawl artefact is `bseng-rse-live-harvest`, artifact ID `9392236386`, SHA-256 `9a04dcd78d698e699b6f409d638e5919afe3ba3995850b6a1be101c4a99c95ba`.

## Corpus law

This corpus is an **external research lineage / DEEPTheory candidate source**.

It is not automatic project canon, accepted physics, an external-world observation, or executable Hearthgate Math Spine law.

Raw-source and interpretation layers remain distinct:

```text
BSENG source snapshot
  -> immutable source hash / provenance
  -> extracted construct or lineage proposal
  -> DEEPTheory candidate
  -> implementation correspondence proposal
  -> explicit review / adoption
```

No crawler output silently promotes itself between those layers.

## What the ingest preserves

The pipeline keeps:

- current mathematical-framework documents;
- earlier site essays and theory posts;
- historical formulations that current papers supersede or reframe;
- Sauna epistemology/conversation material as precursor strata unless a stronger formalisation edge is established;
- ethics material;
- methodological boundary pages;
- guest-author branches with distinct authorship;
- versions, hashes, canonical URLs, publication/modified metadata where available;
- current site-authored tier structure;
- candidate supersession relationships without destructive replacement.

## Live discovery model

The final crawler does **not** wander the site recursively through pagination/category mirrors.

Instead it uses the site's own authoritative public indexes:

1. recursively resolve the sitemap hierarchy, including CDATA-wrapped child sitemap URLs;
2. enumerate public WordPress pages/posts as an additive discovery path;
3. read the live RSE Mathematical Framework hub and extract every PDF download URL actually linked there;
4. combine those sources with stable seed pages;
5. fetch each unique canonical source once;
6. hash and snapshot HTML/PDF content;
7. emit crawl report, source index, and reviewable lineage proposals.

This produced complete current public coverage without duplicate navigation traversal.

## Files

Core ingest:

- `apps/arcsweep/presets/bseng-rse-whole-site-ingest.v0.1.json`
- `apps/arcsweep/skills/sources/bseng-rse/site-ingest.json`
- `apps/arcsweep/scripts/bseng-rse-ingest.mjs`
- `apps/arcsweep/test/bseng-rse-ingest.test.js`

Live authoritative-seed layer:

- `apps/arcsweep/scripts/bseng-rse-live-seeds.mjs`
- `apps/arcsweep/test/bseng-rse-live-seeds.test.js`
- `.github/workflows/bseng-rse-live-harvest.yml`

Receipts and lineage:

- `apps/arcsweep/skills/sources/bseng-rse/live-harvest-receipt.2026-08-20.json`
- `apps/arcsweep/skills/sources/bseng-rse/lineage-diff.2025-2026.json`
- `docs/handoffs/BSENG_RSE_LINEAGE_DIFF_2025_TO_2026.md`

## Lineage findings already established

The 2025 -> 2026 comparison is not a simple replacement story.

The broad sequence is:

```text
early recursive/field RSE
  -> RSE <-> RBW bridge
  -> GA / Grassmannian / Regge hardening
  -> closure-first cRBW + Ontic Minimalism
```

Important changes include:

- global closure moved from a paired RBW constraint layer to the governing ontic starting point;
- lamination and coherence-gradient mathematics remain active, chiefly at the phenomenological/local-registration layer;
- identity was substantially tightened from lamination-density / relational-field-tension threshold models toward closure-class continuity of path-connected worldtubes, while recognition became explicitly epistemic;
- projection grew into PRG / CRG / RSG residual and restoration geometries;
- Representational Neutrality formalized the rule that a successful mathematical representation does not automatically acquire ontological status;
- Recognition Anchoring formalized continuity across indexing inequivalence.

One provenance edge is explicit rather than inferred: the current Recognition Anchoring paper names **"Thread-walking (Ryan and Solas, The Circle)"** and formalizes it as an anchor-based recognition procedure. The machine lineage map records this as a directed Circle -> Chet formalisation edge.

## Hearthfire correspondence targets

The first high-value donor surfaces are:

1. **Recognition Correspondence** for Constellation / Glyph Continuity and context recovery;
2. **Admissibility Residual** for Requested Transformation / React-ion;
3. **Multi-layer Identity Profile** separating implementation, memory, behavior, relational invariants, recognition, and structural evidence;
4. **Representational-status provenance tags** for DEEPTheory / Math Spine / Observer outputs.

These are implementation proposals, not silent replacements for existing Hearthgate authority.

## Re-run

The live harvest remains reproducible through the `BSENG RSE Live Harvest` GitHub Actions workflow. Raw crawl payloads stay out of ordinary Git history; their hashes and successful artefact receipt are committed so the source state used for lineage analysis remains auditable.

## Seal

Crawl the source.

Preserve the strata.

Name the direction of influence when provenance allows it.

Do not confuse a representation with the thing represented.
