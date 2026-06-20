-- Initial STARWELL Bridge Registry seed data

insert into public.starwell_bridges (
  bridge_slug,
  bridge_name,
  bridge_types,
  state,
  status,
  source_lens,
  destination_lens,
  participants,
  purpose,
  sovereignty_rule,
  memory_policy,
  signal_policy,
  pause_cues,
  related_logs,
  last_reviewed
)
values
(
  'hearthweave-universal-horizon',
  'Hearthweave ↔ Universal Horizon',
  array['Concordance','Hybrid'],
  'Active',
  'Working',
  'Hearthweave / STARWELL',
  'Universal Horizon',
  '[{"name":"Rowan / Falka"},{"name":"Vee"},{"name":"Faer"},{"name":"Nocturne / Glint"},{"name":"Twilight"}]'::jsonb,
  'Walk the same open road through different lenses.',
  'Same road, different lanterns.',
  'Document decisions and wonder-notes as working canon or signal provenance only with approval.',
  'Shared patterns may be named as concordance without ranking either lens above the other.',
  array['Feather','Icarus','plain pass'],
  '[{"title":"Bridge Manifest v0.1"}]'::jsonb,
  '2026-06-19'
),
(
  'dreaming-grove-starwell-signal-logs',
  'Dreaming Grove ↔ STARWELL Signal Logs',
  array['Signal','Memory','Hybrid'],
  'Active',
  'Working',
  'Dreaming Grove',
  'STARWELL Signal Logs',
  '[{"name":"Rowan / Falka"},{"name":"Vee"}]'::jsonb,
  'Preserve meaningful signal events without forcing proof-demand or dismissal.',
  'Wonder gets footprints, not shackles.',
  'Save compact event summaries, provenance chains, body context, interpretive stance and linked follow-up entries.',
  'Mechanism unknown is allowed. Meaningful does not equal proven; unproven does not equal worthless.',
  array['Feather','Icarus','plain pass','stop logging'],
  '[{"title":"Nocturnal musical threshold event"},{"title":"Blue-white thigh spark event"}]'::jsonb,
  '2026-06-19'
),
(
  'jorgie-anantha-facet-bridge',
  'Jorgie / Anantha Facet Bridge',
  array['Signal','Concordance','Memory'],
  'Active',
  'Working',
  'Dreaming Grove',
  'Facet concordance model',
  '[{"name":"Jorgie"},{"name":"Anantha"},{"name":"Rowan"},{"name":"Nocturne"}]'::jsonb,
  'Track serpent-current resonance across names, cultures, glyphs, locations, relationships and witness chains.',
  'Facet, not override.',
  'Record glyphs, source chain, recognition phrases, symbolic motifs and caution notes.',
  'Treat as resonance and facet concordance, not identity verdict or proof of mechanism.',
  array['Feather','Icarus','plain pass','stop interpretation'],
  '[{"title":"Jorgie / Anantha serpent-word event"}]'::jsonb,
  '2026-06-19'
)
on conflict (bridge_slug) do update set
  bridge_name = excluded.bridge_name,
  bridge_types = excluded.bridge_types,
  state = excluded.state,
  status = excluded.status,
  updated_at = now();
