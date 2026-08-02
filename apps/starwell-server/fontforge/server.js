'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const {
  isAllowedLocalOrigin,
  localCorsOptions,
} = require('../security/local-boundary');
const {
  compileFontProject,
  detectFontForge,
} = require('./worker');

const app = express();
const PORT = Number(process.env.FONTFORGE_PORT || 3842);
const HOST = '127.0.0.1';
const dataDir = process.env.HEARTHGATE_DATA_DIR || path.join(__dirname, '..', 'data');
const jobsRoot = path.join(dataDir, 'fontforge-jobs');
let cachedStatus = null;
let statusCheckedAt = 0;

app.disable('x-powered-by');
app.use((req, res, next) => {
  if (
    req.headers['access-control-request-private-network'] === 'true'
    && isAllowedLocalOrigin(req.headers.origin, process.env)
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(cors({
  ...localCorsOptions(process.env),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '25mb' }));

function currentStatus(force = false) {
  const now = Date.now();
  if (force || !cachedStatus || now - statusCheckedAt > 30000) {
    cachedStatus = detectFontForge();
    statusCheckedAt = now;
  }
  return cachedStatus;
}

function validJobId(value) {
  return /^[a-z0-9-]{20,120}$/i.test(String(value || ''));
}

function fileRecord(jobId, file) {
  return {
    ...file,
    url: `/api/fontforge/jobs/${encodeURIComponent(jobId)}/files/${encodeURIComponent(file.name)}`,
  };
}

app.get('/api/fontforge/status', (_req, res) => {
  const worker = currentStatus(true);
  res.json({
    ok: true,
    service: 'STARWELL FontForge Worker',
    mode: worker.available ? 'compile-ready' : 'package-only',
    worker,
    dataDir,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/fontforge/compile', async (req, res) => {
  try {
    const project = req.body?.project;
    const options = req.body?.options || {};
    const worker = currentStatus();
    const result = await compileFontProject({ project, options, dataDir, workerStatus: worker });
    const files = (result.files || result.receipt?.files || []).map((file) => fileRecord(result.jobId, file));
    const payload = {
      ok: result.ok,
      jobId: result.jobId,
      worker,
      job: result.job,
      receipt: result.receipt,
      files,
      manifestUrl: `/api/fontforge/jobs/${encodeURIComponent(result.jobId)}/files/fontforge-job.json`,
      receiptUrl: `/api/fontforge/jobs/${encodeURIComponent(result.jobId)}/files/fontforge-receipt.json`,
    };
    res.status(result.ok ? 200 : worker.available ? 422 : 503).json(payload);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/fontforge/jobs/:jobId/files/:fileName', async (req, res) => {
  const { jobId, fileName } = req.params;
  if (!validJobId(jobId)) return res.status(400).json({ error: 'Invalid job id.' });
  const safeName = path.basename(fileName);
  if (safeName !== fileName || !safeName) return res.status(400).json({ error: 'Invalid file name.' });
  const jobDir = path.join(jobsRoot, jobId);
  const filePath = path.join(jobDir, safeName);
  if (!filePath.startsWith(`${jobDir}${path.sep}`)) return res.status(400).json({ error: 'Invalid file path.' });
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
    res.download(filePath, safeName);
  } catch {
    res.status(404).json({ error: 'Compile file not found.' });
  }
});

app.get('/health', (_req, res) => {
  const worker = currentStatus();
  res.json({ ok: true, workerAvailable: worker.available, timestamp: new Date().toISOString() });
});

if (require.main === module) {
  fs.mkdirSync(jobsRoot, { recursive: true });
  app.listen(PORT, HOST, () => {
    const status = currentStatus(true);
    console.log(`[FontForge] local worker listening on http://${HOST}:${PORT}`);
    console.log(`[FontForge] ${status.available ? status.version : status.reason}`);
  });
}

module.exports = { app, currentStatus };
