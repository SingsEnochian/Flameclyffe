create table if not exists public.temporal_twist_progression (
  year integer primary key check (year between 2026 and 2036),
  horizon_index integer not null check (horizon_index between 0 and 10),
  label text not null,
  summary text not null,
  renderer_version text not null default 'temporal-twist-v1.0.0',
  calibration_version text not null default 'ten-year-progression-2026-2036-v1',
  baseline_year integer not null default 2026,
  scenario_classification text not null default 'projected' check (scenario_classification = 'projected'),
  parameters jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (horizon_index)
);

alter table public.temporal_twist_progression enable row level security;

drop policy if exists "temporal progression public read" on public.temporal_twist_progression;
create policy "temporal progression public read"
on public.temporal_twist_progression
for select
to anon, authenticated
using (is_active = true);

insert into public.temporal_twist_progression (year, horizon_index, label, summary, parameters)
values
(2026,0,'Baseline Instrument','Accepted-state baseline and deterministic replay.','{"stability_gain":0.00,"twist_gain":0.00,"resolution_gain":0.00,"branch_gain":0.00,"persistence_gain":0.00,"confidence_decay":0.00}'::jsonb),
(2027,1,'Receipted Timeline','Adds append-only temporal receipts and comparison checkpoints.','{"stability_gain":0.01,"twist_gain":0.02,"resolution_gain":0.03,"branch_gain":0.02,"persistence_gain":0.02,"confidence_decay":0.01}'::jsonb),
(2028,2,'Multi-Lens Comparison','Introduces competing lenses without collapsing uncertainty.','{"stability_gain":0.02,"twist_gain":0.04,"resolution_gain":0.06,"branch_gain":0.06,"persistence_gain":0.04,"confidence_decay":0.02}'::jsonb),
(2029,3,'Canon-Specific Branching','Adds canon-lawful branches through explicit transfer functions.','{"stability_gain":0.03,"twist_gain":0.07,"resolution_gain":0.09,"branch_gain":0.11,"persistence_gain":0.06,"confidence_decay":0.03}'::jsonb),
(2030,4,'Probabilistic Era Fields','Renders uncertainty as era fields rather than hidden error.','{"stability_gain":0.04,"twist_gain":0.10,"resolution_gain":0.12,"branch_gain":0.16,"persistence_gain":0.08,"confidence_decay":0.04}'::jsonb),
(2031,5,'Cross-World Synchrony','Aligns multiple world projections to one shared PREMAQ history.','{"stability_gain":0.06,"twist_gain":0.12,"resolution_gain":0.16,"branch_gain":0.20,"persistence_gain":0.10,"confidence_decay":0.05}'::jsonb),
(2032,6,'Adaptive Calibration','Permits human-approved calibration updates with preserved lineage.','{"stability_gain":0.09,"twist_gain":0.14,"resolution_gain":0.20,"branch_gain":0.24,"persistence_gain":0.12,"confidence_decay":0.06}'::jsonb),
(2033,7,'Longitudinal Pattern Atlas','Builds a searchable atlas of recurring temporal forms.','{"stability_gain":0.12,"twist_gain":0.16,"resolution_gain":0.24,"branch_gain":0.27,"persistence_gain":0.15,"confidence_decay":0.07}'::jsonb),
(2034,8,'Collaborative Observatory Grid','Supports consent-scoped collaborative observation grids.','{"stability_gain":0.15,"twist_gain":0.18,"resolution_gain":0.27,"branch_gain":0.30,"persistence_gain":0.17,"confidence_decay":0.08}'::jsonb),
(2035,9,'High-Fidelity Temporal Weave','Combines audio, glyph, spatial, and timeline rendering.','{"stability_gain":0.18,"twist_gain":0.20,"resolution_gain":0.31,"branch_gain":0.34,"persistence_gain":0.19,"confidence_decay":0.09}'::jsonb),
(2036,10,'Mature Twist Observatory','Operates as a mature, replayable ten-year Observatory instrument.','{"stability_gain":0.22,"twist_gain":0.22,"resolution_gain":0.35,"branch_gain":0.37,"persistence_gain":0.20,"confidence_decay":0.10}'::jsonb)
on conflict (year) do update set
  horizon_index = excluded.horizon_index,
  label = excluded.label,
  summary = excluded.summary,
  parameters = excluded.parameters,
  renderer_version = excluded.renderer_version,
  calibration_version = excluded.calibration_version,
  baseline_year = excluded.baseline_year,
  scenario_classification = excluded.scenario_classification,
  is_active = true,
  updated_at = now();
