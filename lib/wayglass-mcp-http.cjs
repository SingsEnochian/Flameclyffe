'use strict';

const { handleMcpMessage } = require('./wayglass-mcp-core.cjs');
const { publicWayglassRoutes } = require('./wayglass-route-registry.cjs');
const MAX_BODY_BYTES = 1024 * 1024;
const REQUIRED_SCOPE = 'wayglass:constellation';

function json(res, status, payload, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(payload));
}

function makeMcpHttpHandler({ verifyBearer, resourceUrl, listRoutes = publicWayglassRoutes } = {}) {
  if (typeof verifyBearer !== 'function') throw new Error('MCP HTTP requires a bearer token verifier');
  if (typeof resourceUrl !== 'string' || !/^https:\/\//.test(resourceUrl)) {
    throw new Error('MCP HTTP requires an HTTPS resource URL');
  }
  const resource = new URL(resourceUrl);
  if (resource.pathname !== '/mcp' || resource.search || resource.hash) {
    throw new Error('MCP resource URL must end at /mcp');
  }
  const challenge = 'Bearer resource_metadata="' + resource.origin + '/.well-known/oauth-protected-resource/mcp", scope="' + REQUIRED_SCOPE + '"';

  return async function mcpHttp(req, res) {
    if (req.url?.split('?')[0] !== '/mcp') return json(res, 404, { error: 'Not found' });
    if (req.headers.origin && req.headers.origin !== resource.origin) {
      return json(res, 403, { error: 'Origin not permitted' });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method not allowed' });
    }
    const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    if (!bearer) return json(res, 401, { error: 'Authentication required' }, { 'WWW-Authenticate': challenge });
    let principal;
    try {
      principal = await verifyBearer(bearer[1], { resource: resourceUrl, requiredScope: REQUIRED_SCOPE });
    } catch {
      return json(res, 401, { error: 'Invalid credentials' }, { 'WWW-Authenticate': challenge });
    }
    if (!principal || principal.active !== true || !Array.isArray(principal.scopes)
      || !principal.scopes.includes(REQUIRED_SCOPE)) {
      return json(res, 403, { error: 'Insufficient scope' });
    }
    // A valid scoped token is not proof of owner authority. The trusted verifier
    // must independently establish the owner grant, including revocation state.
    if (principal.ownerAuthorized !== true) {
      return json(res, 403, { error: 'Owner authorization required' });
    }
    const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') return json(res, 415, { error: 'Expected application/json' });
    let raw = '';
    for await (const chunk of req) {
      raw += chunk.toString('utf8');
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return json(res, 413, { error: 'Request too large' });
    }
    let body;
    try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'Malformed JSON' }); }
    const result = handleMcpMessage(body, { authenticated: true, listRoutes });
    if (result === null) {
      res.writeHead(202, { 'Cache-Control': 'no-store' });
      return res.end();
    }
    return json(res, 200, result);
  };
}

module.exports = { makeMcpHttpHandler };
