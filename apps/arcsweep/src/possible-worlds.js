import { CONTINUITY_GENOME_FIELDS, WORLDSEED_SCHEMA } from './worldseed.js';

export const POSSIBLE_WORLDS_COMPARISON_SCHEMA = 'arcsweep.possible-worlds-comparison/v1';

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value.trim()))];
}

function delta(left = [], right = []) {
  const a = unique(left);
  const b = unique(right);
  return {
    kept: a.filter((value) => b.includes(value)),
    removed: a.filter((value) => !b.includes(value)),
    added: b.filter((value) => !a.includes(value)),
  };
}

function validateSeed(seed, label) {
  if (!seed || seed.schema !== WORLDSEED_SCHEMA) throw new Error(`${label} must be ${WORLDSEED_SCHEMA}.`);
  if (!seed.fingerprint) throw new Error(`${label} requires a Worldseed fingerprint.`);
}

export function comparePossibleWorlds(left, right) {
  validateSeed(left, 'Left world');
  validateSeed(right, 'Right world');

  const inheritance = {
    mustSurvive: delta(left.inheritance?.mustSurvive, right.inheritance?.mustSurvive),
    mayChange: delta(left.inheritance?.mayChange, right.inheritance?.mayChange),
    mayBeLost: delta(left.inheritance?.mayBeLost, right.inheritance?.mayBeLost),
    descendantsInherit: delta(left.inheritance?.descendantsInherit, right.inheritance?.descendantsInherit),
    transferableSeeds: delta(left.inheritance?.transferableSeeds, right.inheritance?.transferableSeeds),
  };

  const continuityGenome = Object.fromEntries(CONTINUITY_GENOME_FIELDS.map((field) => [
    field,
    delta(left.continuityGenome?.fields?.[field], right.continuityGenome?.fields?.[field]),
  ]));

  const sectionCounts = Object.fromEntries(
    [...new Set([...Object.keys(left.sections || {}), ...Object.keys(right.sections || {})])]
      .sort()
      .map((key) => [key, {
        left: Array.isArray(left.sections?.[key]) ? left.sections[key].length : 0,
        right: Array.isArray(right.sections?.[key]) ? right.sections[key].length : 0,
      }]),
  );

  const changedGenomeFields = CONTINUITY_GENOME_FIELDS.filter((field) => {
    const change = continuityGenome[field];
    return change.added.length || change.removed.length;
  });

  const changedInheritanceAxes = Object.entries(inheritance)
    .filter(([, change]) => change.added.length || change.removed.length)
    .map(([key]) => key);

  return {
    schema: POSSIBLE_WORLDS_COMPARISON_SCHEMA,
    version: 1,
    left: { world: left.world, fingerprint: left.fingerprint },
    right: { world: right.world, fingerprint: right.fingerprint },
    sameFingerprint: left.fingerprint === right.fingerprint,
    inheritance,
    continuityGenome,
    changedGenomeFields,
    changedInheritanceAxes,
    sectionCounts,
    lineage: {
      leftRefs: unique(left.provenance?.lineageRefs),
      rightRefs: unique(right.provenance?.lineageRefs),
      delta: delta(left.provenance?.lineageRefs, right.provenance?.lineageRefs),
    },
    summary: {
      changedGenomeFieldCount: changedGenomeFields.length,
      changedInheritanceAxisCount: changedInheritanceAxes.length,
      sectionCountChanges: Object.values(sectionCounts).filter((value) => value.left !== value.right).length,
    },
  };
}
