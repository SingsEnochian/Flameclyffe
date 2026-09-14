-- Ontology Kernel v0.1 hardening.
-- Supabase default function privileges grant EXECUTE to API roles explicitly,
-- so revoke those grants in addition to the PUBLIC-role revoke in v1.
revoke execute on function public.sync_deep_observer_event_to_ontology() from anon;
revoke execute on function public.sync_deep_observer_event_to_ontology() from authenticated;
