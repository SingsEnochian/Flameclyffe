import { MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY } from './magic-book-physical-acceptance.js';

export const MAGIC_BOOK_PHYSICAL_PROOF_EXPORT_SCHEMA = 'arcsweep.magic-book-physical-proof-export/v0.1';

function readJson(key, fallback = null) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function isSealedMagicBookPhysicalProof(receipt) {
  return Boolean(
    receipt
    && receipt.schema === 'arcsweep.magic-book-physical-acceptance/v0.1'
    && receipt.human_confirmed === true
    && receipt.physical_device_attested === true
  );
}

export function serialiseMagicBookPhysicalProof(receipt) {
  if (!isSealedMagicBookPhysicalProof(receipt)) throw new Error('A sealed physical acceptance receipt is required.');
  return `${JSON.stringify(receipt, null, 2)}\n`;
}

export function magicBookPhysicalProofFilename(receipt) {
  if (!isSealedMagicBookPhysicalProof(receipt)) throw new Error('A sealed physical acceptance receipt is required.');
  const stamp = String(receipt.sealed_at || 'sealed-proof')
    .replaceAll(':', '-')
    .replace(/[^0-9A-Za-z._-]+/g, '_');
  return `arcsweep-magic-book-ipad-proof-${stamp}.json`;
}

function sealedProof() {
  const receipt = readJson(MAGIC_BOOK_PHYSICAL_ACCEPTANCE_KEY, null);
  return isSealedMagicBookPhysicalProof(receipt) ? receipt : null;
}

async function copyText(text) {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(text);
    return 'clipboard';
  }
  if (typeof document === 'undefined') throw new Error('Clipboard is unavailable.');
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand?.('copy') === true;
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed.');
  return 'legacy-clipboard';
}

function makeFile(text, filename) {
  try {
    return new File([text], filename, { type: 'application/json' });
  } catch {
    return null;
  }
}

async function shareOrDownload(text, filename) {
  const file = makeFile(text, filename);
  if (file && globalThis.navigator?.share && globalThis.navigator?.canShare?.({ files: [file] })) {
    await globalThis.navigator.share({
      title: 'ArcSweep Magic Book physical proof',
      text: 'Sealed iPad + Apple Pencil acceptance receipt.',
      files: [file],
    });
    return 'share';
  }
  if (typeof document === 'undefined' || typeof URL === 'undefined') throw new Error('File export is unavailable.');
  const blob = new Blob([text], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(href), 0);
  }
  return 'download';
}

function statusNode(panel) {
  let node = panel?.querySelector?.('[data-magic-book-proof-export-status]');
  if (node) return node;
  node = document.createElement('p');
  node.className = 'magic-book-glyph-status';
  node.dataset.magicBookProofExportStatus = 'true';
  panel?.append(node);
  return node;
}

function setStatus(message) {
  const panel = document.getElementById('magic-book-physical-acceptance');
  const node = panel ? statusNode(panel) : null;
  if (node) node.textContent = message;
}

export async function copySealedMagicBookPhysicalProof() {
  const receipt = sealedProof();
  if (!receipt) throw new Error('No sealed physical proof is available yet.');
  const method = await copyText(serialiseMagicBookPhysicalProof(receipt));
  return Object.freeze({
    schema: MAGIC_BOOK_PHYSICAL_PROOF_EXPORT_SCHEMA,
    action: 'copy',
    method,
    sealed_at: receipt.sealed_at || null,
    transmitted: false,
  });
}

export async function exportSealedMagicBookPhysicalProof() {
  const receipt = sealedProof();
  if (!receipt) throw new Error('No sealed physical proof is available yet.');
  const text = serialiseMagicBookPhysicalProof(receipt);
  const filename = magicBookPhysicalProofFilename(receipt);
  const method = await shareOrDownload(text, filename);
  return Object.freeze({
    schema: MAGIC_BOOK_PHYSICAL_PROOF_EXPORT_SCHEMA,
    action: 'export',
    method,
    filename,
    sealed_at: receipt.sealed_at || null,
    transmitted: method === 'share',
  });
}

function installButtons() {
  if (typeof document === 'undefined') return false;
  const panel = document.getElementById('magic-book-physical-acceptance');
  if (!panel || !sealedProof()) return false;
  const actions = panel.querySelector('.magic-book-glyph-actions');
  if (!actions || actions.querySelector('[data-magic-book-proof-copy]')) return false;

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.dataset.magicBookProofCopy = 'true';
  copy.textContent = 'Copy sealed proof';

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.dataset.magicBookProofExport = 'true';
  exportButton.textContent = 'Share / export proof JSON';

  actions.append(copy, exportButton);
  return true;
}

function install() {
  if (typeof document === 'undefined' || globalThis.__magicBookPhysicalProofExport) return globalThis.__magicBookPhysicalProofExport || null;

  const observer = new MutationObserver(() => installButtons());
  observer.observe(document.body, { childList: true, subtree: true });
  installButtons();

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-magic-book-proof-copy]')) {
      void copySealedMagicBookPhysicalProof()
        .then(() => setStatus('Sealed proof copied as JSON.'))
        .catch((error) => setStatus(error?.message || String(error)));
      return;
    }
    if (event.target.closest?.('[data-magic-book-proof-export]')) {
      void exportSealedMagicBookPhysicalProof()
        .then((result) => setStatus(result.method === 'share' ? 'Sealed proof handed to the iPad share sheet.' : 'Sealed proof exported as JSON.'))
        .catch((error) => setStatus(error?.message || String(error)));
    }
  }, true);

  const api = Object.freeze({
    schema: MAGIC_BOOK_PHYSICAL_PROOF_EXPORT_SCHEMA,
    receipt: sealedProof,
    copy: copySealedMagicBookPhysicalProof,
    exportFile: exportSealedMagicBookPhysicalProof,
  });
  globalThis.__magicBookPhysicalProofExport = api;
  globalThis.addEventListener?.('pagehide', () => observer.disconnect(), { once: true });
  return api;
}

export const magicBookPhysicalProofExport = install();
