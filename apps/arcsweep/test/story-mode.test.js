import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ARCSWEEP_INTERACTION_MODES,
  buildVoicePromptEnvelope,
  createInitialPremaqc,
  runFeedbackCycle,
} from '../src/feedback-loop.js';
import { STORY_MODE_CONTRACT, STORY_MODE_VALUE } from '../src/story-mode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');
const world = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };

test('Story Mode is a first-class interaction and not an alias for writing', async () => {
  assert.equal(ARCSWEEP_INTERACTION_MODES.includes(STORY_MODE_VALUE), true);
  const before = createInitialPremaqc(world.id, {}, '2026-08-23T20:00:00.000Z');
  const cycle = await runFeedbackCycle({
    world,
    premaqc: before,
    mode: STORY_MODE_VALUE,
    work: 'Falka crossed the observatory while rain whispered against the Stonewood glass.',
    response: 'Virelya remained by the northern stair, answering only when the moment reached him.',
    voiceIds: ['lioreal'],
    soundEvents: [{ event_id: 'story-rain-1', cue_id: 'rain', fired_at: '2026-08-23T20:01:00.000Z' }],
    observedAt: '2026-08-23T20:01:00.000Z',
  });

  assert.equal(cycle.turn.mode, 'story');
  assert.equal(cycle.story_mode.schema, 'arcsweep.story-mode/v1');
  assert.equal(cycle.story_mode.contract_id, STORY_MODE_CONTRACT.id);
  assert.deepEqual(cycle.story_mode.relational_axes_touched, ['C', 'R', 'M']);
  assert.deepEqual(cycle.story_mode.sound_receipt_ids, ['story-rain-1']);
  assert.equal(cycle.authority.story_mode_is_provisional_narrative, true);
  assert.equal(cycle.authority.canon_commit, false);
  assert.equal(cycle.premaqc_after.state.Q.value, before.state.Q.value, 'Story Mode must not manufacture Qualia');
  assert.equal(cycle.premaqc_after.qualia.present, before.qualia.present);
});

test('Story Mode prompt requests scene continuation while preserving agency and unresolved values', () => {
  const prompt = buildVoicePromptEnvelope({
    world,
    mode: STORY_MODE_VALUE,
    work: 'The door opened.',
    premaqc: createInitialPremaqc(world.id),
    canon: [{ name: 'Scene canon', content: 'Third-person past. The door is already established as copper-bound Stonewood.' }],
  });
  assert.match(prompt, /Story Mode/);
  assert.match(prompt, /continue the scene as narrative/i);
  assert.match(prompt, /Preserve established POV, tense, scene chronology, character knowledge gates/i);
  assert.match(prompt, /Do not choose actions or invent inner experience for the user/i);
  assert.match(prompt, /no automatic canon commit/i);
  assert.match(prompt, /PREMAQC:/);
  assert.doesNotMatch(prompt, /PREMAC:/);
});

test('Story Mode contract names its texture, state touch, persistence, replay, and authority', () => {
  assert.equal(STORY_MODE_CONTRACT.texture, 'continuous-narrative');
  assert.deepEqual(STORY_MODE_CONTRACT.state.relational_axes_touched, ['C', 'R', 'M']);
  assert.match(STORY_MODE_CONTRACT.state.qualia_policy, /firsthand-only/i);
  assert.equal(STORY_MODE_CONTRACT.persistence.cycle_receipted, true);
  assert.equal(STORY_MODE_CONTRACT.persistence.shared_runtime_eligible, true);
  assert.equal(STORY_MODE_CONTRACT.persistence.deterministic_replay_required, true);
  assert.equal(STORY_MODE_CONTRACT.authority.automatic_canon_commit, false);
  assert.equal(STORY_MODE_CONTRACT.authority.human_review_required_for_canon, true);
});

test('Story Mode is visibly mounted after the Feedback Chamber and survives rerenders', () => {
  const bootstrap = fs.readFileSync(path.join(srcRoot, 'sidecar-bootstrap.js'), 'utf8');
  const sidecar = fs.readFileSync(path.join(srcRoot, 'story-mode-sidecar.js'), 'utf8');
  assert.match(bootstrap, /feedback-chamber-v2\.js'[\s\S]*story-mode-sidecar\.js'/);
  assert.match(sidecar, /option\.value = STORY_MODE_VALUE/);
  assert.match(sidecar, /localStorage\.setItem\(STORAGE_KEY, STORY_MODE_VALUE\)/);
  assert.match(sidecar, /MutationObserver/);
  assert.match(sidecar, /aria-live/);
  assert.match(sidecar, /continuous narrative/);
});
