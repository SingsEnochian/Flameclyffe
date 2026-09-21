export const MAGIC_BOOK_PHYSICAL_ACCEPTANCE_SCHEMA = 'arcsweep.magic-book-physical-acceptance/v0.1';
export const MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY = 'hearthgate.arcsweep.magic-book.physical-acceptance.v0.1';

const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '').trim();
const time = (value) => {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : 0;
};

function receiptKind(receipt, kind) {
  return receipt?.schema === 'arcsweep.magic-book-receipt/v0.1' && receipt.kind === kind;
}

function strokeReceipt(receipts, pointerType) {
  return [...receipts]
    .reverse()
    .find((receipt) => receiptKind(receipt, 'glyph-stroke') && text(receipt.detail?.pointer_type).toLowerCase() === pointerType) || null;
}

function persistedStrokeIds(project = {}) {
  return new Set((project.glyphs || []).flatMap((glyph) => (glyph.strokes || []).map((stroke) => stroke.id).filter(Boolean)));
}

function after(receipts, kind, at) {
  const threshold = time(at);
  return receipts.find((receipt) => receiptKind(receipt, kind) && time(receipt.created_at) > threshold) || null;
}

function latestBefore(receipts, kind, at) {
  const threshold = time(at);
  return [...receipts]
    .reverse()
    .find((receipt) => receiptKind(receipt, kind) && time(receipt.created_at) > 0 && time(receipt.created_at) < threshold) || null;
}

function between(receipts, predicate, startAt, endAt) {
  const start = time(startAt);
  const end = time(endAt);
  if (!start || !end || end <= start) return false;
  return receipts.some((receipt) => {
    const observed = time(receipt.created_at);
    return observed >= start && observed <= end && predicate(receipt);
  });
}

function boundedInputProofs(deviceProof, deviceProofs = []) {
  const proofs = [...(Array.isArray(deviceProofs) ? deviceProofs : []), deviceProof]
    .filter((proof) => proof && typeof proof === 'object')
    .map((proof) => ({
      pointer_type: text(proof.pointer_type || proof.pointerType).toLowerCase() || 'unknown',
      pressure_observed: proof.pressure_observed === true || Number(proof.pressure || 0) > 0,
      tilt_observed: proof.tilt_observed === true || Math.abs(Number(proof.tilt_x || proof.tiltX || 0)) > 0 || Math.abs(Number(proof.tilt_y || proof.tiltY || 0)) > 0,
      twist_observed: proof.twist_observed === true || Number(proof.twist || 0) !== 0,
      observed_at: proof.observed_at || null,
    }));
  const byType = new Map();
  for (const proof of proofs) {
    const prior = byType.get(proof.pointer_type);
    byType.set(proof.pointer_type, prior ? {
      pointer_type: proof.pointer_type,
      pressure_observed: prior.pressure_observed || proof.pressure_observed,
      tilt_observed: prior.tilt_observed || proof.tilt_observed,
      twist_observed: prior.twist_observed || proof.twist_observed,
      observed_at: proof.observed_at || prior.observed_at,
    } : proof);
  }
  return [...byType.values()].slice(-4);
}

export function evaluateMagicBookPhysicalAcceptance({
  deviceStatus = null,
  deviceProof = null,
  deviceProofs = [],
  receipts = [],
  persistedProject = null,
} = {}) {
  const trail = Array.isArray(receipts) ? receipts : [];
  const touchStroke = strokeReceipt(trail, 'touch');
  const penStroke = strokeReceipt(trail, 'pen');
  const proofStroke = penStroke || touchStroke;
  const storedIds = persistedStrokeIds(persistedProject || {});
  const proofs = boundedInputProofs(deviceProof, deviceProofs);
  const penProof = proofs.find((proof) => proof.pointer_type === 'pen') || null;
  const latestProof = proofs.at(-1) || null;

  const touchAt = time(touchStroke?.created_at);
  const penAt = time(penStroke?.created_at);
  const earliestStrokeAt = touchAt && penAt ? Math.min(touchAt, penAt) : Math.max(touchAt, penAt);
  const latestStrokeAt = Math.max(touchAt, penAt);
  const proofSessionOpen = earliestStrokeAt ? latestBefore(trail, 'book-open', earliestStrokeAt) : null;
  const sessionStartAt = proofSessionOpen?.created_at || null;
  const sessionReady = Boolean(proofSessionOpen && latestStrokeAt > time(sessionStartAt));
  const closeAfterStroke = latestStrokeAt
    ? trail.find((receipt) => receiptKind(receipt, 'book-close') && time(receipt.created_at) > latestStrokeAt)
    : null;
  const reopenAfterClose = closeAfterStroke ? after(trail, 'book-open', closeAfterStroke.created_at) : null;

  const checks = Object.freeze({
    pointer_events_available: deviceStatus?.pointer_events_available === true,
    touch_capable_device: Number(deviceStatus?.touch_points || 0) > 0,
    proof_session_opened: sessionReady,
    touch_stroke_observed: Boolean(touchStroke),
    pencil_stroke_observed: Boolean(penStroke),
    pencil_pressure_observed: Boolean(penProof?.pressure_observed || penStroke?.detail?.pressure_observed === true),
    glyph_forge_page_entered: sessionReady && between(
      trail,
      (receipt) => receiptKind(receipt, 'page-turn') && receipt.page_id === 'glyph-forge',
      sessionStartAt,
      new Date(latestStrokeAt).toISOString(),
    ),
    brush_selected: sessionReady && between(
      trail,
      (receipt) => receiptKind(receipt, 'brush-select'),
      sessionStartAt,
      new Date(latestStrokeAt).toISOString(),
    ),
    brush_setting_changed: sessionReady && between(
      trail,
      (receipt) => receiptKind(receipt, 'brush-setting-change'),
      sessionStartAt,
      new Date(latestStrokeAt).toISOString(),
    ),
    proof_strokes_persisted: Boolean(
      touchStroke?.detail?.stroke_id
      && penStroke?.detail?.stroke_id
      && storedIds.has(touchStroke.detail.stroke_id)
      && storedIds.has(penStroke.detail.stroke_id)
    ),
    leave_return_observed: Boolean(closeAfterStroke && reopenAfterClose),
    device_probe_observed: proofs.length > 0,
  });

  const required = [
    'pointer_events_available',
    'touch_capable_device',
    'proof_session_opened',
    'touch_stroke_observed',
    'pencil_stroke_observed',
    'pencil_pressure_observed',
    'glyph_forge_page_entered',
    'brush_selected',
    'brush_setting_changed',
    'proof_strokes_persisted',
    'leave_return_observed',
  ];
  const missing = Object.freeze(required.filter((key) => checks[key] !== true));

  return Object.freeze({
    schema: 'arcsweep.magic-book-physical-acceptance-candidate/v0.1',
    ready_to_seal: missing.length === 0,
    checks,
    missing,
    evidence: Object.freeze({
      proof_session_open_receipt_id: proofSessionOpen?.receipt_id || null,
      touch_stroke_receipt_id: touchStroke?.receipt_id || null,
      pencil_stroke_receipt_id: penStroke?.receipt_id || null,
      pencil_tilt_observed: penProof?.tilt_observed === true || penStroke?.detail?.tilt_observed === true,
      pencil_twist_observed: penProof?.twist_observed === true || penStroke?.detail?.twist_observed === true,
      latest_device_pointer_type: latestProof?.pointer_type || null,
      latest_device_pressure_observed: latestProof?.pressure_observed === true,
      proof_stroke_receipt_id: proofStroke?.receipt_id || null,
      close_after_proof_receipt_id: closeAfterStroke?.receipt_id || null,
      reopen_after_proof_receipt_id: reopenAfterClose?.receipt_id || null,
    }),
    privacy: Object.freeze({
      coordinates_recorded: false,
      drawing_content_recorded: false,
      text_content_recorded: false,
    }),
  });
}

export function sealMagicBookPhysicalAcceptance(candidate, {
  humanConfirmed = false,
  sealedAt = new Date().toISOString(),
} = {}) {
  if (!candidate || candidate.schema !== 'arcsweep.magic-book-physical-acceptance-candidate/v0.1') {
    throw new TypeError('A valid physical acceptance candidate is required.');
  }
  if (candidate.ready_to_seal !== true) throw new Error('Physical acceptance evidence is incomplete.');
  if (humanConfirmed !== true) throw new Error('Explicit human confirmation on the physical device is required.');

  return Object.freeze({
    schema: MAGIC_BOOK_PHYSICAL_ACCEPTANCE_SCHEMA,
    sealed_at: sealedAt,
    human_confirmed: true,
    physical_device_attested: true,
    acceptance_scope: 'real-ipad-touch-and-apple-pencil',
    checks: clone(candidate.checks),
    evidence: clone(candidate.evidence),
    privacy: clone(candidate.privacy),
    release_promotion: false,
    note: 'Physical interaction gate sealed. Final release promotion remains a separate explicit release action.',
  });
}
