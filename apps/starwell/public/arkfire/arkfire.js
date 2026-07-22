const manifestUrl = new URL('./arkfire-app.manifest.json', import.meta.url);

async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function bootArkfire() {
  const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
  if (!manifestResponse.ok) throw new Error(`Arkfire manifest failed: ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const chunks = await Promise.all(manifest.parts.map(async (part) => {
    const response = await fetch(new URL(part.path, manifestUrl), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Arkfire source part failed: ${part.path} (${response.status})`);
    const text = await response.text();
    const digest = await sha256(text);
    if (digest && digest !== part.sha256) throw new Error(`Arkfire source checksum mismatch: ${part.path}`);
    return text;
  }));
  const source = chunks.join('');
  const digest = await sha256(source);
  if (digest && digest !== manifest.sourceSha256) throw new Error('Arkfire assembled source checksum mismatch.');
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

bootArkfire().catch((error) => {
  console.error('[arkfire boot]', error);
  const root = document.getElementById('arkfire-root');
  if (root) root.innerHTML = `<section class="fatal-error"><h1>Arkfire could not start</h1><p>${String(error.message || error)}</p><button type="button" onclick="location.reload()">Retry</button></section>`;
});
