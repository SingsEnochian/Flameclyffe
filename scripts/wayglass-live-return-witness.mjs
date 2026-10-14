#!/usr/bin/env node
/** Two-phase authenticated host witness. No model/provider calls and no secrets in receipts.
 * First: WAYGLASS_LIVE_RETURN_APPROVED=YES WAYGLASS_MCP_URL=... WAYGLASS_LIVE_ACCESS_TOKEN=... node scripts/wayglass-live-return-witness.mjs prepare
 * Then restart the ACTUAL host and retain separate boot/deploy evidence.
 * Finally: same env node scripts/wayglass-live-return-witness.mjs return /private/path/to/ticket.json
 */
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const EXPECTED_QUESTION = 'How does verified return differ from reconstructed familiarity?';

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

async function rpc(client, name, args = {}, authenticated = true) {
  const headers = { 'content-type': 'application/json' };
  if (authenticated) headers.authorization = 'Bearer ' + client.token;
  const response = await fetch(client.url, {
    method: 'POST',
    redirect: 'manual',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0', id: randomBytes(5).toString('hex'),
      method: 'tools/call', params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!authenticated) return { status: response.status };
  if (response.status !== 200) throw new Error('Authenticated MCP request was not accepted (HTTP ' + response.status + ').');
  let envelope;
  try { envelope = await response.json(); } catch { throw new Error('MCP returned non-JSON content.'); }
  if (envelope.error || envelope.result?.isError || !envelope.result?.structuredContent) {
    throw new Error('MCP tool ' + name + ' did not return a successful structured result.');
  }
  return envelope.result.structuredContent;
}

export function verifyReturn(ticket, profile, returned) {
  assert.equal(profile.id, ticket.profile_id, 'Authenticated profile changed.');
  assert.equal(returned.participant?.participant_id, 'rarity', 'Crew seat was substituted.');
  assert.equal(returned.recovered_departure?.stop_receipt?.receipt_id, ticket.stop_receipt_id, 'Stop receipt mismatch.');
  assert.equal(hash(JSON.stringify(returned.recovered_departure)), ticket.departure_sha256,
    'Departure packet changed, including identity, provenance or alternatives.');
  assert.equal(returned.recovered_departure?.stop_receipt?.next_owner, ticket.next_owner, 'Named next owner changed.');
  assert.deepEqual(returned.recovered_departure?.stop_receipt?.unresolved_wonder_questions,
    ticket.unresolved_wonder_questions, 'Unresolved Wonder changed.');
  assert.equal(returned.entry_receipt?.data?.return_from, ticket.leave_event_hash, 'Leave event binding mismatch.');
  const file = returned.project?.files?.find(item => item.path === ticket.path);
  assert.ok(file, 'Trial work was not recovered.');
  assert.equal(file.hash, ticket.file_sha256, 'Recovered work hash changed.');
  assert.equal(hash(file.content), ticket.file_sha256, 'Recovered work content disagrees with object digest.');
  return { accepted: true, profile_id: profile.id, stop_receipt_id: ticket.stop_receipt_id,
    leave_event_hash: ticket.leave_event_hash, file_sha256: ticket.file_sha256,
    host_restart_independently_verified: false };
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
  if (entered.participant?.participant_id !== 'rarity' || !entered.session_id) {
    throw new Error('Rarity seat or project session was not established.');
  }
  const filename = 'live-return-witness.txt';
  const content = 'Wayglass authorised return witness: ' + project_id + '\n';
  const written = await rpc(client, 'write_project_file', {
    session_id: entered.session_id, path: filename, content, expected_hash: null,
  });
  const digest = hash(content);
  if (written.receipt?.participant_id !== 'rarity' || written.receipt?.data?.after_hash !== digest) {
    throw new Error('Authentic attributable write evidence missing.');
  }
  const left = await rpc(client, 'leave_workspace', {
    session_id: entered.session_id,
    stop_point: 'Recover the accepted witness text after operator host restart.',
    next_owner: 'rarity',
    unresolved_wonder_questions: [EXPECTED_QUESTION],
    alternatives: [
      { option: 'quiet arrival', state: 'unresolved' },
      { option: 'visible recognition', state: 'unresolved' },
    ],
  });
  const stopId = left.departure?.stop_receipt?.receipt_id;
  if (!left.exited || !stopId || !left.receipt?.event_hash) throw new Error('Durable stop receipt was not issued.');
  const ticket = {
    schema: 'wayglass.live-return-witness/v0.1', recorded_at: new Date().toISOString(),
    host_origin: client.url.origin, workspace_id: 'builder', project_id,
    profile_id: profile.id, path: filename, file_sha256: digest, next_owner: 'rarity',
    unresolved_wonder_questions: [EXPECTED_QUESTION],
    stop_receipt_id: stopId, leave_event_hash: left.receipt.event_hash,
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
