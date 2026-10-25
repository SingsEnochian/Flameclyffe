# Travelling inheritance: read-only host context integration

Wayglass is the ship: travel, learning, transformation, encounter, relationship,
embodiment, return and adventure are the purpose. This module helps receipted
learning travel without silently redefining a participant. Core preflight:
`Wayglass_Core_Rule.pdf` (Rowan's current two-page rule), travelling inheritance
canon and whole-system design law. The wider Wonder remains open.

## System ownership and interfaces

The existing kernel owns participant/world continuity. The deed ledger owns
append-only inheritance history. Independently retained accepted evidence owns
acceptance, not model prose or the ledger's hash chain. A host-owned world registry
owns approved world profiles. `WayglassInheritanceContext` owns the read-only
projection boundary; the existing Wayglass router owns provider assembly.
Provider responses remain unreviewed external observations.

This stacked integration combines PR #438's ledger/compiler with PR #436's host.
It adds no continuation packet fields, no second participant identity system,
no receipt-writing route and no model-weight changes.

Host-only dependencies of `WayglassInheritanceContext`:

| Dependency | Contract |
| --- | --- |
| `store.read(participant_id)` | Read authoritative stored inheritance state; never write from this boundary. Production storage must be durable. |
| `resolveBinding(request)` | Authenticate the caller and resolve the participant plus authorised destination world through host/kernel state; return `{ participant_id, world_id }` or null. Do not derive authority from request-body IDs, model text or arbitrary headers. |
| `resolveWorld(world_id, binding)` | Return a host-approved profile with matching `world_id`, provenance-bearing `rules_ref` and accepted translations. Do not return a client-supplied profile. |
| `resolveAcceptedEvent(event, binding)` | Resolve the event's source/outcome references against independent accepted evidence and return its complete canonical event, or null. The result must deeply equal the stored event. Acceptance and revocation semantics belong to this trusted service. |

Supply the instance to `createWayglassRouter({ inheritanceContext })` or install it
as `app.locals.wayglassInheritanceContext` on the existing Express app. The default
router reads that host-only slot. No production callback or database adapter is
invented here. An inheritance request with participant/world IDs but no configured
resolver returns 503; a configured resolver requires the authenticated binding.
Legacy turns without those IDs remain unchanged when no resolver is installed.

## Executable flow and receipt linkage

`POST /api/v1/wayglass/respond` resolves its existing provider route, then:

1. Obtain a trusted binding; compare existing participant/world request selectors.
2. Read exactly one history snapshot and validate its hash chain and event IDs.
3. Check active seed/deed events and all revocation records against accepted evidence.
   Revoked deed contents need not remain accepted and are excluded from context.
4. Resolve the trusted destination profile and call `compileContext(world)` on the
   same snapshot. Unsupported translations stay explicitly unavailable with lineage.
5. Append compiler instructions to the existing shared `buildInstructions` output.
   Send the serialised dossier in a separate labelled user-data message, after prior
   history and before the current input. Descriptions/translations do not enter the
   instruction field. Arbitrary request-body compiled-context claims are ignored.
6. Dispatch through existing Ollama/HUMAIN system messages or OpenAI `instructions`
   plus `input`. The response receipt references the context schema, participant,
   destination, rules, revision, head hash and included capability receipt hashes.

The added `receipt.inheritance_context` is projection provenance, not an acceptance
receipt or persistence acknowledgement. `wayglass_persisted` remains false for the
provider turn. Model observations remain unreviewed and non-authoritative.

Missing identity authentication yields 401; participant/world substitution yields
403; invalid history, unaccepted evidence or invalid world projection yields 409.
Host storage failure propagates as an error before provider dispatch. No error
falls back to a context-free turn. No read or projection calls `record` or CAS.

## Consistency, failure and recovery

The compiler validates and projects one captured revision rather than rereading
mutable history halfway through assembly. Each new request captures a fresh
snapshot, so accepted revocations affect subsequent requests. This is snapshot
consistency, not a distributed transaction across the independent evidence store
and world registry. The host must provide appropriate consistency and revocation
freshness for deployment. A failed request leaves the last stored state untouched.

The host never takes event authority from a continuation packet or model response.
Future write-side integration still requires authenticated grant/acceptance,
durable atomic storage and independently retained witnesses. This module does not
implement these services or remove revoked text from arbitrary user conversation
history; it controls the inheritance dossier projection only.

## Verification and remaining trial

`npm run wayglass:test` includes both ledger tests and HTTP host integration tests.
Host tests use the actual Express router on loopback, independently accepted
synthetic fixture events, a test-only binding adapter, in-memory storage and a
captured provider transport. They check all three provider payload formats,
existing IC/OOC/ownership instructions, receipt linkage, zero writes, revocation,
binding substitution, missing/changed evidence, chain corruption, unwitnessed
revocation, unsupported translation, invalid destination, unavailable storage and
unconfigured-host rejection. The Wayglass workflow installs the host dependencies
and runs these tests alongside build/staging checks.

This proves the executable local HTTP-to-provider-payload boundary, not a live
deed, durable process restart, deployed host, external inference success or the full
Return Engine crossing trial. Before the next real trial, supply the host's actual
binding/evidence/world/storage services, record one genuinely accepted outcome,
restart the host and run world A -> deed -> world B projection/use -> A return.
Retain receipts independently and then run same-runtime, authorised model-swap and
corrupted-packet arms without promoting observations into deeds.

Picked up: accepted-deed/compiler/provider assembly seam. Stop point: executable
read-only host integration and captured-payload proof. Next owner: Rarity for the
production host service adapters; Rowan for first named world profiles. Handoff
acknowledgement: implementation requested by Rowan, deployment trial still open.
