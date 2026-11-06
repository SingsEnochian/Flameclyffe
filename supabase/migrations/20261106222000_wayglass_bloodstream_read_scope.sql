-- Dedicated, revocable, read-only access to the Wayglass agentic bloodstream.
-- Does not confer merge, Codex dispatch, training apply, or identity authority.
alter table public.wayglass_route_grants
 drop constraint if exists wayglass_route_grants_valid_scopes;
alter table public.wayglass_route_grants
 add constraint wayglass_route_grants_valid_scopes
 check (scopes <@ array['wayglass:present','wayglass:read','wayglass:review','wayglass:bloodstream:read']::text[]);
comment on table public.wayglass_route_grants is
 'Owner-approved revocable Wayglass privileges; bloodstream:read is observation only, never apply or dispatch.';
