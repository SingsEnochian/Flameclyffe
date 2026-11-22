async function sha256(source, cryptoImpl) {
  if (!cryptoImpl?.subtle?.digest) throw new Error('Web Crypto is required to verify the Wyrdrune source receipt.');
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function runWyrdruneProgram(source, {
  mode = 'execute',
  context = null,
  programId = null,
  fetchImpl = fetch,
  cryptoImpl = globalThis.crypto,
  signal,
} = {}) {
  if (typeof source !== 'string' || !source.trim() || source.length > 50000) {
    throw new TypeError('Enter a Wyrdrune programme of up to 50000 characters.');
  }
  if (!['compile', 'execute'].includes(mode)) throw new TypeError('Wyrdrune mode must be compile or execute.');
  const response = await fetchImpl('/api/v1/wayglass/wyrdrune/workbench', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, mode, context, program_id: programId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Wyrdrune workbench request failed.');
  if (data.schema !== 'wayglass.wyrdrune-workbench/v1' || data.mode !== mode ||
      data.dispatch !== 'none' || !Array.isArray(data.external_effects) || data.external_effects.length !== 0) {
    throw new TypeError('The returned Wyrdrune workbench receipt does not match the requested execution contract.');
  }
  const expected = await sha256(source, cryptoImpl);
  if (data.source_hash !== expected || data.ir?.sourceHash !== expected ||
      (mode === 'execute' && data.execution?.sourceHash !== expected)) {
    throw new TypeError('Wyrdrune source hash does not match the executed programme.');
  }
  return Object.freeze({ ...data, source_verified: true });
}
