'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const registerObserverScoopRoutes = require('./routes/observer-scoop.routes');

const app = express();
const HOST = '127.0.0.1';
const PORT = Number(process.env.OBSERVER_PORT || 3001);
const dataDir = process.env.HEARTHGATE_DATA_DIR || path.join(__dirname, 'data');
const LOCAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || LOCAL_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not permitted to access the local Observer API'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['content-type'],
  credentials: false,
  maxAge: 600,
}));
app.use(express.json({ limit: '128kb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'veil-observatory-loopback-api',
    host: HOST,
    port: PORT,
    storage_credentials_present: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    ),
    timestamp: new Date().toISOString(),
  });
});

registerObserverScoopRoutes(app, dataDir);

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : String(error);
  const status = /Origin is not permitted/.test(message) ? 403 : 500;
  res.status(status).json({ ok: false, error: message });
});

app.listen(PORT, HOST, () => {
  console.log(`[Veil Observatory] loopback API listening on http://${HOST}:${PORT}`);
});
