# Presence Fabric v0.1

Presence Fabric is the additive Astra 6.1 contract for representing an identity participating on a surface. It is deliberately smaller than a provider session and does not become an authority or credential store.

## Ownership

- Identity is the durable anchor (`identity_id`).
- Presence is a bounded participation instance (`presence_id`, `surface`, `session_id`).
- Provider/model binding is replaceable and may be `UNKNOWN`.
- Participation mode describes routing intent only; it grants no privilege.
- ArcSweep owns continuity and projection across surfaces; renderers and providers do not create rival identity stores.

Every record is immutable and schema-tagged as `arcsweep.presence/v1`. Missing or unrecognised surfaces, providers, and models are explicit `UNKNOWN`; missing identity or session is an error.

## Lineage

`createPresenceLineageReceipt` emits a credential-free summary for rebind, project, participation, and teardown transitions. Receipts contain no arbitrary metadata or secrets and always carry `authority_grants: []`. Teardown preserves the identity, surface, session, and continuity reference in `before`, while `after` is `null`.

## Integration

`model-presence-bus.js` retains its existing additive model-presence fields and now exposes the canonical nested `presence` record. House Commons v5 supplies an explicit `house-commons` surface and stable room/voice session key during streaming. Existing consumers remain compatible.

## Evidence boundary

This is a runtime contract and test-backed implementation, not evidence that any model or system is conscious. Provider claims, user interpretation, and symbolic/fictional material remain separate evidence classes.
