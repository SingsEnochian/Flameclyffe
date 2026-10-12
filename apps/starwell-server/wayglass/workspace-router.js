'use strict';

const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { createWorkspaceArtifacts } = require('./workspace-artifacts');
const { enterWorkspace } = require('./crew-workspaces');

function createWorkspaceRouter({ env = process.env, artifacts = createWorkspaceArtifacts() } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const configured = env.WAYGLASS_CODEX_ACCESS_TOKEN;
    const supplied = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!configured || Buffer.byteLength(configured) < 32 || configured === env.WAYGLASS_RARITY_ACCESS_TOKEN || !supplied || Buffer.byteLength(configured) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(configured), Buffer.from(supplied))) {
      return res.status(401).json({ error: 'Authenticated Codex workspace entrance required.' });
    }
    next();
  });
  function action(res, call) {
    try { res.json(call()); } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
  }
  router.get('/:workspace_id/:project_id', (req, res) => action(res, () => artifacts.inspect(req.params, 'codex')));
  router.post('/:workspace_id/enter', (req, res) => action(res, () => enterWorkspace({ workspace_id: req.params.workspace_id, participant_id: 'codex' })));
  router.post('/:workspace_id/:project_id/artifacts', (req, res) => action(res, () => artifacts.writeArtifact({ ...req.body, ...req.params }, 'codex')));
  router.post('/:workspace_id/:project_id/handoff', (req, res) => action(res, () => artifacts.handoff({ ...req.body, ...req.params }, 'codex')));
  return router;
}

module.exports = { createWorkspaceRouter };
