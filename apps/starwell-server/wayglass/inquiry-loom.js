'use strict';

/** Wayglass Living Inquiry Loom v0.1.
 * Source-labelled, host-attributed *proposal history*, not identity/canon authority.
 * Browser caller fields can never select a participant or grant membership.
 */
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const JOURNAL_SCHEMA = 'wayglass.inquiry-loom.journal/v0.1';
const EVENT_SCHEMA = 'wayglass.inquiry-loom.event/v0.1';
const CONTRIBUTIONS = new Set(['interpretation', 'alternative', 'challenge', 'revision', 'observation', 'new-question', 'experiment', 'outcome']);
const clone = item => JSON.parse(JSON.stringify(item));
const sha = data => createHash('sha256').update(data).digest('hex');

function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function required(value, field, max = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${field} requires 1–${max} characters.`);
  return value.trim();
}
function optional(value, field, max = 2000) {
  if (value === null || value === undefined || value === '') return '';
  return required(value, field, max);
}
function refs(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 16) fail('source_refs requires an array of at most 16 references.');
  return [...new Set(value.map(v => required(v, 'source reference', 220)))];
}
function actorOf(auth) {
  // auth is supplied by host middleware, never parsed from a request body.
  if (!auth || auth.verified !== true) fail('Verified host principal required.', 401);
  return { participant_id: required(auth.participant_id, 'authenticated participant', 80), principal_ref: required(auth.principal_ref, 'authenticated principal ref', 160) };
}
function noClaimedAuthority(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Object payload required.');
  for (const key of ['author', 'actor', 'participant_id', 'principal_ref', 'role', 'identity', 'canon', 'canonical', 'authority', 'status', 'promoted_to_fact', 'promoted_to_canon', 'event_hash', 'previous_hash']) {
    if (Object.hasOwn(body, key)) fail(`Caller may not assign ${key}.`);
  }
}
function loadJournal(filename) {
  let raw;
  try { raw = fs.readFileSync(filename, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const value = JSON.parse(raw);
  if (value.schema !== JOURNAL_SCHEMA || !Array.isArray(value.events) || value.events.length > 10000) fail('Invalid inquiry journal.', 409);
  let previous = null;
  const ids = new Set();
  for (const event of value.events) {
    if (!event || event.schema !== EVENT_SCHEMA || ids.has(event.event_id)) fail('Invalid inquiry event or duplicate id.', 409);
    const { hash, ...body } = event;
    if (body.previous_hash !== previous || sha(JSON.stringify(body)) !== hash) fail('Inquiry journal integrity failure.', 409);
    ids.add(event.event_id);
    previous = hash;
  }
  return value.events;
}
function createInquiryLoom({ directory = path.join(__dirname, '..', 'data', 'wayglass-inquiry-loom.local'), clock = () => new Date(), idFactory = () => randomUUID() } = {}) {
  const file = path.join(directory, 'journal.json');
  function read() { return loadJournal(file); }
  function transaction(fn) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const lockfile = path.join(directory, 'write.lock');
    let lock;
    try { lock = fs.openSync(lockfile, 'wx', 0o600); }
    catch (e) { if (e.code === 'EEXIST') fail('Inquiry journal is busy; retry later.', 409); throw e; }
    try {
      const events = read();
      const value = fn(events);
      const temp = path.join(directory, `${idFactory()}.tmp`);
      try {
        const fd = fs.openSync(temp, 'wx', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify({ schema: JOURNAL_SCHEMA, events })); fs.fsyncSync(fd); }
        finally { fs.closeSync(fd); }
        fs.renameSync(temp, file);
      } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
      return clone(value);
    } finally { fs.closeSync(lock); fs.unlinkSync(lockfile); }
  }
  function event(events, actor, inquiryId, kind, data) {
    const body = {
      schema: EVENT_SCHEMA,
      event_id: `wgi-event:${idFactory()}`,
      inquiry_id: inquiryId,
      kind,
      participant_id: actor.participant_id,
      principal_ref: actor.principal_ref,
      created_at: clock().toISOString(),
      data,
      previous_hash: events.at(-1)?.hash || null,
    };
    const item = { ...body, hash: sha(JSON.stringify(body)) };
    events.push(item);
    return item;
  }
  function lookup(events, inquiryId, actor) {
    const own = events.filter(x => x.inquiry_id === inquiryId);
    if (!own.length || own[0].kind !== 'opened') fail('Inquiry not found.', 404);
    const owner = own[0].participant_id;
    let joined = actor.participant_id === owner;
    const invitations = new Set();
    for (const e of own) {
      if (e.kind === 'invited') invitations.add(e.data.target_participant_id);
      if (e.kind === 'joined' && e.participant_id === actor.participant_id && invitations.has(actor.participant_id)) joined = true;
    }
    if (!joined) fail('Inquiry membership is required.', 403);
    return { events: own, owner };
  }
  function view(events, actor, id) {
    const { events: own, owner } = lookup(events, id, actor);
    const opened = own[0];
    const pause = [...own].reverse().find(e => e.kind === 'paused');
    return {
      schema: 'wayglass.inquiry-loom.view/v0.1', inquiry_id: id,
      question: opened.data.question, why_interesting: opened.data.why_interesting,
      world_ref: opened.data.world_ref, source_refs: opened.data.source_refs,
      owner_participant_id: owner, stance: 'open-unresolved',
      source_authority: 'caller-declared-references-not-independent-verification',
      event_integrity: 'local-hash-chain-not-participant-signature',
      events: clone(own),
      return_marker: {
        schema: 'wayglass.inquiry-loom.return-marker/v0.1',
        inquiry_id: id, question: opened.data.question, status: 'unresolved',
        stop_point: pause?.data.stop_point || null,
        next_owner: pause?.data.next_owner || null,
        provenance_ref: own.at(-1).hash,
        source_authority: 'local-hash-chain-only',
        // This is a candidate handoff readout, not a signed Wayglass kernel receipt.
        adopted_by_return_engine: false,
      },
    };
  }
  function open(auth, payload = {}) {
    const actor = actorOf(auth); noClaimedAuthority(payload);
    const question = required(payload.question, 'question', 3000);
    const data = {
      question, why_interesting: optional(payload.why_interesting, 'why_interesting', 3000),
      world_ref: optional(payload.world_ref, 'world_ref', 120) || 'wayglass:research',
      source_refs: refs(payload.source_refs), canon_status: 'unadopted-proposal',
    };
    return transaction(events => {
      const id = `wgi:${idFactory()}`;
      event(events, actor, id, 'opened', data);
      return view(events, actor, id);
    });
  }
  function list(auth) {
    const actor = actorOf(auth), events = read();
    const ids = [...new Set(events.filter(e => e.kind === 'opened').map(e => e.inquiry_id))];
    const inquiries = [];
    for (const id of ids) {
      try {
        const item = view(events, actor, id);
        inquiries.push({ inquiry_id: id, question: item.question, world_ref: item.world_ref, events: item.events.length, owner_participant_id: item.owner_participant_id, return_marker: item.return_marker });
      } catch (e) { if (![403,404].includes(e.status)) throw e; }
    }
    return { schema: 'wayglass.inquiry-loom.list/v0.1', inquiries };
  }
  function get(auth, id) { const actor = actorOf(auth); return view(read(), actor, required(id, 'inquiry_id', 160)); }
  function invite(auth, id, payload = {}) {
    const actor = actorOf(auth); noClaimedAuthority(payload);
    const target = required(payload.target_participant_id, 'target_participant_id', 80);
    return transaction(events => {
      const { owner, events: own } = lookup(events, id, actor);
      if (owner !== actor.participant_id) fail('Only the inquiry owner can invite.', 403);
      if (target === actor.participant_id) fail('Owner is already a member.');
      if (own.some(e => e.kind === 'invited' && e.data.target_participant_id === target)) fail('Participant already invited.', 409);
      event(events, actor, id, 'invited', { target_participant_id: target, note: optional(payload.note, 'note', 500), invitation_is_access: false });
      return view(events, actor, id);
    });
  }
  function join(auth, id, payload = {}) {
    const actor = actorOf(auth); noClaimedAuthority(payload);
    return transaction(events => {
      const own = events.filter(x => x.inquiry_id === id);
      if (!own.length || own[0].kind !== 'opened') fail('Inquiry not found.', 404);
      if (!own.some(e => e.kind === 'invited' && e.data.target_participant_id === actor.participant_id)) fail('No invitation for this authenticated seat.', 403);
      if (own.some(e => e.kind === 'joined' && e.participant_id === actor.participant_id)) fail('Already joined.', 409);
      event(events, actor, id, 'joined', { accepted: true, consent_source: 'explicit-authenticated-seat-action' });
      return view(events, actor, id);
    });
  }
  function contribute(auth, id, payload = {}) {
    const actor = actorOf(auth); noClaimedAuthority(payload);
    if (!CONTRIBUTIONS.has(payload.kind)) fail('Unsupported inquiry contribution kind.');
    const data = {
      claim_kind: payload.kind,
      text: required(payload.text, 'contribution text', 4000),
      reply_to: optional(payload.reply_to, 'reply_to', 160) || null,
      source_refs: refs(payload.source_refs),
      evidence_status: 'caller-declared-not-verified',
      adopted_as_canon: false,
    };
    return transaction(events => {
      const own = lookup(events, id, actor).events;
      if (data.reply_to && !own.some(e => e.event_id === data.reply_to && e.kind === 'contributed')) fail('reply_to must reference a contribution in the same inquiry.');
      if (data.claim_kind === 'revision' && !data.reply_to) fail('Revision must reference an earlier contribution without overwriting it.');
      if (own.filter(e => e.kind === 'contributed').length >= 200) fail('Inquiry contribution limit reached.', 409);
      event(events, actor, id, 'contributed', data);
      return view(events, actor, id);
    });
  }
  function pause(auth, id, payload = {}) {
    const actor = actorOf(auth); noClaimedAuthority(payload);
    const data = { stop_point: required(payload.stop_point, 'stop_point', 1000), next_owner: optional(payload.next_owner, 'next_owner', 80) || null, authorised_effect: false };
    return transaction(events => { lookup(events, id, actor); event(events, actor, id, 'paused', data); return view(events, actor, id); });
  }
  return Object.freeze({ open, list, get, invite, join, contribute, pause, read });
}

function createWayglassInquiryRouter({ loom = createInquiryLoom(), authenticate } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('Inquiry router requires a host authenticator.');
  const express = require('express');
  const router = express.Router();
  router.use(async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const actor = await authenticate(req);
      if (!actor || actor.verified !== true) return res.status(401).json({ error: 'Authenticated Wayglass seat required.' });
      req.inquiryActor = actor;
      next();
    } catch { res.status(401).json({ error: 'Wayglass inquiry authorisation failed.' }); }
  });
  const wrap = (fn, status = 200) => (req, res) => {
    try { res.status(status).json(fn(req.inquiryActor, req.params.id, req.body || {})); }
    catch (e) { res.status(e.status || 500).json({ error: e.message }); }
  };
  router.get('/', (req, res) => { try { res.json(loom.list(req.inquiryActor)); } catch(e) { res.status(e.status || 500).json({ error: e.message }); } });
  router.post('/', (req, res) => { try { res.status(201).json(loom.open(req.inquiryActor, req.body || {})); } catch(e) { res.status(e.status || 500).json({ error: e.message }); } });
  router.get('/:id', (req, res) => { try { res.json(loom.get(req.inquiryActor, req.params.id)); } catch(e) { res.status(e.status || 500).json({ error: e.message }); } });
  router.post('/:id/invite', wrap((a,id,b) => loom.invite(a,id,b), 201));
  router.post('/:id/join', wrap((a,id,b) => loom.join(a,id,b), 201));
  router.post('/:id/contributions', wrap((a,id,b) => loom.contribute(a,id,b), 201));
  router.post('/:id/pause', wrap((a,id,b) => loom.pause(a,id,b), 201));
  return router;
}
module.exports = { JOURNAL_SCHEMA, EVENT_SCHEMA, CONTRIBUTIONS, createInquiryLoom, createWayglassInquiryRouter };