'use strict';

const express = require('express');
const { catalogue, compileSelection } = require('../../../lib/wayglass-source-loom.cjs');

const router = express.Router();
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.get('/', (_req, res) => {
  return res.json(catalogue());
});

router.post('/compile', (req, res) => {
  try {
    const compiled = compileSelection({
      source_ids: req.body?.source_ids ?? [],
      consent: req.body?.consent === true,
    });
    return res.json({
      schema: 'wayglass.source-loom-selection/v0.1',
      receipt: compiled.receipt,
      reference_text: compiled.reference_text,
      mode: 'reference-pointers-not-source-content',
      context_committed_to_model: false,
    });
  } catch (error) {
    return res.status(400).json({
      schema: 'wayglass.source-loom-selection-error/v0.1',
      error: error.message,
    });
  }
});

module.exports = router;
