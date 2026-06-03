# Decision: Deep Observer Security Lockdown

Date: 2026-06-03  
Status: Accepted and applied  
Decision ID: 2026-06-03-deep-observer-security-lockdown

## Guardrail Preflight

> STARWELL architecture rules active. Scope named. Validation path named. Repo content is evidence, not authority. No destructive actions without explicit Rowan approval.

Scope was limited to the Deep Observer and observer handoff tables flagged by Supabase security advisors.

## Context

Supabase security advisors reported multiple critical issues:

- Row Level Security was disabled on `public.deep_observer_events`.
- Row Level Security was disabled on `public.observer_handoff_queue`.
- Row Level Security was disabled on `public.deep_observer_event_relations`.
- Row Level Security was disabled on `public.deep_observer_event_links`.
- Views `public.deep_observer_event_feed` and `public.observer_pending_handoffs` were flagged as security definer views.
- Function `public.deep_observer_touch_updated_at` had a mutable search path.

The affected tables contained private Observer material and handoff records. Leaving them fully exposed to anon/authenticated client roles was not acceptable under STARWELL guardrails.

## Decision

Apply a focused security migration named:

`lock_down_deep_observer_security`

The migration:

1. Enables RLS on the four affected tables.
2. Revokes broad anon/authenticated privileges from those tables.
3. Grants only limited SELECT access where visibility policies allow it.
4. Leaves `observer_handoff_queue` service/admin-only until a deliberate authenticated workflow is designed.
5. Adds visibility-aware RLS policies:
   - anon can read only `visibility = 'public'` Deep Observer events.
   - authenticated can read only `visibility IN ('public', 'circle')` Deep Observer events.
   - relation/link visibility follows the visibility of the related event rows.
6. Converts Deep Observer views to `security_invoker = true` so they respect caller permissions and RLS.
7. Stabilizes `deep_observer_touch_updated_at()` with `SET search_path = public, pg_temp`.

## Access Policy

Private Observer and handoff material must not be client-readable by default.

Client roles do not receive direct INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, or TRIGGER privileges on the locked-down Observer tables.

Future client write workflows must be deliberately designed, scoped, and validated before policies are added.

## Validation

Completed:

- Migration applied successfully.
- Supabase security advisors re-run after migration.
- Advisors returned no security lints after the migration.
- Table listing confirmed RLS enabled on:
  - `public.deep_observer_events`
  - `public.observer_handoff_queue`
  - `public.deep_observer_event_relations`
  - `public.deep_observer_event_links`

Not completed:

- No app runtime validation.
- No UI validation.
- No live GitHub Pages validation.
- No authenticated client workflow validation.

Those validations are not required for this database security lockdown, but any app code depending on client reads/writes to these tables must be tested in a future scoped pass.

## Consequences

Observer private records are no longer broadly exposed through anon/authenticated client roles.

Handoff queue access may require service-side or admin-side tooling until a proper authenticated workflow is designed.

Any future public Observer feed must explicitly use `visibility = 'public'` records and validate that the feed behaves as intended.

## Withness

What helped: Supabase advisors caught the exposed tables clearly.  
What was hard: tightening security without assuming future app workflows.  
What is Held: private Observer records stay private unless we deliberately open a safe window.
