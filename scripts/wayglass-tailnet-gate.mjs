// Wayglass Tailnet Gate: intentionally tiny, localhost-only reverse proxy.
// Tailscale Serve and the Cloudflare Tunnel both connect over loopback.
// Never use Tailscale Funnel or advertise Ollama's port 11434.
import http from 'node:http';
import houseAccess from '../apps/starwell-server/wayglass/house-access.js';

const publicHost = 'wayglass.world';

export const TAILNET_GATE_PORT = 32861;
export const HOST_PORT = 3000;

export function allowedWayglassPath(url) {
  // Origin-form requests only. An absolute upstream URL must never be
  // interpreted as a local allowlisted path.
  if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//')||/[\\\r\n\0]/.test(url)) return false;
  // Reject encoded separators, dot segments and ambiguous path decoding before
  // forwarding the ORIGINAL request target to the upstream HTTP server.
  const rawPath=url.split('?')[0];
  if(/%(?:2f|5c|2e|00|0a|0d|25)/i.test(rawPath)) return false;
  if(rawPath.split('/').some(part=>part==='.'||part==='..')) return false;
  let pathname;
  try { pathname = new URL(url, 'http://127.0.0.1').pathname; }
  catch { return false; }
  return pathname === '/wayglass' || pathname.startsWith('/wayglass/')
    || pathname === '/api/v1/wayglass' || pathname.startsWith('/api/v1/wayglass/')
    || pathname === '/api/v1/house/session' || pathname.startsWith('/api/v1/house/session/');
}

export function createTailnetGate({ port = TAILNET_GATE_PORT, hostPort = HOST_PORT, httpModule = http, environment = process.env, createVerifier = houseAccess.createAccessVerifier } = {}) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new TypeError('Invalid tailnet gate port');
  if (!Number.isSafeInteger(hostPort) || hostPort < 1024 || hostPort > 65535 || hostPort === port) throw new TypeError('Invalid Wayglass host port');
  const access = houseAccess.accessConfiguration(environment);
  const verifyOwner = access?.origin === 'https://' + publicHost ? createVerifier(access) : null;
  const gateway = httpModule.createServer(async (req, res) => {
    const isPublic = req.headers.host?.toLowerCase() === publicHost;
    if (isPublic) {
      let owner;
      try {
        owner = await verifyOwner?.(req.headers['cf-access-jwt-assertion']);
      } catch {
        // A signing-key outage must also deny the request.
      }
      if (!owner) {
        res.writeHead(401, { 'Cache-Control': 'no-store', 'X-Wayglass-Access-Gate': verifyOwner ? 'enabled' : 'disabled' });
        res.end();
        return;
      }
    }
    const path = String(req.url || '/');
    if (path === '/') {
      res.writeHead(302, { Location:'/wayglass/', 'Cache-Control':'no-store' });
      res.end();
      return;
    }
    if (!allowedWayglassPath(path)) {
      res.writeHead(404, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
      res.end(JSON.stringify({ error:'Route not in the Wayglass private remote gateway' }));
      return;
    }
    const headers = { ...req.headers };
    for (const key of Object.keys(headers)) {
      if (/^(tailscale-|ts-|x-forwarded-|forwarded$|x-real-ip$)/i.test(key) ||
          (key.startsWith('cf-') && !(isPublic && key === 'cf-access-jwt-assertion'))) delete headers[key];
    }
    // Do not confer steward authority based on gateway headers. Host requires
    // its own signed House session, whether accessed locally or via the tailnet.
    const trustedOrigin = String(environment.WAYGLASS_TAILNET_ORIGIN || '');
    let trustedHost = '';
    try {
      const parsed = new URL(trustedOrigin);
      if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.ts.net')
        && !parsed.port && !parsed.username && !parsed.password && parsed.pathname === '/')
        trustedHost = parsed.host;
    } catch {}
    // This hostname is pinned by the local launcher after examining the
    // authenticated Tailscale CLI status; never accept the request's Host as
    // authorization. The host uses it only to issue Secure __Host cookies.
    headers.host = isPublic ? publicHost : (trustedHost || ('127.0.0.1:' + hostPort));
    headers['x-wayglass-tailnet-gate'] = 'localhost-proxy-not-authorization';
    const upstream = httpModule.request({
      hostname:'127.0.0.1', port:hostPort, method:req.method, path, headers,
      timeout:120000,
    }, response => {
      const outHeaders = { ...response.headers };
      // HTTPS is terminated by Tailscale Serve. Strict secure session cookies
      // must not be downgraded because the internal hop is plain HTTP.
      if (Array.isArray(outHeaders['set-cookie'])) {
        outHeaders['set-cookie'] = outHeaders['set-cookie'].map(cookie =>
          /;\s*secure(?:;|$)/i.test(cookie) ? cookie : cookie + '; Secure');
      }
      outHeaders['cache-control'] = isPublic ? 'private, no-store' : (outHeaders['cache-control'] || 'no-store');
      res.writeHead(response.statusCode || 502, outHeaders);
      response.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy(new Error('Wayglass host timed out')));
    res.once('close', () => {
      if (!res.writableFinished) upstream.destroy();
    });
    upstream.on('error', () => {
      if (res.destroyed) return;
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ error:'Local Wayglass host is unavailable' }));
      } else res.destroy();
    });
    req.pipe(upstream);
  });
  gateway.on('clientError', (_err, socket) => socket.destroy());
  return Object.freeze({
    listen: () => new Promise((resolve,reject) => {
      gateway.once('error', reject);
      gateway.listen(port,'127.0.0.1',()=>{
        gateway.off('error',reject);
        resolve({host:'127.0.0.1',port});
      });
    }),
    close: () => new Promise(resolve => gateway.close(resolve)),
    server: gateway,
  });
}
