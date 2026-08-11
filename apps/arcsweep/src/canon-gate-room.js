export const CANON_GATE_ROOM = Object.freeze({
  id: 'canon-gate',
  label: 'Canon Gate',
  glyph: '⌬',
  category: 'continuity',
  defaultVisible: true,
  description: 'Upload, classify, review, and download canon sources without surrendering provenance or approval.',
  actions: Object.freeze([
    { id: 'upload-documents', label: 'Upload Documents', method: 'uploadCanonFiles' },
    { id: 'upload-folder', label: 'Upload Folder', method: 'uploadCanonFolder' },
    { id: 'review-primer', label: 'Review Ingest Primer', method: null },
    { id: 'download-json', label: 'Download Canon JSON', method: 'downloadCanonJson' },
    { id: 'download-folder', label: 'Download Portable Canon Folder', method: 'downloadCanonFolder' },
  ]),
});

export function buildCanonUploadOptions({
  world,
  primer,
  authority = 'unknown',
  status = 'unclassified',
  tags = [],
  createdBy = ['Rowan', 'Vee'],
  receptionProfileRef = null,
}) {
  if (!world?.id || !world?.name) throw new Error('A destination world is required before canon upload.');
  if (!primer || primer.schemaVersion !== 'arcsweep.ingest-primer/v0.1') {
    throw new Error('A valid Arcsweep ingest primer is required before canon upload.');
  }
  return {
    canonId: world.id,
    canonName: world.name,
    primer,
    authority,
    status,
    tags,
    createdBy,
    receptionProfileRef,
  };
}

export function createCanonGateController(bridge = globalThis.arcsweepDesktop) {
  if (!bridge) throw new Error('Canon Gate requires the Arcsweep desktop bridge.');
  const required = [
    'listCanons',
    'readCanon',
    'uploadCanonFiles',
    'uploadCanonFolder',
    'downloadCanonJson',
    'downloadCanonFolder',
  ];
  for (const method of required) {
    if (typeof bridge[method] !== 'function') throw new Error(`Arcsweep desktop bridge is missing ${method}().`);
  }
  return Object.freeze({
    list: () => bridge.listCanons(),
    read: (canonId) => bridge.readCanon(canonId),
    uploadDocuments: (options) => bridge.uploadCanonFiles(options),
    uploadFolder: (options) => bridge.uploadCanonFolder(options),
    downloadJson: (canonId) => bridge.downloadCanonJson(canonId),
    downloadFolder: (canonId) => bridge.downloadCanonFolder(canonId),
  });
}

export function formatIngestSummary(result) {
  if (!result || result.canceled) return 'No sources were added.';
  const added = result.added?.length || 0;
  const duplicates = result.duplicates?.length || 0;
  const parts = [`${added} source${added === 1 ? '' : 's'} added`];
  if (duplicates) parts.push(`${duplicates} duplicate${duplicates === 1 ? '' : 's'} recognised`);
  return `${parts.join('; ')}.`;
}
