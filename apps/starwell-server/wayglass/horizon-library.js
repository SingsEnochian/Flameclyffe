'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const express = require('express');

const SEED_SCHEMA = 'universal-horizon.seed/v0.1';
const STATE_SCHEMA = 'universal-horizon.local-state/v0.1';
const RECORD_SCHEMA = 'universal-horizon.record/v0.1';
const PROPOSAL_SCHEMA = 'universal-horizon.relationship-proposal/v0.1';
const REVIEW_SCHEMA = 'universal-horizon.relationship-review/v0.1';
const WONDER_SCHEMA = 'universal-horizon.counterfactual-wonder/v0.1';

const CLAIM_TYPES = new Set([
  'observation', 'measurement', 'experiment', 'finding', 'hypothesis',
  'interpretation', 'simulation', 'myth', 'fiction', 'analogy',
  'speculation', 'counterfactual-wonder', 'architecture', 'unknown',
]);

const RELATION_TYPES = new Set([
  'supports', 'contradicts', 'replicates', 'extends', 'cites',
  'derived-from', 'structural-analogy', 'shares-pattern', 'related',
]);

function text(value, max = 6000) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanList(value, max = 64) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => text(item, 500)).filter(Boolean))].slice(0, max);
}

function readJson(filename, fallback) {
  try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch { return fallback; }
}

function writeJsonAtomic(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temp = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, filename);
}

function validateRecord(record) {
  if (!record || record.schema !== RECORD_SCHEMA) throw new Error('Horizon seed contains an invalid record schema.');
  if (!text(record.id, 180) || !text(record.title, 300)) throw new Error('Horizon record requires id and title.');
  if (!CLAIM_TYPES.has(record.claim_type)) throw new Error(`Unsupported Horizon claim type: ${record.claim_type}`);
  return Object.freeze({
    schema: RECORD_SCHEMA,
    id: text(record.id, 180),
    title: text(record.title, 300),
    domain: text(record.domain, 120) || 'general',
    record_type: text(record.record_type, 120) || 'note',
    claim_type: record.claim_type,
    status: text(record.status, 80) || 'seed',
    contributor: text(record.contributor, 240) || 'unknown',
    summary: text(record.summary, 6000),
    tags: cleanList(record.tags, 32),
    source_refs: cleanList(record.source_refs, 32),
    evidence_refs: cleanList(record.evidence_refs, 32),
    unresolved_questions: cleanList(record.unresolved_questions, 32),
    created_at: text(record.created_at, 80) || null,
  });
}

function createUniversalHorizonLibrary({
  seedPath = path.join(__dirname, '..', 'data', 'universal-horizon-seed.v0.1.json'),
  statePath = path.join(__dirname, '..', 'data', 'universal-horizon.local.json'),
  now = () => new Date().toISOString(),
  idFactory = () => randomUUID(),
} = {}) {
  const seed = readJson(seedPath, { schema: SEED_SCHEMA, records: [] });
  if (seed.schema !== SEED_SCHEMA || !Array.isArray(seed.records)) throw new Error('Universal Horizon seed is invalid.');
  const records = seed.records.map(validateRecord);
  const byId = new Map(records.map(record => [record.id, record]));

  function loadState() {
    const state = readJson(statePath, { schema: STATE_SCHEMA, proposals: [], reviews: [], wonders: [] });
    if (state.schema !== STATE_SCHEMA || !Array.isArray(state.proposals) || !Array.isArray(state.reviews)) {
      return { schema: STATE_SCHEMA, proposals: [], reviews: [], wonders: [] };
    }
    if (!Array.isArray(state.wonders)) state.wonders = [];
    return state;
  }

  function saveState(state) {
    const next = {
      schema: STATE_SCHEMA,
      updated_at: now(),
      proposals: state.proposals,
      reviews: state.reviews,
      wonders: state.wonders || [],
    };
    writeJsonAtomic(statePath, next);
    return next;
  }

  function search({ q = '', claim_type = '', record_type = '', limit = 20 } = {}) {
    const query = text(q, 500).toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const bounded = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtered = records
      .filter(record => !claim_type || record.claim_type === claim_type)
      .filter(record => !record_type || record.record_type === record_type)
      .map(record => {
        const haystack = [
          record.title, record.summary, record.domain, record.record_type,
          record.claim_type, ...record.tags, ...record.unresolved_questions,
        ].join(' ').toLowerCase();
        const score = terms.length
          ? terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
          : 1;
        return { record, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
      .slice(0, bounded)
      .map(item => item.record);

    return {
      schema: 'universal-horizon.search-result/v0.1',
      query: query || null,
      count: filtered.length,
      records: filtered,
    };
  }

  function getRecord(id) {
    return byId.get(text(id, 180)) || null;
  }

  function listWonders({ status = '' } = {}) {
    const state = loadState();
    return state.wonders.filter(item => !status || item.status === status);
  }

  function createWonder(input = {}) {
    const proposition = text(input.proposition, 3000);
    if (!proposition) throw new Error('Counterfactual Wonder requires a proposition.');

    const wonder = {
      schema: WONDER_SCHEMA,
      wonder_id: 'uhw:' + idFactory(),
      proposition,
      stance: {
        could_be_false: true,
        explore_as_if_true: true,
        promoted_to_fact: false,
      },
      why_interesting: text(input.why_interesting, 4000),
      implications: cleanList(input.implications, 64),
      predictions: cleanList(input.predictions, 64),
      discriminators: cleanList(input.discriminators, 64),
      counterexamples: cleanList(input.counterexamples, 64),
      source_refs: cleanList(input.source_refs, 64),
      created_by: text(input.created_by, 240) || 'unspecified',
      status: 'open',
      created_at: now(),
    };

    const state = loadState();
    state.wonders.push(wonder);
    saveState(state);
    return wonder;
  }

  function listProposals({ status = '' } = {}) {
    const state = loadState();
    return state.proposals.filter(proposal => !status || proposal.status === status);
  }

  function propose(input = {}) {
    const fromId = text(input.from_id, 180);
    const toId = text(input.to_id, 180);
    const relationType = text(input.relation_type, 80);
    if (!byId.has(fromId) || !byId.has(toId)) throw new Error('Relationship proposal must reference two existing Horizon records.');
    if (fromId === toId) throw new Error('Relationship proposal requires two distinct records.');
    if (!RELATION_TYPES.has(relationType)) throw new Error('Unsupported Horizon relationship type.');
    const summary = text(input.summary, 3000);
    if (!summary) throw new Error('Relationship proposal summary required.');

    const proposal = {
      schema: PROPOSAL_SCHEMA,
      proposal_id: 'uhp:' + idFactory(),
      from_id: fromId,
      to_id: toId,
      relation_type: relationType,
      summary,
      proposer: text(input.proposer, 240) || 'unspecified',
      evidence_refs: cleanList(input.evidence_refs, 32),
      claim_type: relationType === 'structural-analogy' || relationType === 'shares-pattern' ? 'analogy' : 'interpretation',
      status: 'pending',
      created_at: now(),
      reviewed_at: null,
      latest_review_id: null,
    };
    const state = loadState();
    state.proposals.push(proposal);
    saveState(state);
    return proposal;
  }

  function review(input = {}) {
    const proposalId = text(input.proposal_id, 220);
    const decision = text(input.decision, 80);
    if (!['accept', 'reject', 'keep-open'].includes(decision)) throw new Error('Review decision must be accept, reject, or keep-open.');
    const state = loadState();
    const proposal = state.proposals.find(item => item.proposal_id === proposalId);
    if (!proposal) throw new Error('Unknown Horizon relationship proposal.');

    const review = {
      schema: REVIEW_SCHEMA,
      review_id: 'uhr:' + idFactory(),
      proposal_id: proposalId,
      decision,
      reviewer: text(input.reviewer, 240) || 'unspecified',
      notes: text(input.notes, 3000),
      evidence_refs: cleanList(input.evidence_refs, 32),
      reviewed_at: now(),
    };
    state.reviews.push(review);
    proposal.status = decision === 'accept' ? 'accepted' : decision === 'reject' ? 'rejected' : 'keep-open';
    proposal.reviewed_at = review.reviewed_at;
    proposal.latest_review_id = review.review_id;
    saveState(state);
    return { proposal, review };
  }

  function graph() {
    const state = loadState();
    return {
      schema: 'universal-horizon.graph/v0.1',
      records,
      accepted_relationships: state.proposals.filter(item => item.status === 'accepted'),
      open_relationships: state.proposals.filter(item => item.status === 'pending' || item.status === 'keep-open'),
      counterfactual_wonders: state.wonders,
    };
  }

  function status() {
    const state = loadState();
    return {
      schema: 'universal-horizon.status/v0.1',
      records: records.length,
      proposals: state.proposals.length,
      accepted_relationships: state.proposals.filter(item => item.status === 'accepted').length,
      open_relationships: state.proposals.filter(item => item.status === 'pending' || item.status === 'keep-open').length,
      open_wonders: state.wonders.filter(item => item.status === 'open').length,
      source_of_truth: 'seed records + explicit reviewed proposals',
      mutation_boundary: 'relationship review never rewrites source records',
    };
  }

  return Object.freeze({ search, getRecord, propose, review, listProposals, createWonder, listWonders, graph, status });
}

function createUniversalHorizonRouter(options = {}) {
  const router = express.Router();
  const library = options.library || createUniversalHorizonLibrary(options);

  router.get('/status', (_req, res) => res.json(library.status()));
  router.get('/search', (req, res) => res.json(library.search(req.query || {})));
  router.get('/records/:id', (req, res) => {
    const record = library.getRecord(req.params.id);
    return record ? res.json(record) : res.status(404).json({ error: 'Unknown Horizon record.' });
  });
  router.get('/proposals', (req, res) => res.json({
    schema: 'universal-horizon.proposal-list/v0.1',
    proposals: library.listProposals({ status: text(req.query.status, 80) }),
  }));
  router.get('/wonder', (req, res) => res.json({
    schema: 'universal-horizon.counterfactual-wonder-list/v0.1',
    wonders: library.listWonders({ status: text(req.query.status, 80) }),
  }));
  router.post('/wonder', (req, res) => {
    try { return res.status(201).json(library.createWonder(req.body || {})); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  });
  router.get('/graph', (_req, res) => res.json(library.graph()));
  router.post('/proposals', (req, res) => {
    try { return res.status(201).json(library.propose(req.body || {})); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  });
  router.post('/reviews', (req, res) => {
    try { return res.status(201).json(library.review(req.body || {})); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  });

  return router;
}

module.exports = {
  SEED_SCHEMA, STATE_SCHEMA, RECORD_SCHEMA, PROPOSAL_SCHEMA, REVIEW_SCHEMA, WONDER_SCHEMA,
  CLAIM_TYPES, RELATION_TYPES,
  createUniversalHorizonLibrary, createUniversalHorizonRouter,
};
