import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createYggInterface,
  createYggRoomProposal,
  createYggRoomTemplate,
  validateYggInterface,
  validateYggRoomProposal,
  validateYggRoomTemplate,
} from '../src/interfaces/yggInterfaceSchema.js';
import { createYggdrasilAccount } from '../src/accounts/yggdrasilAccountSchema.js';
import { createYggRoomBuilderProposal, yggInterfaces, yggRoomTemplates } from '../src/interfaces/yggInterfaceRegistry.js';

test('Ygg interfaces are lab-only contracts with reduced-motion support', () => {
  const yggInterface = createYggInterface({ id: 'ygg-room-builder', title: 'Ygg Room Builder', mode: 'room-builder' });

  assert.deepEqual(validateYggInterface(yggInterface), []);
  assert.equal(yggInterface.labOnly, true);
  assert.equal(yggInterface.safety.noCanonWrites, true);
  assert.equal(yggInterface.safety.supportsReducedMotion, true);
});

test('Ygg room templates stay preview-safe', () => {
  const template = createYggRoomTemplate({ id: 'quiet-nest', title: 'Quiet Nest', kind: 'nest' });

  assert.deepEqual(validateYggRoomTemplate(template), []);
  assert.equal(template.soundscape.autoplay, false);
  assert.equal(template.roomControls.requiresReviewForCanon, true);
});

test('Ygg room templates reject live sound enablement', () => {
  const template = createYggRoomTemplate({
    id: 'loud-room',
    title: 'Loud Room',
    kind: 'lab',
    soundscape: { enabled: true, autoplay: false },
  });

  const errors = validateYggRoomTemplate(template).join('\n');
  assert.match(errors, /live sound/);
});

test('Ygg room proposal creates a local-preview world node', () => {
  const account = createYggdrasilAccount({
    id: 'local-rowan-seed',
    profile: { displayName: 'Rowan', handle: 'rowan', emailVisible: false },
    customization: {
      displayName: 'Rowan',
      palette: 'sea-blues',
      accessibility: { reducedMotion: true },
      sound: { defaultPatch: 'north_star_still' },
      privacy: { profile: 'private', customizations: 'private', presence: 'private' },
    },
  });

  const proposal = createYggRoomProposal({
    template: createYggRoomTemplate({ id: 'hearth-nook', title: 'Hearth Nook', kind: 'chamber' }),
    account,
  });

  assert.deepEqual(validateYggRoomProposal(proposal), []);
  assert.equal(proposal.state, 'local-preview');
  assert.equal(proposal.node.title, "Rowan's Hearth Nook");
  assert.equal(proposal.node.theme.palette, 'sea-blues');
  assert.equal(proposal.node.soundscape.enabled, false);
  assert.equal(proposal.node.soundscape.autoplay, false);
  assert.equal(proposal.safety.noCanonWrites, true);
});

test('Ygg registries include room builder interfaces and templates', () => {
  assert.ok(yggInterfaces.some((entry) => entry.id === 'ygg-room-builder'));
  assert.ok(yggRoomTemplates.some((entry) => entry.id === 'tone-lab'));

  const proposal = createYggRoomBuilderProposal({ templateId: 'tone-lab' });
  assert.equal(proposal.templateId, 'tone-lab');
  assert.equal(proposal.node.kind, 'lab');
  assert.deepEqual(validateYggRoomProposal(proposal), []);
});

test('Ygg room proposal validation blocks unsafe promotion and autoplay', () => {
  const unsafe = createYggRoomProposal();
  unsafe.state = 'canon-ready';
  unsafe.safety.noAutoplay = false;
  unsafe.node.soundscape.autoplay = true;
  unsafe.node.soundscape.enabled = true;

  const errors = validateYggRoomProposal(unsafe).join('\n');
  assert.match(errors, /proposal\/local-preview/);
  assert.match(errors, /autoplay/);
  assert.match(errors, /live sound/);
});
