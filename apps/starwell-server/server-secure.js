'use strict';

const http = require('node:http');
const originalCors = require('cors');
const { localCorsOptions } = require('./security/local-boundary');

const corsPath = require.resolve('cors');
const originalListen = http.Server.prototype.listen;

// server.js predates the desktop boundary. Keep its routes intact while
// replacing permissive CORS with an explicit localhost allow-list.
require.cache[corsPath].exports = function hardenedCors(options = {}) {
  return originalCors({
    ...options,
    ...localCorsOptions(process.env),
  });
};

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
}
