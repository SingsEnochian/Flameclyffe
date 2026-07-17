export const RECORDER_SCHEMA_VERSION = '0.1.0';

export function chooseRecorderMimeType(MediaRecorderCtor = globalThis.MediaRecorder) {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  if (!MediaRecorderCtor?.isTypeSupported) return '';
  return candidates.find((candidate) => MediaRecorderCtor.isTypeSupported(candidate)) || '';
}

export function makeRecordingSessionId(now = new Date()) {
  return `signal-session-${now.toISOString().replace(/[:.]/g, '-')}`;
}

export function buildSnapshotRecord({ sourceId, endpoint, capturedAt, status, body, error = null }) {
  return {
    sourceId,
    endpoint,
    capturedAt,
    status,
    byteLength: typeof body === 'string' ? new TextEncoder().encode(body).byteLength : 0,
    body,
    error,
  };
}

export function buildRecordingReceipt({
  sessionId,
  selectedSources,
  startedAt,
  endedAt,
  durationMs,
  media,
  snapshots,
  notes = '',
}) {
  return {
    schemaVersion: RECORDER_SCHEMA_VERSION,
    datasetKind: 'signal_well_live_recording',
    sessionId,
    startedAt,
    endedAt,
    durationMs,
    selectedSources: selectedSources.map((source) => ({
      id: source.id,
      name: source.name,
      provider: source.provider,
      availability: source.availability,
      cadence: source.cadence,
      families: [...source.families],
      frequencyLabel: source.frequencyLabel,
      officialUrl: source.officialUrl,
      openUrl: source.openUrl,
      recordModes: [...source.recordModes],
    })),
    media: media ? {
      filename: media.filename,
      mimeType: media.mimeType,
      byteLength: media.byteLength,
      sha256: media.sha256 || null,
      captureMode: media.captureMode,
    } : null,
    snapshots: snapshots.map((snapshot) => ({ ...snapshot })),
    notes,
    provenance: {
      localOnly: true,
      captureInitiatedByHuman: true,
      sourcesRemainExternallyOwned: true,
      annotationsAppendOnly: true,
    },
  };
}
