import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildCanonicalAppendBlock,
  buildIngestionScan,
  validateCanonicalTarget,
} from '../memory/ingestion/rootguard-scan.js';
import { appendAuditLog, readAuditLog } from '../memory/ingestion/audit-log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANONICAL_MEMORY_DIR = path.resolve(__dirname, '../memory/canonical');

export const memoryIngestRouter = Router();

memoryIngestRouter.post('/ingest', async (req, res, next) => {
  try {
    const {
      targetFile,
      sourceLabel = 'manual',
      content = '',
      dryRun = true,
      approved = false,
      approvedBy = 'Rowan',
    } = req.body || {};

    const safeTargetFile = validateCanonicalTarget(targetFile);
    const scan = buildIngestionScan({ content, targetFile: safeTargetFile });

    const auditBase = {
      action: dryRun ? 'dry-run' : 'write-attempt',
      targetFile: safeTargetFile,
      sourceLabel,
      hash: scan.hash,
      bytes: scan.bytes,
      safeToWrite: scan.safeToWrite,
      protectedTarget: scan.protectedTarget,
      promptInjectionCount: scan.promptInjectionFindings.length,
      secretFindingCount: scan.secretFindings.length,
    };

    if (dryRun) {
      await appendAuditLog(auditBase);
      return res.status(200).json({
        status: 'dry-run',
        message: 'Rootguard scan complete. No canonical memory was modified.',
        scan,
      });
    }

    if (!approved) {
      await appendAuditLog({ ...auditBase, action: 'blocked', reason: 'Missing explicit approval.' });
      return res.status(403).json({
        status: 'blocked',
        error: 'Canonical memory writes require approved: true after dry-run review.',
        scan,
      });
    }

    if (!scan.safeToWrite) {
      await appendAuditLog({ ...auditBase, action: 'blocked', reason: 'Rootguard scan failed.' });
      return res.status(400).json({
        status: 'blocked',
        error: 'Rootguard scan failed. Canonical memory was not modified.',
        scan,
      });
    }

    const targetPath = path.join(CANONICAL_MEMORY_DIR, safeTargetFile);
    const appendBlock = buildCanonicalAppendBlock({
      sourceLabel,
      targetFile: safeTargetFile,
      content,
      hash: scan.hash,
      approvedBy,
    });

    await fs.appendFile(targetPath, appendBlock, 'utf-8');

    const readback = await fs.readFile(targetPath, 'utf-8');
    const verified = readback.includes(scan.hash);

    await appendAuditLog({ ...auditBase, action: 'write', approvedBy, verified });

    return res.status(200).json({
      status: 'written',
      message: 'Canonical memory updated and verified by readback.',
      targetFile: safeTargetFile,
      hash: scan.hash,
      verified,
    });
  } catch (err) {
    next(err);
  }
});

memoryIngestRouter.get('/audit', async (_req, res, next) => {
  try {
    const entries = await readAuditLog({ limit: 100 });
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
});
