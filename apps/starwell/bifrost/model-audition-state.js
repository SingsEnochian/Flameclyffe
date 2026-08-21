export function modelAuditionAvailability({ baseline = null, candidate = null } = {}) {
  const baselineReady = Boolean(baseline?.configured);
  const candidateReady = Boolean(candidate?.configured && candidate?.audition_route);
  return Object.freeze({
    baseline_ready: baselineReady,
    candidate_ready: candidateReady,
    run_enabled: candidateReady,
    mode: baselineReady && candidateReady
      ? 'dual-route'
      : candidateReady
        ? 'candidate-only'
        : 'blocked',
    baseline_missing: Array.isArray(baseline?.missing) ? [...baseline.missing] : [],
    candidate_missing: Array.isArray(candidate?.missing) ? [...candidate.missing] : [],
  });
}

export function modelAuditionRunPlan(availability) {
  const mode = availability?.mode || 'blocked';
  if (mode === 'dual-route') return Object.freeze({ run_baseline: true, run_candidate: true, mode });
  if (mode === 'candidate-only') return Object.freeze({ run_baseline: false, run_candidate: true, mode });
  return Object.freeze({ run_baseline: false, run_candidate: false, mode: 'blocked' });
}
