// Wayglass Dream Station: a local companion to third-party iOS audio apps.
// There is no documented BrainWave control API. Never imply remote playback.
export const DREAM_STATION_SCHEMA = 'wayglass.dream-station.session/v0.1';
export const DREAM_STATION_SHORTCUT = 'Wayglass Dream Launch';
export const DREAM_STATION_STORE = 'wayglass.dream-station.sessions/v0.1';
export const MAX_SESSIONS = 25;

export const DREAM_PROGRAMS = Object.freeze([
  Object.freeze({ id: 'beta-gamma-lucid', label: 'Beta/Gamma Lucid Dreams', minimumMinutes: 60, purpose: 'Waking-dream exploration' }),
  Object.freeze({ id: 'beta-rem', label: 'Beta REM', minimumMinutes: 60, purpose: 'Vivid dream exploration' }),
  Object.freeze({ id: 'theta-rem', label: 'Theta REM', minimumMinutes: null, purpose: 'Sleep and dreaming' }),
  Object.freeze({ id: 'other', label: 'Another program (select in BrainWave)', minimumMinutes: null, purpose: 'User-selected program' }),
]);

export function createDreamStationShortcutUrl(name = DREAM_STATION_SHORTCUT) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Shortcut name required.');
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name.trim())}`;
}

export function buildDreamStationReceipt({ programId, durationMinutes, notes = '', observed = false, timestamp = new Date().toISOString(), receiptId = null }) {
  const program = DREAM_PROGRAMS.find((item) => item.id === programId);
  const minutes = Number(durationMinutes);
  if (!program) throw new Error('Unknown Dream Station program.');
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) throw new Error('Duration must be 1–600 minutes.');
  if (Number.isNaN(Date.parse(timestamp))) throw new Error('Invalid timestamp.');
  if (program.minimumMinutes != null && minutes < program.minimumMinutes) {
    throw new Error(`${program.label} shows a ${program.minimumMinutes}-minute minimum in the reference screen.`);
  }
  const cleanNotes = String(notes).trim().slice(0, 1200);
  const id = receiptId || `dream-${timestamp.replace(/\D/g, '').slice(0, 14)}`;
  return Object.freeze({
    schema: DREAM_STATION_SCHEMA,
    receipt_id: id,
    created_at: timestamp,
    app: 'BrainWave: Dream Inducer',
    integration_mode: 'manual-companion',
    program: program.label,
    program_id: program.id,
    planned_minutes: minutes,
    user_observation: cleanNotes,
    user_observed_session: Boolean(observed),
    playback_controlled_by_wayglass: false,
    remote_program_selected: false,
    evidence_domain: 'user-declared',
    canon_commit: false,
  });
}

export function readDreamStationSessions(storage) {
  try {
    const value = JSON.parse(storage.getItem(DREAM_STATION_STORE) || '[]');
    return Array.isArray(value)
      ? value.filter((r) => r?.schema === DREAM_STATION_SCHEMA).slice(-MAX_SESSIONS)
      : [];
  } catch {
    return [];
  }
}

export function writeDreamStationSessions(storage, receipts) {
  if (!Array.isArray(receipts)) throw new Error('Receipts must be an array.');
  const selected = receipts.filter((r) => r?.schema === DREAM_STATION_SCHEMA).slice(-MAX_SESSIONS);
  storage.setItem(DREAM_STATION_STORE, JSON.stringify(selected));
  return selected;
}
