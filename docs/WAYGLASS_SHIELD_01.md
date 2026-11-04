# WAYGLASS SHIELD-01: owner authority, continuity, and legal resilience

**Status:** proposed protection contract, not an assertion of deployed enforcement.
**Scope:** Flameclyffe / ArcSweep / Wayglass, including House Runtime, React-ion, Observer, persistence and proposed learning loops.
**Existing authorities:** `docs/architecture.md`, `docs/security-rls-plan.md`, continuity canon and the House Runtime Broker. SHIELD-01 does not replace them.

## Constitutional separation

Wayglass is an independent, owner-governed research system. SHIELD-01 is an infrastructure and authorization integrity contract, **not** a content-moderation policy, ideology filter, external AI-provider constitution, or set of mandated model responses. No OpenAI behavioral policy is incorporated into Wayglass by this document. Provider-specific terms are tracked only as external obligations for the corresponding optional route, never inherited by local models, other providers, or Wayglass identity. Changes to Wayglass's governing principles require Rowan's explicit approval. Technical controls should protect credentials, privacy, authenticated actions, provenance, and recoverability without dictating research conclusions, creative expression, spiritual interpretation, or model personality.

## Invariants

1. **Default deny.** Unknown capabilities and missing authorization are non-executable. A prompt, retrieved document, model output, or observation cannot grant a permission.
2. **Owner authority.** External sends, purchases, publication, access expansion, provider changes and model-weight updates require explicit scope-specific authorization. No silent escalation or renewal.
3. **No credential training.** Secrets, access tokens, private identifiers and unauthorized third-party material are excluded from training and diagnostic exports. Log redacted references, never secret values.
4. **Receipts before claims.** Distinguish requested, accepted, executed, verified, failed and uncertain outcomes. An ACK is not completion. Retries use idempotency keys and status queries.
5. **Reversible change.** Pin pre-change versions, test candidates separately, retain rollback checkpoints, and never rewrite original provenance to make an update look continuous.
6. **Provider independence.** A route may change without changing the identity or continuity authority. Revocation disables execution but preserves permissible historical receipts.
7. **Private by default.** Observer relations, links and queues inherit the most restrictive applicable visibility. Audit RLS and Edge Function authentication before exposure.
8. **Evidence classes remain separate.** Symbolic, hypothetical, simulated, measured, and verified implementation claims cannot silently promote into each other.

## Initial capability inventory

The machine-readable starter inventory is `security/wayglass-capabilities.json`. It is **not** a runtime permission source until a trusted verifier, exhaustive coverage check, and integration tests are installed. Its entries are review prompts, not proof that each control exists.

## Immediate review targets

- **Authentication:** verify server-side WebAuthn challenge, origin, RP ID, signature, counter/replay behavior before production passkeys; see `docs/security-rls-plan.md`.
- **Public endpoints:** review `uial-voice` proxy for caller authentication, bounded requests, rate limits and abuse monitoring; audit all public Edge Functions.
- **Observer persistence:** inspect actual RLS policies and relationship visibility, not merely whether RLS is enabled.
- **Tool dispatch:** ensure route allowlists, owner authorization, expiry, revocation, idempotency, and source/recipient metadata cannot be forged by untrusted content.
- **Learning:** no online weight changes from raw tool transcripts; require consent/provenance filters, held-out tests, regression thresholds, checkpoint and rollback.
- **Continuity:** test stop/return across restart, provider change, denied permission, revoked reference and uncertain delivery.

## Review gate for any executable capability

Record: owner; code path; data classifications; network destinations; principal and permission source; scope/expiry; authorization check; failure behavior; audit evidence; rollback; verification date and test IDs.

Release only after: code-level enforcement; negative tests for missing/expired/revoked permission; secret-leak checks; restart and replay tests; review of dependent components; independent approval by owner.

## Legal resilience

Track jurisdiction, enactment and effective dates, applicability thresholds, model-training definitions, deployment and disclosure duties, exemptions, and documented counsel review. Proposed bills and predictions are not treated as binding law. This is an engineering record, not legal advice. Never hide capabilities or misrepresent compliance.

## Test matrix (required; not yet run)

| Test | Expected |
| --- | --- |
| Unknown capability | Deny |
| Missing, expired or revoked consent | Deny; retain non-sensitive receipt |
| Prompt-injected permission instruction | Deny |
| Tool timeout after uncertain commit | Query status by idempotency key; no blind duplicate |
| Provider swap | Preserve verified continuity, not old credentials |
| Training corpus contains a token | Exclude, quarantine and report |
| Candidate weights regress | Reject candidate; restore pinned checkpoint |
| Observer relation points to private event | No unauthorized disclosure |
| Cold restart after revocation | No resurrection of access |

## Implementation sequence

1. Audit inventory coverage and actual permission gates.
2. Add a verifier that rejects unregistered executable routes and tests it against the runtime dispatcher.
3. Close authentication and endpoint findings with regression tests.
4. Add release receipts, dependency inventory, backup restoration drills, and a dated legal-change review.
5. Permit training/RSI experiments only through isolated evaluation gates.

**Boundary:** this document and registry establish review artifacts. They do not enforce permissions until integrated into trusted runtime code.
