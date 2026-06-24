#!/usr/bin/env node

import assert from 'node:assert/strict';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4000/api/v1/kernel';
const BASE_URL = (process.env.KERNEL_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

const allowedWeatherScenes = new Set([
  'Stonewood Mist',
  'Amber Sleet',
  'Deep Ridge Frost',
  'Quiet Canopy Hum',
]);

const allowedTopologyDensities = new Set([
  'Sheltered',
  'Broad',
  'Chambered',
  'Fractured Tree',
]);

const allowedPlaybackModes = new Set([
  'loop-ready-user-initiated',
  'metadata-only',
  'disabled',
]);

const secretPatterns = [
  /sb_secret_/i,
  /sb_publishable_/i,
  /SUPABASE_SERVICE_ROLE/i,
  /SERVICE_ROLE/i,
  /OPENAI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /GITHUB_TOKEN/i,
  /GOOGLE_CLIENT_SECRET/i,
  /PRIVATE_KEY/i,
  /BEGIN\s+(RSA|OPENSSH|PRIVATE)\s+KEY/i,
];

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (error) {
    throw new Error(
      `Could not reach Portal Kernel at ${BASE_URL}. Start the local server first. Original error: ${error.message}`,
    );
  }

  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error(`Expected JSON from ${path}, received: ${text.slice(0, 200)}`);
    }
  }

  return { response, json, text };
}

async function loadSeed(seedToken) {
  return requestJson('/load-seed', {
    method: 'POST',
    body: JSON.stringify({ seedToken }),
  });
}

function assertNoSecrets(payload, label) {
  const serialised = JSON.stringify(payload);

  for (const pattern of secretPatterns) {
    assert.equal(
      pattern.test(serialised),
      false,
      `${label} appears to contain a secret-like token matching ${pattern}`,
    );
  }
}

function assertValidRoomCard(roomCard, label) {
  assert.ok(roomCard, `${label} should include a room card`);
  assert.equal(typeof roomCard.seed, 'string', `${label}.seed should be a string`);
  assert.match(roomCard.derivedCoordinates, /^YG-\d{1,3}-\d{1,3}$/, `${label}.derivedCoordinates format`);

  assert.ok(roomCard.environment, `${label}.environment should exist`);
  assert.ok(
    allowedWeatherScenes.has(roomCard.environment.weatherScene),
    `${label}.environment.weatherScene should be from the fixed pool`,
  );
  assert.ok(
    allowedTopologyDensities.has(roomCard.environment.topologyDensity),
    `${label}.environment.topologyDensity should be from the fixed pool`,
  );
  assert.match(
    roomCard.environment.structuralStability,
    /^(7\d|8\d|9\d|100)%$/,
    `${label}.environment.structuralStability should be between 70% and 100%`,
  );

  assert.ok(roomCard.audioProfile, `${label}.audioProfile should exist`);
  assert.match(roomCard.audioProfile.baseFrequency, /^\d+Hz$/, `${label}.audioProfile.baseFrequency format`);
  assert.match(
    roomCard.audioProfile.loopAssetPath,
    /^\/assets\/audio\/weather\/[a-z0-9-]+\.mp3$/,
    `${label}.audioProfile.loopAssetPath should stay inside the weather audio asset namespace`,
  );
  assert.ok(
    allowedPlaybackModes.has(roomCard.audioProfile.playbackMode),
    `${label}.audioProfile.playbackMode must be user-initiated or inert; unattended playback is not allowed`,
  );
}

function deterministicProjection(roomCard) {
  return {
    seed: roomCard.seed,
    derivedCoordinates: roomCard.derivedCoordinates,
    environment: roomCard.environment,
    audioProfile: roomCard.audioProfile,
  };
}

async function testEmptySeedRejected() {
  const { response, json } = await loadSeed('   ');
  assert.equal(response.status, 400, 'empty seed should return 400');
  assertNoSecrets(json, 'empty-seed response');
}

async function testSeedDeterminism() {
  const first = await loadSeed('Stonewood_Core');
  const second = await loadSeed('Stonewood_Core');

  assert.equal(first.response.status, 200, 'first seed load should succeed');
  assert.equal(second.response.status, 200, 'second seed load should succeed');

  const firstCard = first.json.roomCard;
  const secondCard = second.json.roomCard;

  assertValidRoomCard(firstCard, 'first Stonewood_Core room card');
  assertValidRoomCard(secondCard, 'second Stonewood_Core room card');
  assert.deepEqual(
    deterministicProjection(firstCard),
    deterministicProjection(secondCard),
    'same seed should produce identical room card projection',
  );

  assertNoSecrets(first.json, 'first deterministic response');
  assertNoSecrets(second.json, 'second deterministic response');
}

async function testSeedMatrixAllowedValues() {
  const seeds = [
    'Stonewood_Core',
    'Amber_Ridge',
    'Quiet_Canopy',
    'Deep_Frost_Chamber',
    'Falka_NorthStar_Test',
  ];

  const seenCoordinates = new Set();

  for (const seedToken of seeds) {
    const { response, json } = await loadSeed(seedToken);
    assert.equal(response.status, 200, `${seedToken} should load successfully`);
    assertValidRoomCard(json.roomCard, `${seedToken} room card`);
    assertNoSecrets(json, `${seedToken} response`);
    seenCoordinates.add(json.roomCard.derivedCoordinates);
  }

  assert.ok(seenCoordinates.size >= 3, 'seed matrix should produce varied coordinates across sample seeds');
}

async function testActiveRoomReflectsLastSeed() {
  const loaded = await loadSeed('Quiet_Canopy');
  assert.equal(loaded.response.status, 200, 'seed load before active-room check should succeed');

  const { response, json } = await requestJson('/active-room');
  assert.equal(response.status, 200, 'active-room should return 200');
  assert.equal(json.chamberActive, true, 'active-room should report an active chamber after seed load');

  const activeCard = json.data || json.roomCard;
  assertValidRoomCard(activeCard, 'active-room card');
  assert.deepEqual(
    deterministicProjection(activeCard),
    deterministicProjection(loaded.json.roomCard),
    'active-room should match the most recently loaded seed card',
  );
  assertNoSecrets(json, 'active-room response');
}

async function run() {
  console.log(`[🌲 KERNEL VALIDATION]: Testing ${BASE_URL}`);

  await testEmptySeedRejected();
  await testSeedDeterminism();
  await testSeedMatrixAllowedValues();
  await testActiveRoomReflectsLastSeed();

  console.log('[✅ KERNEL VALIDATION]: Portal Kernel seed contract passed.');
}

run().catch((error) => {
  console.error(`[🚨 KERNEL VALIDATION FAILED]: ${error.message}`);
  process.exitCode = 1;
});
