#!/usr/bin/env node
/** Two-phase authenticated host witness. No model/provider calls and no secrets in receipts.
 * First: WAYGLASS_LIVE_RETURN_APPROVED=YES WAYGLASS_MCP_URL=... WAYGLASS_LIVE_ACCESS_TOKEN=... node scripts/wayglass-live-return-witness.mjs prepare
 * Then restart the ACTUAL host and retain separate boot/deploy evidence.
 * Finally: same env node scripts/wayglass-live-return-witness.mjs return /private/path/to/ticket.json
 */
import { randomBytes, createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const EXPECTED_QUESTION = 'How does verified return differ from reconstructed familiarity?';
const EXPECTED_STOP = 'Recover the accepted witness text after operator host restart.';
const EXPECTED_ALTERNATIVES = [
  { option: 'quiet arrival', state: 'unresolved' },
  { option: 'visible recognition', state: 'unresolved' },
];
const SHA = /^[a-f0-9]{64}$/;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function need(condition, reason) {
  if (!condition) throw new Error('Invalid Wayglass evidence: ' + reason);
}
function records(value) {
  return Array.isArray(value) && value.every(entry => entry !== null && typeof entry === 'object' && !Array.isArray(entry));
}
function nonemptyStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonempty);
}
function boundWork(items, path, digest) {
  return records(items) && items.some(item => item.path === path && item.hash === digest);
}

/** Inspect original host receipt content before writing any baseline ticket. */
export function validateDeparture(departure, expected) {
  const stop = departure?.stop_receipt;
  const packet = departure?.continuation_packet;
  const world = 'wayglass:' + expected.workspace_id + ':' + expected.project_id;
  need(departure?.schema === 'wayglass.departure/v0.1' && departure.status === 'stopped',
    'departure schema/status');
  need(departure.world_id === world && departure.participant_id === 'rarity',
    'departure world/participant');
  need(departure.canon_commit === false && departure.authority_grant === false,
    'departure authority');
  need(stop?.schema === 'wayglass.stop-receipt/v0.1' && nonempty(stop.receipt_id),
    'missing stop receipt');
  need(stop.world_id === world && stop.participant_id === 'rarity' &&
    nonempty(stop.stopped_at) && !Number.isNaN(Date.parse(stop.stopped_at)),
    'stop world/participant/time');
  need(stop.stop_point === EXPECTED_STOP && stop.next_owner === 'rarity',
    'stop point or next owner');
  need(records(stop.identity_declarations) && stop.identity_declarations.some(entry =>
    entry.participant_id === 'rarity' && nonempty(entry.continuity_ref) && nonempty(entry.source_ref)),
    'stop identity declarations');
  need(nonemptyStrings(stop.provenance_refs) &&
    stop.provenance_refs.includes('wayglass-session:' + expected.session_id),
    'stop provenance');
  need(boundWork(stop.active_work, expected.path, expected.file_sha256), 'stop active work');
  need(same(stop.unresolved_wonder_questions, [EXPECTED_QUESTION]), 'stop Wonder questions');
  need(same(stop.alternatives, EXPECTED_ALTERNATIVES), 'stop alternatives');
  need(records(stop.relationship_state) && records(stop.organ_refs) &&
    Array.isArray(stop.revoked_refs), 'stop retained relationship/revocation state');
  need(stop.authority?.scope === 'departure-evidence-only' &&
    stop.authority.canon_commit === false && stop.authority.identity_commit === false &&
    stop.authority.relationship_commit === false && stop.authority.authority_grant === false,
    'stop authority boundary');

  need(packet?.schema === 'wayglass.continuation-packet/v0.1' &&
    nonempty(packet.packet_id), 'continuation packet schema/ID');
  need(packet.world_id === world && packet.participant_id === 'rarity' &&
    packet.stopped_at === stop.stopped_at && packet.transport === 'wayglass-stop-receipt',
    'continuation origin');
  need(packet.stop_point === stop.stop_point && packet.next_owner === stop.next_owner &&
    same(packet.identity_declarations, stop.identity_declarations),
    'continuation stop and identity');
  need(boundWork(packet.active_work, expected.path, expected.file_sha256) &&
    same(packet.active_work, stop.active_work), 'continuation active work');
  need(nonemptyStrings(packet.provenance_refs) &&
    packet.provenance_refs.includes('wayglass-stop:' + stop.receipt_id) &&
    stop.provenance_refs.every(ref => packet.provenance_refs.includes(ref)),
    'continuation provenance');
  need(same(packet.unresolved_wonder_questions, stop.unresolved_wonder_questions) &&
    same(packet.alternatives, stop.alternatives) &&
    same(packet.revoked_refs, stop.revoked_refs) &&
    same(packet.relationship_state, stop.relationship_state) &&
    same(packet.organ_refs, stop.organ_refs),
    'continuation context');
  need(packet.authority?.scope === 'continuation-context-only' &&
    packet.authority.requires_review_before_promotion === true &&
    packet.authority.canon_commit === false && packet.authority.identity_commit === false &&
    packet.authority.relationship_commit === false && packet.authority.authority_grant === false,
    'continuation authority boundary');
  return true;
}

/** Verify the event's own content hash and its author, principal and project bindings. */
export function validateEvent(event, binding) {
  need(event && typeof event === 'object' && SHA.test(event.event_hash || ''),
    'missing event hash');
  const { event_hash, ...body } = event;
  need(hash(JSON.stringify(body)) === event_hash, 'event content hash mismatch');
  need(nonempty(event.event_id) && nonempty(event.created_at) &&
    !Number.isNaN(Date.parse(event.created_at)), 'event ID/time');
  need(event.kind === binding.kind && event.participant_id === 'rarity' &&
    SHA.test(event.principal_ref || ''), 'event kind/author/principal');
  need(event.workspace_id === binding.workspace_id &&
    event.project_id === binding.project_id &&
    event.session_id === binding.session_id, 'event workspace/project/session');
  need(nonemptyStrings(event.source_refs) &&
    event.source_refs.includes('wayglass:workspace-projects/v0.1'),
    'event provenance refs');
  need(event.data && typeof event.data === 'object', 'event data');
  if (binding.principal_ref) need(event.principal_ref === binding.principal_ref,
    'event principal differs from authenticated work');
  if (binding.kind === 'change') {
    need(event.data.path === binding.path && event.data.before_hash === null &&
      event.data.after_hash === binding.file_sha256 &&
      event.data.tool === 'write_project_file', 'write event path/content/operation');
  }
  if (binding.kind === 'leave') {
    need(event.data.departure && typeof event.data.departure === 'object' &&
      same(event.data.departure, binding.departure), 'leave event departure');
  }
  if (binding.kind === 'enter' && binding.return_from !== undefined) {
    need(event.data.return_from === binding.return_from, 'entry event stop linkage');
  }
  return true;
}

export function safeMcpUrl(raw) {
  if (!raw) throw new Error('WAYGLASS_MCP_URL required.');
  const url = new URL(raw);
  const local = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('MCP requires HTTPS or loopback HTTP.');
  if (url.pathname !== '/mcp' || url.search || url.hash || url.username || url.password) {
    throw new Error('Use an exact /mcp URL without query, fragment or embedded credentials.');
  }
  return url;
}

function approvedEnvironment() {
  if (process.env.WAYGLASS_LIVE_RETURN_APPROVED !== 'YES') {
    throw new Error('Explicit WAYGLASS_LIVE_RETURN_APPROVED=YES is required.');
  }
  const url = safeMcpUrl(process.env.WAYGLASS_MCP_URL);
  const token = process.env.WAYGLASS_LIVE_ACCESS_TOKEN;
  if (!token || token.trim() !== token || /[\r\n]/.test(token)) {
    throw new Error('A valid private WAYGLASS_LIVE_ACCESS_TOKEN is required.');
  }
  return { url, token };
}

export async function rpc(client, name, args = {}, authenticated = true) {
  const headers = { 'content-type': 'application/json' };
  const requestId = randomBytes(12).toString('hex');
  if (authenticated) headers.authorization = 'Bearer ' + client.token;
  const response = await fetch(client.url, {
    method: 'POST',
    redirect: 'manual',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0', id: requestId,
      method: 'tools/call', params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!authenticated) return { status: response.status };
  if (response.status !== 200) throw new Error('Authenticated MCP request was not accepted (HTTP ' + response.status + ').');
  let envelope;
  try { envelope = await response.json(); } catch { throw new Error('MCP returned non-JSON content.'); }
  if (envelope?.jsonrpc !== '2.0' || envelope.id !== requestId) {
    throw new Error('MCP response does not match its JSON-RPC request.');
  }
  if (envelope.error || envelope.result?.isError || !envelope.result?.structuredContent) {
    throw new Error('MCP tool ' + name + ' did not return a successful structured result.');
  }
  return envelope.result.structuredContent;
}

export function verifyReturn(ticket, profile, returned) {
  need(nonempty(ticket.profile_id) && profile?.id === ticket.profile_id,
    'authenticated profile mismatch');
  need(ticket.workspace_id === 'builder' && nonempty(ticket.project_id) &&
    nonempty(ticket.path) && SHA.test(ticket.file_sha256 || '') &&
    SHA.test(ticket.principal_ref || '') &&
    SHA.test(ticket.write_event_hash || '') &&
    SHA.test(ticket.leave_event_hash || '') &&
    SHA.test(ticket.departure_sha256 || '') &&
    nonempty(ticket.first_session_id) && nonempty(ticket.stop_receipt_id),
    'incomplete private return ticket');
  need(returned?.participant?.participant_id === 'rarity' &&
    nonempty(returned.session_id), 'crew seat or session mismatch');
  need(returned.project?.workspace_id === ticket.workspace_id &&
    returned.project?.project_id === ticket.project_id,
    'recovered project identity mismatch');
  const expected = {
    workspace_id: ticket.workspace_id, project_id: ticket.project_id,
    session_id: ticket.first_session_id, path: ticket.path,
    file_sha256: ticket.file_sha256,
  };
  validateDeparture(returned.recovered_departure, expected);
  need(returned.recovered_departure.stop_receipt.receipt_id === ticket.stop_receipt_id,
    'stop receipt mismatch');
  need(hash(JSON.stringify(returned.recovered_departure)) === ticket.departure_sha256,
    'departure content changed');
  need(returned.recovered_departure.stop_receipt.next_owner === ticket.next_owner &&
    same(returned.recovered_departure.stop_receipt.unresolved_wonder_questions,
      ticket.unresolved_wonder_questions), 'named owner/Wonder changed');
  validateEvent(returned.entry_receipt, {
    kind: 'enter', workspace_id: ticket.workspace_id,
    project_id: ticket.project_id, session_id: returned.session_id,
    principal_ref: ticket.principal_ref, return_from: ticket.leave_event_hash,
  });
  const file = returned.project?.files?.find(item => item.path === ticket.path);
  need(file && file.hash === ticket.file_sha256 &&
    typeof file.content === 'string' &&
    hash(file.content) === ticket.file_sha256, 'recovered work changed');
  const work = returned.project?.receipts;
  need(Array.isArray(work), 'missing durable event history');
  const write = work.find(event => event?.event_hash === ticket.write_event_hash);
  need(Boolean(write), 'original write-event receipt was not recovered');
  validateEvent(write, {
    kind: 'change', workspace_id: ticket.workspace_id,
    project_id: ticket.project_id, session_id: ticket.first_session_id,
    principal_ref: ticket.principal_ref, path: ticket.path,
    file_sha256: ticket.file_sha256,
  });
  const leave = work.find(event => event?.event_hash === ticket.leave_event_hash);
  need(Boolean(leave), 'original departure-event receipt was not recovered');
  validateEvent(leave, {
    kind: 'leave', workspace_id: ticket.workspace_id,
    project_id: ticket.project_id, session_id: ticket.first_session_id,
    principal_ref: ticket.principal_ref, departure: returned.recovered_departure,
  });
  return {
    accepted: true,
    profile_id: profile.id,
    principal_ref: ticket.principal_ref,
    stop_receipt_id: ticket.stop_receipt_id,
    write_event_hash: ticket.write_event_hash,
    leave_event_hash: ticket.leave_event_hash,
    return_event_hash: returned.entry_receipt.event_hash,
    file_sha256: ticket.file_sha256,
    host_restart_independently_verified: false,
  };
}

function writePrivateJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

async function prepare(client) {
  const unauthenticated = await rpc(client, 'list_workspaces', {}, false);
  if (![401, 403].includes(unauthenticated.status)) {
    throw new Error('Unauthenticated MCP access was not rejected. Refusing live trial.');
  }
  const profile = await rpc(client, 'get_profile');
  if (!profile.id) throw new Error('Authenticated principal lacks a stable profile ID.');
  const project_id = 'return-' + Date.now().toString(36) + '-' + randomBytes(4).toString('hex');
  const entered = await rpc(client, 'enter_workspace', { workspace_id: 'builder', project_id });
  if (entered.participant?.participant_id !== 'rarity' || !nonempty(entered.session_id) ||
      entered.project?.workspace_id !== 'builder' || entered.project?.project_id !== project_id) {
    throw new Error('Rarity seat or bound project session was not established.');
  }
  validateEvent(entered.entry_receipt, {
    kind: 'enter', workspace_id: 'builder', project_id, session_id: entered.session_id,
  });
  need(entered.entry_receipt.data.return_from === null,
    'first entry unexpectedly claims a return');
  const principal_ref = entered.entry_receipt.principal_ref;
  const filename = 'live-return-witness.txt';
  const content = 'Wayglass authorised return witness: ' + project_id + '\n';
  const written = await rpc(client, 'write_project_file', {
    session_id: entered.session_id, path: filename, content, expected_hash: null,
  });
  const digest = hash(content);
  need(written?.changed === true, 'write was not acknowledged');
  validateEvent(written.receipt, {
    kind: 'change', workspace_id: 'builder', project_id, session_id: entered.session_id,
    principal_ref, path: filename, file_sha256: digest,
  });
  need(written.project?.files?.some(item =>
    item.path === filename && item.hash === digest && item.content === content),
    'immediate project snapshot did not preserve accepted write');
  const left = await rpc(client, 'leave_workspace', {
    session_id: entered.session_id,
    stop_point: EXPECTED_STOP,
    next_owner: 'rarity',
    unresolved_wonder_questions: [EXPECTED_QUESTION],
    alternatives: EXPECTED_ALTERNATIVES,
  });
  need(left?.exited === true, 'exit was not acknowledged');
  validateDeparture(left.departure, {
    workspace_id: 'builder', project_id, session_id: entered.session_id,
    path: filename, file_sha256: digest,
  });
  validateEvent(left.receipt, {
    kind: 'leave', workspace_id: 'builder', project_id, session_id: entered.session_id,
    principal_ref, departure: left.departure,
  });
  const stopId = left.departure.stop_receipt.receipt_id;
  const ticket = {
    schema: 'wayglass.live-return-witness/v0.1', recorded_at: new Date().toISOString(),
    host_origin: client.url.origin, workspace_id: 'builder', project_id,
    profile_id: profile.id, principal_ref, first_session_id: entered.session_id,
    path: filename, file_sha256: digest, next_owner: 'rarity',
    unresolved_wonder_questions: [EXPECTED_QUESTION],
    stop_receipt_id: stopId, write_event_hash: written.receipt.event_hash,
    leave_event_hash: left.receipt.event_hash,
    departure_sha256: hash(JSON.stringify(left.departure)),
    credential_recorded: false,
    host_restart_independently_verified: false,
  };
  const folder = path.join(os.homedir(), '.wayglass', 'return-trials');
  const ticketPath = path.join(folder, project_id + '.json');
  writePrivateJson(ticketPath, ticket);
  process.stdout.write(JSON.stringify({ phase: 'prepared', ticket_path: ticketPath,
    trial_id: project_id, stop_receipt_id: stopId, host_restart_independently_verified: false }) + '\n');
}

async function returnFromStop(client, ticketPath) {
  if (!ticketPath) throw new Error('Private ticket path required for return phase.');
  const data = fs.readFileSync(ticketPath);
  const ticket = JSON.parse(data);
  if (ticket.schema !== 'wayglass.live-return-witness/v0.1' || ticket.host_origin !== client.url.origin) {
    throw new Error('Ticket schema or host origin mismatch.');
  }
  const profile = await rpc(client, 'get_profile');
  const returned = await rpc(client, 'enter_workspace', {
    workspace_id: ticket.workspace_id, project_id: ticket.project_id,
    stop_receipt_id: ticket.stop_receipt_id,
  });
  const result = verifyReturn(ticket, profile, returned);
  const witness = {
    schema: 'wayglass.live-return-witness-result/v0.1',
    checked_at: new Date().toISOString(), ticket_sha256: hash(data),
    result, authenticated_mcp_verified: true,
    separate_invocations: true, host_restart_independently_verified: false,
    note: 'A separate boot/deployment receipt is required to substantiate an actual host restart.',
  };
  const resultPath = ticketPath.replace(/\.json$/, '.result.json');
  writePrivateJson(resultPath, witness);
  process.stdout.write(JSON.stringify({ phase: 'returned', accepted: true,
    result_path: resultPath, host_restart_independently_verified: false }) + '\n');
}

async function main() {
  const phase = process.argv[2];
  if (!['prepare', 'return'].includes(phase)) {
    throw new Error('Usage: node scripts/wayglass-live-return-witness.mjs prepare|return [private-ticket-path]');
  }
  const client = approvedEnvironment();
  if (phase === 'prepare') await prepare(client);
  else await returnFromStop(client, process.argv[3]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Do not print RPC payloads or host credentials.
    process.stderr.write('Wayglass live witness stopped: ' + error.message + '\n');
    process.exitCode = 1;
  });
}
