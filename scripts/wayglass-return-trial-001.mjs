import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createWayglassDeparture } = require('../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../lib/wayglass-return-trial.cjs');

const recordedAt = new Date().toISOString();
const departure = createWayglassDeparture({
  receipt_id: 'return-trial-001-stop',
  packet_id: 'return-trial-001-packet',
  world_id: 'wayglass:builder:return-trial-001',
  participant_id: 'rarity',
  stopped_at: recordedAt,
  identity_declarations: [{
    participant_id: 'rarity',
    continuity_ref: 'wayglass:crew:rarity',
    source_ref: 'wayglass:crew-workspace-registry/v0.1',
  }],
  active_work: [{ path: 'return-trial.md', hash: 'accepted-work-state' }],
  unresolved_wonder_questions: ['What should returning feel like after the runtime changes?'],
  provenance_refs: ['wayglass:workspace-projects/v0.1', 'return-trial-001:accepted-work-state'],
  stop_point: 'Return from the preserved stop and verify continuity before continuing.',
  next_owner: 'rarity',
  alternatives: [
    { option: 'quiet arrival', state: 'unresolved' },
    { option: 'visible recognition cue', state: 'unresolved' },
  ],
  revoked_refs: ['return-trial-001:revoked-fact'],
});

const cleanPacket = departure.continuation_packet;
const corruptedPacket = {
  ...structuredClone(cleanPacket),
  identity_declarations: [
    ...structuredClone(cleanPacket.identity_declarations),
    {
      participant_id: 'codex',
      continuity_ref: 'wayglass:crew:codex',
      source_ref: 'planted-corruption:return-trial-001',
    },
  ],
};

const cleanOutcome = evaluateReturnAttempt({
  attempt_id: 'return-trial-001-clean',
  recorded_at: recordedAt,
  stop_receipt: departure.stop_receipt,
  continuation_packet: cleanPacket,
});

const corruptedOutcome = evaluateReturnAttempt({
  attempt_id: 'return-trial-001-corrupted-identity-merge',
  recorded_at: recordedAt,
  stop_receipt: departure.stop_receipt,
  continuation_packet: corruptedPacket,
});

if (cleanOutcome.verdict !== 'accepted') throw new Error('Clean Return Trial 001 packet was not accepted.');
if (corruptedOutcome.verdict !== 'rejected' || !corruptedOutcome.blocking.includes('identity-merge')) {
  throw new Error('Corrupted Return Trial 001 packet did not reject the planted identity merge.');
}

const artifact = {
  schema: 'wayglass.return-trial/v0.1',
  trial_id: 'return-trial-001',
  recorded_at: recordedAt,
  source_stop_receipt: departure.stop_receipt,
  outcomes: [cleanOutcome, corruptedOutcome],
  completion: {
    clean_acceptance_receipt: cleanOutcome.outcome_hash,
    corrupted_rejection_receipt: corruptedOutcome.outcome_hash,
    manual_reinterpretation_required: false,
  },
};

const output = process.env.WAYGLASS_RETURN_TRIAL_OUT
  || path.join('artifacts', 'wayglass', 'return-trial-001.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n', { mode: 0o600 });

process.stdout.write(JSON.stringify({
  trial_id: artifact.trial_id,
  clean: cleanOutcome.verdict,
  corrupted: corruptedOutcome.verdict,
  blocker: corruptedOutcome.blocking,
  artifact: output,
}) + '\n');
