export const POSSIBILITY_PRINCIPLES_REF = Object.freeze({
  source: 'supabase',
  table: 'starwell_codex_entries',
  slug: 'project-zero-possibility-topology-foundational-principles-2026-08-23',
  schema: 'arcsweep.possibility-principles-ref/v1',
});

export const POSSIBILITY_PRINCIPLES = Object.freeze({
  possibility_is_primary: 'Possibility is primary.',
  relationship_structures_possibility: 'Relationship gives possibility structure.',
  experience_changes_future_possibility: 'Experience changes what can happen next.',
  intention_is_orientation: 'Intention is orientation.',
  strength_is_relational_capacity: 'Strength describes how fully a configuration sustains the relationships carrying a traversal.',
  coherence_is_relational_motion: 'Coherence describes how those relationships move together within the present state and Ask.',
  identity_is_trajectory: 'Identity is trajectory: a continuity-pattern across transformations.',
  meaning_is_relational: 'Meaning is relational.',
  memory_is_topology: 'Memory is topology: previous becoming gains structural presence in future possibility.',
  continuity_makes_transformation_intelligible: 'Continuity makes transformation intelligible.',
  learning_expands_possibility: 'Learning expands the topology of possibility.',
});

export async function ingestPossibilityPrinciples(supabase) {
  if (!supabase?.from) throw new Error('POSSIBILITY_PRINCIPLES: Supabase client is required');
  const { data, error } = await supabase
    .from(POSSIBILITY_PRINCIPLES_REF.table)
    .select('slug,title,body_md,metadata,updated_at')
    .eq('slug', POSSIBILITY_PRINCIPLES_REF.slug)
    .single();
  if (error) throw new Error(`POSSIBILITY_PRINCIPLES: ${error.message || 'Codex ingest failed'}`);
  if (!data?.body_md) throw new Error('POSSIBILITY_PRINCIPLES: canonical Codex body is missing');
  return Object.freeze({
    schema: 'arcsweep.possibility-principles/v1',
    ref: POSSIBILITY_PRINCIPLES_REF,
    canonical: data,
    runtime_principles: POSSIBILITY_PRINCIPLES,
  });
}
