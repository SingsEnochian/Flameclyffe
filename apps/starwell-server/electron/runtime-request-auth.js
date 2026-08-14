'use strict';

function runtimeAuthorizationUrls(port = 3841) {
  const origins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
  return origins.flatMap((origin) => [
    `${origin}/api/v1/flames/*`,
    `${origin}/api/v1/bifrost/ignition/*`,
    `${origin}/api/chat*`,
  ]);
}

function shouldAttachRuntimeAuthorization(url, port = 3841) {
  let parsed;
  try { parsed = new URL(String(url || '')); } catch { return false; }
  const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
  if (parsed.protocol !== 'http:' || !allowedHosts.has(parsed.host)) return false;
  return parsed.pathname === '/api/chat'
    || parsed.pathname.startsWith('/api/v1/flames/')
    || parsed.pathname.startsWith('/api/v1/bifrost/ignition/');
}

function attachRuntimeAuthorization(headers = {}, token = '') {
  const value = String(token || '').trim();
  if (!value) return { ...headers };
  return {
    ...headers,
    Authorization: `Bearer ${value}`,
  };
}

module.exports = {
  runtimeAuthorizationUrls,
  shouldAttachRuntimeAuthorization,
  attachRuntimeAuthorization,
};
