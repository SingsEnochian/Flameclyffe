create table if not exists public.wayglass_route_controls (
  control_id text primary key,
  feather_stop boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint wayglass_route_controls_only_global check (control_id = 'global')
);
insert into public.wayglass_route_controls (control_id,feather_stop) values ('global',false) on conflict (control_id) do nothing;
alter table public.wayglass_route_controls enable row level security;
revoke all on table public.wayglass_route_controls from public, anon, authenticated;
comment on table public.wayglass_route_controls is 'Owner-managed global Feather stop for all Wayglass shared crossings.';