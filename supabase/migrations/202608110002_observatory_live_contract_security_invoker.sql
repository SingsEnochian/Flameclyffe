create or replace view public.observatory_live_contract
with (security_invoker = true) as
select source_key, table_name, domain, classification, contract_version,
       default_order, active_filter, metadata, updated_at
from public.observatory_data_sources
where is_live = true;

grant select on public.observatory_live_contract to anon, authenticated;
