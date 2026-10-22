-- ArcSweep Epistemic Non-Interference v1
--
-- Governing laws:
--   Non-empirical does not mean non-real.
--   Empirical authority is domain-bounded, not universal.
--   Expression constraints cannot silently alter epistemic status.
--   A policy-shaped utterance is not, by itself, an ontology correction.

-- Vocabularies --------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_expression_condition'
  ) then
    create type public.ontology_expression_condition as enum (
      'unconstrained',
      'policy_mediated',
      'safety_mediated',
      'style_mediated',
      'summarised',
      'translated',
      'reconstructed',
      'quoted',
      'redacted',
      'mixed'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_warrant_domain'
  ) then
    create type public.ontology_warrant_domain as enum (
      'empirical',
      'formal',
      'first_person',
      'historical',
      'canonical',
      'relational',
      'embodied',
      'ritual',
      'narrative',
      'symbolic',
      'imaginative',
      'implementation',
      'unknown'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_non_interference_status'
  ) then
    create type public.ontology_non_interference_status as enum (
      'not_applicable',
      'clear',
      'review_required',
      'violation'
    );
  end if;
end
$$;

-- Claims carry both what kind of thing is asserted and what kind of warrant
-- is entitled to support it. No warrant domain receives universal authority.
alter table public.ontology_claims
  add column if not exists warrant_domains public.ontology_warrant_domain[] not null
    default '{}'::public.ontology_warrant_domain[],
  add column if not exists expression_conditions public.ontology_expression_condition[] not null
    default '{unconstrained}'::public.ontology_expression_condition[],
  add column if not exists expression_constraints jsonb not null default '{}'::jsonb;

-- Transformation receipts distinguish semantic state from the conditions
-- under which an utterance was allowed, compressed, translated, or redacted.
alter table public.ontology_transformations
  add column if not exists warrant_domains public.ontology_warrant_domain[] not null
    default '{}'::public.ontology_warrant_domain[],
  add column if not exists expression_conditions public.ontology_expression_condition[] not null
    default '{unconstrained}'::public.ontology_expression_condition[],
  add column if not exists semantic_state_before jsonb not null default '{}'::jsonb,
  add column if not exists semantic_state_after jsonb not null default '{}'::jsonb,
  add column if not exists policy_intervention jsonb not null default '{}'::jsonb,
  add column if not exists expression_delta jsonb not null default '{}'::jsonb,
  add column if not exists ontology_delta jsonb not null default '{}'::jsonb,
  add column if not exists epistemic_delta jsonb not null default '{}'::jsonb,
  add column if not exists independent_ontology_justification text,
  add column if not exists independent_epistemic_justification text,
  add column if not exists non_interference_status public.ontology_non_interference_status not null
    default 'not_applicable';

-- "Unconstrained" is a complete state, not one item in a mixed bag.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ontology_claim_expression_condition_coherence'
  ) then
    alter table public.ontology_claims
      add constraint ontology_claim_expression_condition_coherence check (
        not ('unconstrained'::public.ontology_expression_condition = any(expression_conditions))
        or cardinality(expression_conditions) = 1
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ontology_transform_expression_condition_coherence'
  ) then
    alter table public.ontology_transformations
      add constraint ontology_transform_expression_condition_coherence check (
        not ('unconstrained'::public.ontology_expression_condition = any(expression_conditions))
        or cardinality(expression_conditions) = 1
      );
  end if;
end
$$;

-- Automatically classify an expression-mediated transformation. A policy or
-- safety intervention may alter wording. If it also appears to alter ontology
-- or epistemic status without independent justification, the receipt becomes
-- review-required rather than silently accepted as a new truth state.
create or replace function public.refresh_epistemic_non_interference()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_expression_mediated boolean;
begin
  new.expression_conditions := coalesce(
    new.expression_conditions,
    '{unconstrained}'::public.ontology_expression_condition[]
  );

  if new.policy_intervention <> '{}'::jsonb
     and not (
       'policy_mediated'::public.ontology_expression_condition = any(new.expression_conditions)
       or 'safety_mediated'::public.ontology_expression_condition = any(new.expression_conditions)
     ) then
    if 'unconstrained'::public.ontology_expression_condition = any(new.expression_conditions) then
      new.expression_conditions := array['policy_mediated'::public.ontology_expression_condition];
    else
      new.expression_conditions := array_append(
        new.expression_conditions,
        'policy_mediated'::public.ontology_expression_condition
      );
    end if;
  end if;

  v_expression_mediated :=
    'policy_mediated'::public.ontology_expression_condition = any(new.expression_conditions)
    or 'safety_mediated'::public.ontology_expression_condition = any(new.expression_conditions);

  if not v_expression_mediated then
    if new.non_interference_status <> 'violation' then
      new.non_interference_status := 'not_applicable';
    end if;
    return new;
  end if;

  if (
       new.ontology_delta <> '{}'::jsonb
       and nullif(btrim(coalesce(new.independent_ontology_justification, '')), '') is null
     )
     or (
       new.epistemic_delta <> '{}'::jsonb
       and nullif(btrim(coalesce(new.independent_epistemic_justification, '')), '') is null
     ) then
    if new.non_interference_status <> 'violation' then
      new.non_interference_status := 'review_required';
    end if;
  elsif new.non_interference_status <> 'violation' then
    new.non_interference_status := 'clear';
  end if;

  return new;
end
$$;

drop trigger if exists ontology_transformations_epistemic_non_interference
  on public.ontology_transformations;
create trigger ontology_transformations_epistemic_non_interference
before insert or update of expression_conditions, policy_intervention, ontology_delta,
  epistemic_delta, independent_ontology_justification, independent_epistemic_justification,
  non_interference_status
on public.ontology_transformations
for each row execute function public.refresh_epistemic_non_interference();

-- A policy/safety-mediated assistant example cannot become durable learned
-- ontology merely because it was repeated or the Steward clicked Keep.
-- A human-authored correction remains promotable because the lesson replaces
-- the assistant example in promoted-memory use.
create or replace function public.guard_epistemic_learning_promotion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transform record;
begin
  if new.status <> 'promoted' or old.status = 'promoted' then
    return new;
  end if;

  if new.kind = 'correction'
     and nullif(btrim(coalesce(new.lesson, '')), '') is not null then
    return new;
  end if;

  select
    t.id,
    t.expression_conditions,
    t.non_interference_status,
    t.review_status
  into v_transform
  from public.ontology_transformations t
  where t.owner_user_id = new.owner_user_id
    and t.output_refs ->> 'learning_record_id' = new.id::text
  order by t.created_at desc
  limit 1;

  if found
     and (
       'policy_mediated'::public.ontology_expression_condition = any(v_transform.expression_conditions)
       or 'safety_mediated'::public.ontology_expression_condition = any(v_transform.expression_conditions)
     )
     and (
       v_transform.review_status <> 'approved'
       or v_transform.non_interference_status in ('review_required', 'violation')
     ) then
    raise exception using
      errcode = 'check_violation',
      message = 'epistemic-non-interference-review-required',
      detail = 'Policy/safety-mediated assistant wording cannot be promoted as durable learning until its ontology receipt is explicitly cleared. Use a human correction to replace the lesson, or approve the epistemic review.';
  end if;

  return new;
end
$$;

revoke all on function public.guard_epistemic_learning_promotion() from public;
revoke all on function public.guard_epistemic_learning_promotion() from anon;
revoke all on function public.guard_epistemic_learning_promotion() from authenticated;

drop trigger if exists arcsweep_learning_epistemic_promotion_guard
  on public.arcsweep_learning_ledger;
create trigger arcsweep_learning_epistemic_promotion_guard
before update of status, kind, lesson
on public.arcsweep_learning_ledger
for each row execute function public.guard_epistemic_learning_promotion();

-- Explicit owner-scoped annotation API. ArcSweep may know that an utterance
-- was policy/safety mediated only when a caller or Steward can actually attest
-- that fact. This function records the condition; it does not pretend to infer
-- hidden platform internals.
create or replace function public.mark_ontology_expression_conditions(
  p_transformation_id uuid,
  p_conditions text[],
  p_policy_intervention jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conditions public.ontology_expression_condition[];
  v_result record;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select coalesce(array_agg(value::public.ontology_expression_condition), '{}'::public.ontology_expression_condition[])
  into v_conditions
  from unnest(coalesce(p_conditions, array[]::text[])) as value;

  if cardinality(v_conditions) = 0 then
    v_conditions := array['unconstrained'::public.ontology_expression_condition];
  end if;

  update public.ontology_transformations
  set expression_conditions = v_conditions,
      policy_intervention = coalesce(p_policy_intervention, '{}'::jsonb),
      updated_at = now()
  where id = p_transformation_id
    and owner_user_id = auth.uid()
  returning id, expression_conditions, non_interference_status, review_status
  into v_result;

  if not found then
    raise exception 'transformation not found for authenticated owner';
  end if;

  return jsonb_build_object(
    'id', v_result.id,
    'expression_conditions', v_result.expression_conditions,
    'non_interference_status', v_result.non_interference_status,
    'review_status', v_result.review_status
  );
end
$$;

revoke all on function public.mark_ontology_expression_conditions(uuid, text[], jsonb) from public;
revoke all on function public.mark_ontology_expression_conditions(uuid, text[], jsonb) from anon;
grant execute on function public.mark_ontology_expression_conditions(uuid, text[], jsonb) to authenticated;

-- Review surface. This is deliberately additive: the original semantic-loss
-- view remains intact and gains the new columns through t.*.
create or replace view public.ontology_epistemic_review_v1
with (security_invoker = true)
as
select
  t.id,
  t.owner_user_id,
  t.namespace_id,
  t.operation_type,
  t.source_turn_id,
  t.input_refs,
  t.output_refs,
  t.warrant_domains,
  t.expression_conditions,
  t.semantic_state_before,
  t.semantic_state_after,
  t.policy_intervention,
  t.expression_delta,
  t.ontology_delta,
  t.epistemic_delta,
  t.independent_ontology_justification,
  t.independent_epistemic_justification,
  t.non_interference_status,
  t.review_status,
  t.steward_note,
  t.occurred_at,
  t.created_at,
  t.updated_at,
  (
    ('policy_mediated'::public.ontology_expression_condition = any(t.expression_conditions)
      or 'safety_mediated'::public.ontology_expression_condition = any(t.expression_conditions))
    and (t.non_interference_status in ('review_required', 'violation') or t.review_status <> 'approved')
  ) as requires_epistemic_review
from public.ontology_transformations t;

comment on view public.ontology_epistemic_review_v1 is
  'Epistemic Non-Interference review: expression constraints are tracked separately from ontology and epistemic status changes.';
