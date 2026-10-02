import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtAgentPrompt } from '../src/art-agent-prompt.js';
import { normaliseGeneratorRequest } from '../src/generator-bridge.js';
import { buildUiDesignAgentPrompt } from '../../agent-workspace/ui-design-agent-prompt.js';

test('art agent prompt preserves structured visual direction and House depth rules', () => {
  const prompt = buildArtAgentPrompt({
    subject: 'Crow portrait inside ArcSweep',
    medium: 'graphite and ink',
    lighting: 'warm rim light',
    glass: true,
    reference_traits: ['rough paper', 'selective internal glow'],
    avoid: ['flat glass', 'generic cyberpunk'],
  });
  assert.match(prompt, /SUBJECT: Crow portrait inside ArcSweep/);
  assert.match(prompt, /MEDIUM: graphite and ink/);
  assert.match(prompt, /GLASS PASS:/);
  assert.match(prompt, /cast\/occlusion shadow/);
  assert.match(prompt, /REFERENCE LAW:/);
  assert.match(prompt, /ARTEFACT LAW:/);
});

test('generator bridge accepts structured art_spec and carries prompt lineage', () => {
  const request = normaliseGeneratorRequest({
    art_spec: {
      subject: 'A living-glass glyph',
      medium: 'ink and luminous glass',
      avoid: ['flat blur-only glass'],
    },
    width: 768,
    height: 768,
  });
  assert.equal(request.prompt_schema, 'arcsweep.art-agent-prompt/v0.1');
  assert.match(request.prompt, /A living-glass glyph/);
  assert.match(request.negative_prompt, /flat blur-only glass/);
});

test('UI design prompt begins from task, state, authority and verification rather than decoration', () => {
  const prompt = buildUiDesignAgentPrompt({
    job: 'Let Rowan talk with The Crow while painting',
    actions: ['chat', 'paint', 'switch brush'],
    states: ['offline', 'rendering', 'ready'],
    authority: ['configured != live', 'draft != submitted'],
    somatics: 'short semantic haptics for tool selection',
  });
  assert.match(prompt, /JOB TO BE DONE:/);
  assert.match(prompt, /SYSTEM STATES:/);
  assert.match(prompt, /AUTHORITY \/ TRUTH BOUNDARIES:/);
  assert.match(prompt, /HAPTICS \/ AUDIO:/);
  assert.match(prompt, /DEPTH RULE:/);
  assert.match(prompt, /PANEL RULE:/);
});