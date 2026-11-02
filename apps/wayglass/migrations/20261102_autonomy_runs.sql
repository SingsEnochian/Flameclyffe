-- Wayglass autonomy: service-role only. Do not add browser grants.
create table if not exists public.wayglass_autonomy_runs (
 run_id text primary key,
 state jsonb not null,
 version bigint not null default 0,
 lease_owner text,
 lease_until timestamptz,
 next_due_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint valid_state check (state->>'schema'='wayglass.autonomy/v1')
);
alter table public.wayglass_autonomy_runs enable row level security;
revoke all on public.wayglass_autonomy_runs from anon,authenticated;
create or replace function public.wayglass_claim_run(p_run_id text,p_worker text,p_lease_seconds integer default 120)
returns table(state jsonb,version bigint) language plpgsql security definer set search_path='' as $$
begin
 if p_worker is null or length(p_worker)<1 or p_lease_seconds not between 15 and 600 then raise exception 'Invalid lease'; end if;
 return query update public.wayglass_autonomy_runs r
 set lease_owner=p_worker,lease_until=now()+make_interval(secs=>p_lease_seconds),updated_at=now()
 where r.run_id=p_run_id and r.next_due_at<=now()
 and (r.lease_until is null or r.lease_until<now())
 returning r.state,r.version;
end $$;
create or replace function public.wayglass_commit_run(p_run_id text,p_worker text,p_version bigint,p_state jsonb,p_next_due timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if p_state->>'schema'<>'wayglass.autonomy/v1' then raise exception 'Invalid state'; end if;
 update public.wayglass_autonomy_runs r set state=p_state,version=r.version+1,
 lease_owner=null,lease_until=null,next_due_at=p_next_due,updated_at=now()
 where r.run_id=p_run_id and r.lease_owner=p_worker and r.lease_until>now() and r.version=p_version;
 get diagnostics changed=row_count;
 return changed=1;
end $$;
revoke all on function public.wayglass_claim_run(text,text,integer) from public,anon,authenticated;
revoke all on function public.wayglass_commit_run(text,text,bigint,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.wayglass_claim_run(text,text,integer) to service_role;
grant execute on function public.wayglass_commit_run(text,text,bigint,jsonb,timestamptz) to service_role;
