import { authoriseHouseRequest, clearHouseSessionCookies, houseSessionCookie, issueHouseSession, validateStewardCredential } from './_shared/house-session.mjs';

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

export default async (request) => {
  const env = { get: (name) => Netlify.env.get(name) };
  if (request.method === 'GET') {
    const session = authoriseHouseRequest(request, env);
    return session ? json(200, { connected: true, role: 'steward', mode: session.mode }) : json(401, { connected: false });
  }
  if (request.method === 'DELETE') {
    const response = json(200, { connected: false });
    for (const cookie of clearHouseSessionCookies()) response.headers.append('set-cookie', cookie);
    return response;
  }
  if (request.method !== 'POST') return json(405, { error: 'GET, POST, or DELETE required.' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
  if (!validateStewardCredential(String(body.credential || ''), env)) return json(401, { error: 'Steward credential refused.' });
  try {
    const session = issueHouseSession(env);
    return json(201, { connected: true, role: 'steward', expires_at: new Date(session.claims.exp * 1000).toISOString() }, { 'set-cookie': houseSessionCookie(request, session.token, session.ttl) });
  } catch (error) { return json(503, { error: error.message }); }
};

export const config = { path: '/api/v1/house/session' };
