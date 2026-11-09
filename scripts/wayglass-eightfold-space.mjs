// Run Wayglass's four Eightfold engines together, in one process:
//   npm run wayglass:eightfold
// Optional: --sources=path/to/quad-sources.json for a real six-channel observer packet
// from an authorised adapter. Without it the observer channels are reported as
// unavailable, never invented. No model, audio, persistence or canon change.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { runEightfoldSpace } = require('../lib/wayglass-eightfold-space.cjs');
const { TABLES } = require('../lib/wayglass-quad-eightfold.cjs');

const at = new Date().toISOString();
const arg = process.argv.find(a => a.startsWith('--sources='));
const quadSources = arg ? JSON.parse(readFileSync(arg.slice(10), 'utf8')) : {
  schema: 'wayglass.quad-sources/v1', observed_at: at,
  channels: TABLES.map(id => ({ id, status: 'unavailable', count: null, latest_at: null, provenance: 'no-authorised-adapter-in-this-run' })),
};
const crossing = {
  world_id: 'wayglass:home', participant_id: 'participant:rowan', embodiment: { body_class: 'host-os' },
  explicit_consent: true, gateway_focus: 'unclassified',
  gateway_observation: { kind: 'firsthand', actor_id: 'participant:rowan', source_ref: 'conversation:2026-11-09T02:50-05:00',
    content: 'Pull em across to the same space.' },
  wayglass_observation: { kind: 'instrument', actor_id: 'instrument:wayglass-eightfold-space',
    source_ref: 'script:wayglass-eightfold-space.mjs', content: 'Phase alignment of the four Eightfold engines, checked at start.' },
  identity_declarations: [{ participant_id: 'participant:rowan', declaration: 'owner-steward of Wayglass (repository owner)' }],
  unresolved_wonder_questions: ['Does this help the ship travel, learn, encounter, transform, preserve its people and histories, cross a boundary, return, or discover how far it can sail? (WAYGLASS_CORE_RULE drift check)'],
  provenance_refs: ['docs/wayglass/WAYGLASS_CORE_RULE.md'], next_owner: 'participant:rowan',
  stop_point: 'Return to Rowan with every engine receipt intact.', recorded_at: at,
};
const quadContinuity = { participant_ref: 'wayglass', world_ref: 'wayglass:home', stop_point: crossing.stop_point,
  next_owner: 'participant:rowan', unresolved_wonder_questions: crossing.unresolved_wonder_questions, revoked_refs: [] };

const r = await runEightfoldSpace({ crossing, quadSources, quadContinuity });
const line = (k, v) => console.log(k.padEnd(16), v);
console.log('\nWAYGLASS · EIGHTFOLD SPACE  ' + r.space.phases.join(' → ') + '  · centre: ' + r.space.center);
line('phases aligned', r.space.aligned + ' (' + r.space.engines.length + ' engines)');
const w = r.receipts.wyrdrune, d = r.receipts['double-mobius'], o = r.receipts['mobius-octo'], q = r.receipts['quad-eightfold'];
line('wyrdrune', `${w.status} · output ${JSON.stringify(w.output)} · carry ${JSON.stringify(w.carry)} · faces ${w.checkpoints.join('/')}`);
line('double-mobius', `${d.status} · orientation ${d.orientation.start}→${d.orientation.after_gateway}→${d.orientation.after_wayglass} · ${d.lanes} lanes · return ${d.return_verdict}`);
line('mobius-octo', `${o.cores} cores · peak ${o.peak_concurrency} · ` + o.lineages.map(l => `${l.system.split(':')[1]} ${l.status}${l.chain_ok ? '✓' : '✗'}`).join(', '));
line('quad-eightfold', `${q.phase_records} phase records · ${q.completed_cycles} cycle · sources: ${quadSources.channels.map(c => c.status).join('/')} · weights updated: ${q.model_weight_updates}`);
line('commits', `model ${r.model_invoked} · audio ${r.audio_started} · persisted ${r.persisted} · canon ${r.canon_commit}\n`);
