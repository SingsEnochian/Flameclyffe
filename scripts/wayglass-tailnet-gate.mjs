// Wayglass Tailnet Gate: intentionally tiny, localhost-only reverse proxy.
// Tailscale Serve terminates HTTPS and connects to this gateway on loopback.
// Never use Tailscale Funnel or advertise Ollama's port 11434.
import http from 'node:http';

export const TAILNET_GATE_PORT = 32861;
export const HOST_PORT = 3000;

export function allowedWayglassPath(url) {
  let pathname;
  try { pathname = new URL(url, 'http://127.0.0.1').pathname; }
  catch { return false; }
  return pathname === '/wayglass' || pathname.startsWith('/wayglass/')
    || pathname === '/api/v1/wayglass' || pathname.startsWith('/api/v1/wayglass/')
    || pathname === '/api/v1/house/session' || pathname.startsWith('/api/v1/house/session/');
}

export function createTailnetGate({ port = TAILNET_GATE_PORT, hostPort = HOST_PORT, httpModule = http } = {}) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new TypeError('Invalid tailnet gate port');
  const gateway = httpModule.createServer((req, res) => {
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
      if (/^(tailscale-|ts-|x-forwarded-|forwarded$|x-real-ip$)/i.test(key)) delete headers[key];
    }
    // Do not confer steward authority based on gateway headers. Host requires
    // its own signed House session, whether accessed locally or via the tailnet.
    headers.host = '127.0.0.1:' + hostPort;
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
      outHeaders['cache-control'] = outHeaders['cache-control'] || 'no-store';
      res.writeHead(response.statusCode || 502, outHeaders);
      response.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy(new Error('Wayglass host timed out')));
    upstream.on('error', () => {
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
