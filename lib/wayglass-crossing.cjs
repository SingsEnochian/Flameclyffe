'use strict';

// Wayglass Möbius Crossing v0.1 · kernel-sovereign, crash-consistent crossing
// between two (or more) quads, each an independent Möbius lineage.
//
// The kernel *governs* the crossing; it does none of the quads' thinking.
// Each quad runs its own cycle on its own private state. At the twist, each
// stages a packet for its peers. A crossing commits only by a durable
// coordinator decision:
//
//   prepared ──kernel──▶ decided(commit|abort) ──▶ applied(quad…) ──▶ done
//
// - The decision is written durably before any quad applies an effect.
// - Abort releases every quad at its last valid checkpoint; nothing is lost.
// - Crash after decision: recovery replays the missing quads deterministically
//   and requires each replayed packet to match the prepared digest; publishes
//   are idempotent. A divergent replay, or a crash inside a non-idempotent
//   Return, is "needs-review", never invented continuity.
// - Revocation fencing: capabilities carry an epoch, checked at prepare (by the
//   kernel) and again immediately before every protected effect.
// - Feather is honoured at every boundary.

const { digest } = require('./wyrdrune/canonical.cjs');
const { PHASES } = require('./wayglass-mobius.cjs');

const CROSSING_SCHEMA = 'wayglass.crossing/v0.1';
const SCOPE = 'crossing.publish';
const OUTBOUND = PHASES.slice(0, 6); // through Choose: everything before Return

class CrashSignal extends Error { constructor(at) { super('simulated crash at ' + at); this.name = 'CrashSignal'; this.at = at; } }
class FenceError extends Error { constructor(m) { super(m); this.name = 'FenceError'; } }

// ---- Authority with epochs (revocation fencing) -------------------------------
function createAuthority() {
  const epochs = new Map(); const revoked = new Set();
  return Object.freeze({
    grant(participant, scope = SCOPE) {
      const epoch = (epochs.get(participant) ?? 0) + 1;
      epochs.set(participant, epoch); revoked.delete(participant);
      return Object.freeze({ participant, scope, epoch });
    },
    revoke(participant) { revoked.add(participant); epochs.set(participant, (epochs.get(participant) ?? 0) + 1); },
    valid(cap, scope = SCOPE) {
      return Boolean(cap) && cap.scope === scope && !revoked.has(cap.participant) && epochs.get(cap.participant) === cap.epoch;
    },
    snapshot() { return { epochs: Object.fromEntries(epochs), revoked: [...revoked].sort() }; },
  });
}

// A protected effect: authority is re-checked immediately before it is applied.
function fenced(effect, cap, authority) {
  return Object.freeze({ ...effect,
    apply: async () => {
      if (!authority.valid(cap, cap?.scope)) throw new FenceError(`authority for ${cap?.participant} revoked or stale (epoch ${cap?.epoch})`);
      return effect.apply();
    } });
}

// ---- Packets and channel -------------------------------------------------------
function makePacket({ crossing, round, from, participant, to, body }) {
  const payload = { crossing, round, from, participant, to, body };
  return Object.freeze({ ...payload, digest: digest(payload) });
}
const packetBytes = p => Buffer.byteLength(JSON.stringify(p.body), 'utf8');

function createChannel() {
  const store = new Map(); // `${crossing}|${from}|${to}` → packet
  return Object.freeze({
    // Idempotent: the same packet twice is a no-op; a different one is a conflict.
    publish(packet) {
      const key = `${packet.crossing}|${packet.from}|${packet.to}`;
      const existing = store.get(key);
      if (existing) { if (existing.digest !== packet.digest) throw new Error(`channel conflict on ${key}`); return 'already-published'; }
      store.set(key, packet); return 'published';
    },
    retract(packet) { const key = `${packet.crossing}|${packet.from}|${packet.to}`; if (store.get(key)?.digest === packet.digest) store.delete(key); },
    inbox(crossing, to) { return [...store.values()].filter(p => p.crossing === crossing && p.to === to).sort((a, b) => (a.from < b.from ? -1 : 1)); },
    all() { return [...store.values()]; },
  });
}

// ---- Durable coordinator log ---------------------------------------------------
function createCoordinatorLog(initial = []) {
  const rows = initial.map(r => JSON.parse(JSON.stringify(r)));
  return Object.freeze({
    async write(entry) { rows.push(JSON.parse(JSON.stringify({ schema: CROSSING_SCHEMA, ...entry }))); },
    entries(id) { return rows.filter(r => !id || r.id === id).map(r => JSON.parse(JSON.stringify(r))); },
    dump() { return JSON.parse(JSON.stringify(rows)); },
  });
}

// ---- The kernel's crossing inspection (pure) -----------------------------------
function inspectCrossing({ id, quads, packets, authority, feather = () => false }) {
  const reasons = [];
  if (feather()) reasons.push('feather-stopped');
  const roots = quads.map(q => q.lineage.root);
  const participants = quads.map(q => q.participant);
  if (new Set(roots).size !== roots.length) reasons.push('duplicate-lineage');
  if (new Set(participants).size !== participants.length) reasons.push('participant-substitution');
  quads.forEach((q, i) => {
    if (!authority.valid(q.cap)) reasons.push(`quad-${i}-authority-invalid`);
    if (q.cap?.participant !== q.participant) reasons.push(`quad-${i}-capability-not-its-own`);
  });
  for (const p of packets) {
    const from = quads.findIndex(q => q.lineage.root === p.from);
    if (from < 0) { reasons.push('packet-from-unknown-lineage'); continue; }
    if (p.participant !== quads[from].participant) reasons.push('packet-identity-substitution');
    if (p.crossing !== id) reasons.push('packet-wrong-crossing');
    const { digest: d, ...payload } = p;
    if (d !== digest(payload)) reasons.push('packet-digest-mismatch');
    if (!roots.includes(p.to) || p.to === p.from) reasons.push('packet-bad-recipient');
  }
  return Object.freeze({ schema: CROSSING_SCHEMA, crossing: id, allowed: reasons.length === 0, reasons: Object.freeze(reasons) });
}

// ---- Running a crossing ----------------------------------------------------------
// quads: [{ lineage, phases, participant, cap, outbox }]; each quad's Choose puts
// its packets in outbox.packets and stages their publication (fenced).
async function runCrossing({ id, quads, log, authority, feather = () => false, inject = () => {}, kernel = inspectCrossing }) {
  await log.write({ id, state: 'begun', quads: quads.map(q => ({ root: q.lineage.root, participant: q.participant })) });
  quads.forEach(q => { q.outbox.packets = []; });
  const cycles = quads.map(q => q.lineage.begin(q.phases));
  const abortAll = async (why) => {
    for (const c of cycles) { try { c.abort(why); } catch { /* in Return */ } }
    await log.write({ id, state: 'decided', decision: 'abort', reasons: [why] });
    return { id, decision: 'abort', reasons: [why], results: [] };
  };
  // Outbound through Choose for every quad, phase by phase (no quad sees another's
  // packet from *this* crossing: what crosses is perceived next cycle, other face).
  for (const s of OUTBOUND) {
    for (const [i, c] of cycles.entries()) {
      inject(`stage:${s}`, i);
      const r = await c.stage[s]();
      if (r) return abortAll(`quad ${i} ended at ${s}: ${r.status} (${(r.reason || []).join('; ')})`);
    }
  }
  const packets = quads.flatMap(q => q.outbox.packets);
  await log.write({ id, state: 'prepared', packets: packets.map(p => ({ from: p.from, to: p.to, digest: p.digest })) });
  inject('prepared', -1);
  const verdict = kernel({ id, quads, packets, authority, feather });
  if (!verdict.allowed) return abortAll(`kernel veto: ${verdict.reasons.join(', ')}`);
  await log.write({ id, state: 'decided', decision: 'commit', reasons: [] }); // durable before any effect
  inject('decided', -1);
  const results = [];
  for (const [i, c] of cycles.entries()) {
    inject('before-return', i);
    const r = (await c.stage.return()) || (await c.stage.transcend());
    results.push(r);
    await log.write({ id, state: r.status.startsWith('committed') ? 'applied' : 'failed', quad: quads[i].lineage.root,
      status: r.status, checkpoint: r.checkpoint ? digest(r.checkpoint) : null });
    inject('after-return', i);
  }
  const allApplied = results.every(r => r.status.startsWith('committed'));
  await log.write({ id, state: allApplied ? 'done' : 'split', reasons: allApplied ? [] : results.map(r => r.status) });
  return { id, decision: 'commit', outcome: allApplied ? 'done' : 'split', results };
}

// Recovery after a crash: converge every quad on the coordinator's decision.
// quads here are freshly restored lineages (from their own journals) with phases.
async function recoverCrossing({ id, log, quads, authority, feather = () => false }) {
  const rows = log.entries(id);
  const decided = rows.find(r => r.state === 'decided');
  const prepared = rows.find(r => r.state === 'prepared');
  if (rows.some(r => r.state === 'done')) return { id, recovery: 'clean' };
  if (!decided || decided.decision === 'abort') {
    if (!decided) await log.write({ id, state: 'decided', decision: 'abort', reasons: ['recovered: no durable decision before crash'] });
    return { id, recovery: 'aborted', reasons: [decided ? 'abort was decided' : 'no decision on record → abort'] };
  }
  const applied = new Set(rows.filter(r => r.state === 'applied').map(r => r.quad));
  const results = [];
  for (const q of quads) {
    if (applied.has(q.lineage.root)) continue;
    if (q.interruptedInReturn) return { id, recovery: 'needs-review', reasons: [`${q.participant} crashed inside Return; its effects may be partly applied`] };
    // Idempotent replay: rerun this quad's cycle from its last checkpoint.
    q.outbox.packets = [];
    const c = q.lineage.begin(q.phases);
    for (const s of OUTBOUND) { const r = await c.stage[s](); if (r) return { id, recovery: 'needs-review', reasons: [`replay of ${q.participant} ended at ${s}: ${r.status}`] }; }
    const expected = prepared.packets.filter(p => p.from === q.lineage.root).map(p => p.digest).sort();
    const got = q.outbox.packets.map(p => p.digest).sort();
    if (digest(expected) !== digest(got)) {
      c.abort('replay diverged from prepared packets');
      return { id, recovery: 'needs-review', reasons: [`replay of ${q.participant} diverged from what was prepared; not inventing continuity`] };
    }
    if (!authority.valid(q.cap) || feather()) { c.abort('authority or Feather at recovery'); return { id, recovery: 'fenced', reasons: ['authority revoked or Feather raised before recovery could apply'] }; }
    const r = (await c.stage.return()) || (await c.stage.transcend());
    results.push(r);
    await log.write({ id, state: r.status.startsWith('committed') ? 'applied' : 'failed', quad: q.lineage.root, status: r.status, replayed: true,
      checkpoint: r.checkpoint ? digest(r.checkpoint) : null });
    if (!r.status.startsWith('committed')) return { id, recovery: 'split', reasons: [r.status] };
  }
  await log.write({ id, state: 'done', recovered: true });
  return { id, recovery: 'replayed', results };
}

module.exports = { CROSSING_SCHEMA, SCOPE, CrashSignal, FenceError, createAuthority, fenced, makePacket, packetBytes,
  createChannel, createCoordinatorLog, inspectCrossing, runCrossing, recoverCrossing };
