#!/usr/bin/env node
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolveWayglassRoute } from '../lib/wayglass-route-registry.cjs';
import ingress from '../lib/wayglass-wyrdrune-ingress.cjs';
import wtl from '../lib/wyrdrune/wyrdrune.cjs';

const loopback = '127.0.0.1';
const dryRun = process.argv[2] === '--dry-run';
const requestedModel = dryRun ? 'orion-26b-fixture' : process.argv[2];
const endpoint = 'http://' + loopback + ':11434';
const challenge = 'AMBER-' + randomBytes(8).toString('hex');
const words = '  This is a Wyrdrune transport test. Reply with exactly ' + challenge + '\n';
let stage = 'ollama-model-discovery';
let server;
let receipt;

try {
  if (!dryRun) {
    const catalog = await fetch(endpoint + '/api/tags', { signal: AbortSignal.timeout(5000) });
    assert.ok(catalog.ok, 'Ollama returned HTTP ' + catalog.status);
    const names = (await catalog.json()).models.map(model => model.name);
    const matches = names.filter(name => /orion.*26b/i.test(name));
    const model = requestedModel ?? (matches.length === 1 ? matches[0] : undefined);
    assert.ok(model && names.includes(model), 'Pass the exact Amber model tag shown by ollama list.');
    process.env.WAYGLASS_SHIP_MODEL = model;
  } else {
    process.env.WAYGLASS_SHIP_MODEL = requestedModel;
  }
  process.env.WAYGLASS_OLLAMA_URL = endpoint + '/api/chat';
  process.env.ARCSWEEP_RUNTIME_TOKEN = randomBytes(32).toString('hex');

  stage = 'start-staged-wayglass';
  const requireHost = createRequire(new URL('../apps/starwell-server/wayglass/router.js', import.meta.url));
  const express = requireHost('express');
  const { createWayglassRouter } = requireHost('./router.js');
  const route = resolveWayglassRoute('wayglass:ship');
  const encoded = ingress.encodeWyrdruneMessage(words);
  let observed = false;

  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({
    fetchImpl: async (url, options) => {
      assert.equal(String(url), endpoint + '/api/chat');
      const request = JSON.parse(options.body);
      assert.equal(request.model, route.model());
      const source = request.messages.at(-1).content;
      assert.equal(source, encoded.source);
      const result = await wtl.execute(wtl.compile(source));
      assert.equal(result.output[0].words, words);
      observed = true;
      return dryRun
        ? Response.json({ model: route.model(), message: { content: challenge } })
        : fetch(url, { ...options, redirect: 'error' });
    },
  }));
  server = app.listen(0, loopback);
  await once(server, 'listening');
  stage = 'ship-voice-exchange';
  const response = await fetch('http://' + loopback + ':' + server.address().port + '/api/v1/wayglass/respond', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.ARCSWEEP_RUNTIME_TOKEN },
    body: JSON.stringify({
      route_id: 'wayglass:ship', character_id: 'wayglass', input: words,
      session_id: challenge, surface_id: 'wayglass:smoke',
      interaction: { channel: 'OOC', turn_owner: 'Wyrdrune transport probe' },
      max_output_tokens: 128,
    }),
    signal: AbortSignal.timeout(125000),
  });
  const result = await response.json();
  assert.ok(response.ok, 'Wayglass returned HTTP ' + response.status + ': ' + (result.error || 'unknown error'));
  assert.ok(observed, 'No Ollama request was captured');
  assert.equal(result.participant_id, 'wayglass');
  assert.equal(result.receipt.returned_model, route.model());
  assert.equal(result.receipt.input_wyrdrune.source_hash, encoded.sourceHash);
  receipt = {
    route: result.route_id, model: result.receipt.returned_model,
    observation: result.receipt.observation_id, input_wyrdrune: result.receipt.input_wyrdrune,
  };
  stage = 'challenge-response';
  assert.ok(result.output.trim() === challenge, 'Amber did not echo the exact challenge.');
  console.log(JSON.stringify({ status: dryRun ? 'fixture-verified' : 'live-verified', ...receipt }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: 'failed', stage, error: error.cause?.code || error.message, ...(receipt && { receipt }),
  }, null, 2));
  if (stage === 'start-staged-wayglass') console.error('Build and stage first with npm run wayglass:deploy:server.');
  process.exitCode = 1;
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
