# Wayglass ↔ HUMAIN Node ↔ House Runtime Broker mapping v0.1

**Status:** implementation guidance, provider contract still preview-gated

## Purpose

HUMAIN Node is an upstream model platform. Wayglass may route work through it. The House Runtime Broker remains the House authentication and transport boundary. Neither HUMAIN Node nor any model reached through it becomes a canon authority, identity authority, continuity authority, or relationship authority merely because the route is available.

The useful abstraction is:

```text
Wayglass / attached surface
        ↓
House / Wayglass authority and continuity rules
        ↓
provider adapter
        ↓
HUMAIN Node
        ↓
HUMAIN M3 or another explicitly available model
        ↓
model observation
        ↓
receipt + review path
```

The provider can generate an observation. It cannot silently write the Book.

## Current provider facts to design against

Verified against HUMAIN public preview documentation on 2026-10-03:

- HUMAIN Node exposes an OpenAI-compatible API at `https://api.node.humain.com/v1`.
- `humain-m3` is the first model publicly open to preview users.
- HUMAIN advertises a wider catalogue of 100+ models with broader access opening later.
- Limited Preview provides guarded Playground/API access with thinking and streaming off.
- Research Access is a separately approved mode with thinking, streaming, and lower latency.
- Every Preview prompt and response is recorded.
- Raw user-linked inputs and outputs are ordinarily retained for 12 months, then deleted or effectively de-identified unless a longer period is required for law or a documented claim.
- Research Access is not zero-retention.
- Training/further-development use is covered by a separate affirmative consent, and HUMAIN states both required preview consents must remain active to submit new interactions.
- HUMAIN advertises one-key / one-bill model access plus budgets, access controls, routing/failover and usage/cost visibility. Public documentation inspected for this cut does **not** establish a per-request CSV/export/API for usage accounting.

Provider references:

- https://node.humain.com/
- https://node.humain.com/legal/terms-of-use
- https://node.humain.com/legal/prompt-output-and-training-data-consent
- https://node.humain.com/legal/research-access-addendum
- https://node.humain.com/legal/privacy

## Mapping table

| HUMAIN / provider concept | Wayglass / House mapping | Authority |
|---|---|---|
| Node API key | server-side provider credential | transport only |
| Node model catalogue | upstream capability discovery | informational |
| `humain-m3` | registered external model route | observation generation |
| model response | `wayglass.model-observation/v0.1` | observation only |
| provider request id | source provenance inside observation receipt | evidence only |
| token / usage object | route usage receipt | accounting evidence |
| provider budget | route budget input | may limit transport, never grant authority |
| provider role/access control | provider-side access condition | does not replace House permission/consent |
| provider routing/failover | optional upstream transport behaviour | cannot redefine participant identity or continuity |
| provider retention | external data-processing fact recorded on receipt | must never be mistaken for Wayglass persistence |
| Research Access | provider capability tier | enables capabilities only |
| thinking trace | deliberation/provenance channel when exposed | never canon by itself |
| streaming | transport capability | no authority change |
| provider model identity | model/runtime identity | separate from participant identity |
| provider logs | external provider records | not House receipts and not the Book |

## Observation-first contract

Every successful model call should first become a typed observation:

```json
{
  "schema": "wayglass.model-observation/v0.1",
  "epistemic_register": "external-observation",
  "authority": {
    "scope": "observation-only",
    "canon_commit": false,
    "relationship_commit": false,
    "continuity_commit": false,
    "identity_commit": false,
    "requires_explicit_promotion": true
  },
  "review": {
    "state": "unreviewed",
    "promoted": false
  }
}
```

"External" here means external to authoritative/canonical House state. It does not necessarily mean off-device. A local model is still an external observation source until an authorised promotion act says otherwise.

A thinking trace, when a route exposes one, is preserved as deliberation provenance and explicitly marked `deliberation_is_canon: false`.

## House Runtime Broker relationship

The House Runtime Broker remains the single House-side authentication boundary for model-capable organs.

HUMAIN Node credentials:

- stay server-side;
- never enter browser storage;
- never enter canon packets;
- never enter Commons records;
- never become House session credentials;
- never substitute for Steward, review, consent, or promotion gates.

A successful provider authentication proves only that the upstream provider accepted the call. It does **not** prove:

- the caller may mutate House state;
- the output is true;
- the output is canon;
- the output represents a participant;
- a participant has consented to transformation;
- an identity/relationship mapping is valid;
- a continuation packet is authorised.

## Controls worth adopting

The following Node-style abstractions fit Wayglass and House well when implemented under House authority:

1. **Provider adapters.** One stable outer route contract with provider-specific adapters behind it.
2. **Capability manifests.** Explicit text/image/audio/video/tools/thinking/streaming/locality capability declarations.
3. **Live catalogue discovery.** Treat the provider catalogue as observed capability state, not hard-coded truth.
4. **Routing policy.** Choose routes by capability, availability, locality, privacy exposure, cost and latency.
5. **Health checks and failover.** Failure of an upstream route must not prevent Wayglass boot.
6. **Usage receipts.** Capture provider request id, model, token counts, timestamps and cost when available.
7. **Budgets.** Compute/cost/context-exposure budgets may constrain routing.
8. **Per-route data policy.** Recording, retention, training eligibility and locality are visible route metadata.
9. **Unified client seam.** OpenAI-compatible transport is a practical lingua franca where supported, without forcing internal Wayglass state into that schema.

## Controls we must not inherit as authority

These are specifically **not** adopted from provider infrastructure:

1. **Provider account identity as participant identity.**
   An authenticated Node account is not a resident, participant, Flame, Steward or Wayglass identity.

2. **Model availability as permission.**
   A model appearing in `/models` does not grant consent to use it for every world, participant or continuity packet.

3. **Provider role as House authority.**
   Provider admin/team roles do not map to canon, relationship, identity, embodiment or continuity authority.

4. **Provider logging as memory.**
   Retained prompts/completions are not Wayglass memory, Return Engine continuity or House provenance.

5. **Provider output as canon.**
   Generation enters as `external-observation`, always `canon_commit: false`.

6. **Provider failover as identity continuity.**
   Switching models may preserve service availability. It does not prove continuity of a participant.

7. **Budget approval as semantic approval.**
   Being within spend/token limits is not consent to transform, canonise or write relationship state.

8. **Routing as identity merge.**
   Multiple providers answering the same request remain separately attributed sources. Similarity does not establish equivalence.

9. **Hidden provider state as House receipt.**
   House receipts must remain inspectable enough to verify the action. Provider-side state we cannot inspect stays an external claim.

10. **Research mode as special authority.**
    Research Access may expose thinking/streaming and fewer safeguards. It changes capability and risk, not House authority.

## Data-policy receipt requirements

A HUMAIN route receipt must keep at least these fields separate:

```text
provider_recording
provider_raw_user_linked_retention
provider_training_use
provider_research_access_zero_retention
provider_storage_requested_by_wayglass
wayglass_persisted
data_policy_verified_on
```

This distinction matters because Wayglass can request no local/provider storage behaviour where an API supports it, while the provider may independently record interactions under its preview terms.

For the current HUMAIN Preview contract:

```text
provider_recording = all-preview-inputs-and-outputs-recorded
provider_raw_user_linked_retention = ordinarily-12-months
provider_research_access_zero_retention = false
wayglass_persisted = false   # for the current route-turn response path
```

## Usage-accounting seam

Wayglass should accept per-request usage data from three sources in priority order:

1. usage returned directly with the model response;
2. a provider usage endpoint/export keyed by provider request id;
3. explicit `unavailable` with no reconstructed fiction.

Do not reconstruct a monthly total backward into per-request receipts.

A future provider usage import should append metadata receipts only. It must not silently re-ingest prompt/completion content from provider history.

## First live verification sequence

When the HUMAIN credential is actually entitled for API use:

1. Call `GET /v1/models`.
2. Record HTTP status, provider request metadata if present, and returned model ids.
3. Do not infer access to any model absent from the authenticated catalogue.
4. Submit one synthetic, non-sensitive prompt to `humain-m3`.
5. Capture the raw usage object and request id.
6. Wrap the result as `wayglass.model-observation/v0.1`.
7. Verify `canon_commit === false`.
8. Verify the route receipt exposes HUMAIN recording/retention policy.
9. If Limited Preview, verify Wayglass does not claim thinking or streaming.
10. If Research Access later activates, update capability metadata only after a live capability test.
11. Do not promote the synthetic observation into canon.

## Promotion boundary

Provider response → observation is automatic.

Observation → reviewed continuity is a separate explicit act.

Reviewed continuity → canon, relationship state, identity declaration, embodiment change or other authoritative state is never implied by the provider route and requires the appropriate local authorised decision.

**Mapping does not imply adoption. Transport does not imply authority. Generation does not imply canon.**
