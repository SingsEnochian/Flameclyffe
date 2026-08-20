import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASK_PACKET_SCHEMA,
  ASK_RESPONSE_SCHEMA,
  createAskPacket,
  createAskResponse,
  createDimensionalNameRegistry,
  diagnosticAcknowledgement,
  formatDimensionalAddress,
  parseDimensionalAddress,
  resolveE8x32Coordinate,
  routeAskPacket,
} from '../src/bifrost-protocol-stack.js';

test('parses and formats IPv4-style dimensional addresses with harmonic selectors', () => {
  const address = parseDimensionalAddress('137.42.219.88@7.835769:φ=1.724');
  assert.equal(address.x, 137);
  assert.equal(address.y, 42);
  assert.equal(address.z, 219);
  assert.equal(address.t, 88);
  assert.equal(address.frequency, 7.835769);
  assert.equal(address.phase, 1.724);
  assert.equal(formatDimensionalAddress(address), '0137.0042.0219.0088@7.835769:φ=1.724');
});

test('rejects dimensional address fields outside the 0..255 routing range', () => {
  assert.throws(() => parseDimensionalAddress('256.0.0.0'), /must lie within 0\.\.255/);
});

test('resolves a human-readable dimensional name without exposing the lattice machinery', () => {
  const registry = createDimensionalNameRegistry([
    { name: 'templehouse.hearthweave.terra', address: '137.42.219.88@7.835769' },
  ]);
  const resolved = registry.resolve('TEMPLEHOUSE.HEARTHWEAVE.TERRA');
  assert.equal(resolved.address.x, 137);
  assert.deepEqual(registry.names(), ['templehouse.hearthweave.terra']);
});

test('expands the compact address into 32 E8-compatible integer blocks', async () => {
  const coordinate = await resolveE8x32Coordinate('137.42.219.88@7.835769');
  assert.equal(coordinate.dimensions, 256);
  assert.equal(coordinate.blocks.length, 32);
  for (const block of coordinate.blocks) {
    assert.equal(block.length, 8);
    const sum = block.reduce((total, value) => total + value, 0);
    assert.equal(Math.abs(sum % 2), 0);
  }
});

test('creates an Ask packet that keeps intention, consent and evidence provenance distinct', async () => {
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'WakingWorld',
    world: 'Waking World',
    intention: 'Ask clearly and record what follows',
    transformation: 'Request a bounded observable change',
    constraints: { preserve: ['agency', 'continuity'] },
    consent: { required: true, granted: true, revocable: true, scope: 'this bounded request' },
    evidence: [
      { class: 'observed', source: 'observer', value: { note: 'baseline' }, confidence: 1 },
      { class: 'symbolic', source: 'mythframe', value: { glyph: 'bridge' }, confidence: 0.8 },
    ],
    ttl: 3,
    nonce: 'test-nonce',
    createdAt: '2026-08-13T04:30:00.000Z',
  });

  assert.equal(packet.schema, ASK_PACKET_SCHEMA);
  assert.equal(packet.authority.ask_is_success, false);
  assert.equal(packet.consent.granted, true);
  assert.equal(packet.evidence[0].class, 'observed');
  assert.equal(packet.evidence[1].class, 'symbolic');
});

test('routes Ask packets with TTL and detects loopback without declaring success', async () => {
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'TerraAeterna',
    world: 'Terra Aeterna',
    intention: 'Visit the Templehouse',
    transformation: 'Resolve a route',
    consent: { required: false, granted: false },
    ttl: 2,
    createdAt: '2026-08-13T04:30:00.000Z',
  });
  const first = routeAskPacket(packet, 'Arcsweep');
  const second = routeAskPacket(first, 'Arcsweep');
  assert.equal(first.transport.ttl, 1);
  assert.equal(second.transport.ttl, 0);
  assert.equal(second.transport.loopback, true);
  assert.equal(second.authority.ask_is_success, false);
});

test('creates protocol responses and does not let ACK masquerade as fulfilment', async () => {
  const packet = await createAskPacket({
    sender: 'Rowan',
    target: 'TerraAeterna',
    world: 'Terra Aeterna',
    intention: 'Request contact',
    transformation: 'Open a bounded communication attempt',
    consent: { required: false, granted: false },
    createdAt: '2026-08-13T04:30:00.000Z',
  });
  const response = await createAskResponse({
    packet,
    code: 'ACK',
    responder: 'Arcsweep',
    message: 'Packet received',
    respondedAt: '2026-08-13T04:31:00.000Z',
  });
  assert.equal(response.schema, ASK_RESPONSE_SCHEMA);
  assert.equal(response.code, 'ACK');
  assert.equal(response.authority.success_declared, false);
});

test('keeps Bill the Cat behind a deterministic recoverable-diagnostic gate', () => {
  const ordinary = diagnosticAcknowledgement({ reason: 'healthy packet' });
  const cat = diagnosticAcknowledgement({ reason: 'loopback recovered', recoverable: true, loopback: true });
  assert.equal(ordinary.code, 'ACK');
  assert.equal(ordinary.easter_egg, null);
  assert.equal(cat.code, 'ACK-THPPPT');
  assert.equal(cat.easter_egg.protocol, 'BCEP/1');
});
