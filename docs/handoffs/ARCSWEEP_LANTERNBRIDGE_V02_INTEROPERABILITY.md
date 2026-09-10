# ArcSweep ↔ Project Zero Lanternbridge v0.2 interoperability

**Status:** PARTIAL

## Purpose

Resume the existing Lanternbridge Slice 5 path without inventing a second protocol or making Project Zero an owner of ArcSweep state.

Project Zero remains one cockpit/reference implementation. ArcSweep remains a sovereign operating environment. Lanternbridge v0.2 is the shared entry-envelope protocol at the crossing point.

This slice adds the Rowan-side mechanical comparison instrument only. It does not add transport, polling, authentication negotiation, capability exchange, autonomous replies, memory ingestion, model training, or repository mutation.

## Existing foundation

ArcSweep already has `apps/arcsweep/src/lanternbridge-receiver.js`, which:

- recognizes adopted Lanternbridge `0.2` envelopes;
- preserves raw source internally while keeping dry-run inspection non-mutating;
- separates envelope recognition from downstream authority;
- recognizes the four v0.2 usage actions;
- performs no downstream actions during inspection.

Project Zero already has its independently implemented read-only Lanternbridge Inspector with the diagnostic shape represented by:

- `envelopeState`;
- `protocolIdentifier`;
- parsed `metadata`;
- per-action `authority[].resolved`;
- per-action `runtimeCapability`.

## New Rowan-side receipt

`apps/arcsweep/src/lanternbridge-interoperability.js` normalizes the two independent diagnostic shapes into one comparison plane.

The normalized comparison covers:

- envelope state;
- protocol identifier;
- bridge id;
- type;
- origin;
- exact author actor identifiers;
- response signal;
- all four usage-authority results;
- local runtime capability.

The receipt schema is:

```text
arcsweep.lanternbridge-interoperability-receipt/v0.1
```

The receipt deliberately does **not** embed the source Markdown or record body. It carries only a source reference and SHA-256 digest plus normalized diagnostics. This is important for records that are inspectable but do not grant republish authority.

## CLI

Run the Rowan-side inspection against a local Lanternbridge record:

```powershell
npm run lanternbridge:interop -- --source "<path-to-UH-Lanternbridge>\artifacts\LB-A001-v0.2-protocol-publication.md"
```

This produces a Rowan-side-only receipt with:

```text
comparison.status = AWAITING_PROJECT_ZERO_DIAGNOSTIC
```

If a Project Zero Inspector diagnostic has been exported to JSON, compare both independent implementations with:

```powershell
npm run lanternbridge:interop -- --source "<path-to-UH-Lanternbridge>\artifacts\LB-A001-v0.2-protocol-publication.md" --project-zero ".\project-zero-lb-a001.json"
```

A complete match exits normally. A semantic mismatch is preserved in `comparison.mismatches` and exits with code `2`; the harness never forces agreement.

## First real acceptance record

Use the existing adopted protocol-publication receipt:

```text
artifacts/LB-A001-v0.2-protocol-publication.md
```

Known Project Zero runtime validation classifies this record as:

```text
VALID
protocol 0.2
artifact
runtime INSPECT_ONLY
memory_ingest = NO_AUTHORITY
transform = NO_AUTHORITY
republish = NO_AUTHORITY
model_training = NO_AUTHORITY
```

The absence of a `usage` block is intentional. No downstream action is authorized merely because the source is visible.

## Acceptance gate

This slice becomes VERIFIED for the first crossing only after one real local run proves all of the following from the exact same source bytes:

1. the source SHA-256 is recorded;
2. ArcSweep classifies the adopted record;
3. Project Zero independently classifies that same record;
4. both diagnostics are normalized without changing either implementation;
5. envelope state and authority results match, or any mismatch is preserved explicitly;
6. the comparison receipt contains no Lanternbridge source prose;
7. no downstream action, repository write, memory ingest, transform, republish, or model-training action occurs.

Until that real two-sided receipt exists, the interoperability harness is PARTIAL, not VERIFIED.

## Next protocol boundary

Do not design Lanternbridge v0.3 transport from this implementation alone. Transport, notification, authentication, delivery, node discovery, and capability exchange remain a later protocol discussion after v0.2 has mechanical cross-runtime evidence.

**Project Zero owns nothing here. ArcSweep owns nothing there. Lanternbridge describes the crossing.**
