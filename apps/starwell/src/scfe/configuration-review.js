export function reviewConfigurations({ aspects = [], configurations = [], barbault = {} }) {
  const review = {
    status: 'observed',
    confidence: 'low',
    flags: [],
    notes: [],
  };

  const oppositionCount = aspects.filter((aspect) => aspect.aspect_type === 'opposition').length;
  const trineCount = aspects.filter((aspect) => aspect.aspect_type === 'trine').length;
  const sextileCount = aspects.filter((aspect) => aspect.aspect_type === 'sextile').length;
  const hardCount = aspects.filter((aspect) => ['opposition', 'square', 'quincunx'].includes(aspect.aspect_type)).length;
  const harmonicCount = trineCount + sextileCount;
  const hasBasketCandidate = configurations.some((configuration) => configuration.configuration_type === 'basket_cradle_candidate');

  if (!aspects.length) {
    review.status = 'quiet_field';
    review.flags.push('no_major_aspects_detected');
    review.notes.push('No major configured aspect geometry was detected using the current v0.1 orb rules.');
    return review;
  }

  if (hasBasketCandidate) {
    review.status = 'candidate_needs_review';
    review.confidence = harmonicCount >= 4 && oppositionCount >= 1 ? 'medium' : 'low';
    review.flags.push('basket_cradle_candidate');
    review.notes.push('Basket/cradle status remains a candidate until a stricter geometry detector validates ordering, aspect chain, and visual topology.');
  }

  if (oppositionCount > 0) {
    review.flags.push('opposition_axis_present');
  }

  if (harmonicCount >= 3) {
    review.flags.push('harmonic_support_present');
  }

  if (hardCount >= harmonicCount && hardCount > 1) {
    review.flags.push('hard_aspect_density_watch');
    review.notes.push('Hard-aspect density is high enough to require pacing language and somatic cross-checking.');
  }

  if (barbault.compression_level === 'wide_distribution') {
    review.flags.push('wide_distribution_not_crisis_compression');
    review.notes.push('The Cyclic Index classification is wide distribution, so the field should not be described as a Barbault compression trough.');
  }

  if (!review.notes.length) {
    review.notes.push('Configuration review found no special caution beyond normal evidence labels.');
  }

  return review;
}
