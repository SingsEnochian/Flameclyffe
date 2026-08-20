create index if not exists arcsweep_deep_time_records_review_receipt_idx
  on public.arcsweep_deep_time_records (review_receipt_id);

create index if not exists arcsweep_feedback_cycles_packet_id_idx
  on public.arcsweep_feedback_cycles (packet_id);

drop policy if exists "sealed House Runtime reads feedback reviews" on public.arcsweep_feedback_reviews;
create policy "sealed House Runtime reads feedback reviews"
  on public.arcsweep_feedback_reviews for select to anon, authenticated
  using (false);

drop policy if exists "sealed House Runtime reads DEEPTime records" on public.arcsweep_deep_time_records;
create policy "sealed House Runtime reads DEEPTime records"
  on public.arcsweep_deep_time_records for select to anon, authenticated
  using (false);
