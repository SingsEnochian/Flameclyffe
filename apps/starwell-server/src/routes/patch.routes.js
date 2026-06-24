import { randomUUID } from 'node:crypto';
import { Router } from 'express';

export const patchRouter = Router();

const patchTrayMemory = [];

const allowedStatuses = new Set([
  'pending_review',
  'approved_for_test',
  'tested',
  'blocked',
  'archived',
]);

function sanitizePatchPayload(body) {
  const {
    title,
    filesTouched,
    details = '',
    codeDraft = '',
    source = 'manual',
    advisor = null,
  } = body;

  if (!title || typeof title !== 'string') {
    return { error: 'Missing patch title.' };
  }

  if (!Array.isArray(filesTouched) || filesTouched.length === 0) {
    return { error: 'filesTouched must be a non-empty array.' };
  }

  const cleanFiles = filesTouched
    .filter((filePath) => typeof filePath === 'string')
    .map((filePath) => filePath.trim())
    .filter(Boolean);

  if (cleanFiles.length === 0) {
    return { error: 'filesTouched must include at least one valid file path.' };
  }

  const now = new Date().toISOString();

  return {
    patch: {
      id: `patch-${randomUUID()}`,
      title: title.trim(),
      filesTouched: cleanFiles,
      details: String(details).slice(0, 8000),
      codeDraft: String(codeDraft).slice(0, 50000),
      source,
      advisor,
      status: 'pending_review',
      riskLevel: 'medium',
      reviewRequired: true,
      writeAllowed: false,
      stagedAt: now,
      updatedAt: now,
      ledger: [
        {
          kind: 'staged_patch',
          at: now,
          actor: advisor || 'developer-workbench',
          note: 'Patch staged for human review. No files were written.',
        },
      ],
    },
  };
}

patchRouter.get('/tray', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    patches: patchTrayMemory,
    guardrails: {
      localOnly: true,
      writeAllowed: false,
      humanReviewRequired: true,
      noDiskWritesFromThisRoute: true,
    },
  });
});

patchRouter.post('/stage', (req, res) => {
  const result = sanitizePatchPayload(req.body);

  if (result.error) {
    return res.status(400).json({ ok: false, error: result.error });
  }

  patchTrayMemory.push(result.patch);
  console.log(`[📝 PATCH TRAY]: Patch staged for review: ${result.patch.title}`);

  return res.status(201).json({
    ok: true,
    message: 'Patch staged for human review. No files were written.',
    patchId: result.patch.id,
    status: result.patch.status,
  });
});

patchRouter.post('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note = '' } = req.body;

  if (!allowedStatuses.has(status)) {
    return res.status(400).json({
      ok: false,
      error: 'Unsupported patch status.',
      allowedStatuses: [...allowedStatuses],
    });
  }

  const patch = patchTrayMemory.find((entry) => entry.id === id);

  if (!patch) {
    return res.status(404).json({ ok: false, error: 'Staged patch target not found.' });
  }

  patch.status = status;
  patch.updatedAt = new Date().toISOString();
  patch.ledger.push({
    kind: 'patch_status_updated',
    at: patch.updatedAt,
    actor: 'developer-workbench',
    status,
    note: String(note).slice(0, 2000),
  });

  console.log(`[🧾 PATCH TRAY]: Patch ${id} marked ${status}.`);

  return res.status(200).json({
    ok: true,
    message: 'Patch status updated. No files were written.',
    patch,
  });
});
