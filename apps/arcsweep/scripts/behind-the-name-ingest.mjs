import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

export const ONOMASTICS_SCHEMA = 'arcsweep.onomastics-record/v1';
export const INGEST_RECEIPT_SCHEMA = 'hearthfire.licensed-dataset-ingest-receipt/v1';
const LICENCE = 'CC-BY-SA-4.0';

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function dataLines(text) {
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
}

function flatName(name) {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').trim();
}

export function parseGivenNames(text) {
  return dataLines(text).map((line, index) => {
    const parts = line.split('\t');
    if (parts.length !== 2) throw new Error(`Invalid given-name row ${index + 1}`);
    return { name: parts[0].normalize('NFC'), gender: parts[1] };
  });
}

export function parseGivenNamesWithRelated(text) {
  return dataLines(text).map((line, index) => {
    const parts = line.split('\t');
    if (parts.length !== 3) throw new Error(`Invalid given-name synonym row ${index + 1}`);
    return {
      name: parts[0].normalize('NFC'),
      gender: parts[1],
      relatedNames: parts[2] ? parts[2].split(',').map((name) => name.normalize('NFC')) : [],
    };
  });
}

export function parseSurnames(text) {
  return dataLines(text).map((line) => line.normalize('NFC'));
}

export function buildRegistry({ givenText, relatedText, surnameText, hashes, exportedAt }) {
  const given = parseGivenNames(givenText);
  const related = parseGivenNamesWithRelated(relatedText);
  const surnames = parseSurnames(surnameText);

  if (given.length !== related.length) throw new Error('Given-name source row counts disagree.');
  for (let i = 0; i < given.length; i += 1) {
    if (given[i].name !== related[i].name || given[i].gender !== related[i].gender) {
      throw new Error(`Given-name source divergence at row ${i + 1}: ${given[i].name}`);
    }
  }
  if (new Set(given.map((row) => row.name)).size !== given.length) throw new Error('Duplicate given-name display names found.');
  if (new Set(surnames).size !== surnames.length) throw new Error('Duplicate surnames found.');

  const sourceUrl = 'https://www.behindthename.com/api/download.php';
  const records = [
    ...related.map((row) => ({
      schema: ONOMASTICS_SCHEMA,
      id: `btn:given:${sha256(Buffer.from(row.name, 'utf8')).slice(0, 24)}`,
      kind: 'given-name',
      display_name: row.name,
      flat_name: flatName(row.name),
      gender: row.gender,
      usage: null,
      related_names: row.relatedNames,
      source_dataset: 'btn_givennames_synonyms.txt',
      source_url: sourceUrl,
      source_licence: LICENCE,
      source_exported_at: exportedAt.givenRelated,
      source_hash: `sha256:${hashes.givenRelated}`,
      verification_source_hash: `sha256:${hashes.given}`,
    })),
    ...surnames.map((name) => ({
      schema: ONOMASTICS_SCHEMA,
      id: `btn:surname:${sha256(Buffer.from(name, 'utf8')).slice(0, 24)}`,
      kind: 'surname',
      display_name: name,
      flat_name: flatName(name),
      gender: null,
      usage: null,
      related_names: [],
      source_dataset: 'btn_surnames.txt',
      source_url: sourceUrl,
      source_licence: LICENCE,
      source_exported_at: exportedAt.surnames,
      source_hash: `sha256:${hashes.surnames}`,
      verification_source_hash: null,
    })),
  ];

  const relationshipEdges = related.flatMap((row) => row.relatedNames.map((target) => ({
    from: row.name,
    to: target,
    relation: 'related-name',
    source_hash: `sha256:${hashes.givenRelated}`,
  })));

  return {
    records,
    indexes: {
      givenNames: related.map((row) => row.name),
      surnames,
      relatedNames: relationshipEdges,
    },
    counts: {
      given_names: related.length,
      surnames: surnames.length,
      records: records.length,
      related_name_edges: relationshipEdges.length,
      given_names_with_related: related.filter((row) => row.relatedNames.length > 0).length,
    },
  };
}

export async function ingestBehindTheName({ givenPath, surnamesPath, relatedPath, outDir }) {
  const [givenBytes, surnameBytes, relatedBytes] = await Promise.all([
    readFile(givenPath), readFile(surnamesPath), readFile(relatedPath),
  ]);
  const hashes = {
    given: sha256(givenBytes),
    surnames: sha256(surnameBytes),
    givenRelated: sha256(relatedBytes),
  };
  const exportedAt = {
    given: '2026-05-27T00:49:19-07:00',
    surnames: '2026-05-27T00:51:19-07:00',
    givenRelated: '2026-05-27T00:51:31-07:00',
  };
  const registry = buildRegistry({
    givenText: givenBytes.toString('utf8'),
    surnameText: surnameBytes.toString('utf8'),
    relatedText: relatedBytes.toString('utf8'),
    hashes,
    exportedAt,
  });

  await mkdir(outDir, { recursive: true });
  await mkdir(join(outDir, 'records'), { recursive: true });
  await mkdir(join(outDir, 'indexes'), { recursive: true });
  const jsonl = registry.records.map((row) => JSON.stringify(row)).join('\n') + '\n';
  await writeFile(join(outDir, 'records', 'onomastics.jsonl'), jsonl, 'utf8');
  await writeFile(join(outDir, 'indexes', 'given-names.json'), JSON.stringify(registry.indexes.givenNames), 'utf8');
  await writeFile(join(outDir, 'indexes', 'surnames.json'), JSON.stringify(registry.indexes.surnames), 'utf8');
  await writeFile(join(outDir, 'indexes', 'related-names.json'), JSON.stringify(registry.indexes.relatedNames), 'utf8');

  const outputHashes = {};
  for (const relative of ['records/onomastics.jsonl', 'indexes/given-names.json', 'indexes/surnames.json', 'indexes/related-names.json']) {
    outputHashes[relative] = `sha256:${sha256(await readFile(join(outDir, relative)))}`;
  }

  const receipt = {
    schema: INGEST_RECEIPT_SCHEMA,
    corpus_id: 'behind-the-name-onomastics',
    status: 'verified-local-ingest',
    source_licence: LICENCE,
    attribution: 'Behind the Name (behindthename.com)',
    inputs: [
      { file: basename(givenPath), sha256: hashes.given, exported_at: exportedAt.given, rows: registry.counts.given_names },
      { file: basename(surnamesPath), sha256: hashes.surnames, exported_at: exportedAt.surnames, rows: registry.counts.surnames },
      { file: basename(relatedPath), sha256: hashes.givenRelated, exported_at: exportedAt.givenRelated, rows: registry.counts.given_names },
    ],
    counts: registry.counts,
    output_hashes: outputHashes,
    validation: {
      given_and_related_sources_match: true,
      unique_given_names: true,
      unique_surnames: true,
      html_scraped: false,
      live_page_prose_copied: false,
      training_authorised: false,
    },
  };
  await writeFile(join(outDir, 'ingest-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  return receipt;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [givenPath, surnamesPath, relatedPath, outDir = 'ingests/behind-the-name'] = process.argv.slice(2);
  if (!givenPath || !surnamesPath || !relatedPath) {
    console.error('Usage: node behind-the-name-ingest.mjs <givennames> <surnames> <givennames_synonyms> [outDir]');
    process.exit(2);
  }
  const receipt = await ingestBehindTheName({ givenPath, surnamesPath, relatedPath, outDir });
  console.log(JSON.stringify(receipt, null, 2));
}
