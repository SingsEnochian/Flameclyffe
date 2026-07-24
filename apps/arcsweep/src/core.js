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
  if (value.worlds && !Array.isArray(value.worlds)) {
    throw new Error('Arcsweep worlds must be an array.');
  }
  if (value.scripts && !Array.isArray(value.scripts)) {
    throw new Error('Arcsweep scripts must be an array.');
  }
  if (value.continuity && !Array.isArray(value.continuity)) {
    throw new Error('Arcsweep continuity must be an array.');
  }
  if (value.manifestations && !Array.isArray(value.manifestations)) {
    throw new Error('Arcsweep manifestations must be an array.');
  }
  return value;
}
