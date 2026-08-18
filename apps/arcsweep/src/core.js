export function clampPositiveNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function calculateRatio(crMinutes, drMinutes) {
  return clampPositiveNumber(drMinutes) / clampPositiveNumber(crMinutes);
}

export function calculateDrElapsed(startedAt, now, crMinutes, drMinutes) {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return (end - start) * calculateRatio(crMinutes, drMinutes);
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const chunks = [];
  if (days) chunks.push(`${days}d`);
  if (hours || days) chunks.push(`${hours}h`);
  if (minutes || hours || days) chunks.push(`${minutes}m`);
  chunks.push(`${seconds}s`);
  return chunks.join(' ');
}

export function buildReturnRecord(state, returnedAt = new Date().toISOString()) {
  const elapsedCr = state.session.startedAt
    ? Math.max(0, new Date(returnedAt).getTime() - new Date(state.session.startedAt).getTime())
    : 0;
  const wakingMinutes = state.session.wakingMinutes || state.settings.crMinutes;
  const worldMinutes = state.session.worldMinutes || state.settings.drMinutes;
  return {
    id: `return-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    returnedAt,
    targetWorldId: state.session.targetWorldId || null,
    targetWorld: state.session.targetWorld || state.settings.drLabel,
    intention: state.session.intention || '',
    returnAnchor: state.settings.returnAnchor || 'Notch',
    wakingMinutes,
    worldMinutes,
    elapsedCr,
    elapsedDr: calculateDrElapsed(
      state.session.startedAt,
      returnedAt,
      wakingMinutes,
      worldMinutes,
    ),
  };
}

export function validateImportedState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Arcsweep import must be a JSON object.');
  }
  for (const key of ['worlds', 'scripts', 'continuity', 'manifestations', 'returnHistory', 'feedbackCycles']) {
    if (value[key] !== undefined && !Array.isArray(value[key])) {
      throw new Error(`Arcsweep ${key} must be an array.`);
    }
  }
  if (value.records !== undefined && (!value.records || typeof value.records !== 'object' || Array.isArray(value.records))) {
    throw new Error('Arcsweep room records must be an object.');
  }
  if (value.records) {
    for (const [roomId, records] of Object.entries(value.records)) {
      if (!Array.isArray(records)) throw new Error(`Arcsweep room ${roomId} must be an array.`);
    }
  }
  if (value.observatory !== undefined && (!value.observatory || typeof value.observatory !== 'object' || Array.isArray(value.observatory))) {
    throw new Error('Arcsweep observatory state must be an object.');
  }
  if (value.observatory) {
    for (const key of [
      'custom_profiles',
      'sweeps',
      'theory_candidates',
      'theory_reviews',
      'deep_time_records',
      'deep_time_replays',
      'advisor_receipts',
      'domain_mappings',
      'runa_suggestions',
      'runa_renderer_candidates',
      'runa_renderer_reviews',
      'runa_preview_palettes',
      'runa_preview_plans',
      'runa_preview_renders',
      'runa_preview_evidence_arms',
      'runa_preview_observation_links',
      'provenance_exports',
      'integrity_reports',
    ]) {
      if (value.observatory[key] !== undefined && !Array.isArray(value.observatory[key])) {
        throw new Error(`Arcsweep observatory ${key} must be an array.`);
      }
    }
  }
  if (value.feedbackQueue !== undefined && (!value.feedbackQueue || typeof value.feedbackQueue !== 'object' || Array.isArray(value.feedbackQueue))) {
    throw new Error('Arcsweep feedback queue must be an object.');
  }
  if (value.houseglass !== undefined && (!value.houseglass || typeof value.houseglass !== 'object' || Array.isArray(value.houseglass))) {
    throw new Error('Arcsweep Houseglass state must be an object.');
  }
  if (value.kelyranSchool !== undefined && (!value.kelyranSchool || typeof value.kelyranSchool !== 'object' || Array.isArray(value.kelyranSchool))) {
    throw new Error('Arcsweep Kelyran School state must be an object.');
  }
  if (value.transformationRequests !== undefined) {
    if (!value.transformationRequests || typeof value.transformationRequests !== 'object' || Array.isArray(value.transformationRequests)) {
      throw new Error('Arcsweep transformationRequests must be an object.');
    }
    const byWorld = value.transformationRequests.byWorld;
    if (byWorld !== undefined && (!byWorld || typeof byWorld !== 'object' || Array.isArray(byWorld))) {
      throw new Error('Arcsweep transformationRequests.byWorld must be an object.');
    }
    for (const [worldId, record] of Object.entries(byWorld || {})) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error(`Arcsweep transformationRequests ${worldId} must be an object.`);
      }
      for (const key of ['requests', 'responses', 'circuits']) {
        if (record[key] !== undefined && !Array.isArray(record[key])) {
          throw new Error(`Arcsweep transformationRequests ${worldId}.${key} must be an array.`);
        }
      }
    }
  }
  return value;
}

export function isoNow() {
  return new Date().toISOString();
}
