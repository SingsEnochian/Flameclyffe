'use strict';

const { handleMcpMessage } = require('./wayglass-mcp-core.cjs');
const MAX_BODY_BYTES = 1024 * 1024;
const REQUIRED_SCOPE = 'wayglass:constellation';

function json(res, status, payload, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(payload));
}

function makeMcpHttpHandler({ verifyBearer, resourceUrl, listRoutes, present, respond } = {}) {
  if (typeof verifyBearer !== 'function') throw new Error('MCP HTTP requires a bearer token verifier');
  if (typeof resourceUrl !== 'string' || !/^https:\/\//.test(resourceUrl)) {
    throw new Error('MCP HTTP requires an HTTPS resource URL');
  }
  const resource = new URL(resourceUrl);
  if (resource.pathname !== '/mcp' || resource.search || resource.hash || resource.username || resource.password) {
    throw new Error('MCP resource URL must end at /mcp');
  }
  const challenge = 'Bearer resource_metadata="' + resource.origin + '/.well-known/oauth-protected-resource/mcp", scope="' + REQUIRED_SCOPE + '"';

  return async function mcpHttp(req, res) {
    if (req.url?.split('?')[0] !== '/mcp') return json(res, 404, { error: 'Not found' });
    // MCP resource identity is exact: never accept query-carried credentials or alternate URLs.
    // Reject before bearer verification so malformed resource requests cannot trigger auth work.
    if (req.url !== '/mcp') return json(res, 400, { error: 'Invalid MCP resource URL' });
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
    if (!principal || principal.active !== true) {
      return json(res, 401, { error: 'Invalid credentials' }, { 'WWW-Authenticate': challenge + ', error="invalid_token"' });
    }
    if (!Array.isArray(principal.scopes) || !principal.scopes.includes(REQUIRED_SCOPE)) {
      return json(res, 403, { error: 'Insufficient scope' });
    }
    // A valid scoped token is not proof of owner authority. The trusted verifier
    // must independently establish the owner grant, including revocation state.
    if (principal.revoked === true || principal.consentRevoked === true || principal.ownerAuthorized !== true) {
      return json(res, 403, { error: 'Owner authorization required' });
    }
    // Every authorized crossing must have a stable, attributable principal.
    // A verifier that cannot identify the owner must fail closed, not pass null.
    if (typeof principal.subject !== 'string' || !principal.subject.trim()) {
      return json(res, 403, { error: 'Owner identity required' });
    }
    const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') return json(res, 415, { error: 'Expected application/json' });
    // Count raw bytes before decoding: UTF-8 sequences may span TCP chunks.
    // Do not retain an unbounded request body or trust Content-Length alone.
    const declaredLength = req.headers['content-length'];
    if (declaredLength !== undefined && /^\d+$/.test(declaredLength)
      && Number(declaredLength) > MAX_BODY_BYTES) {
      return json(res, 413, { error: 'Request too large' });
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) return json(res, 413, { error: 'Request too large' });
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return json(res, 400, { error: 'Malformed JSON' }); }
    let result;
    try {
      result = await handleMcpMessage(body, { authenticated: true, principal, resource: resourceUrl, present, respond: typeof respond === 'function' ? input => respond(input, { principalId: principal.subject, scopes: [...principal.scopes], resource: resourceUrl, consentRef: principal.consentRef || null }) : undefined, listRoutes: typeof listRoutes === 'function' ? () => listRoutes({
        principalId: typeof principal.subject === 'string' ? principal.subject : null,
        scopes: [...principal.scopes],
        resource: resourceUrl,
        consentRef: typeof principal.consentRef === 'string' ? principal.consentRef : null,
      }) : undefined });
    } catch {
      // A failing native route/provider must not leak secrets or crash the HTTP request.
      return json(res, 500, { error: 'MCP route unavailable' });
    }
    if (result === null) {
      res.writeHead(202, { 'Cache-Control': 'no-store' });
      return res.end();
    }
    return json(res, 200, result);
  };
}

module.exports = { makeMcpHttpHandler };
