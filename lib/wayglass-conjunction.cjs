"use strict";
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const SCHEMA = 'wayglass.conjunction-ledger/v0.1';
const clone = value => structuredClone(value);
function requireValue(ok, message) { if (!ok) throw new TypeError(message); }
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
class ConjunctionLedger {
  constructor(file) {
    this.file = file;
    this.state = { schema: SCHEMA, records: {} };
    if (fs.existsSync(file)) {
      const state = JSON.parse(fs.readFileSync(file, 'utf8'));
      requireValue(state.schema === SCHEMA && state.records && !Array.isArray(state.records), 'Unsupported or corrupt conjunction ledger');
      for (const [id, row] of Object.entries(state.records)) {
        requireValue(row.id === id && Number.isInteger(row.revision) && Array.isArray(row.events) && row.proposal, 'Corrupt conjunction record');
      }
      this.state = state;
    }
  }
  list() { return clone(Object.values(this.state.records)); }
  get(id) { return clone(this.state.records[id] || null); }
  apply(id, action, input) {
    requireValue(text(id) && !['__proto__', 'constructor', 'prototype'].includes(id), 'Conjunction ID required');
    requireValue(input && text(input.operation_id), 'operation_id required');
    const current = this.state.records[id];
    const previous = current?.events.find(event => event.operation_id === input.operation_id);
    if (previous) {
      requireValue(previous.action === action && isDeepStrictEqual(previous.input, input), 'Conflicting operation retry');
      return this.get(id);
    }
    requireValue(input.expected_revision === (current?.revision ?? 0), 'Revision conflict; inspect before retrying');
    let row = clone(current);
    if (action === 'propose') {
      requireValue(!current, 'Conjunction already exists');
      const p = input.proposal;
      requireValue(p && ['intentional', 'emergent', 'reciprocal'].includes(p.mode), 'Conjunction mode required');
      requireValue(Array.isArray(p.parents) && p.parents.length >= 2, 'At least two parent timelines required');
      requireValue(new Set(p.parents.map(parent => parent.world_id + ':' + parent.timeline_id)).size === p.parents.length, 'Distinct parent timelines required');
      for (const parent of p.parents) requireValue(['world_id', 'timeline_id', 'revision_ref', 'rules_ref'].every(key => text(parent[key])), 'Parent world, timeline, revision and rules references required');
      requireValue(Array.isArray(p.participant_ids) && p.participant_ids.length > 0 && p.participant_ids.every(text) && new Set(p.participant_ids).size === p.participant_ids.length, 'Distinct participants required');
      requireValue(Array.isArray(p.provenance_refs) && p.provenance_refs.length && p.provenance_refs.every(text), 'Provenance required');
      requireValue(text(p.proposer_id), 'Proposer required');
      if (p.mode === 'emergent') requireValue(Array.isArray(p.resonance_refs) && p.resonance_refs.length && p.resonance_refs.every(text), 'Emergent resonance evidence required');
      if (p.mode === 'reciprocal') requireValue(p.participant_ids.includes(p.proposer_id), 'Reciprocal proposer must be a participant');
      requireValue(p.translation && text(p.translation.profile_ref) && ['preserved', 'transformed', 'unavailable'].every(key => Array.isArray(p.translation[key])), 'Explicit translation profile required');
      row = { id, revision: 0, status: 'proposed', proposal: clone(p), decisions: {}, branch: null, return_marker: null, events: [] };
    } else {
      requireValue(row, 'Unknown conjunction');
      if (action === 'respond') {
        requireValue(['proposed', 'negotiating'].includes(row.status), 'Proposal is no longer awaiting responses');
        requireValue(row.proposal.participant_ids.includes(input.participant_id), 'Participant is not invited');
        requireValue(['accept', 'decline', 'negotiate'].includes(input.decision) && text(input.evidence_ref), 'Decision and attributed evidence required');
        if (input.decision === 'negotiate') requireValue(text(input.terms), 'Negotiation terms required');
        Object.defineProperty(row.decisions, input.participant_id, { value: { decision: input.decision, evidence_ref: input.evidence_ref, terms: input.terms || null }, enumerable: true, configurable: true, writable: true });
        row.status = input.decision === 'decline' ? 'declined' : Object.values(row.decisions).some(d => d.decision === 'negotiate') ? 'negotiating' : 'proposed';
      } else if (action === 'open') {
        requireValue(row.status === 'proposed' && row.proposal.participant_ids.every(p => row.decisions[p]?.decision === 'accept'), 'All invited participants must accept');
        row.branch = { id: `conjunction:${id}`, parents: clone(row.proposal.parents), translation: clone(row.proposal.translation) };
        row.status = 'open';
      } else if (action === 'pause') {
        requireValue(row.status === 'open' && text(input.continuation_ref) && text(input.stop_point) && text(input.next_owner), 'Open conjunction and complete return marker required');
        row.return_marker = { continuation_ref: input.continuation_ref, stop_point: input.stop_point, next_owner: input.next_owner };
        row.status = 'paused';
      } else if (action === 'resume') {
        requireValue(row.status === 'paused' && input.continuation_ref === row.return_marker.continuation_ref, 'Matching continuation reference required');
        row.status = 'open';
      } else throw new TypeError('Unknown conjunction action');
    }
    row.revision++;
    row.events.push({ operation_id: input.operation_id, action, input: clone(input), recorded_at: new Date().toISOString() });
    const next = clone(this.state);
    Object.defineProperty(next.records, id, { value: row, enumerable: true, configurable: true, writable: true });
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temporary = this.file + '.tmp';
    try { fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 }); fs.renameSync(temporary, this.file); }
    catch (error) { try { fs.unlinkSync(temporary); } catch {} throw error; }
    this.state = next;
    return this.get(id);
  }
}
module.exports = { ConjunctionLedger, SCHEMA };
