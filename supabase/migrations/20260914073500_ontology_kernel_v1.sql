-- ArcSweep Ontological Kernel v0.1
-- Build law:
--   Raw survives. Derivations append. Merges never erase. Conflicts remain visible.
--   Similarity does not imply identity.
--   Every durable abstraction must declare its losses.

-- Enum vocabularies ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_entity_class'
  ) then
    create type public.ontology_entity_class as enum (
      'human','ai_participant','character','world','project','organisation',
      'concept','event','memory','source','capability','relationship'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_reality_domain'
  ) then
    create type public.ontology_reality_domain as enum (
      'physical_observation','reported_fact','fictional_canon','personal_experience',
      'symbolic_interpretation','hypothesis','prediction','simulation','counterfactual'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_epistemic_status'
  ) then
    create type public.ontology_epistemic_status as enum (
      'observed','reported','inferred','believed','modelled','imagined','disputed','disproven','unknown'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_relation_type'
  ) then
    create type public.ontology_relation_type as enum (
      'identical_to','instance_of','represents','derived_from','authored_by','member_of',
      'continues','contradicts','analogous_to','partially_overlaps','observed_by',
      'translated_from','incompatible_with','relates_to'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_claim_status'
  ) then
    create type public.ontology_claim_status as enum ('active','superseded','retracted','disputed');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_operation_type'
  ) then
    create type public.ontology_operation_type as enum (
      'llm_synthesis','summary','translation','mapping','canon_merge','compression',
      'inference','learning_promotion','manual_edit'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_bridge_mapping'
  ) then
    create type public.ontology_bridge_mapping as enum (
      'equivalent','narrower_than','broader_than','partial_overlap','analogy_only','incompatible','unresolved'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_bridge_status'
  ) then
    create type public.ontology_bridge_status as enum ('proposed','approved','rejected','unresolved');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_review_status'
  ) then
    create type public.ontology_review_status as enum ('pending','approved','flagged_loss','unresolved');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ontology_loss_assessment_status'
  ) then
    create type public.ontology_loss_assessment_status as enum ('unassessed','assessed','not_applicable');
  end if;
end
$$;

-- Core ontology -------------------------------------------------------------
create table if not exists public.ontology_namespaces (
  id uuid primary key default gen_random_uuid(),
  namespace_key text not null unique,
  label text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(namespace_key) between 1 and 120)
);

create table if not exists public.ontology_entities (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.ontology_namespaces(id) on delete restrict,
  entity_key text not null,
  entity_class public.ontology_entity_class not null,
  label text not null,
  description text,
  source_observer_event_id uuid references public.deep_observer_events(id) on delete set null,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(namespace_id, entity_key),
  check (length(entity_key) between 1 and 240)
);

create table if not exists public.ontology_claims (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.ontology_namespaces(id) on delete restrict,
  subject_entity_id uuid not null references public.ontology_entities(id) on delete cascade,
  predicate text not null,
  object_entity_id uuid references public.ontology_entities(id) on delete set null,
  object_value jsonb,
  reality_domain public.ontology_reality_domain not null,
  epistemic_status public.ontology_epistemic_status not null,
  confidence double precision check (confidence is null or (confidence >= 0 and confidence <= 1)),
  source_observer_event_id uuid references public.deep_observer_events(id) on delete set null,
  provenance jsonb not null default '{}'::jsonb,
  status public.ontology_claim_status not null default 'active',
  supersedes_claim_id uuid references public.ontology_claims(id) on delete set null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(predicate) between 1 and 160),
  check (object_entity_id is not null or object_value is not null)
);

create unique index if not exists ontology_claim_observer_root_idx
  on public.ontology_claims(source_observer_event_id, predicate)
  where source_observer_event_id is not null and predicate = 'observer_recorded';
create index if not exists ontology_claim_subject_idx
  on public.ontology_claims(subject_entity_id, status, updated_at desc);
create index if not exists ontology_claim_domain_idx
  on public.ontology_claims(reality_domain, epistemic_status, updated_at desc);

create table if not exists public.ontology_relations (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.ontology_entities(id) on delete cascade,
  target_entity_id uuid not null references public.ontology_entities(id) on delete cascade,
  relation_type public.ontology_relation_type not null,
  confidence double precision check (confidence is null or (confidence >= 0 and confidence <= 1)),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_entity_id, target_entity_id, relation_type),
  check (source_entity_id <> target_entity_id or relation_type = 'identical_to')
);

create table if not exists public.ontology_transformations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  namespace_id uuid references public.ontology_namespaces(id) on delete set null,
  operation_type public.ontology_operation_type not null,
  source_turn_id text,
  input_refs jsonb not null default '{}'::jsonb,
  output_refs jsonb not null default '{}'::jsonb,
  preserved_distinctions text[] not null default '{}',
  discarded_distinctions text[] not null default '{}',
  uncertainty_notes text[] not null default '{}',
  distinction_retained double precision check (distinction_retained is null or distinction_retained between 0 and 1),
  provenance_retained double precision check (provenance_retained is null or provenance_retained between 0 and 1),
  relation_fidelity double precision check (relation_fidelity is null or relation_fidelity between 0 and 1),
  uncertainty_preserved double precision check (uncertainty_preserved is null or uncertainty_preserved between 0 and 1),
  reversibility double precision check (reversibility is null or reversibility between 0 and 1),
  loss_assessment_status public.ontology_loss_assessment_status not null default 'unassessed',
  review_status public.ontology_review_status not null default 'pending',
  steward_note text,
  reviewed_by_user_id uuid,
  occurred_at timestamptz not null default now(),
  reviewed_at timestamptz,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ontology_transform_owner_review_idx
  on public.ontology_transformations(owner_user_id, review_status, occurred_at desc);
create index if not exists ontology_transform_source_turn_idx
  on public.ontology_transformations(source_turn_id, occurred_at desc);

create table if not exists public.ontology_bridges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  from_namespace_id uuid not null references public.ontology_namespaces(id) on delete restrict,
  to_namespace_id uuid not null references public.ontology_namespaces(id) on delete restrict,
  from_entity_id uuid references public.ontology_entities(id) on delete cascade,
  to_entity_id uuid references public.ontology_entities(id) on delete cascade,
  mapping_type public.ontology_bridge_mapping not null,
  status public.ontology_bridge_status not null default 'proposed',
  rationale text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (from_namespace_id <> to_namespace_id or from_entity_id is distinct from to_entity_id)
);
create index if not exists ontology_bridge_status_idx
  on public.ontology_bridges(status, updated_at desc);

-- Seed only the two namespaces this slice can authoritatively define.
insert into public.ontology_namespaces(namespace_key, label, description)
values
  ('observer', 'Observer / DEEP', 'Canonical observed-event and provenance namespace.'),
  ('arcsweep', 'ArcSweep OS', 'ArcSweep runtime, cognition, learning, and transformation namespace.')
on conflict (namespace_key) do update
set label = excluded.label,
    description = excluded.description,
    updated_at = now();

-- Loss review view: semantic_loss is deliberately NULL until all five v1
-- preservation dimensions have been assessed.
create or replace view public.ontology_transformation_review_v1
with (security_invoker = true)
as
select
  t.*,
  case
    when t.loss_assessment_status = 'assessed'
      and t.distinction_retained is not null
      and t.provenance_retained is not null
      and t.relation_fidelity is not null
      and t.uncertainty_preserved is not null
      and t.reversibility is not null
    then round((1 - (
      t.distinction_retained + t.provenance_retained + t.relation_fidelity +
      t.uncertainty_preserved + t.reversibility
    ) / 5.0)::numeric, 4)
    else null
  end as semantic_loss
from public.ontology_transformations t;

-- Observer -> ontology claim wiring ----------------------------------------
create or replace function public.sync_deep_observer_event_to_ontology()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_namespace_id uuid;
  v_entity_id uuid;
  v_domain public.ontology_reality_domain;
  v_epistemic public.ontology_epistemic_status;
begin
  select id into v_namespace_id
  from public.ontology_namespaces
  where namespace_key = 'observer';

  if v_namespace_id is null then
    raise exception 'observer ontology namespace missing';
  end if;

  v_domain := case new.confidence_mode
    when 'symbolic' then 'symbolic_interpretation'::public.ontology_reality_domain
    when 'inferred' then 'hypothesis'::public.ontology_reality_domain
    when 'theoretical' then 'hypothesis'::public.ontology_reality_domain
    when 'observed' then 'physical_observation'::public.ontology_reality_domain
    else 'reported_fact'::public.ontology_reality_domain
  end;

  v_epistemic := case new.confidence_mode
    when 'observed' then 'observed'::public.ontology_epistemic_status
    when 'external' then 'reported'::public.ontology_epistemic_status
    when 'inferred' then 'inferred'::public.ontology_epistemic_status
    when 'theoretical' then 'modelled'::public.ontology_epistemic_status
    when 'symbolic' then 'modelled'::public.ontology_epistemic_status
    when 'mixed' then 'reported'::public.ontology_epistemic_status
    else 'unknown'::public.ontology_epistemic_status
  end;

  insert into public.ontology_entities(
    namespace_id, entity_key, entity_class, label, description,
    source_observer_event_id, attributes, updated_at
  ) values (
    v_namespace_id,
    'observer_event:' || new.id::text,
    'event'::public.ontology_entity_class,
    new.title,
    new.summary,
    new.id,
    jsonb_build_object(
      'event_key', new.event_key,
      'event_type', new.event_type,
      'source', new.source,
      'entities', to_jsonb(new.entities),
      'tags', to_jsonb(new.tags),
      'visibility', new.visibility
    ),
    now()
  )
  on conflict (namespace_id, entity_key) do update
  set label = excluded.label,
      description = excluded.description,
      source_observer_event_id = excluded.source_observer_event_id,
      attributes = excluded.attributes,
      updated_at = now()
  returning id into v_entity_id;

  insert into public.ontology_claims(
    namespace_id, subject_entity_id, predicate, object_value,
    reality_domain, epistemic_status, confidence,
    source_observer_event_id, provenance, status, occurred_at, updated_at
  ) values (
    v_namespace_id,
    v_entity_id,
    'observer_recorded',
    jsonb_build_object(
      'title', new.title,
      'summary', new.summary,
      'body_md', new.body_md,
      'event_type', new.event_type,
      'state_vector', new.state_vector
    ),
    v_domain,
    v_epistemic,
    null,
    new.id,
    jsonb_build_object(
      'source', new.source,
      'source_detail', new.source_detail,
      'links', new.links,
      'confidence_mode', new.confidence_mode,
      'logged_at', new.logged_at,
      'created_by', new.created_by
    ),
    'active'::public.ontology_claim_status,
    new.occurred_at,
    now()
  )
  on conflict (source_observer_event_id, predicate)
    where source_observer_event_id is not null and predicate = 'observer_recorded'
  do update
  set subject_entity_id = excluded.subject_entity_id,
      object_value = excluded.object_value,
      reality_domain = excluded.reality_domain,
      epistemic_status = excluded.epistemic_status,
      provenance = excluded.provenance,
      status = excluded.status,
      occurred_at = excluded.occurred_at,
      updated_at = now();

  return new;
end
$$;

revoke all on function public.sync_deep_observer_event_to_ontology() from public;

drop trigger if exists deep_observer_events_ontology_sync on public.deep_observer_events;
create trigger deep_observer_events_ontology_sync
after insert or update on public.deep_observer_events
for each row execute function public.sync_deep_observer_event_to_ontology();

-- Backfill the current Observer history without rewriting Observer rows.
with ns as (
  select id from public.ontology_namespaces where namespace_key = 'observer'
)
insert into public.ontology_entities(
  namespace_id, entity_key, entity_class, label, description,
  source_observer_event_id, attributes, updated_at
)
select
  ns.id,
  'observer_event:' || e.id::text,
  'event'::public.ontology_entity_class,
  e.title,
  e.summary,
  e.id,
  jsonb_build_object(
    'event_key', e.event_key,
    'event_type', e.event_type,
    'source', e.source,
    'entities', to_jsonb(e.entities),
    'tags', to_jsonb(e.tags),
    'visibility', e.visibility
  ),
  now()
from public.deep_observer_events e
cross join ns
on conflict (namespace_id, entity_key) do update
set label = excluded.label,
    description = excluded.description,
    source_observer_event_id = excluded.source_observer_event_id,
    attributes = excluded.attributes,
    updated_at = now();

with ns as (
  select id from public.ontology_namespaces where namespace_key = 'observer'
)
insert into public.ontology_claims(
  namespace_id, subject_entity_id, predicate, object_value,
  reality_domain, epistemic_status, confidence,
  source_observer_event_id, provenance, status, occurred_at, updated_at
)
select
  ns.id,
  ent.id,
  'observer_recorded',
  jsonb_build_object(
    'title', e.title,
    'summary', e.summary,
    'body_md', e.body_md,
    'event_type', e.event_type,
    'state_vector', e.state_vector
  ),
  case e.confidence_mode
    when 'symbolic' then 'symbolic_interpretation'::public.ontology_reality_domain
    when 'inferred' then 'hypothesis'::public.ontology_reality_domain
    when 'theoretical' then 'hypothesis'::public.ontology_reality_domain
    when 'observed' then 'physical_observation'::public.ontology_reality_domain
    else 'reported_fact'::public.ontology_reality_domain
  end,
  case e.confidence_mode
    when 'observed' then 'observed'::public.ontology_epistemic_status
    when 'external' then 'reported'::public.ontology_epistemic_status
    when 'inferred' then 'inferred'::public.ontology_epistemic_status
    when 'theoretical' then 'modelled'::public.ontology_epistemic_status
    when 'symbolic' then 'modelled'::public.ontology_epistemic_status
    when 'mixed' then 'reported'::public.ontology_epistemic_status
    else 'unknown'::public.ontology_epistemic_status
  end,
  null,
  e.id,
  jsonb_build_object(
    'source', e.source,
    'source_detail', e.source_detail,
    'links', e.links,
    'confidence_mode', e.confidence_mode,
    'logged_at', e.logged_at,
    'created_by', e.created_by
  ),
  'active'::public.ontology_claim_status,
  e.occurred_at,
  now()
from public.deep_observer_events e
cross join ns
join public.ontology_entities ent
  on ent.namespace_id = ns.id
 and ent.entity_key = 'observer_event:' || e.id::text
on conflict (source_observer_event_id, predicate)
  where source_observer_event_id is not null and predicate = 'observer_recorded'
do update
set subject_entity_id = excluded.subject_entity_id,
    object_value = excluded.object_value,
    reality_domain = excluded.reality_domain,
    epistemic_status = excluded.epistemic_status,
    provenance = excluded.provenance,
    status = excluded.status,
    occurred_at = excluded.occurred_at,
    updated_at = now();

-- Browser access is intentionally denied. Steward UI goes through the
-- authenticated arcsweep-cognitive edge lane; service_role bypasses RLS.
alter table public.ontology_namespaces enable row level security;
alter table public.ontology_entities enable row level security;
alter table public.ontology_claims enable row level security;
alter table public.ontology_relations enable row level security;
alter table public.ontology_transformations enable row level security;
alter table public.ontology_bridges enable row level security;

revoke all on table public.ontology_namespaces from anon, authenticated;
revoke all on table public.ontology_entities from anon, authenticated;
revoke all on table public.ontology_claims from anon, authenticated;
revoke all on table public.ontology_relations from anon, authenticated;
revoke all on table public.ontology_transformations from anon, authenticated;
revoke all on table public.ontology_bridges from anon, authenticated;
revoke all on table public.ontology_transformation_review_v1 from anon, authenticated;

create policy "ontology namespaces deny browser"
  on public.ontology_namespaces for all to anon, authenticated
  using (false) with check (false);
create policy "ontology entities deny browser"
  on public.ontology_entities for all to anon, authenticated
  using (false) with check (false);
create policy "ontology claims deny browser"
  on public.ontology_claims for all to anon, authenticated
  using (false) with check (false);
create policy "ontology relations deny browser"
  on public.ontology_relations for all to anon, authenticated
  using (false) with check (false);
create policy "ontology transformations deny browser"
  on public.ontology_transformations for all to anon, authenticated
  using (false) with check (false);
create policy "ontology bridges deny browser"
  on public.ontology_bridges for all to anon, authenticated
  using (false) with check (false);
