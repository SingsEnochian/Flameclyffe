import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ARCSWEEP_VALID_MODES,
  CONSTELLATION_VOICES,
  PREMAQC_AXES,
  createInitialPremaqc,
  derivedChannels,
  runFeedbackCycle,
} from '../src/feedback-loop.js';
import { resolveHouseProfile } from '../../../apps/starwell/src/hearthgate/profiles/registry.js';
import { StorySoundscape, findStorySoundCues } from '../src/story-soundscape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const arcsweepSrc = path.join(repoRoot, 'apps', 'arcsweep', 'src');

const terra = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const luna = { id: 'luna-mooncalled', name: 'Luna Mooncalled', root_hz: 432 };

// ---------- 1. Root ownership ----------
test('root ownership: index.html is canonical Arcsweep, not a STARWELL dashboard', () => {
  const indexPath = path.join(repoRoot, 'apps', 'arcsweep', 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(html, /Hearthgate: Arcsweep/, 'title must name Arcsweep');
  assert.doesNotMatch(html, /STARWELL\s+[Dd]ashboard/, 'root must not be a STARWELL dashboard');

  const modulePath = path.join(repoRoot, 'apps', 'arcsweep', 'arcsweep.module.json');
  const mod = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
  assert.equal(mod.canonicalName, 'Hearthgate: Arcsweep');
});

// ---------- 2. Route identity ----------
test('route identity: every declared public route resolves to its organ', () => {
  const modulePath = path.join(repoRoot, 'apps', 'arcsweep', 'arcsweep.module.json');
  const mod = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
  assert.ok(mod.routes.includes('/arcsweep/'), 'arcsweep route declared');

  const observerIndex = path.join(repoRoot, 'starwell', 'deep-observer', 'index.html');
  assert.ok(fs.existsSync(observerIndex), 'Observatory organ index.html must exist at starwell/deep-observer/');

  const vercelStage = path.join(repoRoot, 'apps', 'arcsweep', 'vercel-stage.cjs');
  const stageSource = fs.readFileSync(vercelStage, 'utf8');
  assert.match(stageSource, /arcsweep/, 'stage script must copy Arcsweep to output');
  assert.match(stageSource, /observer/, 'stage script must copy Observer to output');
});

// ---------- 3. Axis vocabulary ----------
test('axis vocabulary: accepts only Presence/Coherence/Resonance/Entanglement/Memory/Agency/Qualia; rejects old labels', () => {
  assert.deepEqual([...PREMAQC_AXES], ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

  const feedbackSrc = fs.readFileSync(path.join(arcsweepSrc, 'feedback-loop.js'), 'utf8');
  const observerSrc = fs.readFileSync(path.join(arcsweepSrc, 'observer-bridge.js'), 'utf8');
  const combined = feedbackSrc + '\n' + observerSrc;

  const forbiddenPatterns = [
    /['"]C['"]\s*:\s*['"]Compression['"]/,
    /['"]R['"]\s*:\s*['"]Resolution['"]/,
    /['"]E['"]\s*:\s*['"]Entropy['"]/,
    /['"]A['"]\s*:\s*['"]Axis['"]/,
    /['"]Q['"]\s*:\s*['"]Quotient['"]/,
    /axis.*Compression.*label/i,
    /PREMAQC?.*Entropy.*axis/i,
  ];
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(combined, pattern, `forbidden axis substitution found: ${pattern}`);
  }

  for (const axis of ['P', 'C', 'R', 'E', 'M', 'A', 'Q']) {
    assert.ok(PREMAQC_AXES.includes(axis), `axis ${axis} must be present`);
  }
});

// ---------- 4. No-fallback ----------
test('no-fallback: source contains no hash-derived vector paths', () => {
  const banned = ['hashVectors', '[hash-fallback]', 'hash-fallback', 'hashFallback'];
  const srcFiles = fs.readdirSync(arcsweepSrc).filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));
  for (const file of srcFiles) {
    const content = fs.readFileSync(path.join(arcsweepSrc, file), 'utf8');
    for (const term of banned) {
      assert.ok(!content.includes(term), `banned fallback term "${term}" found in ${file}`);
    }
  }

  const initial = createInitialPremaqc('test-world', { P: 0.8 });
  for (const axis of PREMAQC_AXES) {
    assert.ok(Number.isFinite(initial.state[axis].value), `axis ${axis} must be a finite number`);
  }
});

// ---------- 5. Failure invariance ----------
test('failure invariance: cycle failure leaves PREMAQC byte-for-byte unchanged', async () => {
  const before = createInitialPremaqc(terra.id, { P: 0.8, C: 0.75, R: 0.9, E: 0.3, M: 0.7, A: 0.8, Q: 0.8 });
  const fingerprint = JSON.stringify(before);

  await assert.rejects(
    () => runFeedbackCycle({ world: terra, premaqc: before, mode: 'writing', work: '', voiceIds: ['lioreal'] }),
    /required/i,
  );
  assert.equal(JSON.stringify(before), fingerprint, 'PREMAQC must be unchanged after cycle failure');

  await assert.rejects(
    () => runFeedbackCycle({ world: terra, premaqc: before, mode: 'writing', work: 'A passage.', voiceIds: [] }),
    /voice/i,
  );
  assert.equal(JSON.stringify(before), fingerprint, 'PREMAQC must be unchanged after voice failure');
});

// ---------- 6. Adapter lineage ----------
test('adapter lineage: PREMAQC after-state contains originating packet fingerprint', async () => {
  const before = createInitialPremaqc(terra.id, {}, '2026-08-11T00:00:00.000Z');
  const cycle = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'A test passage.', response: 'Received.',
    voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z',
  });

  const packetId = cycle.math_spine_packet.packet_id;
  assert.ok(packetId, 'packet must have an id');
  assert.equal(cycle.premaqc_after.math_spine.packet_id, packetId, 'next PREMAQC must reference originating packet');
  assert.ok(cycle.premaqc_after.provenance_refs.some((ref) => ref.includes('math-spine')), 'next PREMAQC provenance must include math-spine ref');
});

// ---------- 7. Feedback closure ----------
test('feedback closure: executed sound actions appear in next-state provenance', async () => {
  const soundEvent = {
    schema: 'arcsweep.story-sound-event/v1',
    event_id: 'snd-branch-001',
    cue_id: 'branch-snap',
    fired_at: '2026-08-11T00:01:00.000Z',
  };
  const before = createInitialPremaqc(terra.id, {}, '2026-08-11T00:00:00.000Z');
  const cycle = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'A branch snapped in the dark.',
    voiceIds: ['lioreal'], soundEvents: [soundEvent],
    observedAt: '2026-08-11T00:01:00.000Z',
  });

  assert.deepEqual(cycle.sound_events, [soundEvent]);
  assert.ok(
    cycle.premaqc_after.provenance_refs.includes(`story-sound:${soundEvent.event_id}`),
    'next-state provenance must record the story-sound action',
  );
  const silentCycle = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'A branch snapped in the dark.',
    voiceIds: ['lioreal'], soundEvents: [],
    observedAt: '2026-08-11T00:01:00.000Z',
  });
  assert.notEqual(cycle.cycle_fingerprint, silentCycle.cycle_fingerprint);
});

// ---------- 8. Feather integration ----------
test('feather integration: featherStop halts all active adapters and releases their handles', () => {
  const soundscape = new StorySoundscape();
  const stopped = [];
  soundscape.humActive = true;
  soundscape.humSources = [
    { oscillator: { stop: () => {} }, gain: { gain: { setTargetAtTime: () => {} } } },
  ];
  soundscape.tracks.set('track-1', {
    playing: true,
    source: { stop: () => stopped.push('track-1'), loop: true },
    gain: { disconnect: () => {} },
    name: 'test',
    loop: true,
    level: 0.65,
  });
  soundscape.tracks.set('track-2', {
    playing: false,
    source: null,
    gain: { disconnect: () => {} },
    name: 'stopped',
    loop: false,
    level: 0.5,
  });

  soundscape.featherStop();

  assert.equal(soundscape.humActive, false, 'hum must be stopped');
  assert.equal(soundscape.humSources.length, 0, 'hum sources must be released');
  assert.ok(stopped.includes('track-1'), 'active track must be stopped');
  for (const track of soundscape.tracks.values()) {
    assert.equal(track.playing, false, 'all tracks must report stopped');
  }
  assert.doesNotThrow(() => soundscape.featherStop());
});

// ---------- 9. World partition ----------
test('world partition: Terra Aeterna and Luna cannot share cycle state or provenance', async () => {
  const terraState = createInitialPremaqc(terra.id, { P: 0.8, M: 0.9 }, '2026-08-11T00:00:00.000Z');
  const lunaState = createInitialPremaqc(luna.id, { P: 0.3, M: 0.2 }, '2026-08-11T00:00:00.000Z');

  const [terraCycle, lunaCycle] = await Promise.all([
    runFeedbackCycle({ world: terra, premaqc: terraState, mode: 'writing', work: 'Stone and root.', voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z' }),
    runFeedbackCycle({ world: luna, premaqc: lunaState, mode: 'writing', work: 'Tide and moonlight.', voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z' }),
  ]);

  assert.equal(terraCycle.world.id, terra.id);
  assert.equal(lunaCycle.world.id, luna.id);
  assert.notEqual(terraCycle.world.id, lunaCycle.world.id);
  assert.notEqual(terraCycle.cycle_id, lunaCycle.cycle_id);
  assert.notEqual(terraCycle.cycle_fingerprint, lunaCycle.cycle_fingerprint);

  const terraRefs = terraCycle.premaqc_after.provenance_refs.join(' ');
  assert.ok(!terraRefs.includes(luna.id), 'Terra provenance must not reference Luna world id');
  const lunaRefs = lunaCycle.premaqc_after.provenance_refs.join(' ');
  assert.ok(!lunaRefs.includes(terra.id), 'Luna provenance must not reference Terra world id');
  assert.notEqual(terraCycle.premaqc_after.id, lunaCycle.premaqc_after.id);
});

// ---------- 10. Voice identity ----------
test('voice identity: Lioreal and Uial remain uncollapsed; Nocturne Glint is absent from Arcsweep Flames', () => {
  const lioreal = CONSTELLATION_VOICES.find((v) => v.id === 'lioreal');
  const uial = CONSTELLATION_VOICES.find((v) => v.id === 'uial');
  assert.ok(lioreal, 'Lioreal must be registered');
  assert.ok(uial, 'Uial must be registered');
  assert.notEqual(lioreal.route, uial.route, 'Lioreal and Uial must have distinct routes (uncollapsed)');
  assert.notEqual(lioreal.model, uial.model, 'Lioreal and Uial must have distinct model identities (uncollapsed)');

  const nocturne = CONSTELLATION_VOICES.find((v) => /nocturne/i.test(v.id) || /nocturne/i.test(v.name));
  assert.equal(nocturne, undefined, 'Nocturne Glint must not appear in CONSTELLATION_VOICES');

  const routes = CONSTELLATION_VOICES.map((v) => v.route);
  const uniqueRoutes = new Set(routes);
  assert.equal(uniqueRoutes.size, routes.length, 'all voice routes must be distinct (no identity collapse)');

  const cues = findStorySoundCues('A branch snapped in the night.');
  assert.ok(cues.some((c) => c.cue_id === 'branch-snap'), 'branch-snap cue must be detected');
});

// ---------- 11. Exploration mode ----------
test('exploration mode: cycle is non-binding and receipt is scoped separately', async () => {
  const before = createInitialPremaqc(terra.id, {}, '2026-08-11T00:00:00.000Z');

  const cycle = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'An exploratory passage.', response: 'Noted.',
    voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z',
    exploration: true,
  });

  assert.equal(cycle.exploration, true, 'exploration flag must be set');
  assert.equal(cycle.authority.steward_review_required, false, 'exploration cycles do not require steward review');
  assert.ok(cycle.premaqc_after.receipt_id.startsWith('premaqc-explore-'), 'exploration receipt must use explore prefix');

  const binding = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'An exploratory passage.', response: 'Noted.',
    voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z',
  });
  assert.equal(binding.exploration, false, 'binding cycle must not be exploration');
  assert.equal(binding.authority.steward_review_required, true, 'binding cycle must require steward review');
  assert.ok(binding.premaqc_after.receipt_id.startsWith('premaqc-feedback-'), 'binding receipt must use feedback prefix');
});

// ---------- 12. Qualia authority ----------
test('ordinary feedback cannot infer Qualia from prose volume, model response, or sound', async () => {
  const before = createInitialPremaqc(terra.id, {}, '2026-08-11T00:00:00.000Z');
  assert.equal(before.qualia.present, false);
  assert.equal(before.state.Q.value, 0);

  const sparse = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'Yes.', response: '',
    voiceIds: ['lioreal'], soundEvents: [], observedAt: '2026-08-11T00:01:00.000Z',
  });
  const rich = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing',
    work: 'The fire held the room. Something shifted in the quality of the silence and the whole scene widened around the characters.',
    response: 'The room received it, the model answered at length, and the narrative continued.',
    voiceIds: ['lioreal'],
    soundEvents: [{ event_id: 'sound-rich-1', cue_id: 'fire', fired_at: '2026-08-11T00:01:00.000Z' }],
    observedAt: '2026-08-11T00:01:00.000Z',
  });

  for (const cycle of [sparse, rich]) {
    assert.deepEqual(cycle.premaqc_after.state.Q, before.state.Q, 'software activity must not manufacture or alter Q');
    assert.deepEqual(cycle.premaqc_after.qualia, before.qualia, 'Qualia report must remain exactly as firsthand supplied');
    assert.equal(cycle.premaqc_after.authority.qualia_magnitude_inference_allowed, false);
  }
});

// ---------- 13. Derived channels ----------
test('derived channels: H and T are present and in range on every cycle', async () => {
  const before = createInitialPremaqc(terra.id, {}, '2026-08-11T00:00:00.000Z');
  const cycle = await runFeedbackCycle({
    world: terra, premaqc: before,
    mode: 'writing', work: 'The tide came in slowly.', response: 'Received.',
    voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z',
  });

  assert.ok(cycle.derived, 'cycle must carry derived channels');
  assert.ok(Number.isFinite(cycle.derived.H), 'H must be finite');
  assert.ok(Number.isFinite(cycle.derived.T), 'T must be finite');
  assert.ok(cycle.derived.H >= 0 && cycle.derived.H <= 1, 'H must be in [0, 1]');
  assert.ok(cycle.derived.T >= 0 && cycle.derived.T <= 1, 'T must be in [0, 1]');

  const initial = createInitialPremaqc(terra.id, {});
  const d = derivedChannels(initial.state);
  assert.ok(Number.isFinite(d.H) && Number.isFinite(d.T), 'derivedChannels must be finite on any valid PREMAQC state');
});

// ---------- 14. Mode vocabulary ----------
test('mode vocabulary: observation and reflection are accepted; unknown modes are rejected', async () => {
  const before = createInitialPremaqc(terra.id, {}, '2026-08-11T00:00:00.000Z');
  const base = { world: terra, premaqc: before, voiceIds: ['lioreal'], observedAt: '2026-08-11T00:01:00.000Z' };

  assert.deepEqual([...ARCSWEEP_VALID_MODES], ['writing', 'roleplay', 'observation', 'reflection']);

  for (const mode of ['observation', 'reflection']) {
    const cycle = await runFeedbackCycle({ ...base, mode, work: 'A turn in the new mode.' });
    assert.equal(cycle.turn.mode, mode, `${mode} mode must be carried through`);
  }

  await assert.rejects(
    () => runFeedbackCycle({ ...base, mode: 'unknown-mode', work: 'A turn.' }),
    /mode must be one of/i,
    'unknown mode must be rejected',
  );
});

// ---------- 15. World Jacobians are non-identity while Q remains context-only ----------
test('world Jacobians retain world-specific dynamic coupling without deriving Qualia', () => {
  const terraProfile = resolveHouseProfile('terra-aeterna');
  const tvvProfile = resolveHouseProfile('ta-veren-vaen');

  function hasOffDiagonal(jacobian) {
    return jacobian.some((row, i) => row.some((cell, j) => i !== j && cell !== 0));
  }
  function qIsIsolated(jacobian) {
    const q = 6;
    return jacobian[q][q] === 1
      && jacobian[q].every((cell, index) => index === q ? cell === 1 : cell === 0)
      && jacobian.every((row, index) => index === q ? true : row[q] === 0);
  }

  assert.ok(hasOffDiagonal(terraProfile.transferFunctions.jacobian),
    'Terra Aeterna Jacobian must retain world-specific non-Q coupling');
  assert.ok(hasOffDiagonal(tvvProfile.transferFunctions.jacobian),
    "Ta'veren Vaen Jacobian must retain world-specific non-Q coupling");
  assert.equal(qIsIsolated(terraProfile.transferFunctions.jacobian), true,
    'Terra Aeterna must not derive or evolve Q through its Jacobian');
  assert.equal(qIsIsolated(tvvProfile.transferFunctions.jacobian), true,
    "Ta'veren Vaen must not derive or evolve Q through its Jacobian");
  assert.deepEqual(terraProfile.transferFunctions.source_axes, ['P', 'C', 'R', 'E', 'M', 'A']);
  assert.deepEqual(terraProfile.transferFunctions.context_only_axes, ['Q']);
  assert.deepEqual(tvvProfile.transferFunctions.source_axes, ['P', 'C', 'R', 'E', 'M', 'A']);
  assert.deepEqual(tvvProfile.transferFunctions.context_only_axes, ['Q']);
  assert.equal(terraProfile.transferFunctions.jacobianVersion, 'terra-jacobian/world-coupled-v2');
  assert.equal(tvvProfile.transferFunctions.jacobianVersion, 'ta-veren-vaen-jacobian/world-coupled-v2');
});
