import { authoriseHouseRequest } from '../../netlify/functions/_shared/house-session.mjs';

const ROUTES = new Map([
  ['routes', ['GET']], ['kernel', ['GET']], ['kernel/enter', ['POST']],
  ['kernel/leave', ['POST']], ['respond', ['POST']], ['voyage/messages', ['GET', 'POST']],
]);
const json = (status, body) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

export function createWayglassGatewayHandler({ env, fetchImpl = fetch, authorise = authoriseHouseRequest }) {
  return async request => {
    if (!authorise(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const url = new URL(request.url);
    const prefix = '/api/v1/wayglass/';
    const route = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
    if (!ROUTES.has(route)) return json(404, { error: 'Unknown Wayglass host route.' });
    if (!ROUTES.get(route).includes(request.method)) return json(405, { error: 'Method not allowed.' });
    const base = env.get('HEARTHGATE_GATEWAY_URL');
    const token = env.get('HEARTHGATE_GATEWAY_TOKEN');
    if (!base || !token) return json(503, { error: 'Wayglass host gateway is not configured.' });
    let host;
    try {
      host = new URL(base);
      if (host.protocol !== 'https:' || host.username || host.password || host.search || host.hash) throw new Error();
    } catch { return json(503, { error: 'Wayglass host gateway requires a configured HTTPS endpoint.' }); }
    let body;
    if (request.method === 'POST') {
      body = await request.text();
      if (Buffer.byteLength(body) > 65536) return json(413, { error: 'Wayglass request exceeds 64 KiB.' });
    }
    try {
      const response = await fetchImpl(`${base.replace(/\/$/, '')}/api/v1/wayglass/${route}${url.search}`, {
        method: request.method, redirect: 'error',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body }), signal: AbortSignal.timeout(120000),
      });
      return new Response(response.body, { status: response.status, headers: {
        'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store',
      } });
    } catch { return json(502, { error: 'Wayglass host gateway could not be reached.' }); }
  };
}
