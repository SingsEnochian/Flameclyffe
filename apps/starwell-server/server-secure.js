'use strict';

const http = require('node:http');
const originalCors = require('cors');
const originalExpress = require('express');
const { localCorsOptions } = require('./security/local-boundary');
const { createLegacyMemberChatHandler } = require('./bifrost/legacy-chat-adapter');
const { createLegacyModelStatusHandler } = require('./bifrost/legacy-model-status');

const corsPath = require.resolve('cors');
const expressPath = require.resolve('express');
const originalListen = http.Server.prototype.listen;

// server.js predates the desktop boundary. Keep its routes intact while
// replacing permissive CORS with an explicit localhost allow-list.
require.cache[corsPath].exports = function hardenedCors(options = {}) {
  return originalCors({
    ...options,
    ...localCorsOptions(process.env),
  });
};

function hardenedExpress(...args) {
  const app = originalExpress(...args);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), serial=()');
    if (req.path?.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Compatibility bridge: server.js still contains historical /api/chat and
  // /api/model-status handlers backed by a stale MEMBER_CONFIGS provider map.
  // Under the secure desktop entrypoint these earlier routes own the paths and
  // delegate identity/model authority to Bifröst/Flame instead. The later
  // historical handlers remain unreachable unless server-secure.js is bypassed.
  app.post(
    '/api/chat',
    originalExpress.json({ limit: '1mb' }),
    createLegacyMemberChatHandler()
  );
  app.get('/api/model-status', createLegacyModelStatusHandler());

  return app;
}
for (const key of Reflect.ownKeys(originalExpress)) {
  if (key === 'length' || key === 'name' || key === 'prototype') continue;
  Object.defineProperty(hardenedExpress, key, Object.getOwnPropertyDescriptor(originalExpress, key));
}
require.cache[expressPath].exports = hardenedExpress;

// Express calls listen(PORT, callback), which otherwise binds every network
// interface. Insert the loopback host unless a host was explicitly supplied.
http.Server.prototype.listen = function loopbackListen(...args) {
  const hasOptionsObject = args[0] && typeof args[0] === 'object';
  const hasHostString = typeof args[1] === 'string';
  if (hasOptionsObject) {
    args[0] = { ...args[0], host: args[0].host || '127.0.0.1' };
  } else if (!hasHostString) {
    args.splice(1, 0, '127.0.0.1');
  }
  return originalListen.apply(this, args);
};

try {
  require('./server');
} finally {
  http.Server.prototype.listen = originalListen;
  require.cache[corsPath].exports = originalCors;
  require.cache[expressPath].exports = originalExpress;
}
