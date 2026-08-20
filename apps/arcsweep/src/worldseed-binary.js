export const WORLDSEED_BINARY_SCHEMA = 'arcsweep.worldseed-binary/v1';
export const WORLDSEED_BINARY_ENTRY_SCHEMA = 'arcsweep.worldseed-binary-entry/v1';

function clone(value) {
  return structuredClone(value);
}

function recordsFromPackage(pkg) {
  return [
    ...(Array.isArray(pkg?.seedhouseRecords) ? pkg.seedhouseRecords : []),
    ...(Array.isArray(pkg?.content?.canon) ? pkg.content.canon : []),
    ...(Array.isArray(pkg?.content?.timeline) ? pkg.content.timeline : []),
    ...Object.values(pkg?.content?.rooms || {}).flatMap((records) => Array.isArray(records) ? records : []),
  ];
}

export function collectWorldseedPackageAttachments(pkg) {
  const seen = new Set();
  const attachments = [];
  for (const record of recordsFromPackage(pkg)) {
    for (const attachment of Array.isArray(record?.attachments) ? record.attachments : []) {
      const key = attachment?.id || attachment?.sha256 || attachment?.relativePath || attachment?.storedName;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      attachments.push(clone(attachment));
    }
  }
  return attachments;
}

export function embedWorldseedBinaryPayloads(pkg, payloads = [], packedAt = new Date().toISOString()) {
  const next = clone(pkg);
  const attachments = collectWorldseedPackageAttachments(next);
  const expected = new Map(attachments.map((attachment) => [attachment.id, attachment]));
  const entries = [];
  const seen = new Set();
  for (const payload of payloads) {
    if (!payload || payload.schema !== WORLDSEED_BINARY_ENTRY_SCHEMA) throw new Error('Worldseed binary entry has an unsupported schema.');
    if (!payload.attachmentId || !expected.has(payload.attachmentId)) throw new Error(`Worldseed binary entry ${payload.attachmentId || 'unknown'} is not referenced by this Ark.`);
    if (seen.has(payload.attachmentId)) throw new Error(`Worldseed binary entry ${payload.attachmentId} is duplicated.`);
    seen.add(payload.attachmentId);
    const attachment = expected.get(payload.attachmentId);
    if (attachment.sha256 && payload.sha256 && attachment.sha256 !== payload.sha256) {
      throw new Error(`Worldseed binary entry ${payload.attachmentId} does not match its attachment SHA-256.`);
    }
    entries.push(clone(payload));
  }
  const missingAttachmentIds = attachments.map((attachment) => attachment.id).filter((id) => id && !seen.has(id));
  next.binary = {
    schema: WORLDSEED_BINARY_SCHEMA,
    version: 1,
    packedAt,
    mode: missingAttachmentIds.length ? 'partial' : 'embedded',
    attachmentCount: attachments.length,
    embeddedCount: entries.length,
    missingAttachmentIds,
    entries,
  };
  if (next.manifest) {
    next.manifest.binary = {
      schema: WORLDSEED_BINARY_SCHEMA,
      mode: next.binary.mode,
      attachmentCount: next.binary.attachmentCount,
      embeddedCount: next.binary.embeddedCount,
      missingAttachmentIds: [...missingAttachmentIds],
      sha256: Object.fromEntries(entries.map((entry) => [entry.attachmentId, entry.sha256])),
    };
  }
  return next;
}

function remapRecordAttachments(record, receiptByAttachmentId) {
  const next = clone(record);
  if (!Array.isArray(next.attachments)) return next;
  next.attachments = next.attachments.map((attachment) => {
    const replacement = receiptByAttachmentId.get(attachment?.id);
    return replacement ? clone(replacement) : attachment;
  });
  return next;
}

export function remapWorldseedPackageAttachments(pkg, receipts = []) {
  const receiptByAttachmentId = new Map(
    receipts
      .filter((receipt) => receipt?.importedFromAttachmentId)
      .map((receipt) => [receipt.importedFromAttachmentId, receipt]),
  );
  const next = clone(pkg);
  next.seedhouseRecords = (next.seedhouseRecords || []).map((record) => remapRecordAttachments(record, receiptByAttachmentId));
  next.content = next.content || {};
  next.content.canon = (next.content.canon || []).map((record) => remapRecordAttachments(record, receiptByAttachmentId));
  next.content.timeline = (next.content.timeline || []).map((record) => remapRecordAttachments(record, receiptByAttachmentId));
  next.content.rooms = Object.fromEntries(Object.entries(next.content.rooms || {}).map(([roomId, records]) => [
    roomId,
    (records || []).map((record) => remapRecordAttachments(record, receiptByAttachmentId)),
  ]));
  return next;
}

export function binaryArkStatus(pkg) {
  const attachments = collectWorldseedPackageAttachments(pkg);
  const binary = pkg?.binary;
  if (!attachments.length) return { mode: 'none-required', attachmentCount: 0, embeddedCount: 0, complete: true };
  if (!binary || binary.schema !== WORLDSEED_BINARY_SCHEMA) {
    return { mode: 'references-only', attachmentCount: attachments.length, embeddedCount: 0, complete: false };
  }
  return {
    mode: binary.mode,
    attachmentCount: attachments.length,
    embeddedCount: Array.isArray(binary.entries) ? binary.entries.length : 0,
    complete: binary.mode === 'embedded' && binary.entries?.length === attachments.length,
  };
}
