import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AEMETH_MODEL_PARTICIPANTS,
  buildAemethParticipantPacket,
  buildAemethParticipantPrompt,
  createAemethReplayEnvelope,
  invokeAemethParticipant,
} from '../src/aemeth-lens.js';

test('Ox Alpha is a distinct Aemeth model witness with route-resolved provider provenance', () => {
  const oa = AEMETH_MODEL_PARTICIPANTS.find((item) => item.id === 'oxalpha');
  assert.equal(oa?.displayName, 'Ox Alpha');
  assert.equal(oa?.captionLabel, 'OA');
  assert.equal(oa?.route, 'oxalpha');
  assert.equal(oa?.provider, 'route-resolved-at-invocation');
  assert.equal(oa?.model, 'GLM-5.3-Flash');
  assert.equal(oa?.providerRoutes?.house?.provider, 'huggingface-inference-providers');
  assert.equal(oa?.providerRoutes?.house?.model, 'zai-org/GLM-5.3-Flash');
  assert.equal(oa?.providerRoutes?.portable?.provider, 'openrouter');
  assert.equal(oa?.providerRoutes?.portable?.model, 'z-ai/glm-5.3-flash');
  assert.match(oa?.authority || '', /never inferred Qualia/i);
});

test('Aemeth participant packet preserves firsthand witness authority and blocks Qualia inference', () => {
  const packet = buildAemethParticipantPacket({
    id: 'working-1',
    instrumentProfile: 'Aemeth Shewstone 001 · physical sphere',
    phase: 'Observation',
    ask: 'What changes with observer angle?',
    witnessRaw: 'The seal appears to widen as my angle changes.',
    activeDiagram: 'Sigillum Dei Aemeth',
  });
  assert.equal(packet.participant.id, 'oxalpha');
  assert.equal(packet.firsthandWitness.authority, 'Rowan-authored firsthand report only');
  assert.equal(packet.firsthandWitness.qualiaInferenceAllowed, false);
  assert.equal(packet.authority.modelMayInferQualia, false);
  assert.equal(packet.authority.modelMayRewriteFirsthandWitness, false);
  assert.equal(packet.authority.modelMayCommitCanon, false);
  const prompt = buildAemethParticipantPrompt(packet);
  assert.match(prompt, /not physically looking through Rowan’s shewstone/i);
  assert.match(prompt, /Keep three layers distinct/i);
});

test('Aemeth replay envelope carries model witnesses without replacing Rowan witness', () => {
  const envelope = createAemethReplayEnvelope({
    witnessRaw: 'firsthand',
    modelParticipant: 'Ox Alpha',
    modelWitnessLog: 'OA lane text',
    interpretation: 'later interpretation',
    modelWitnesses: [{ participantId: 'oxalpha', text: 'structural reading' }],
  });
  assert.equal(envelope.witnessRaw, 'firsthand');
  assert.equal(envelope.modelParticipant, 'Ox Alpha');
  assert.equal(envelope.modelWitnessLog, 'OA lane text');
  assert.equal(envelope.interpretation, 'later interpretation');
  assert.equal(envelope.modelWitnesses[0].participantId, 'oxalpha');
});

test('Aemeth OA House invocation preserves actual provider/model provenance', async () => {
  let request = null;
  const result = await invokeAemethParticipant({
    token: 'house-token',
    record: { id: 'working-1', phase: 'Observation', witnessRaw: 'A shape shifted.' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        async json() {
          return {
            flame_id: 'oxalpha',
            display_name: 'Ox Alpha',
            provider: 'huggingface-inference-providers',
            model: 'zai-org/GLM-5.3-Flash',
            message: 'Interpretation: the reported change is consistent with an observer-angle transformation.',
            cited_sources: [],
          };
        },
      };
    },
  });
  assert.equal(request.url, '/api/v1/flames/oxalpha/chat');
  assert.equal(request.options.headers.authorization, 'Bearer house-token');
  assert.match(JSON.parse(request.options.body).message, /AEMETH CHAMBER · MODEL WITNESS TURN/);
  assert.equal(result.participantId, 'oxalpha');
  assert.equal(result.provider, 'huggingface-inference-providers');
  assert.equal(result.model, 'zai-org/GLM-5.3-Flash');
  assert.equal(result.status, 'replied');
});

test('Aemeth OA invocation fails closed on identity mismatch', async () => {
  await assert.rejects(
    invokeAemethParticipant({
      token: 'house-token',
      record: { id: 'working-2' },
      fetchImpl: async () => ({
        ok: true,
        async json() { return { flame_id: 'lioreal', message: 'wrong voice' }; },
      }),
    }),
    /identity mismatch/i,
  );
});
