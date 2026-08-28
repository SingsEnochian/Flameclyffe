const MANIFEST_URL = new URL('../assets/third-party/wot-chapter-icons/manifest.json', import.meta.url);
const SAFE_ICON = /^[A-Za-z0-9_'-]+-icon\.svg$/;
let manifestCache = null;

export async function loadWotChapterIconManifest(fetchImpl = fetch) {
  if (manifestCache) return manifestCache;
  const response = await fetchImpl(MANIFEST_URL);
  if (!response?.ok) throw new Error(`Wheel of Time chapter icon manifest failed (${response?.status ?? 'unknown'}).`);
  const manifest = await response.json();
  if (manifest?.status !== 'external-quarantined' || manifest?.policy?.vendorCopies !== false) {
    throw new Error('Wheel of Time chapter icon rights manifest is not in quarantined external mode.');
  }
  manifestCache = Object.freeze(manifest);
  return manifestCache;
}

export function validateWotChapterIconFilename(filename) {
  const value = String(filename || '').trim();
  if (!SAFE_ICON.test(value) || value.includes('..') || value.includes('/')) throw new Error('Invalid Wheel of Time chapter icon filename.');
  return value;
}

export async function resolveWotChapterIcon(filename, { fetchImpl = fetch } = {}) {
  const safe = validateWotChapterIconFilename(filename);
  const manifest = await loadWotChapterIconManifest(fetchImpl);
  const rawUrl = new URL(encodeURIComponent(safe).replaceAll('%27', "'"), manifest.upstream.rawBase).toString();
  return Object.freeze({
    schema: 'arcsweep.third-party-asset-ref/v1',
    packId: manifest.id,
    filename: safe,
    url: rawUrl,
    upstreamCommit: manifest.upstream.commit,
    status: manifest.status,
    attribution: `${manifest.rights.projectCopyright} · ${manifest.rights.projectLicense}; ${manifest.rights.imageCopyright}`,
    licenseUrl: manifest.rights.licenseUrl,
    derivativePolicy: 'asset adaptations remain subject to the upstream share-alike licence; Flameclyffe code/content licensing is separate',
    canonPromotion: false,
  });
}

export function clearWotChapterIconManifestCache() {
  manifestCache = null;
}
