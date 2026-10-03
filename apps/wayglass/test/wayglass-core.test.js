import test from 'node:test';
import assert from 'node:assert/strict';

import { createInteractionState } from '../src/interaction-state.js';
import { normaliseMaterialSignal } from '../src/material-state.js';
import { pointerMaterialState } from '../src/motion-choreography.js';
import { commandForKeyboardEvent } from '../src/keyboard-controls.js';
import { detectEmbodimentCapabilities, detectARSupport } from '../src/embodiment.js';
import { publicWayglassRoutes, resolveWayglassRoute } from '../../../lib/wayglass-route-registry.js';
import kernelModule from '../../../lib/wayglass-kernel.cjs';

const { bootWayglassKernel } = kernelModule;

test('Wayglass interaction state keeps IC/OOC, turn owner, and ownership separate', () => {
  const state = createInteractionState({ channel: 'IC', turn_owner: 'Rowan' });
  state.setOwnership({ character: 'Eilidh', owner: 'Rowan', permission: 'owned' });
  state.setOwnership({ character: 'Izar', owner: 'Crow', permission: 'owned' });
  state.setChannel('OOC');
  state.setTurnOwner('Crow');

  assert.deepEqual(state.snapshot(), {
    channel: 'OOC',
    turn_owner: 'Crow',
    character_ownership: [
      { character: 'Eilidh', owner: 'Rowan', permission: 'owned' },
      { character: 'Izar', owner: 'Crow', permission: 'owned' },
    ],
  });
});

test('Wayglass route catalogue exposes safe metadata but not API credentials', () => {
  const routes = publicWayglassRoutes();
  assert.ok(routes.some((route) => route.route_id === 'openai:gpt'));
  const json = JSON.stringify(routes);
  assert.doesNotMatch(json, /api_key/i);
  assert.doesNotMatch(json, /OPENAI_API_KEY/);
  assert.equal(resolveWayglassRoute('missing'), null);
});

test('registered GPT route is server resolved and extensible', () => {
  const route = resolveWayglassRoute('openai:gpt');
  assert.equal(route.provider, 'openai');
  assert.equal(route.capabilities.text, true);
  assert.equal(typeof route.model, 'function');
});


test('Wayglass material signals preserve semantics without letting visual state become canon', () => {
  assert.deepEqual(normaliseMaterialSignal({
    strength: 1.4,
    intent: 0.83,
    channel: 'OOC',
    ownership: 1,
    handoff_progress: 0.64,
    canon_state: 'unresolved',
    mode: 'handoff',
  }), {
    strength: 1,
    intent: 0.83,
    channel: 'OOC',
    ownership: 1,
    handoff_progress: 0.64,
    canon_state: 'unresolved',
    mode: 'handoff',
  });

  assert.deepEqual(normaliseMaterialSignal({
    channel: 'invented-channel',
    canon_state: 'definitely-canon',
    handoff_progress: -4,
  }), {
    strength: 0.72,
    intent: 0,
    channel: 'IC',
    ownership: 0,
    handoff_progress: 0,
    canon_state: 'candidate',
    mode: 'wake',
  });
});


test('Wayglass pointer choreography clamps optical motion inputs', () => {
  assert.deepEqual(pointerMaterialState({
    x: 500,
    y: 250,
    width: 1000,
    height: 500,
    velocity: 0.8,
  }), {
    x: 0.5,
    y: 0.5,
    velocity: 0.5,
  });

  assert.deepEqual(pointerMaterialState({
    x: -10,
    y: 900,
    width: 0,
    height: 100,
    velocity: 99,
  }), {
    x: 0,
    y: 1,
    velocity: 1,
  });
});


test('Wayglass keyboard commands remain deterministic and text-entry safe', () => {
  assert.equal(commandForKeyboardEvent({ altKey: true, code: 'KeyI' }), 'channel:ic');
  assert.equal(commandForKeyboardEvent({ altKey: true, code: 'KeyO' }), 'channel:ooc');
  assert.equal(commandForKeyboardEvent({ altKey: true, code: 'KeyR' }), 'focus:route');
  assert.equal(commandForKeyboardEvent({ altKey: true, code: 'KeyW' }), 'focus:composer');
  assert.equal(commandForKeyboardEvent({ altKey: true, ctrlKey: true, code: 'KeyW' }), null);
  assert.equal(commandForKeyboardEvent({ code: 'KeyW' }), null);
});

test('Wayglass embodiment contract describes host capabilities without redefining identity', async () => {
  const fake = {
    addEventListener() {},
    isSecureContext: true,
    navigator: {
      maxTouchPoints: 5,
      vibrate() {},
      platform: 'TestBody',
      xr: {
        async isSessionSupported(mode) {
          return mode === 'immersive-ar';
        },
      },
    },
    matchMedia(query) {
      return { matches: query === '(pointer: fine)' };
    },
  };

  assert.deepEqual(detectEmbodimentCapabilities(fake), {
    schema: 'wayglass.embodiment/v0.1',
    keyboard: true,
    touch: true,
    fine_pointer: true,
    hover: false,
    vibration: true,
    webxr: true,
    secure_context: true,
    platform_hint: 'TestBody',
  });
  assert.deepEqual(await detectARSupport(fake), {
    supported: true,
    reason: 'immersive-ar-supported',
  });
});


test('Wayglass kernel boots local-first without claiming the seed model is native Wayglass', () => {
  const boot = bootWayglassKernel({
    world_id: 'wayglass:test-world',
    embodiment: {
      body_id: 'android:test',
      body_class: 'android',
      platform_hint: 'Android',
      keyboard: true,
      touch: true,
      ar: true,
      haptics: true,
    },
  });

  assert.equal(boot.schema, 'wayglass.kernel/v0.1');
  assert.equal(boot.system_id, 'wayglass');
  assert.equal(boot.world.world_id, 'wayglass:test-world');
  assert.equal(boot.cognition.route_id, 'local:ollama');
  assert.equal(boot.cognition.provider, 'ollama');
  assert.equal(boot.cognition.native_wayglass_model, false);
  assert.equal(boot.continuity.identity_is_not_body, true);
  assert.equal(boot.continuity.continuity_is_not_substrate, true);
  assert.equal(boot.embodiment.body_class, 'android');
  assert.equal(boot.embodiment.ar, true);
});

test('local Ollama route is explicit seed substrate, not a promoted Wayglass-native model', () => {
  const route = resolveWayglassRoute('local:ollama');
  assert.equal(route.provider, 'ollama');
  assert.equal(route.lineage.kind, 'external-seed');
  assert.equal(route.lineage.native_wayglass, false);
  assert.equal(route.capabilities.local, true);
  assert.equal(route.capabilities.thinking, true);
});


test('HUMAIN Node route is registered as external preview infrastructure', () => {
  const route = resolveWayglassRoute('humain:m3-preview');
  assert.equal(route.provider, 'humain-node');
  assert.equal(route.lineage.kind, 'external-preview-route');
  assert.equal(route.lineage.native_wayglass, false);
  assert.equal(route.capabilities.text, true);
  assert.equal(route.capabilities.image, false);
  assert.equal(route.capabilities.video, false);
  assert.equal(route.capabilities.preview, true);
  assert.equal(route.upstream_capabilities.image, true);
  assert.equal(route.upstream_capabilities.video, true);
  assert.equal(route.upstream_capabilities.tools, true);
  assert.equal(typeof route.api_key, 'function');
  assert.equal(typeof route.catalogue_endpoint, 'function');
});

test('public HUMAIN route metadata never exposes the Node key', () => {
  const routes = publicWayglassRoutes();
  const humain = routes.find((route) => route.route_id === 'humain:m3-preview');
  assert.ok(humain);
  const json = JSON.stringify(humain);
  assert.doesNotMatch(json, /HUMAIN_NODE_KEY/);
  assert.doesNotMatch(json, /api_key/i);
});


test('HUMAIN sandbox route is isolated from preview credentials and marked non-native', () => {
  const route = resolveWayglassRoute('humain:m3-sandbox');
  assert.equal(route.provider, 'humain-node');
  assert.equal(route.environment, 'sandbox');
  assert.equal(route.lineage.kind, 'external-sandbox-route');
  assert.equal(route.lineage.native_wayglass, false);
  assert.equal(route.capabilities.sandbox, true);
  assert.equal(typeof route.api_key, 'function');
  assert.equal(typeof route.catalogue_endpoint, 'function');
});

test('public HUMAIN sandbox metadata never exposes sandbox credential names or values', () => {
  const routes = publicWayglassRoutes();
  const sandbox = routes.find((route) => route.route_id === 'humain:m3-sandbox');
  assert.ok(sandbox);
  const json = JSON.stringify(sandbox);
  assert.doesNotMatch(json, /HUMAIN_NODE_SANDBOX_KEY/);
  assert.doesNotMatch(json, /api_key/i);
});
