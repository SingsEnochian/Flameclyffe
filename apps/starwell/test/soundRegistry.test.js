import test from 'node:test';
import assert from 'node:assert/strict';

import { createMcpSoundGatewayAdapter } from '../src/bridges/mcpSoundGatewayAdapter.js';
import { findSoundPatch, portalSoundPatches, validateSoundPatchRegistry } from '../src/sound/portalSoundRegistry.js';
import { createYggdrasilSoundProposal } from '../src/sound/yggdrasilSoundPlanner.js';

test('STARWELL sound registry validates seeded patches', () => {
  assert.deepEqual(validateSoundPatchRegistry(portalSoundPatches), []);
  assert.ok(findSoundPatch('safe_gateway_369'));
  assert.ok(findSoundPatch('runa_gateway_432'));
  assert.ok(findSoundPatch('yggdrasil_root_breath'));
});

test('Yggdrasil sound proposal stays data-only in v0.1', () => {
  const proposal = createYggdrasilSoundProposal({ patchId: 'yggdrasil_root_breath', roomId: 'ygg-gate' });

  assert.equal(proposal.proposalOnly, true);
  assert.equal(proposal.playbackEnabled, false);
  assert.equal(proposal.patchSummary.id, 'yggdrasil_root_breath');
  assert.equal(proposal.featherStop, true);
  assert.equal(proposal.plainPass, true);
});

test('MCP sound adapter exposes registry summaries without activating output', () => {
  const adapter = createMcpSoundGatewayAdapter();
  const resource = adapter.readResource('starwell://sound/patches');
  const payload = JSON.parse(resource.text);

  assert.equal(adapter.resource.uri, 'starwell://sound/patches');
  assert.equal(adapter.tool.name, 'starwell.propose_sound_patch');
  assert.equal(payload.patches.some((patch) => patch.id === 'yggdrasil_root_breath'), true);
  assert.equal(payload.patches.every((patch) => patch.playback.enabled === false), true);
});

test('MCP sound adapter returns proposal-only patch requests', () => {
  const adapter = createMcpSoundGatewayAdapter();
  const result = adapter.callTool('starwell.propose_sound_patch', {
    patchId: 'runa_gateway_432',
    roomId: 'templehouse-shrine',
  });

  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.proposalOnly, true);
  assert.equal(result.structuredContent.playbackEnabled, false);
  assert.equal(result.structuredContent.patchId, 'runa_gateway_432');
});
