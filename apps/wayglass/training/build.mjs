import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFlameCorpus, createTrainingReadinessReceipt } from '../../../hearth/training/flame-training.js';

// This is a corpus preparation tool, NOT a model training or deployment job.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const profile = JSON.parse(await readFile(path.join(here, 'profile.json'), 'utf8'));
const records = JSON.parse(await readFile(path.join(here, 'seed-records.json'), 'utf8'));
if (profile.flameId !== 'wayglass' || profile.trainingTarget !== 'retrieval-and-evaluation') {
  throw new Error('Wayglass v0.1 must remain a ship-scoped, review-only learning profile.');
}
if (!Array.isArray(records) || records.some((item) =>
  !String(item.id || '').startsWith('synthetic:wayglass-v01:') ||
  item.provenance?.type !== 'synthetic')) {
  throw new Error('The seed bundle must contain only explicitly synthetic, attributed examples.');
}
const corpus = buildFlameCorpus({ profile, records });
const readiness = createTrainingReadinessReceipt(corpus); // Deliberately closed until independent review.
const outputBase = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'hearth/corpora');
const output = path.join(outputBase, 'wayglass', 'wayglass-v0.1');
await mkdir(output, { recursive: true });
const jsonl = (split) => corpus.records.filter((r) => r.split === split)
  .map((r) => JSON.stringify({ messages: r.messages, metadata: { id: r.id, provenance: r.provenance } })).join('\n') + '\n';
await Promise.all([
  writeFile(path.join(output, 'corpus.json'), JSON.stringify(corpus, null, 2) + '\n'),
  writeFile(path.join(output, 'train.jsonl'), jsonl('training')),
  writeFile(path.join(output, 'evaluation.jsonl'), jsonl('evaluation')),
  writeFile(path.join(output, 'readiness.json'), JSON.stringify(readiness, null, 2) + '\n'),
]);
console.log(JSON.stringify({ output, admitted: corpus.counts.admitted,
  rejected: corpus.counts.rejected, digest: corpus.digest,
  trainingReady: readiness.ready, weightsChanged: corpus.authority.weightsChanged }));
