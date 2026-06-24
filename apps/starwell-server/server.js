import express from 'express';
import cors from 'cors';

import { developerRouter } from './src/routes/developer.routes.js';
import { patchRouter } from './src/routes/patch.routes.js';
import { memoryRouter } from './src/routes/memory.routes.js';
import { portalKernelRouter } from './src/routes/portal-kernel.routes.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function localOnly(req, res, next) {
  const remoteAddress = req.socket.remoteAddress;

  const isLocal =
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress === '::ffff:127.0.0.1';

  if (!isLocal) {
    return res.status(403).json({
      ok: false,
      error: 'Local-only workbench refused non-local request',
    });
  }

  return next();
}

app.disable('x-powered-by');
app.use(localOnly);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed: ${origin}`));
  },
}));

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    status: 'ok',
    service: 'starwell-yggdrasil-workbench',
    localOnly: true,
  });
});

app.use('/api/v1/developer', developerRouter);
app.use('/api/v1/patches', patchRouter);
app.use('/api/v1/memory', memoryRouter);
app.use('/api/v1/kernel', portalKernelRouter);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Door not built yet',
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  console.error(`[🚨 SERVER ERROR]: ${err.message}`);

  res.status(500).json({
    ok: false,
    error: 'Internal system fault',
    details: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[🌲 YGGDRASIL WORKBENCH]: Active on http://127.0.0.1:${PORT}`);
});
