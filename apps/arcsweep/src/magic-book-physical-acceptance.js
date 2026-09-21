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

export function evaluateMagicBookPhysicalAcceptance({
  deviceStatus = null,
  deviceProof = null,
  receipts = [],
  persistedProject = null,
} = {}) {
  const trail = Array.isArray(receipts) ? receipts : [];
  const touchStroke = strokeReceipt(trail, 'touch');
  const penStroke = strokeReceipt(trail, 'pen');
  const proofStroke = penStroke || touchStroke;
  const storedIds = persistedStrokeIds(persistedProject || {});
  const latestStrokeAt = Math.max(time(touchStroke?.created_at), time(penStroke?.created_at));
  const closeAfterStroke = latestStrokeAt
    ? trail.find((receipt) => receiptKind(receipt, 'book-close') && time(receipt.created_at) > latestStrokeAt)
    : null;
  const reopenAfterClose = closeAfterStroke ? after(trail, 'book-open', closeAfterStroke.created_at) : null;

  const checks = Object.freeze({
    pointer_events_available: deviceStatus?.pointer_events_available === true,
    touch_capable_device: Number(deviceStatus?.touch_points || 0) > 0,
    touch_stroke_observed: Boolean(touchStroke),
    pencil_stroke_observed: Boolean(penStroke),
    pencil_pressure_observed: penStroke?.detail?.pressure_observed === true,
    glyph_forge_page_entered: trail.some((receipt) => receiptKind(receipt, 'page-turn') && receipt.page_id === 'glyph-forge'),
    brush_selected: trail.some((receipt) => receiptKind(receipt, 'brush-select')),
    brush_setting_changed: trail.some((receipt) => receiptKind(receipt, 'brush-setting-change')),
    proof_strokes_persisted: Boolean(
      touchStroke?.detail?.stroke_id
      && penStroke?.detail?.stroke_id
      && storedIds.has(touchStroke.detail.stroke_id)
      && storedIds.has(penStroke.detail.stroke_id)
    ),
    leave_return_observed: Boolean(closeAfterStroke && reopenAfterClose),
    device_probe_observed: Boolean(deviceProof?.pointer_type),
  });

  const required = [
    'pointer_events_available',
    'touch_capable_device',
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
      touch_stroke_receipt_id: touchStroke?.receipt_id || null,
      pencil_stroke_receipt_id: penStroke?.receipt_id || null,
      pencil_tilt_observed: penStroke?.detail?.tilt_observed === true,
      pencil_twist_observed: penStroke?.detail?.twist_observed === true,
      latest_device_pointer_type: deviceProof?.pointer_type || null,
      latest_device_pressure_observed: deviceProof?.pressure_observed === true,
      proof_stroke_receipt_id: proofStroke?.receipt_id || null,
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
