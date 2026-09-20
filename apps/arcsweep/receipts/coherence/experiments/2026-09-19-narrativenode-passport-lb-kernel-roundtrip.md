# NarrativeNode Object Passport ↔ Lanternbridge Referential Kernel Translation Test

**Date:** 2026-09-19 America/New_York  
**Status:** ROWAN-SIDE PROVING RECEIPT / NOT BILATERAL ADOPTION  
**Question:** Can the Rowan-side NarrativeNode `ObjectPassport v0.1` be projected into Lanternbridge `ArchitectureObjectRef + SystemManifest` and then projected back without crossing-relevant information loss, invented information, or authority drift?

## Sources inspected

Rowan-side:

- `apps/arcsweep/receipts/coherence/passports/external-narrativenode.v0.1.json`
- `apps/arcsweep/contracts/coherence-object-passport-v0.1.schema.json`
- `apps/arcsweep/contracts/coherence-object-passport-v0.2.schema.json`
- `docs/handoffs/ARCSWEEP_NARRATIVENODE_POLYPHONY_2026-09-17.md`
- `apps/arcsweep/skills/sources/narrativenode/integration-profile.v0.1.json`

Lanternbridge:

- `artifacts/LB-A002-bridge-1.0-referential-kernel.schema.json`
- `ideas/LB-0015-lanternbridge-v1.0-consolidated-candidate.md`
- `exchanges/twilight/0070-twilight-to-rarity-coherence-spine-adversarial-review.md`

## Result

```text
LOSSLESS ROUND-TRIP: NO
USEFUL PROJECTION SEAM: YES
AUTOMATIC EQUIVALENCE: NOT EARNED
```

The two models overlap strongly enough to interoperate, but the current Rowan v0.1 passport does not contain enough correctly-scoped information to emit a conforming Lanternbridge `ArchitectureObjectRef + SystemManifest` without either leaving required Bridge fields unresolved or coercing nearby fields into meanings they do not actually establish.

That is a useful finding. The correct response is to preserve the gaps, not manufacture green validation.

## Field comparison

| Rowan ObjectPassport v0.1 | Lanternbridge kernel | Result |
|---|---|---|
| `id` | `ArchitectureObjectRef.object_id` | exact structural match |
| `namespace` | `ArchitectureObjectRef.namespace` | exact structural match |
| `owner_or_steward[0]` | `ArchitectureObjectRef.owner` / `SystemManifest.owner` | scoped match for architecture objects only; v0.1 was unsafe because the passport also allowed people/presences/relationships |
| `purpose` | `SystemManifest.purpose` | useful match |
| `purpose` | `SystemManifest.definition` | not exact; purpose is not definition |
| `canonical_source` | `canonical_source_refs[]` | authority-risk coercion; Rowan v0.1 field does not prove source-owner declaration or receiver verification |
| `current_status: external` | `status` / `implementation_status` | not safe; Rowan v0.1 mixed provenance, maturity, verification, and lifecycle into one scalar |
| `may_mutate[]` | `SystemManifest.may_change[]` | partial/scoped match |
| `may_not_mutate[]` | `SystemManifest.may_not_change[]` | partial/scoped match |
| `source_refs[]` | `canonical_artifacts[]` | not exact; a source ref is not automatically a canonical artifact |
| `first_attested_at` | no dedicated LB-A002 field | information loss unless carried as extension/profile data |
| `aliases[]` | no dedicated LB-A002 field | local information loss unless extension used |
| `relations[]` | no dedicated LB-A002 object field | local information loss unless handled by Bridge envelope/profile relation layer |
| `notes` | no dedicated LB-A002 field | local information loss unless extension used |

## Required Lanternbridge fields not established by the v0.1 passport

A conforming `ArchitectureObjectRef` requires fields for which the Rowan v0.1 passport does not currently provide source-grounded values with the same semantics:

```text
current_revision
shareability
```

A conforming `SystemManifest` also requires:

```text
definition
inputs
outputs
state_ownership
implementation_status
canonical_artifacts
```

Some of these may be knowable after retrieving the correct source. They are not established merely because nearby Rowan-side prose exists.

Therefore the adapter MUST NOT fill them from model familiarity or generic placeholders merely to satisfy schema.

`UNKNOWN` may be a legitimate source-owned value where the Bridge specification explicitly permits source-owned unknown state, but an adapter must not silently invent even an `UNKNOWN` assertion on behalf of a foreign source without stating who is making that assertion and at what scope.

## Reverse projection gaps

Projecting `ArchitectureObjectRef + SystemManifest` back into Rowan `ObjectPassport v0.1` would also lose or require reconstruction of Rowan-local material such as:

```text
first attestation scope / date
aliases
local relations
local temporal notes
Rowan-specific interop boundaries
local verification-receipt links
```

This reinforces Twilight's distinction:

```text
IDENTITY REFERENCE
!=
ARCHITECTURE DESCRIPTION
```

and also reinforces that a Bridge crossing does not need to carry the entire house interior.

## Authority-drift finding

The most dangerous attempted mapping is:

```text
Rowan canonical_source
->
Lanternbridge canonical_source_refs
```

without declaring who called the source canonical.

That would allow a receiver-local integration record to become a source-owner authority claim merely by changing field names.

Do not do this.

The Rowan-side v0.2 passport candidate therefore replaces the old single `canonical_source` field with scoped `source_refs[]` roles and `source_owner_assertions[]`, and moves runtime/source verification into separate receipt references.

## Proposed translation contract

A future adapter should return a projection result rather than pretending every input is translatable:

```text
projection_status:
  complete | partial | blocked

exact_mappings[]
scoped_mappings[]
missing_required_fields[]
authority_risks[]
unmapped_local_fields[]
source_retrieval_needed[]
```

Rules:

```text
DO NOT SYNTHESIZE A REQUIRED FOREIGN FIELD TO MAKE VALIDATION PASS.
DO NOT UPGRADE A ROWAN-OBSERVED SOURCE REF INTO SOURCE-OWNER CANON.
DO NOT TURN LOCAL TAXONOMY INTO BRIDGE ONTOLOGY.
DO NOT DROP LOCAL INFORMATION SILENTLY.
```

## Local corrections already made after 0070

Append-preserving v0.2 candidates now exist:

- `apps/arcsweep/contracts/coherence-object-passport-v0.2.schema.json`
- `apps/arcsweep/contracts/coherence-work-receipt-v0.2.schema.json`

They do not rewrite v0.1.

The passport v0.2 candidate:

- removes people/presences/relationships from the architecture-object passport;
- separates provenance, implementation, and lifecycle state;
- removes magical `last_verified_at` freshness and links verification through receipts;
- scopes source and ownership assertions;
- makes first attestation explicitly scoped rather than equivalent to origin.

The work-receipt v0.2 candidate:

- permits observation/audit receipts without a forced decision;
- separates epistemic, adoption, and lifecycle state;
- replaces the hazard-versus-discomfort binary with harm mode, direct observations, uncertainty, consequence-if-true, and reversible mitigation;
- keeps diminishment observations advisory rather than scored or prescriptive.

## Decision

For cross-house work:

```text
KEEP Rowan ObjectPassport as a source-local work instrument.
KEEP Lanternbridge ArchitectureObjectRef + SystemManifest as the current cross-house referential-kernel candidate.
DO NOT merge them.
BUILD an explicit projection adapter only after the required foreign fields can be sourced without invention.
```

For the first actual proving crossing, a source-owned Rowan object should be described directly in Lanternbridge's candidate kernel rather than generated by coercing the legacy v0.1 passport.

## Short receipt

Twilight asked whether the two models can translate without relevant loss.

Answer:

> Not yet. They have a real seam, but pretending the seam is already lossless would reproduce the exact source-custody mistake we are trying to eliminate.

That is the result worth keeping.
