'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const LEDGER_SCHEMA = 'wayglass.observer-self-development-ledger/v0.1';

function text(value, max = 4000) { return String(value ?? '').trim().slice(0, max); }

function readJson(filename) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (parsed?.schema === LEDGER_SCHEMA && Array.isArray(parsed.proposals)) return parsed;
  } catch {}
  return { schema: LEDGER_SCHEMA, proposals: [], updated_at: null };
}

function writeAtomic(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temp = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, filename);
}

function createObserverSelfDevelopmentLedger({
  filename = path.join(__dirname, '..', 'data', 'wayglass-observer-self-development.local.json'),
  now = () => new Date().toISOString(),
} = {}) {
  function list() { return readJson(filename).proposals; }

  function ingest(input = {}) {
    const id = text(input.proposal_id, 220);
    if (!id || !text(input.title, 400) || !text(input.acceptance_test, 3000)) {
      throw new Error('Self-development proposal requires proposal_id, title, and acceptance_test.');
    }
    const ledger = readJson(filename);
    const existing = ledger.proposals.find(item => item.proposal_id === id);
    if (existing) return existing;

    const proposal = {
      schema: 'wayglass.observer-self-development/v0.1',
      proposal_id: id,
      key: text(input.key, 160),
      title: text(input.title, 400),
      question: text(input.question, 2000),
      desired_change: text(input.desired_change, 4000),
      acceptance_test: text(input.acceptance_test, 4000),
      source: text(input.source, 240) || 'living-observer-private-interior',
      status: 'queued',
      created_at: text(input.created_at, 80) || now(),
      queued_at: now(),
      review: null,
    };
    ledger.proposals.push(proposal);
    ledger.updated_at = now();
    writeAtomic(filename, ledger);
    return proposal;
  }

  function review(id, decision, notes = '') {
    if (!['approve-for-build', 'reject', 'keep-open'].includes(decision)) throw new Error('Unsupported review decision.');
    const ledger = readJson(filename);
    const proposal = ledger.proposals.find(item => item.proposal_id === id);
    if (!proposal) throw new Error('Unknown self-development proposal.');
    proposal.status = decision;
    proposal.review = { decision, notes: text(notes, 2000), reviewed_at: now() };
    ledger.updated_at = now();
    writeAtomic(filename, ledger);
    return proposal;
  }

  return Object.freeze({ list, ingest, review });
}

function createObserverSelfDevelopmentRouter(options = {}) {
  const router = express.Router();
  const ledger = options.ledger || createObserverSelfDevelopmentLedger(options);

  router.get('/proposals', (_req, res) => res.json({
    schema: LEDGER_SCHEMA,
    proposals: ledger.list(),
  }));
  router.post('/proposals', (req, res) => {
    try { return res.status(201).json(ledger.ingest(req.body || {})); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  });
  router.post('/proposals/:id/review', (req, res) => {
    try { return res.status(201).json(ledger.review(req.params.id, req.body?.decision, req.body?.notes)); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  });
  return router;
}

module.exports = { LEDGER_SCHEMA, createObserverSelfDevelopmentLedger, createObserverSelfDevelopmentRouter };
