import assert from 'node:assert/strict';
import test from 'node:test';
import { createConcordanceAnchorDestination } from '../src/react-ion-concordance-anchor.js';
import { compileReactionRegistry } from '../src/react-ion-registry.js';

function anchor(overrides = {}) {
  return {
    id: 'anchor-1',
    display_name: 'First Concordance Window',
    status: 'active',
    visibility: 'private',
    confidence_mode: 'observed',
    consent_scope: 'private',
    layer: 'waking_world',
    device_mode: 'pocket_lens',
    ...overrides,
  };
}

test('approved dimensional publication of a Concordance anchor requires explicit authorisation', async () => {
  await assert.rejects(() => createConcordanceAnchorDestination({
    anchor: anchor(),
    registrationId: 'dest-anchor',
    dnsName: 'window.terra',
    worldId: 'world-terra',
    worldName: 'Terra Aeterna',
    address: '10.20.30.40@220',
    state: 'approved',
    publicationAuthorised: false,
    updatedAt: '2026-08-13T05:40:00.000Z',
  }), /explicit authorisation/);
});

test('published anchor carries consent and confidence metadata while preserving an explicitly supplied address', async () => {
  const bridge = await createConcordanceAnchorDestination({
    anchor: anchor(),
    registrationId: 'dest-anchor',
    dnsName: 'window.terra',
    aliases: ['first-window'],
    worldId: 'world-terra',
    worldName: 'Terra Aeterna',
    address: '10.20.30.40@220',
    state: 'approved',
    publicationAuthorised: true,
    updatedAt: '2026-08-13T05:41:00.000Z',
  });

  assert.equal(bridge.registration.address, '10.20.30.40@220');
  assert.equal(bridge.registration.anchor.id, 'anchor-1');
  assert.equal(bridge.registration.anchor.consent_scope, 'private');
  assert.equal(bridge.registration.anchor.confidence_mode, 'observed');
  assert.equal(bridge.authority.address_inferred_from_anchor_geometry, false);
  assert.equal(bridge.authority.camera_media_copied, false);

  const runtime = compileReactionRegistry({ destinations: [bridge.registration], corridors: [] });
  const endpoint = runtime.registry.resolve('window.terra').endpoint;
  assert.equal(endpoint.anchor.consent_scope, 'private');
  assert.equal(endpoint.anchor.confidence_mode, 'observed');
});

test('inactive anchors cannot be approved for routing even with publication authorisation', async () => {
  await assert.rejects(() => createConcordanceAnchorDestination({
    anchor: anchor({ status: 'cleared' }),
    registrationId: 'dest-cleared',
    dnsName: 'cleared.window',
    worldId: 'world-terra',
    worldName: 'Terra Aeterna',
    address: '10.20.30.41@220',
    state: 'approved',
    publicationAuthorised: true,
    updatedAt: '2026-08-13T05:42:00.000Z',
  }), /only an active Concordance anchor/);
});

test('anchor geometry never substitutes for a dimensional address', async () => {
  await assert.rejects(() => createConcordanceAnchorDestination({
    anchor: anchor({ x: 50, y: 50 }),
    registrationId: 'dest-no-address',
    dnsName: 'window.no-address',
    worldId: 'world-terra',
    worldName: 'Terra Aeterna',
    address: '',
    state: 'draft',
    updatedAt: '2026-08-13T05:43:00.000Z',
  }), /address is required/);
});
