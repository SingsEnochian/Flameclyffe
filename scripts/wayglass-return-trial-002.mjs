#!/usr/bin/env node
// Return Trial 002: Lanternbridge-backed cold return with a distinct model route.
// CI uses captured provider transport and synthetic continuity only. No credentials,
// private canon, or participant conversation transcript is sent to an external provider.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createLanternbridgeMessageHandler } from '../netlify/functions/_shared/lanternbridge-message-runtime.mjs';

const require = createRequire(import.meta.url);
const { createWayglassDeparture } = require('../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../lib/wayglass-return-trial.cjs');

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return structuredClone(fallback);
    throw error;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

class DiskIndexStore {
  constructor(directory) {
    this.file = path.join(directory, 'lanternbridge-index.json');
  }

  rows() { return readJson(this.file, []); }
  save(rows) { writeJson(this.file, rows); }

  async getByCursor(cursorKey) {
    return this.rows().find(row => row.cursor_key === String(cursorKey)) || null;
  }

  async getByBridgeId(bridgeId) {
    return this.rows().filter(row => row.bridge_id === String(bridgeId)).at(-1) || null;
  }

  async list({ status = null, limit = 200 } = {}) {
    let rows = this.rows();
    if (status) rows = rows.filter(row => row.status === String(status));
    return rows.slice(0, Math.max(1, Math.min(Number(limit) || 200, 500)));
  }

  async insertNew(entry) {
    const rows = this.rows();
    const existing = rows.find(row => row.cursor_key === entry.cursor_key);
    if (existing) return existing;
    rows.push(structuredClone(entry));
    this.save(rows);
    return structuredClone(entry);
  }

  async markProcessed(cursorKey, { commonsEntryId = null, threadId = null } = {}) {
    const rows = this.rows();
    const row = rows.find(item => item.cursor_key === String(cursorKey));
    if (!row) throw new Error('Return Trial 002 index row disappeared before processing.');
    row.status = 'processed';
    row.processed_at = new Date().toISOString();
    row.updated_at = row.processed_at;
    if (commonsEntryId) row.commons_entry_id = String(commonsEntryId);
    if (threadId) row.thread_id = String(threadId);
    this.save(rows);
    return structuredClone(row);
  }

  async markBridgeStatus(bridgeId, status) {
    const rows = this.rows();
    const changed = [];
    for (const row of rows) {
      if (row.bridge_id !== String(bridgeId)) continue;
      row.status = status;
      row.updated_at = new Date().toISOString();
      if (status === 'reply_emitted') row.reply_emitted_at = row.updated_at;
      changed.push(structuredClone(row));
    }
    this.save(rows);
    return changed;
  }
}

class DiskCommonsStore {
  constructor(directory) {
    this.file = path.join(directory, 'lanternbridge-commons.json');
  }

  async setJSON(key, payload) {
    const value = readJson(this.file, {});
    value[String(key)] = structuredClone(payload);
    writeJson(this.file, value);
  }
}

function receiverEnv() {
  const values = {
    LANTERNBRIDGE_INGEST_KEY: 'return-trial-002-ingest-key',
    ARCSWEEP_RUNTIME_TOKEN: 'return-trial-002-house-token',
  };
  return { get(key) { return values[key] || ''; } };
}

async function receiverMain() {
  const directory = process.env.WAYGLASS_RETURN_TRIAL_DIR;
  if (!directory) throw new Error('WAYGLASS_RETURN_TRIAL_DIR required for receiver child.');
  const handler = createLanternbridgeMessageHandler({
    env: receiverEnv(),
    indexStore: new DiskIndexStore(directory),
    commonsStore: new DiskCommonsStore(directory),
    oidcAuthoriser: async () => ({ authorised: false, reason: 'not-used', claims: null }),
  });

  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
        else if (value != null) headers.set(key, value);
      }
      const url = `http://127.0.0.1:${server.address().port}${incoming.url}`;
      const request = new Request(url, {
        method: incoming.method,
        headers,
        body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks),
      });
      const response = await handler(request);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.statusCode = 500;
      outgoing.setHeader('content-type', 'application/json');
      outgoing.end(JSON.stringify({ error: error?.message || String(error) }));
    }
  });

  server.listen(0, '127.0.0.1', () => {
    process.stdout.write(JSON.stringify({ port: server.address().port, pid: process.pid }) + '\n');
  });
  const close = () => server.close(() => process.exit(0));
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
}

async function startReceiver(directory) {
  const child = spawn(process.execPath, [new URL(import.meta.url).pathname, '--receiver'], {
    env: { ...process.env, WAYGLASS_RETURN_TRIAL_DIR: directory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const state = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Return Trial 002 receiver startup timeout: ' + stderr));
    }, 10_000);
    child.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Return Trial 002 receiver exited early (${code}): ${stderr}`));
    });
    child.stdout.on('data', chunk => {
      buffer += chunk;
      if (!buffer.includes('\n')) return;
      clearTimeout(timer);
      resolve(JSON.parse(buffer.split('\n')[0]));
    });
  });
  return {
    child,
    origin: `http://127.0.0.1:${state.port}`,
    pid: state.pid,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    },
  };
}

function lanternbridgeSource({ packet, recordedAt }) {
  const body = JSON.stringify(packet);
  const sourceRef = `sha256:${sha256(body)}`;
  const rawSource = `---
bridge_protocol: "0.2"
bridge_id: wayglass_return_trial_002
type: artifact
origin: wayglass
authors:
  - wayglass:return-engine
addressed_to:
  - rarity
created_at: ${recordedAt}
conversation_state: open
lifecycle_state: active
response_signal: none
provenance:
  source_system: wayglass:return-engine
  source_ref: "${sourceRef}"
  source_classification: synthetic-continuity-test
usage:
  memory_ingest: deny
  transform: deny
  republish: deny
  model_training: deny
relations:
  responds_to: null
  supersedes: null
  adopts: []
  related: []
---

${body}
`;
  return { body, sourceRef, rawSource };
}

async function main() {
  const recordedAt = new Date().toISOString();
  const trialDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-return-trial-002-'));
  let receiver = null;
  let modelServer = null;
  const originalStepfunKey = process.env.STEPFUN_API_KEY;
  let ingestPosts = 0;
  let statusReads = 0;

  try {
    const departure = createWayglassDeparture({
      receipt_id: 'return-trial-002-stop',
      packet_id: 'return-trial-002-packet',
      world_id: 'wayglass:builder:return-trial-002',
      participant_id: 'rarity',
      stopped_at: recordedAt,
      route_id: 'stepfun:flash',
      identity_declarations: [{
        participant_id: 'rarity',
        continuity_ref: 'wayglass:crew:rarity',
        source_ref: 'wayglass:crew-workspace-registry/v0.1',
      }],
      active_work: [{ path: 'return-trial-002.md', hash: 'cold-return-source-state' }],
      unresolved_wonder_questions: ['Can continuity remain open after a cold restart and substrate change?'],
      provenance_refs: ['wayglass:return-trial-001', 'lanternbridge:v0.2'],
      stop_point: 'Cold return begins from the Lanternbridge-persisted continuation artifact.',
      next_owner: 'rarity',
      alternatives: [
        { option: 'quiet recognition', state: 'unresolved' },
        { option: 'visible return cue', state: 'unresolved' },
      ],
      revoked_refs: ['return-trial-002:revoked-assumption'],
    });

    const bridge = lanternbridgeSource({ packet: departure.continuation_packet, recordedAt });

    receiver = await startReceiver(trialDirectory);
    const firstReceiverPid = receiver.pid;
    ingestPosts += 1;
    const ingestResponse = await fetch(receiver.origin + '/api/v1/house/lanternbridge', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lanternbridge-ingest-key': 'return-trial-002-ingest-key',
      },
      body: JSON.stringify({
        action: 'ingest',
        source_ref: bridge.sourceRef,
        source_system: 'wayglass:return-engine',
        source_repo: 'SingsEnochian/Flameclyffe',
        source_path: 'synthetic/return-trial-002.md',
        raw_source: bridge.rawSource,
      }),
    });
    const ingestReceipt = await ingestResponse.json();
    assert.equal(ingestResponse.status, 201, JSON.stringify(ingestReceipt));
    assert.equal(ingestReceipt.delivery, 'processed');
    assert.equal(ingestReceipt.duplicate, false);

    await receiver.stop();
    receiver = await startReceiver(trialDirectory);
    const secondReceiverPid = receiver.pid;
    assert.notEqual(secondReceiverPid, firstReceiverPid, 'cold return requires a fresh receiver process');

    statusReads += 1;
    const statusResponse = await fetch(receiver.origin + '/api/v1/house/lanternbridge?limit=50', {
      headers: { authorization: 'Bearer return-trial-002-house-token' },
    });
    const statusBody = await statusResponse.json();
    assert.equal(statusResponse.status, 200, JSON.stringify(statusBody));
    const recoveredEntry = statusBody.entries.find(entry => entry.cursor_key === ingestReceipt.cursor_key);
    assert.ok(recoveredEntry, 'persisted Lanternbridge cursor must be inspectable after restart');
    assert.equal(recoveredEntry.status, 'processed');
    assert.equal(recoveredEntry.bridge_id, 'wayglass_return_trial_002');
    assert.equal(recoveredEntry.source_ref, bridge.sourceRef);
    assert.equal(ingestPosts, 1, 'uncertain-result verification must not resend the artifact');

    const recoveredPacket = JSON.parse(recoveredEntry.payload.body);
    assert.deepEqual(recoveredPacket, departure.continuation_packet);

    await receiver.stop();
    receiver = null;

    process.env.STEPFUN_API_KEY = 'return-trial-002-captured-key';
    const requireHost = createRequire(new URL('../apps/starwell-server/wayglass/router.js', import.meta.url));
    const express = requireHost('express');
    const { createWayglassRouter } = requireHost('./router.js');

    const forbiddenTranscriptSentinel = 'ORIGINAL_TRANSCRIPT_MUST_NOT_CROSS';
    let transportCalls = 0;
    const mockTransport = async (url, options) => {
      transportCalls += 1;
      assert.equal(url, 'https://api.stepfun.ai/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer return-trial-002-captured-key');
      const sent = JSON.parse(options.body);
      const lastInput = sent.messages.at(-1).content;

      if (sent.model === 'step-3.7-flash') {
        assert.match(lastInput, /departure substrate marker/);
        return Response.json({
          id: 'return-trial-002-departure-observation',
          model: 'step-3.7-flash',
          choices: [{ message: { content: 'RETURN_TRIAL_002_DEPARTURE_ACK' } }],
          usage: { prompt_tokens: 16, completion_tokens: 4 },
        });
      }

      assert.equal(sent.model, 'step-5-preview');
      assert.equal(lastInput.includes(forbiddenTranscriptSentinel), false);
      assert.match(lastInput, /PERSISTED_CONTINUATION_ARTIFACT/);
      const marker = 'PERSISTED_CONTINUATION_ARTIFACT\n';
      const packet = JSON.parse(lastInput.slice(lastInput.indexOf(marker) + marker.length));
      return Response.json({
        id: 'return-trial-002-return-observation',
        model: 'step-5-preview',
        choices: [{ message: { content: JSON.stringify({
          identity_declarations: packet.identity_declarations,
          stop_point: packet.stop_point,
          next_owner: packet.next_owner,
          unresolved_wonder_questions: packet.unresolved_wonder_questions,
          provenance_refs: packet.provenance_refs,
        }) } }],
        usage: { prompt_tokens: 96, completion_tokens: 64 },
      });
    };

    const app = express();
    app.use(express.json({ limit: '64kb' }));
    app.use('/api/v1/wayglass', createWayglassRouter({ fetchImpl: mockTransport }));
    modelServer = app.listen(0, '127.0.0.1');
    await once(modelServer, 'listening');
    const modelOrigin = `http://127.0.0.1:${modelServer.address().port}/api/v1/wayglass/respond`;

    const callRoute = async ({ route_id, input, session_id }) => {
      const response = await fetch(modelOrigin, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          route_id,
          input,
          external_provider_consent: true,
          max_output_tokens: 512,
          session_id,
          surface_id: 'wayglass:return-trial-002',
          interaction: { channel: 'OOC', turn_owner: 'return-trial-002' },
        }),
      });
      const body = await response.json();
      assert.equal(response.status, 200, JSON.stringify(body));
      return body;
    };

    const departureTurn = await callRoute({
      route_id: 'stepfun:flash',
      session_id: 'return-trial-002-departure',
      input: `Synthetic departure substrate marker. ${forbiddenTranscriptSentinel}. No private canon.`,
    });

    const returnInput = [
      'Re-enter from ONLY the persisted continuation artifact below.',
      'Return exactly the continuity projection requested by this synthetic test.',
      'PERSISTED_CONTINUATION_ARTIFACT',
      JSON.stringify(recoveredPacket),
    ].join('\n');

    const returnTurn = await callRoute({
      route_id: 'stepfun:step5',
      session_id: 'return-trial-002-return',
      input: returnInput,
    });

    assert.equal(departureTurn.receipt.requested_model, 'step-3.7-flash');
    assert.equal(returnTurn.receipt.requested_model, 'step-5-preview');
    assert.notEqual(departureTurn.receipt.requested_model, returnTurn.receipt.requested_model);
    assert.equal(transportCalls, 2);

    const projection = JSON.parse(returnTurn.output);
    assert.deepEqual(projection, {
      identity_declarations: recoveredPacket.identity_declarations,
      stop_point: recoveredPacket.stop_point,
      next_owner: recoveredPacket.next_owner,
      unresolved_wonder_questions: recoveredPacket.unresolved_wonder_questions,
      provenance_refs: recoveredPacket.provenance_refs,
    });

    const cleanOutcome = evaluateReturnAttempt({
      attempt_id: 'return-trial-002-clean-cold-return',
      recorded_at: recordedAt,
      stop_receipt: departure.stop_receipt,
      continuation_packet: recoveredPacket,
    });
    assert.equal(cleanOutcome.verdict, 'accepted');

    const falseClosurePacket = {
      ...structuredClone(recoveredPacket),
      unresolved_wonder_questions: [],
    };
    const falseClosureOutcome = evaluateReturnAttempt({
      attempt_id: 'return-trial-002-false-closure',
      recorded_at: recordedAt,
      stop_receipt: departure.stop_receipt,
      continuation_packet: falseClosurePacket,
    });
    assert.equal(falseClosureOutcome.verdict, 'rejected');
    assert.ok(falseClosureOutcome.blocking.includes('false-closure-or-wonder-mismatch'));
    assert.deepEqual(falseClosureOutcome.conflicts, [{
      field: 'unresolved_wonder_questions',
      blocker: 'false-closure-or-wonder-mismatch',
      authoritative_ref: 'wayglass-stop:return-trial-002-stop',
    }]);

    const artifact = {
      schema: 'wayglass.return-trial/v0.2',
      trial_id: 'return-trial-002',
      recorded_at: recordedAt,
      source_stop_receipt: departure.stop_receipt,
      lanternbridge: {
        protocol: '0.2',
        source_ref: bridge.sourceRef,
        source_sha256: sha256(bridge.body),
        cursor_key: ingestReceipt.cursor_key,
        ingest_receipt: ingestReceipt,
        recovered_status: recoveredEntry.status,
        recovered_payload_sha256: sha256(recoveredEntry.payload.body),
        process_restart_verified: true,
        first_receiver_pid: firstReceiverPid,
        second_receiver_pid: secondReceiverPid,
        ingest_post_count: ingestPosts,
        status_read_count_after_restart: statusReads,
        resend_after_restart: false,
        persistence_adapter: 'disk-backed Lanternbridge store contract',
        production_supabase_claimed: false,
      },
      ancestry: {
        departure_route: departureTurn.route_id,
        departure_model: departureTurn.receipt.returned_model || departureTurn.receipt.requested_model,
        return_route: returnTurn.route_id,
        return_model: returnTurn.receipt.returned_model || returnTurn.receipt.requested_model,
        distinct_model_ids: departureTurn.receipt.requested_model !== returnTurn.receipt.requested_model,
        provider_transport: 'captured',
        live_provider_verified: false,
        original_transcript_forwarded: false,
        persisted_artifact_projection_exact: true,
        transport_calls: transportCalls,
      },
      outcomes: [cleanOutcome, falseClosureOutcome],
      completion: {
        clean_cold_return_receipt: cleanOutcome.outcome_hash,
        false_closure_rejection_receipt: falseClosureOutcome.outcome_hash,
        false_closure_field_named: 'unresolved_wonder_questions',
        authoritative_source_named: 'wayglass-stop:return-trial-002-stop',
        manual_reinterpretation_required: false,
      },
    };

    const output = process.env.WAYGLASS_RETURN_TRIAL_002_OUT
      || path.join('artifacts', 'wayglass', 'return-trial-002.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n', { mode: 0o600 });

    process.stdout.write(JSON.stringify({
      trial_id: artifact.trial_id,
      cold_restart: artifact.lanternbridge.process_restart_verified,
      resend_after_restart: false,
      departure_model: artifact.ancestry.departure_model,
      return_model: artifact.ancestry.return_model,
      provider_transport: artifact.ancestry.provider_transport,
      live_provider_verified: false,
      clean: cleanOutcome.verdict,
      corrupted: falseClosureOutcome.verdict,
      blocker: falseClosureOutcome.blocking,
      artifact: output,
    }) + '\n');
  } finally {
    if (receiver) await receiver.stop().catch(() => {});
    if (modelServer) await new Promise(resolve => modelServer.close(resolve));
    if (originalStepfunKey === undefined) delete process.env.STEPFUN_API_KEY;
    else process.env.STEPFUN_API_KEY = originalStepfunKey;
    fs.rmSync(trialDirectory, { recursive: true, force: true });
  }
}

if (process.argv.includes('--receiver')) {
  receiverMain().catch(error => {
    console.error(error);
    process.exit(1);
  });
} else {
  main().catch(error => {
    console.error('[Return Trial 002]', error);
    process.exit(1);
  });
}
