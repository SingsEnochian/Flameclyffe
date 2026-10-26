# Wayglass Memory Echo Guard — audit-only v0.1

25 October 2026. Stacked draft on Ledger PR #475.

## Purpose and boundary

Repeated copies of one historical assertion must not count as independent corroboration. An active copy must not relaunder retired or revoked evidence. This trial modifies only the non-authoritative Ledger audit, not canonical inheritance deeds, Wayglass model context, signed receipts, provider calls or permission policy.

A separate pure grouping function handles 2–32 validated records within the same subject. It groups identical source_ref, optional declared origin_ref, or identical canonicalised word sequences. Grouping is transitive. An active candidate is omitted from eligible retrieval if its family contains a superseded/revoked record. Other active duplicates share one ranked family representative. All candidates remain visible with exclusion_reason: retired-receipt, retired-family-echo, duplicate-family-echo, or null.

This conservative trial is NOT semantic entailment or true origin detection. Paraphrases with no shared declared lineage may evade grouping; coincidentally identical text can over-group genuinely independent records. Source refs and origin claims are not signatures. A malicious source editor could rewrite labels. Legitimately updated copies reusing a revoked source ref can be quarantined until independent source review. This is fail-closed audit behaviour, not a new global revocation rule.

## Evidence and acceptance

New synthetic regression suite: apps/wayglass/test/ledger-memory-echo.test.js

1. Three active echoes of retired evidence (shared source, identical prose, declared origin), with corrected active evidence retained.
2. Ten active copies of a source counted as one eligible family, with unrelated evidence retained.
3. Participant isolation, declared-origin validation and negative independence/signature claims.
4. TravellingInheritance hash-chain fixture: revoked deed, correction and active copied deed; JSON cold restart with persistent exclusion and no additional canonical writes.
5. Denial before store.read and injected-vector case where a highly similar active echo remains excluded.

The audit exposes evidence_families, echo_family_ref, exclusion_reason, echo_excluded_active_count, echo_family_count and origin_independence_verified:false. Similarity remains a measurement, not authority or identity.

All new tests are SYNTHETIC until CI confirms them. No browser, provider, Osia, model-training, independent-signature or device signoff is claimed.

## Run locally

    node --test apps/wayglass/test/ledger-memory-echo.test.js apps/wayglass/test/ledger-verified-ingestion.test.js apps/wayglass/test/ledger-supersession-audit.test.js
    npm run wayglass:test

Keep stacked and draft until focused checks and Wayglass CI pass, and review expanded candidate metadata for UI compatibility. Next: authenticated, participant-bound read-only source; blinded paraphrase corpus; cross-runtime generated-answer exclusion. Do not auto-inject audit rows into a model prompt.

Source: PR #475 verified-source bridge and wayglass/current contract. No deployment or merge performed.
