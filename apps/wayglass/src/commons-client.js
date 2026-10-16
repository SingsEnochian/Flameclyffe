// Use the existing House Commons API and session boundary.
// A static GitHub Pages build may render the shell but cannot call the
// authenticated cross-origin Commons service without a supported same-origin host.
export async function readCommons(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/house/commons', { credentials: 'same-origin', cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign into the House Runtime on this host to open Commons.' : (body.error || 'Commons is unavailable.'));
  return Array.isArray(body.entries) ? body.entries : [];
}

export async function postCommons({ text, threadId = null, replyTo = null, idempotencyKey, fetchImpl = fetch } = {}) {
  const value = String(text ?? '').trim();
  if (!value) throw new Error('Write something before sending.');
  if (value.length > 24000) throw new Error('Commons message exceeds 24,000 characters.');
  const response = await fetchImpl('/api/v1/house/commons', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'steward', author: 'Rowan', text: value,
      thread_id: threadId, reply_to: replyTo, idempotency_key: idempotencyKey,
      status: 'posted', links: [{ kind: 'wayglass', id: 'wayglass:commons', label: 'Wayglass Commons' }],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || (response.status === 401 ? 'House Runtime sign-in required.' : 'Could not post to Commons.'));
  return body;
}
