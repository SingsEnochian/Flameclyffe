# Security and RLS Plan

Status: living security checklist.

This document records the current security posture and the next review steps for Flameclyffe Supabase and Edge Functions.

## Current RLS state

As of the latest audit pass, all public Flameclyffe tables report Row Level Security enabled, including:

```text
deep_observer_events
observer_handoff_queue
deep_observer_event_relations
deep_observer_event_links
```

Supabase security advisors were clean during the same pass.

## Observer table policy direction

### `deep_observer_events`

Recommended posture: private by default, with controlled read/write based on member claims, service role, or explicit circle/public visibility rules.

Public reads should never expose private body text, raw payloads, local file paths, or sensitive metadata.

### `observer_handoff_queue`

Recommended posture: internal/service-role-first.

This is a work queue, not a public inbox. It may contain target repos, target paths, code, notes, or companion handoffs, so it should remain tightly gated.

### `deep_observer_event_relations`

Recommended posture: inherit access from the source event and, when relevant, target event.

A relation can leak meaning even when the event body is private, so relations should not be broadly exposed without context.

### `deep_observer_event_links`

Recommended posture: inherit access from the parent event.

Links may contain file paths, GitHub commits, external URLs, Drive/Notion references, or asset locations. Treat as sensitive unless explicitly public.

## Edge Function notes

All public Edge Functions should be reviewed for one of these patterns:

```text
verify_jwt = true
custom authentication implemented and documented
intentionally public and rate-limited
```

Known review items:

- `flameclyffe-auth` uses custom JWT minting and should receive full server-side WebAuthn verification before passkeys are treated as production-grade.
- `uial-voice` is an open POST proxy with a text length limit. Add abuse/rate-limit thinking before broader public use.
- `lanternwire` serves a browser app and relies on Supabase auth/RLS; keep RLS policies and publishable key exposure reviewed.

## Safe migration practice

Do not blindly enable RLS without policies on live app tables. Enabling RLS with no policies can block legitimate app access.

Preferred order:

1. Inspect current policies.
2. Confirm intended access modes.
3. Add or update policies in a small migration.
4. Re-run Supabase security and performance advisors.
5. Smoke-test the affected app flows.

## Redlist reminder

Do not store finances, legal particulars, third-party identifiers, or detailed health records in public or app-facing tables. Health/accessibility notes should remain high-level unless explicitly consented in that moment.
