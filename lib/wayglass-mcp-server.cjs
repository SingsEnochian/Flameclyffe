'use strict';

const http = require('node:http');
const { makeMcpHttpHandler } = require('./wayglass-mcp-http.cjs');
const { makeProtectedResourceMetadataHandler } = require('./wayglass-mcp-resource-metadata.cjs');

// This factory is intentionally not an OAuth provider. The deployment must
// inject a verifier that validates issuer, signature, expiry, audience,
// revocation and scopes before returning an active principal.
function createWayglassMcpServer({ resourceUrl, authorizationServerUrl, verifyBearer, listRoutes } = {}) {
  if (typeof verifyBearer !== 'function') throw new Error('Verified OAuth bearer adapter required');
  const mcp = makeMcpHttpHandler({ resourceUrl, verifyBearer, listRoutes });
  const metadata = makeProtectedResourceMetadataHandler({ resourceUrl, authorizationServerUrl });
  return http.createServer((req, res) => {
    const pathname = req.url?.split('?')[0];
    if (pathname === '/mcp') {
      Promise.resolve(mcp(req, res)).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ error: 'Internal error' }));
        } else res.destroy();
      });
    } else if (pathname === '/.well-known/oauth-protected-resource/mcp') {
      metadata(req, res);
    } else if (pathname === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, service: 'wayglass-mcp', oauthConfigured: true }));
    } else {
      res.writeHead(404, { 'Cache-Control': 'no-store' });
      res.end();
    }
  });
}

module.exports = { createWayglassMcpServer };
