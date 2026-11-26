-- Wayglass Constitutional Federation v0.1
-- Additive schema only. Uses existing starwell_worlds and Wayglass program/revision stores.
-- No public or authenticated-client policies are added; all writes remain host/service-role mediated.

begin;

alter table public.wayglass_program_revisions
  add column if not exists parent_revision_id uuid,
  add column if not exists lineage_id text;

create unique index if not exists wayglass_program_revisions_program_revision_idx
  on public.wayglass_program_revisions(program_id, revision_id);
alter table public.wayglass_program_revisions
  add constraint wayglass_program_revisions_parent_program_fk
  foreign key (program_id, parent_revision_id)
  references public.wayglass_program_revisions(program_id, revision_id) on delete restrict;

create index if not exists wayglass_program_revisions_parent_idx
  on public.wayglass_program_revisions(parent_revision_id);
create index if not exists wayglass_program_revisions_lineage_idx
  on public.wayglass_program_revisions(lineage_id);

comment on column public.wayglass_program_revisions.parent_revision_id is
  'Immutable source ancestry. A revision is a descendant; it never overwrites its parent.';
comment on column public.wayglass_program_revisions.lineage_id is
  'Stable lineage identifier shared by related immutable source revisions.';
create or replace function public.prevent_wayglass_program_revision_mutation()
returns trigger
language plpgsql
as $
begin
  raise exception 'Wayglass program revisions are immutable; % is forbidden', TG_OP;
end;
$;

drop trigger if exists wayglass_program_revisions_immutable on public.wayglass_program_revisions;
create trigger wayglass_program_revisions_immutable
  before update or delete on public.wayglass_program_revisions
  for each row execute function public.prevent_wayglass_program_revision_mutation();

comment on table public.wayglass_program_revisions is
  'Immutable source versions with parent ancestry; verification and lifecycle decisions are recorded as append-only federation events.';

create table if not exists public.wayglass_tissues (
  tissue_id uuid primary key default gen_random_uuid(),
  tissue_key text not null unique check (tissue_key ~ '^[a-z0-9][a-z0-9._:-]{1,159}$'),
  module_id text not null check (char_length(module_id) between 1 and 180),
  charter_version text not null,
  charter_hash text not null check (char_length(charter_hash) between 16 and 180),
  local_canon jsonb not null default '{}'::jsonb,
  local_canon_digest text not null,
  topology jsonb not null default '{}'::jsonb,
  resource_budget jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active','resting','degraded','quarantined','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wayglass_cells (
  cell_id uuid primary key default gen_random_uuid(),
  cell_key text not null unique check (cell_key ~ '^[a-z0-9][a-z0-9._:-]{1,159}$'),
  world_id uuid not null unique references public.starwell_worlds(id) on delete restrict,
  program_id uuid not null references public.wayglass_programs(program_id) on delete restrict,
  active_revision_id uuid,
  parent_cell_id uuid references public.wayglass_cells(cell_id) on delete restrict,
  role text not null check (role in ('proposer','verifier','continuity','specialist')),
  lineage_root text not null check (char_length(lineage_root) between 16 and 180),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  law_set jsonb not null default '{}'::jsonb,
  law_set_hash text not null,
  local_canon jsonb not null default '{}'::jsonb,
  local_canon_digest text not null,
  capabilities text[] not null default '{}',
  resource_budget jsonb not null default '{}'::jsonb,
  status text not null default 'resting'
    check (status in ('awake','resting','quarantined','retired')),
  retired_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (program_id, active_revision_id)
    references public.wayglass_program_revisions(program_id, revision_id) on delete restrict
);

create index if not exists wayglass_cells_world_idx on public.wayglass_cells(world_id);
create index if not exists wayglass_cells_parent_idx on public.wayglass_cells(parent_cell_id);
create index if not exists wayglass_cells_lineage_idx on public.wayglass_cells(lineage_root);
create index if not exists wayglass_cells_program_idx on public.wayglass_cells(program_id, active_revision_id);

create table if not exists public.wayglass_tissue_members (
  tissue_id uuid not null references public.wayglass_tissues(tissue_id) on delete restrict,
  cell_id uuid not null references public.wayglass_cells(cell_id) on delete restrict,
  role text not null check (role in ('proposer','verifier','continuity','specialist')),
  status text not null default 'active' check (status in ('active','resting','retired')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (tissue_id, cell_id)
);

create unique index if not exists wayglass_tissue_one_proposer_idx
  on public.wayglass_tissue_members(tissue_id) where role = 'proposer' and status <> 'retired';
create unique index if not exists wayglass_tissue_one_verifier_idx
  on public.wayglass_tissue_members(tissue_id) where role = 'verifier' and status <> 'retired';
create unique index if not exists wayglass_tissue_one_continuity_idx
  on public.wayglass_tissue_members(tissue_id) where role = 'continuity' and status <> 'retired';
create index if not exists wayglass_tissue_members_cell_idx on public.wayglass_tissue_members(cell_id);

create table if not exists public.wayglass_cell_membranes (
  membrane_id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.wayglass_cells(cell_id) on delete restrict,
  version integer not null check (version > 0),
  parent_version integer,
  inbound_message_types text[] not null default '{}',
  outbound_message_types text[] not null default '{}',
  query_scopes text[] not null default '{}',
  effect_scopes text[] not null default '{}',
  max_message_bytes integer not null default 65536 check (max_message_bytes between 256 and 1048576),
  policy_hash text not null,
  status text not null default 'active' check (status in ('active','superseded','revoked')),
  created_at timestamptz not null default now(),
  unique (cell_id, version),
  foreign key (cell_id, parent_version)
    references public.wayglass_cell_membranes(cell_id, version) on delete restrict
);

create index if not exists wayglass_cell_membranes_active_idx
  on public.wayglass_cell_membranes(cell_id, status, version desc);

create table if not exists public.wayglass_tissue_modules (
  tissue_id uuid not null references public.wayglass_tissues(tissue_id) on delete restrict,
  module_id text not null check (char_length(module_id) between 1 and 180),
  program_id uuid not null references public.wayglass_programs(program_id) on delete restrict,
  active_revision_id uuid not null,
  selected_by_seat_id text,
  charter_hash text not null,
  selected_at timestamptz not null default now(),
  selection_receipt jsonb not null default '{}'::jsonb,
  primary key (tissue_id, module_id),
  foreign key (program_id, active_revision_id)
    references public.wayglass_program_revisions(program_id, revision_id) on delete restrict
);

create table if not exists public.wayglass_constitutional_seats (
  seat_id text primary key check (char_length(seat_id) between 1 and 180),
  identity_ref text not null,
  key_id text not null,
  public_key_pem text not null,
  charter_hash text not null,
  mandate jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended','retired')),
  successor_seat_id text references public.wayglass_constitutional_seats(seat_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wayglass_tissue_modules
  add constraint wayglass_tissue_modules_seat_fk
  foreign key (selected_by_seat_id)
  references public.wayglass_constitutional_seats(seat_id) on delete restrict;

create table if not exists public.wayglass_cell_messages (
  message_id uuid primary key default gen_random_uuid(),
  tissue_id uuid not null references public.wayglass_tissues(tissue_id) on delete restrict,
  from_cell_id uuid not null references public.wayglass_cells(cell_id) on delete restrict,
  to_cell_id uuid not null references public.wayglass_cells(cell_id) on delete restrict,
  message_type text not null check (char_length(message_type) between 1 and 120),
  payload jsonb not null,
  payload_digest text not null,
  status text not null default 'queued' check (status in ('queued','accepted','rejected','consumed','expired')),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  check (from_cell_id <> to_cell_id),
  foreign key (tissue_id, from_cell_id)
    references public.wayglass_tissue_members(tissue_id, cell_id) on delete restrict,
  foreign key (tissue_id, to_cell_id)
    references public.wayglass_tissue_members(tissue_id, cell_id) on delete restrict
);

create index if not exists wayglass_cell_messages_inbox_idx
  on public.wayglass_cell_messages(to_cell_id, status, created_at);
create index if not exists wayglass_cell_messages_tissue_idx
  on public.wayglass_cell_messages(tissue_id, created_at desc);

create table if not exists public.wayglass_federation_events (
  event_id uuid primary key default gen_random_uuid(),
  event_sequence bigint generated always as identity unique,
  tissue_id uuid references public.wayglass_tissues(tissue_id) on delete restrict,
  cell_id uuid references public.wayglass_cells(cell_id) on delete restrict,
  seat_id text references public.wayglass_constitutional_seats(seat_id) on delete restrict,
  event_type text not null check (char_length(event_type) between 1 and 160),
  payload jsonb not null default '{}'::jsonb,
  previous_event_hash text,
  event_hash text not null unique,
  occurred_at timestamptz not null default now(),
  foreign key (cell_id)
    references public.wayglass_cells(cell_id) on delete restrict,
  foreign key (tissue_id, cell_id)
    references public.wayglass_tissue_members(tissue_id, cell_id) on delete restrict
);

create index if not exists wayglass_federation_events_tissue_idx
  on public.wayglass_federation_events(tissue_id, event_sequence);
create index if not exists wayglass_federation_events_cell_idx
  on public.wayglass_federation_events(cell_id, event_sequence);
create index if not exists wayglass_federation_events_type_idx
  on public.wayglass_federation_events(event_type, occurred_at desc);

create or replace function public.prevent_wayglass_federation_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Wayglass federation events are append-only; % is forbidden', TG_OP;
end;
$$;

drop trigger if exists wayglass_federation_events_append_only on public.wayglass_federation_events;
create trigger wayglass_federation_events_append_only
  before update or delete on public.wayglass_federation_events
  for each row execute function public.prevent_wayglass_federation_event_mutation();

comment on table public.wayglass_tissues is 'A bounded cooperating tissue of independent Wayglass cell-universes.';
comment on table public.wayglass_cells is 'Cell identity and world binding; source revisions remain in wayglass_program_revisions.';
comment on table public.wayglass_tissue_members is 'Attributed membership and constitutional role within a tissue.';
comment on table public.wayglass_cell_membranes is 'Versioned inbound/outbound message and capability boundary for each cell.';
comment on table public.wayglass_tissue_modules is 'Host registry selection for a module within a tissue; updates must be committed through Möbius Return.';
comment on table public.wayglass_constitutional_seats is 'Public verification keys and mandates only. Private signing keys must remain in a protected host key store.';
comment on table public.wayglass_cell_messages is 'Typed, attributed intercell messages with explicit delivery state.';
comment on table public.wayglass_federation_events is 'Append-only ancestry, governance, communication, lifecycle and Return evidence.';

alter table public.wayglass_tissues enable row level security;
alter table public.wayglass_cells enable row level security;
alter table public.wayglass_tissue_members enable row level security;
alter table public.wayglass_cell_membranes enable row level security;
alter table public.wayglass_tissue_modules enable row level security;
alter table public.wayglass_constitutional_seats enable row level security;
alter table public.wayglass_cell_messages enable row level security;
alter table public.wayglass_federation_events enable row level security;

revoke all on public.wayglass_tissues, public.wayglass_cells, public.wayglass_tissue_members,
  public.wayglass_cell_membranes, public.wayglass_tissue_modules, public.wayglass_constitutional_seats,
  public.wayglass_cell_messages, public.wayglass_federation_events
  from anon, authenticated;

grant all on public.wayglass_tissues, public.wayglass_cells, public.wayglass_tissue_members,
  public.wayglass_cell_membranes, public.wayglass_tissue_modules, public.wayglass_constitutional_seats,
  public.wayglass_cell_messages to service_role;

grant select, insert on public.wayglass_federation_events to service_role;
grant usage, select on sequence public.wayglass_federation_events_event_sequence_seq to service_role;

commit;
