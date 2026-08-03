const EPSILON = 1e-12;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const APPROVAL_DECISIONS = new Set(['approved', 'adjust', 'rejected']);

function invariant(condition, message) {
  if (!condition) throw new Error(`WORLD_TONE_APPROVAL: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function copyValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value) {
  invariant(globalThis.crypto?.subtle, 'Web Crypto SHA-256 is unavailable');
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : canonicalise(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function finiteMatrix(input) {
  invariant(Array.isArray(input) && input.length > 0, 'Jacobian must contain rows');
  const matrix = input.map((row) => {
    invariant(Array.isArray(row) && row.length > 0, 'Jacobian rows must contain values');
    const values = row.map(Number);
    invariant(values.every(Number.isFinite), 'Jacobian values must be finite');
    return values;
  });
  const width = matrix[0].length;
  invariant(matrix.every((row) => row.length === width), 'Jacobian rows must have equal length');
  return matrix;
}

function smallerGram(matrix) {
  const rows = matrix.length;
  const columns = matrix[0].length;
  if (rows >= columns) {
    return Array.from({ length: columns }, (_, left) =>
      Array.from({ length: columns }, (_, right) =>
        matrix.reduce((sum, row) => sum + row[left] * row[right], 0),
      ),
    );
  }
  return Array.from({ length: rows }, (_, left) =>
    Array.from({ length: rows }, (_, right) =>
      matrix[left].reduce((sum, value, index) => sum + value * matrix[right][index], 0),
    ),
  );
}

function symmetricEigenvalues(matrix, { tolerance = 1e-12, maxSweeps = 128 } = {}) {
  const size = matrix.length;
  const working = matrix.map((row) => [...row]);
  if (size === 1) return [working[0][0]];

  for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
    let p = 0;
    let q = 1;
    let largest = Math.abs(working[p][q]);
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) {
        const candidate = Math.abs(working[row][column]);
        if (candidate > largest) {
          largest = candidate;
          p = row;
          q = column;
        }
      }
    }
    if (largest <= tolerance) break;

    const angle = 0.5 * Math.atan2(
      2 * working[p][q],
      working[q][q] - working[p][p],
    );
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const app = working[p][p];
    const aqq = working[q][q];
    const apq = working[p][q];

    working[p][p] = cosine ** 2 * app - 2 * sine * cosine * apq + sine ** 2 * aqq;
    working[q][q] = sine ** 2 * app + 2 * sine * cosine * apq + cosine ** 2 * aqq;
    working[p][q] = 0;
    working[q][p] = 0;

    for (let index = 0; index < size; index += 1) {
      if (index === p || index === q) continue;
      const aip = working[index][p];
      const aiq = working[index][q];
      working[index][p] = cosine * aip - sine * aiq;
      working[p][index] = working[index][p];
      working[index][q] = sine * aip + cosine * aiq;
      working[q][index] = working[index][q];
    }
  }

  return Array.from({ length: size }, (_, index) => working[index][index])
    .sort((left, right) => right - left);
}

export function singularValues(matrixInput) {
  const matrix = finiteMatrix(matrixInput);
  return symmetricEigenvalues(smallerGram(matrix))
    .map((value) => Math.sqrt(Math.max(0, value)))
    .sort((left, right) => right - left);
}

export function analyseWorldJacobian(matrixInput, { epsilon = EPSILON } = {}) {
  invariant(Number.isFinite(epsilon) && epsilon > 0, 'epsilon must be positive');
  const matrix = finiteMatrix(matrixInput);
  const values = singularValues(matrix);
  const maximum = values[0] ?? 0;
  const minimum = values.at(-1) ?? 0;
  const foldIndex = 1 - minimum / (maximum + epsilon);
  const conditionNumber = minimum > epsilon ? maximum / minimum : Number.POSITIVE_INFINITY;
  return deepFreeze({
    schema: 'hearthgate.world-jacobian-audit.v1',
    rows: matrix.length,
    columns: matrix[0].length,
    singular_values: values,
    sigma_max: maximum,
    sigma_min: minimum,
    fold_index: Math.min(1, Math.max(0, foldIndex)),
    condition_number: conditionNumber,
    rank_deficient: minimum <= epsilon,
  });
}

export function updateFoldLatch(
  foldIndex,
  wasActive,
  { enter = 0.82, release = 0.68 } = {},
) {
  invariant(Number.isFinite(foldIndex) && foldIndex >= 0 && foldIndex <= 1, 'fold index must lie within 0..1');
  invariant(Number.isFinite(enter) && Number.isFinite(release), 'fold thresholds must be finite');
  invariant(enter > release && enter <= 1 && release >= 0, 'fold thresholds require 0 <= release < enter <= 1');
  return wasActive ? foldIndex >= release : foldIndex >= enter;
}

export function normaliseFoldStrength(foldIndex, enterThreshold = 0.82) {
  invariant(Number.isFinite(foldIndex) && foldIndex >= 0 && foldIndex <= 1, 'fold index must lie within 0..1');
  invariant(Number.isFinite(enterThreshold) && enterThreshold >= 0 && enterThreshold < 1, 'enter threshold must lie within 0..1');
  return Math.min(1, Math.max(0, (foldIndex - enterThreshold) / (1 - enterThreshold)));
}

export function classifyFrequency(frequencyHz) {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return 'invalid';
  if (frequencyHz < 20) return 'infrasonic';
  if (frequencyHz >= 20_000) return 'ultrasonic';
  return 'audible';
}

export function mapWorldFoldFrequencies(
  rootHz,
  foldIndex,
  { enterThreshold = 0.82, excursion = 5 } = {},
) {
  invariant(Number.isFinite(rootHz) && rootHz > 0, 'world root tone must be positive');
  invariant(Number.isFinite(excursion) && excursion >= 0, 'excursion must be nonnegative');
  const strength = normaliseFoldStrength(foldIndex, enterThreshold);
  const displacement = excursion * strength;
  const directHz = rootHz * Math.exp(displacement);
  const inverseHz = rootHz * Math.exp(-displacement);
  return deepFreeze({
    schema: 'hearthgate.world-fold-tone-pair.v1',
    root_hz: rootHz,
    fold_index: foldIndex,
    fold_strength: strength,
    excursion,
    direct_hz: directHz,
    direct_class: classifyFrequency(directHz),
    inverse_hz: inverseHz,
    inverse_class: classifyFrequency(inverseHz),
    reciprocal_product: directHz * inverseHz,
  });
}

export function foldFrequencyIntoAuditionBand(frequencyHz, { minimumHz = 90, maximumHz = 360 } = {}) {
  invariant(Number.isFinite(frequencyHz) && frequencyHz > 0, 'audition frequency must be positive');
  invariant(minimumHz > 0 && maximumHz > minimumHz, 'audition band is invalid');
  let folded = frequencyHz;
  while (folded > maximumHz) folded /= 2;
  while (folded < minimumHz) folded *= 2;
  return folded;
}

export function validateWorldToneCandidate(input) {
  invariant(input && typeof input === 'object', 'candidate must be an object');
  const candidate = copyValue(input);
  const requiredStrings = ['world_id', 'world_name', 'profile_version', 'tone_layer_id', 'source_ref'];
  for (const field of requiredStrings) {
    invariant(typeof candidate[field] === 'string' && candidate[field].trim(), `${field} is required`);
  }
  invariant(Number.isFinite(candidate.root_hz) && candidate.root_hz > 0, 'root_hz must be positive');
  invariant(Number.isFinite(candidate.enter_threshold), 'enter_threshold is required');
  invariant(Number.isFinite(candidate.release_threshold), 'release_threshold is required');
  invariant(candidate.enter_threshold > candidate.release_threshold, 'enter threshold must exceed release threshold');
  invariant(candidate.enter_threshold <= 1 && candidate.release_threshold >= 0, 'thresholds must lie within 0..1');
  invariant(Number.isFinite(candidate.excursion) && candidate.excursion >= 0, 'excursion must be nonnegative');
  candidate.approval_state = candidate.approval_state || 'pending';
  invariant(['pending', 'approved', 'adjust', 'rejected'].includes(candidate.approval_state), 'approval_state is invalid');
  return deepFreeze(candidate);
}

export async function candidateHash(candidateInput) {
  const candidate = validateWorldToneCandidate(candidateInput);
  return sha256Hex(candidate);
}

export function buildAudioHapticPlan(candidateInput, foldIndex, { gain = 0.045 } = {}) {
  const candidate = validateWorldToneCandidate(candidateInput);
  invariant(Number.isFinite(gain) && gain > 0 && gain <= 0.08, 'audition gain must lie within 0..0.08');
  const pair = mapWorldFoldFrequencies(candidate.root_hz, foldIndex, {
    enterThreshold: candidate.enter_threshold,
    excursion: candidate.excursion,
  });
  const rootProxy = foldFrequencyIntoAuditionBand(candidate.root_hz);
  const directProxy = foldFrequencyIntoAuditionBand(pair.direct_hz);
  const inverseProxy = foldFrequencyIntoAuditionBand(pair.inverse_hz);
  const pulses = [
    { role: 'world-root', frequency_hz: rootProxy, duration_ms: 220, gap_after_ms: 140, gain },
    { role: 'direct-rise-1', frequency_hz: directProxy, duration_ms: 75, gap_after_ms: 55, gain: gain * 0.72 },
    { role: 'direct-rise-2', frequency_hz: directProxy, duration_ms: 105, gap_after_ms: 55, gain: gain * 0.86 },
    { role: 'direct-rise-3', frequency_hz: directProxy, duration_ms: 135, gap_after_ms: 180, gain },
    { role: 'inverse-fall-1', frequency_hz: inverseProxy, duration_ms: 135, gap_after_ms: 55, gain },
    { role: 'inverse-fall-2', frequency_hz: inverseProxy, duration_ms: 105, gap_after_ms: 55, gain: gain * 0.86 },
    { role: 'inverse-fall-3', frequency_hz: inverseProxy, duration_ms: 75, gap_after_ms: 0, gain: gain * 0.72 },
  ];
  return deepFreeze({
    schema: 'hearthgate.shokz-audio-haptic-plan.v1',
    transport: 'selected-system-audio-output',
    intended_device: 'shokz-bluetooth-audio',
    fidelity: 'bone-conduction-audio-haptic-proxy',
    direct_source_class: pair.direct_class,
    inverse_source_class: pair.inverse_class,
    pair,
    pulses,
    total_duration_ms: pulses.reduce((sum, pulse) => sum + pulse.duration_ms + pulse.gap_after_ms, 0),
  });
}

function setAudioValue(parameter, value, at) {
  if (typeof parameter?.setValueAtTime === 'function') parameter.setValueAtTime(value, at);
  else if (parameter) parameter.value = value;
}

export class WorldToneApprovalSession extends EventTarget {
  constructor({
    audioContextFactory = null,
    storage = globalThis.localStorage || null,
    now = () => new Date(),
    signer = 'rowan',
  } = {}) {
    super();
    this.audioContextFactory = audioContextFactory;
    this.storage = storage;
    this.now = now;
    this.signer = signer;
    this.candidate = null;
    this.candidateHash = null;
    this.context = null;
    this.nodes = [];
    this.auditionReceipt = null;
    this.active = false;
  }

  createAudioContext() {
    if (this.audioContextFactory) return this.audioContextFactory();
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    invariant(Context, 'Web Audio is unavailable');
    return new Context();
  }

  async loadCandidate(candidateInput) {
    await this.stop();
    this.candidate = validateWorldToneCandidate(candidateInput);
    this.candidateHash = await candidateHash(this.candidate);
    this.auditionReceipt = null;
    return this.candidate;
  }

  async audition({ foldIndex, shokzConfirmed, gain = 0.045 } = {}) {
    invariant(this.candidate && this.candidateHash, 'load a candidate before audition');
    invariant(shokzConfirmed === true, 'explicit Shokz connection confirmation is required');
    invariant(Number.isFinite(foldIndex) && foldIndex >= 0 && foldIndex <= 1, 'fold index must lie within 0..1');
    await this.stop();

    const plan = buildAudioHapticPlan(this.candidate, foldIndex, { gain });
    const context = this.createAudioContext();
    this.context = context;
    if (typeof context.resume === 'function') await context.resume();
    const master = context.createGain();
    const start = (context.currentTime || 0) + 0.03;
    setAudioValue(master.gain, 1, start);
    master.connect(context.destination);
    this.nodes.push(master);

    let cursor = start;
    for (const pulse of plan.pulses) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'sine';
      setAudioValue(oscillator.frequency, pulse.frequency_hz, cursor);
      setAudioValue(envelope.gain, 0.0001, cursor);
      const attackEnd = cursor + Math.min(0.025, pulse.duration_ms / 4000);
      const releaseStart = cursor + Math.max(0.03, pulse.duration_ms / 1000 - 0.035);
      if (typeof envelope.gain?.linearRampToValueAtTime === 'function') {
        envelope.gain.linearRampToValueAtTime(pulse.gain, attackEnd);
        envelope.gain.setValueAtTime(pulse.gain, releaseStart);
        envelope.gain.linearRampToValueAtTime(0.0001, cursor + pulse.duration_ms / 1000);
      } else {
        envelope.gain.value = pulse.gain;
      }
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(cursor);
      oscillator.stop(cursor + pulse.duration_ms / 1000);
      this.nodes.push(oscillator, envelope);
      cursor += (pulse.duration_ms + pulse.gap_after_ms) / 1000;
    }

    this.active = true;
    const completedAt = new Date(this.now().getTime() + plan.total_duration_ms).toISOString();
    this.auditionReceipt = deepFreeze({
      schema: 'hearthgate.world-tone-audition-receipt.v1',
      candidate_hash: this.candidateHash,
      world_id: this.candidate.world_id,
      profile_version: this.candidate.profile_version,
      tone_layer_id: this.candidate.tone_layer_id,
      interface: 'ipad-web-audio',
      intended_device: 'shokz-bluetooth-audio',
      output_device_detected: false,
      device_confirmation: 'user-confirmed',
      fidelity: plan.fidelity,
      fold_index: foldIndex,
      plan,
      started_at: this.now().toISOString(),
      completes_at: completedAt,
    });
    this.dispatchEvent(new CustomEvent('hearthgate:world-tone-auditioned', { detail: this.auditionReceipt }));
    return this.auditionReceipt;
  }

  async stop() {
    const nodes = [...new Set(this.nodes)];
    const context = this.context;
    this.nodes = [];
    this.context = null;
    this.active = false;
    for (const node of nodes) {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    }
    if (context) {
      try { await context.close?.(); } catch {}
    }
  }

  async decide({ decision, shokzConfirmed, feltAndIdentified = false, note = '' } = {}) {
    invariant(this.candidate && this.candidateHash, 'load a candidate before deciding');
    invariant(APPROVAL_DECISIONS.has(decision), 'decision must be approved, adjust, or rejected');
    invariant(shokzConfirmed === true, 'explicit Shokz connection confirmation is required');
    invariant(this.auditionReceipt?.candidate_hash === this.candidateHash, 'the current candidate has not been auditioned');
    if (decision === 'approved') {
      invariant(feltAndIdentified === true, 'approval requires explicit felt-and-identified confirmation');
    }

    const receipt = deepFreeze({
      schema: 'hearthgate.world-tone-approval-receipt.v1',
      candidate_hash: this.candidateHash,
      world_id: this.candidate.world_id,
      world_name: this.candidate.world_name,
      profile_version: this.candidate.profile_version,
      tone_layer_id: this.candidate.tone_layer_id,
      root_hz: this.candidate.root_hz,
      enter_threshold: this.candidate.enter_threshold,
      release_threshold: this.candidate.release_threshold,
      excursion: this.candidate.excursion,
      decision,
      signer: this.signer,
      signer_authority: 'human-calibration-owner',
      shokz_confirmed: true,
      felt_and_identified: Boolean(feltAndIdentified),
      interface: 'ipad-web-app',
      audition_receipt: this.auditionReceipt,
      note: String(note || ''),
      created_at: this.now().toISOString(),
    });
    const receiptHash = await sha256Hex(receipt);
    const finalReceipt = deepFreeze({ ...receipt, receipt_hash: receiptHash });
    this.persistReceipt(finalReceipt);
    this.dispatchEvent(new CustomEvent('hearthgate:world-tone-decision', { detail: finalReceipt }));
    return finalReceipt;
  }

  persistReceipt(receipt) {
    if (!this.storage) return;
    const key = 'hearthgate.world-tone-approvals.v1';
    let existing = [];
    try {
      const parsed = JSON.parse(this.storage.getItem(key) || '[]');
      if (Array.isArray(parsed)) existing = parsed;
    } catch {}
    existing.push(receipt);
    this.storage.setItem(key, JSON.stringify(existing));
  }

  readReceipts() {
    if (!this.storage) return [];
    try {
      const parsed = JSON.parse(this.storage.getItem('hearthgate.world-tone-approvals.v1') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export const DEFAULT_WORLD_TONE_CANDIDATES = deepFreeze([
  {
    world_id: 'terra-aeterna',
    world_name: 'Terra Aeterna / Hearthweave',
    profile_version: '0.2',
    tone_layer_id: 'hearthlight-root',
    root_hz: 220,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: terra-aeterna.v0.2.json',
    approval_state: 'pending',
  },
  {
    world_id: 'starsong-friendship-is-magic',
    world_name: 'Starsong: Friendship Is Magic',
    profile_version: '0.1',
    tone_layer_id: 'starsong-lead',
    root_hz: 528,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: starsong-friendship-is-magic.v0.1.json',
    approval_state: 'pending',
  },
  {
    world_id: 'luna-mooncalled',
    world_name: 'The Luna Who Called Down the Moon',
    profile_version: '0.1',
    tone_layer_id: 'three-moons',
    root_hz: 432,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: luna-mooncalled.v0.1.json',
    approval_state: 'pending',
  },
  {
    world_id: 'taveren-vaen',
    world_name: 'T’averen Vaen',
    profile_version: '0.1',
    tone_layer_id: 'wheel-drone',
    root_hz: 120,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: taveren-vaen.v0.1.json',
    approval_state: 'pending',
  },
  {
    world_id: 'dreaming-grove-templehouse',
    world_name: 'Dreaming Grove / Templehouse',
    profile_version: '0.1',
    tone_layer_id: 'templehouse-hearth',
    root_hz: 174,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: dreaming-grove-templehouse.v0.1.json',
    approval_state: 'pending',
  },
  {
    world_id: 'feather-and-flame',
    world_name: 'Feather & Flame',
    profile_version: '0.1',
    tone_layer_id: 'ember-hearth',
    root_hz: 174,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: feather-and-flame.v0.1.json',
    approval_state: 'pending',
  },
  {
    world_id: 'a-momento-creationis',
    world_name: 'A Momento Creationis',
    profile_version: '0.1',
    tone_layer_id: 'first-mark',
    root_hz: 432,
    enter_threshold: 0.82,
    release_threshold: 0.68,
    excursion: 5,
    source_ref: 'Runa PR #13: a-momento-creationis.v0.1.json',
    approval_state: 'pending',
  },
]);
