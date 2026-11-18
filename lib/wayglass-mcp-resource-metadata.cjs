'use strict';

// RFC 9728 resource metadata. This publishes the OAuth authorization server
// location; it does NOT implement OAuth or grant tokens.
function makeProtectedResourceMetadataHandler({ resourceUrl, authorizationServerUrl } = {}) {
  for (const [name, value] of Object.entries({ resourceUrl, authorizationServerUrl })) {
    if (typeof value !== 'string' || !/^https:\/\//.test(value)) {
      throw new Error(name + ' must be an HTTPS URL');
    }
  }
  const resource = new URL(resourceUrl);
  const issuer = new URL(authorizationServerUrl);
  if (resource.pathname !== '/mcp' || resource.search || resource.hash || issuer.search || issuer.hash) {
    throw new Error('Invalid resource or issuer URL');
  }
  const pathname = '/.well-known/oauth-protected-resource/mcp';
  return function resourceMetadata(req, res) {
    if (req.url?.split('?')[0] !== pathname) {
      res.writeHead(404); return res.end();
    }
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' }); return res.end();
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({
      resource: resourceUrl,
      authorization_servers: [issuer.toString()],
      scopes_supported: ['wayglass:constellation', 'wayglass:bluebird'],
      bearer_methods_supported: ['header'],
    }));
  };
}

module.exports = { makeProtectedResourceMetadataHandler };
