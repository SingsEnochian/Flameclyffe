export const SIGNAL_CLASSIFICATIONS = [
  'unclassified',
  'rfi',
  'solar',
  'jovian',
  'galactic',
  'terrestrial-natural',
  'instrumental',
  'candidate',
  'unresolved',
];

export const EPISTEMIC_STATUSES = [
  'recorded',
  'derived',
  'correlated',
  'interpreted',
  'unknown',
];

const COLUMN_ALIASES = {
  time: ['time', 'time_s', 'seconds', 'timestamp', 'utc'],
  frequency: ['frequency', 'frequency_mhz', 'freq', 'freq_mhz', 'mhz'],
  intensity: ['intensity', 'power', 'value', 'amplitude', 'db', 'dbfs'],
};

function finiteNumber(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function findColumn(headers, aliases) {
  const lowered = headers.map((header) => header.trim().toLowerCase());
  return lowered.findIndex((header) => aliases.includes(header));
}

function splitCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function normaliseSignalPoint(point, index = 0) {
  const time = finiteNumber(point?.time ?? point?.time_s ?? point?.seconds ?? point?.timestamp ?? index);
  const frequency = finiteNumber(point?.frequency ?? point?.frequency_mhz ?? point?.freq ?? point?.freq_mhz ?? point?.mhz);
  const intensity = finiteNumber(point?.intensity ?? point?.power ?? point?.value ?? point?.amplitude ?? point?.db ?? point?.dbfs);

  if (time === null || frequency === null || intensity === null) return null;
  return { time, frequency, intensity };
}

export function normaliseSignalPoints(points, maxPoints = 120000) {
  if (!Array.isArray(points)) throw new Error('Signal data must be an array of points.');
  const normalised = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = normaliseSignalPoint(points[index], index);
    if (point) normalised.push(point);
    if (normalised.length >= maxPoints) break;
  }
  if (normalised.length === 0) throw new Error('No valid time/frequency/intensity points were found.');
  return normalised;
}

export function parseSignalCsv(text, maxPoints = 120000) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error('CSV requires a header and at least one data row.');

  const headers = splitCsvLine(lines[0]);
  const timeIndex = findColumn(headers, COLUMN_ALIASES.time);
  const frequencyIndex = findColumn(headers, COLUMN_ALIASES.frequency);
  const intensityIndex = findColumn(headers, COLUMN_ALIASES.intensity);
  if ([timeIndex, frequencyIndex, intensityIndex].some((index) => index < 0)) {
    throw new Error('CSV headers must identify time, frequency, and intensity columns.');
  }

  const points = [];
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const cells = splitCsvLine(lines[rowIndex]);
    const point = normaliseSignalPoint({
      time: cells[timeIndex],
      frequency: cells[frequencyIndex],
      intensity: cells[intensityIndex],
    }, rowIndex - 1);
    if (point) points.push(point);
    if (points.length >= maxPoints) break;
  }
  if (points.length === 0) throw new Error('CSV contained no valid signal rows.');
  return points;
}

export function parseSignalJson(text, maxPoints = 120000) {
  const parsed = JSON.parse(String(text));
  if (Array.isArray(parsed)) return normaliseSignalPoints(parsed, maxPoints);
  if (Array.isArray(parsed.points)) return normaliseSignalPoints(parsed.points, maxPoints);
  if (Array.isArray(parsed.raw?.points)) return normaliseSignalPoints(parsed.raw.points, maxPoints);
  throw new Error('JSON must be an array of points or contain a points array.');
}

export function parseSignalFileText(text, filename = '') {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) return parseSignalJson(text);
  if (lower.endsWith('.csv')) return parseSignalCsv(text);
  try {
    return parseSignalJson(text);
  } catch {
    return parseSignalCsv(text);
  }
}

export function signalBounds(points) {
  const bounds = {
    timeMin: Number.POSITIVE_INFINITY,
    timeMax: Number.NEGATIVE_INFINITY,
    frequencyMin: Number.POSITIVE_INFINITY,
    frequencyMax: Number.NEGATIVE_INFINITY,
    intensityMin: Number.POSITIVE_INFINITY,
    intensityMax: Number.NEGATIVE_INFINITY,
  };
  points.forEach(({ time, frequency, intensity }) => {
    bounds.timeMin = Math.min(bounds.timeMin, time);
    bounds.timeMax = Math.max(bounds.timeMax, time);
    bounds.frequencyMin = Math.min(bounds.frequencyMin, frequency);
    bounds.frequencyMax = Math.max(bounds.frequencyMax, frequency);
    bounds.intensityMin = Math.min(bounds.intensityMin, intensity);
    bounds.intensityMax = Math.max(bounds.intensityMax, intensity);
  });
  return bounds;
}

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function makeDemoSignalPoints(timeBins = 180, frequencyBins = 96) {
  const random = lcg(0x53544152);
  const points = [];
  for (let timeIndex = 0; timeIndex < timeBins; timeIndex += 1) {
    for (let frequencyIndex = 0; frequencyIndex < frequencyBins; frequencyIndex += 1) {
      const time = timeIndex;
      const frequency = 16 + (8 * frequencyIndex) / Math.max(1, frequencyBins - 1);
      const noise = (random() - 0.5) * 0.55;
      const dayCycle = Math.sin((timeIndex / timeBins) * Math.PI * 2) * 0.18;
      const horizontalRfi = Math.abs(frequency - 18.42) < 0.045 ? 1.65 : 0;
      const driftFrequency = 20.3 + timeIndex * 0.008;
      const driftingLine = Math.abs(frequency - driftFrequency) < 0.055 && timeIndex > 32 && timeIndex < 145 ? 1.1 : 0;
      const burst = timeIndex > 104 && timeIndex < 118 && frequency > 17.2 && frequency < 23.2
        ? Math.max(0, 1.25 - Math.abs(frequency - 20.2) * 0.19)
        : 0;
      points.push({
        time,
        frequency: Number(frequency.toFixed(5)),
        intensity: Number((noise + dayCycle + horizontalRfi + driftingLine + burst).toFixed(5)),
      });
    }
  }
  return points;
}

export function makeCandidate(selection, sequence = 0) {
  const now = new Date().toISOString();
  return {
    id: `candidate-${String(sequence + 1).padStart(3, '0')}`,
    createdAt: now,
    updatedAt: now,
    timeStart: Math.min(selection.timeStart, selection.timeEnd),
    timeEnd: Math.max(selection.timeStart, selection.timeEnd),
    frequencyStart: Math.min(selection.frequencyStart, selection.frequencyEnd),
    frequencyEnd: Math.max(selection.frequencyStart, selection.frequencyEnd),
    classification: 'unclassified',
    epistemicStatus: 'recorded',
    confidence: 0.5,
    note: '',
    crossChecks: [],
  };
}

export function updateCandidate(candidate, patch) {
  const next = { ...candidate, ...patch, updatedAt: new Date().toISOString() };
  if (!SIGNAL_CLASSIFICATIONS.includes(next.classification)) {
    throw new Error(`Unknown signal classification: ${next.classification}`);
  }
  if (!EPISTEMIC_STATUSES.includes(next.epistemicStatus)) {
    throw new Error(`Unknown epistemic status: ${next.epistemicStatus}`);
  }
  next.confidence = Math.max(0, Math.min(1, Number(next.confidence) || 0));
  return next;
}

export function buildSignalSessionExport({ source, points, candidates, sessionNote = '' }) {
  const bounds = signalBounds(points);
  return {
    schemaVersion: '0.1.0',
    datasetKind: 'signal_well_session',
    exportedAt: new Date().toISOString(),
    governingRule: 'Preserve the raw recording; append classifications and interpretations without rewriting the source.',
    source: {
      name: source?.name || 'unnamed-source',
      kind: source?.kind || 'local',
      byteLength: source?.byteLength ?? null,
      sha256: source?.sha256 || null,
      importedAt: source?.importedAt || null,
      rawImmutable: true,
    },
    observation: {
      pointCount: points.length,
      bounds,
    },
    candidates: candidates.map((candidate) => ({ ...candidate })),
    sessionNote,
    provenance: {
      localOnly: true,
      annotationsAppendOnly: true,
      automatedClassification: false,
      reviewer: 'human-led',
    },
  };
}

export function candidatesToCsv(candidates) {
  const headers = [
    'id', 'time_start', 'time_end', 'frequency_start_mhz', 'frequency_end_mhz',
    'classification', 'epistemic_status', 'confidence', 'note', 'cross_checks',
  ];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = candidates.map((candidate) => [
    candidate.id,
    candidate.timeStart,
    candidate.timeEnd,
    candidate.frequencyStart,
    candidate.frequencyEnd,
    candidate.classification,
    candidate.epistemicStatus,
    candidate.confidence,
    candidate.note,
    (candidate.crossChecks || []).join('; '),
  ].map(quote).join(','));
  return [headers.join(','), ...rows].join('\n');
}
