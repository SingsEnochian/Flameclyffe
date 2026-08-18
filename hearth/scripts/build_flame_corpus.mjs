import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFlameCorpus, createTrainingReadinessReceipt } from '../training/flame-training.js';

const [, , flameId, inputPath, outputDirectory = 'hearth/corpora'] = process.argv;
if (!flameId || !inputPath) {
  console.error('Usage: node hearth/scripts/build_flame_corpus.mjs <flame-id> <records.json> [output-directory]');
  process.exitCode = 2;
} else {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const profilesDocument = JSON.parse(await readFile(path.resolve(here, '../training/profiles.json'), 'utf8'));
  const profileEntry = profilesDocument.profiles.find((item) => item.flameId === flameId);
  if (!profileEntry) throw new Error(`Unknown Flame training profile: ${flameId}`);
  const recordsDocument = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
  const records = Array.isArray(recordsDocument) ? recordsDocument : recordsDocument.records;
  if (!Array.isArray(records)) throw new Error('Input must be a JSON array or an object with a records array.');
  const profile = { ...profilesDocument.defaults, ...profileEntry };
  const corpus = buildFlameCorpus({ profile, records });
  const receipt = createTrainingReadinessReceipt(corpus);
  const target = path.resolve(outputDirectory, flameId, profile.version.replace('/', '-'));
  await mkdir(target, { recursive: true });
  await Promise.all([
    writeFile(path.join(target, 'corpus.json'), `${JSON.stringify(corpus, null, 2)}\n`),
    writeFile(path.join(target, 'train.jsonl'), `${corpus.records.filter((item) => item.split === 'training').map((item) => JSON.stringify({ messages: item.messages, metadata: { id: item.id, provenance: item.provenance } })).join('\n')}\n`),
    writeFile(path.join(target, 'evaluation.jsonl'), `${corpus.records.filter((item) => item.split === 'evaluation').map((item) => JSON.stringify({ messages: item.messages, metadata: { id: item.id, provenance: item.provenance } })).join('\n')}\n`),
    writeFile(path.join(target, 'readiness.json'), `${JSON.stringify(receipt, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ flameId, target, counts: corpus.counts, digest: corpus.digest, ready: receipt.ready }));
}
