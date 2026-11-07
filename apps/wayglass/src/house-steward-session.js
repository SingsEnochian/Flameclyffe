// House authentication is performed by the existing Wayglass host.
// Keep the credential only in the caller's transient password field.
export async function signInHouseSteward(credential, fetchImpl = fetch) {
  if (typeof credential !== 'string' || !credential || credential.length > 4096) {
    throw new TypeError('Enter your House Steward credential.');
  }
  const response = await fetchImpl('/api/v1/house/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
    body: JSON.stringify({ credential }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.connected !== true || result.role !== 'steward') {
    throw new Error(result.error || 'House Steward authorization failed.');
  }
  return { connected: true, role: result.role };
}

export async function checkHouseSteward(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/house/session', {
    method: 'GET', cache: 'no-store', credentials: 'same-origin',
  });
  const result = await response.json().catch(() => ({}));
  return response.ok && result.connected === true && result.role === 'steward';
}
