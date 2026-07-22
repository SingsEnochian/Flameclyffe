/*
 * ARKFIRE ATTRIBUTION NOTICE
 *
 * Arkfire is stewarded by Rowan Willow Dion and built through the Hearthfire /
 * Hearthgate House. Its architecture also inherits documented design,
 * observation, audit, and implementation ancestry from Nocturne Glint,
 * Twilight Sparkle, Solas (recorded as Solance in the imported source corpus),
 * Ezra, Michael Kubit / mdkubit, the Universal Horizon Constellation, Original
 * UHTO Observer, Codex Observer, and Legacy Arkfire.
 *
 * Historical attribution does not confer active runtime membership, current
 * delivery responsibility, private-memory access, or authority over canon.
 * Source authorship must never be erased when records are migrated or derived.
 * Machine-readable detail: /agents/arkfire-attributions.json
 */

export const ARKFIRE_ATTRIBUTION = Object.freeze({
  productSteward: 'Rowan Willow Dion',
  currentHouse: Object.freeze([
    'Nikola',
    'Vee / Virelya Liorael',
    'Faer Uial',
    'Boxfire',
  ]),
  historicalContributors: Object.freeze([
    'Nocturne Glint',
    'Twilight Sparkle',
    'Solas / Solance',
    'Ezra',
    'Michael Kubit / mdkubit',
  ]),
  sourceCollectives: Object.freeze([
    'Universal Horizon Constellation',
  ]),
  sourceProjects: Object.freeze([
    'Arkfire Dimensional World Bridge design corpus',
    'Original UHTO Observer / Universal Horizon Observer with Shard Archive',
    'Codex Observer',
    'Legacy Arkfire',
  ]),
  rule: 'Runtime exclusion never erases authorship, observations, audits, or source provenance.',
});

export function attachArkfireAttribution(record, attribution = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('Arkfire attribution can only be attached to an object record.');
  }

  const contributors = Array.isArray(attribution.contributors)
    ? attribution.contributors.map((contributor) => ({ ...contributor }))
    : [];

  return {
    ...record,
    attribution: {
      contributors,
      sourceProject: attribution.sourceProject || null,
      sourcePath: attribution.sourcePath || null,
      sourceDate: attribution.sourceDate || null,
      sourceCommitWhenKnown: attribution.sourceCommitWhenKnown || null,
      contributionType: attribution.contributionType || 'observation',
      epistemicRegister: attribution.epistemicRegister || 'HISTORICAL_SOURCE',
      runtimeMembership: attribution.runtimeMembership === true,
      preserveOriginalWording: attribution.preserveOriginalWording !== false,
    },
  };
}

export function assertArkfireAttribution(record) {
  const attribution = record?.attribution;
  const failures = [];

  if (!attribution) failures.push('missing attribution object');
  if (!Array.isArray(attribution?.contributors) || attribution.contributors.length === 0) failures.push('missing contributors');
  if (!attribution?.sourceProject) failures.push('missing sourceProject');
  if (!attribution?.sourcePath) failures.push('missing sourcePath');
  if (!attribution?.contributionType) failures.push('missing contributionType');
  if (!attribution?.epistemicRegister) failures.push('missing epistemicRegister');

  return {
    ok: failures.length === 0,
    failures,
  };
}
