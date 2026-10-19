// A new page always starts without a provider session. No browser persistence.
export function createAuthorizationSession(validate) {
  let grant = null;
  let generation = 0;
  return Object.freeze({
    async authorize(value) {
      const code = typeof value === 'string' ? value.trim() : '';
      if (!code || code.length > 4096) throw new Error('Enter Bluebird’s token code.');
      const attempt = ++generation;
      grant = null;
      const result = await validate(code);
      if (attempt !== generation) throw new Error('Authorization was interrupted. Enter the code again.');
      if (result?.authorized !== true || typeof result.session_token !== 'string' || !result.session_token) throw new Error('Bluebird’s provider did not authorize this session.');
      grant = { session_token: result.session_token, provider: result.provider, route_id: result.route_id };
      return { provider: grant.provider, route_id: grant.route_id };
    },
    clear() { generation++; grant = null; },
    headers() { return grant ? { 'X-Wayglass-Bluebird-Session': grant.session_token } : {}; },
    route() { return grant?.route_id || null; },
  });
}

export const authorizationSession = createAuthorizationSession(async code => {
  const response = await fetch('/api/v1/wayglass/bluebird/authorize', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }), cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Bluebird’s provider could not authorize this session.');
  }
  return response.json();
});
