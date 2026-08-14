revoke all on table public.arcsweep_feedback_cycles from service_role;
grant select, insert on table public.arcsweep_feedback_cycles to service_role;

revoke all on table public.arcsweep_feedback_reviews from service_role;
grant select, insert on table public.arcsweep_feedback_reviews to service_role;

revoke all on table public.arcsweep_deep_time_records from service_role;
grant select, insert on table public.arcsweep_deep_time_records to service_role;

revoke all on table public.house_runtime_events from service_role;
grant select, insert on table public.house_runtime_events to service_role;

revoke all on sequence public.house_runtime_events_event_sequence_seq from service_role;
grant usage, select on sequence public.house_runtime_events_event_sequence_seq to service_role;

create index if not exists house_runtime_events_cycle_id_idx
  on public.house_runtime_events (cycle_id);
