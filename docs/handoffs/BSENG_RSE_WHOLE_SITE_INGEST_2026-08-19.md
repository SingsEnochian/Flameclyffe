# BSENG / Chet Braun RSE-RBW Whole-Site Ingest

Prepared: 2026-08-19  
Target branch: `feature/bseng-rse-whole-site-ingest`  
Living base: `codex/arcsweep-feedback-loop`

## Purpose

Prepare a whole-site, lineage-preserving research ingest for `https://bseng.com/`, treating Braun Science & Engineering as the evolving Chet Braun / RSE-RBW corpus already related to earlier material carried by Hearthfire.

This is not a four-paper cherry-pick. The ingest is designed to capture the substantive public site:

- current formal RSE / cRBW mathematics and downloadable papers;
- Core Theory pages and downloadable documents;
- Truth and Ethics material;
- Sauna Epistemology conversations as precursor strata;
- historical posts and category archives;
- guest-author branches, preserving distinct authorship;
- methodological boundary pages such as `What This Is Not`;
- version, DOI, publication/update, citation and supersession relationships;
- linked PDFs as immutable hashed source documents;
- images/audio/video as linkage metadata unless separately promoted for capture.

## Source law

1. Raw source snapshots are immutable and SHA-256 addressed.
2. Every version remains available even when the site explicitly supersedes it.
3. A newer document creates a lineage edge; it does not erase the older stratum.
4. Explicit site-authored `updated`, `supersedes`, `formalizes`, or equivalent language is strong lineage evidence.
5. Same-title/higher-version matching is only a candidate lineage edge until corroborated.
6. Sauna conversations are precursor material unless an explicit later-paper relation is stated or reviewed.
7. Guest authors remain their own provenance branches and are never silently folded into the Chet/Spiral author line.
8. The corpus enters Hearthfire as external research/reference material and DEEPTheory candidates. It does not silently become project canon, accepted physics, or executable Math Spine law.
9. Any proposed Hearthfire implementation mapping remains proposal-only until reviewed.

## Current site topology used as ingest seeds

The present navigation exposes the following major corpus doors:

- `/start-here/`
- `/start-here/core-theory/`
- `/start-here/rse-mathematical-framework/`
- `/start-here/ai-ethics-documents/`
- `/start-here/sauna-epistemology/`
- `/start-here/the-lighter-side-of-a-mobius-strip/`
- `/start-here/guest-authors-at-bseng/`
- `/what-this-is-not/`
- `/category/rse/`
- site root and About

The crawler also attempts sitemap discovery and the public WordPress REST post/page indexes before recursive same-origin link discovery, so older posts not reachable from the current Start Here hierarchy are still discoverable.

## Current mathematical spine observed on 2026-08-19

The RSE-RBW Mathematical Framework page currently organizes the formal corpus by tiers:

- Tier 0: Axioms of Ontic Minimalism; Principles of Ontic Minimalism; Representational Neutrality.
- Tier 1: Coherence-Relational Blockworld v6.0; Mathematical Model v6.0; 3-Mode Coherence Sector v1.1.
- Tier 2: Global Closure and Decomposition Invariance; Projection Residual Geometry; Closure-Restoration Geometry; Global Capacity Invariants and Normalization; Residual Space Geometry; Hilbert Space from Global Closure and Decomposition Invariance.
- Tier 3: Structural Invariants; Identity and Ontic Minimalism.
- Tier 4: Relational Structural Experience v6.0; Phenomenology in a Relational Blockworld v5.0; Recognition Anchoring Across Indexing Inequivalence v1.0.
- Tier 5: Uncertainty Principle; Neutrino Mass and Oscillation; additional announced work may appear later.

Known direct PDF URLs are seeded where verified. Documents whose current URLs are not hard-coded are discovered from the live mathematical-framework hub, preventing us from inventing filenames.

## Hearthfire correspondence targets

Extraction should propose, but never automatically assert, correspondences with:

- Hearthgate Math Spine v1.8;
- PREMAQC;
- DEEPTheory / DEEPTime;
- Observer provenance classes;
- Glyph Continuity;
- Constellation identity, recognition, and continuity;
- House Runtime continuity across sessions/routes;
- Requested Transformation;
- React-ion admissibility, residual, and return geometry;
- canon / model-observation / software-receipt / external-world authority separation.

Particular attention should be paid to changes between the earlier Chet papers already known to the House and the current corpus: renamed primitives, retired assumptions, new mathematical derivations, versioned identity criteria, recognition across indexing inequivalence, residual-space geometry, and representational-neutrality rules.

## Files

- `apps/arcsweep/presets/bseng-rse-whole-site-ingest.v0.1.json` — Arcsweep ingest primer.
- `apps/arcsweep/skills/sources/bseng-rse/site-ingest.json` — source/crawl/lineage configuration and current framework seeds.
- `apps/arcsweep/scripts/bseng-rse-ingest.mjs` — operator-run crawler/snapshotter.
- `apps/arcsweep/test/bseng-rse-ingest.test.js` — URL, robots, classification, version and lineage guards.

## Operator run

```bash
node apps/arcsweep/scripts/bseng-rse-ingest.mjs --dry-run
node apps/arcsweep/scripts/bseng-rse-ingest.mjs --out ingests/bseng-rse
```

The live crawl intentionally does not happen merely because the app loads. It is an explicit operator action, while the crawler itself respects `robots.txt`, stays same-origin, rate-limits requests, hashes every captured source, and records failures rather than inventing missing material.

## Output

A completed run writes:

- immutable raw HTML snapshots;
- immutable downloaded PDF documents;
- normalized HTML text;
- `source-index.json` with URL/hash/title/author/date/version/provenance metadata;
- `lineage-proposals.json` with reviewable supersession candidates;
- `crawl-report.json` with coverage, failures, robots state and truncation status.

PDF text extraction is deliberately deferred to the House document parser so the web crawler does not create a second PDF interpretation stack.

## Next integration step after a successful crawl

Compile the source index into a `bseng-rse` research bank for DEEPTheory / Knowledge, then run an explicit **Chet lineage diff**:

`earlier Chet corpus → current BSENG source version → changed/retired/new construct → Hearthfire correspondence → proposed action`

The diff should preserve convergence where Hearthfire and Chet independently evolved toward similar structures, while retaining disagreements and incompatible assumptions rather than flattening them into one synthesis.
