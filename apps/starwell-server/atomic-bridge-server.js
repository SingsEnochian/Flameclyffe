'use strict';

const express = require('express');
const registerAtomicEngineRoutes = require('./routes/atomic-engine.routes');

const app = express();
const host = process.env.ATOMIC_BRIDGE_HOST || '127.0.0.1';
const port = Number(process.env.ATOMIC_BRIDGE_PORT || 31337);

if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.ATOMIC_BRIDGE_ALLOW_LAN !== 'true') {
  throw new Error('Atomic bridge host must remain loopback unless ATOMIC_BRIDGE_ALLOW_LAN=true is explicit.');
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('ATOMIC_BRIDGE_PORT must be an integer between 1024 and 65535.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));
registerAtomicEngineRoutes(app);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'hearthgate-atomic-bridge',
    upstream: process.env.ATOMIC_CHAT_BASE_URL || 'http://127.0.0.1:1337/v1',
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(port, host, () => {
  console.log(`[atomic-bridge] listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[atomic-bridge] ${signal}; closing.`);
  server.close((error) => {
    if (error) {
      console.error('[atomic-bridge] close failed:', error.message);
      process.exitCode = 1;
    }
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
