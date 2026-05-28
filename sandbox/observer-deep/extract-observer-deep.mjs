import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outRoot = path.join(__dirname, 'out');

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: npm run observer:extract -- sandbox/observer-deep/raw/my-entry.md');
  process.exit(1);
}

function section(text, heading) {
  const lines = text.split('\n');
  const headingLine = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === headingLine);

  if (start === -1) return '';

  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) break;
    body.push(lines[index]);
  }

  return body.join('\n').trim();
}

function lineValue(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(.*)$`, 'm');
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

function slugify(value, fallback = 'observer-deep-entry') {
  return (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function parseTags(rawTags, fallbackTags = []) {
  const tags = rawTags
    .split(',')
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);
  return Array.from(new Set([...tags, ...fallbackTags]));
}

function redactTelemetry(telemetry) {
  return telemetry
    .split('\n')
    .map((line) => {
      if (/^Location:/i.test(line)) return 'Location: Local Waking World field (precise coordinates redacted)';
      if (/^State vector:/i.test(line)) return 'State vector: preserved in private raw log; omitted from wiki field record';
      return line;
    })
    .join('\n');
}

function firstSentence(text) {
  const compact = text.replace(/\s+/g, ' ').trim();
  const match = compact.match(/^(.{1,220}?[.!?])\s/);
  return match ? match[1] : compact.slice(0, 220);
}

function buildWikiRecord({ title, glyph, telemetry, motifs, dreamingEvent, whatChanged, notes }) {
  const safeTelemetry = redactTelemetry(telemetry);
  return `# ${title}\n\n**Glyph:** ${glyph || 'Unspecified'}  \n**Motifs:** ${motifs || 'Unspecified'}\n\n## Context\n\n${safeTelemetry || 'No telemetry provided.'}\n\n## Dreaming Event\n\n${dreamingEvent || 'No Dreaming event recorded.'}\n\n## What Changed\n\n${whatChanged || 'No change statement recorded.'}\n\n## Interpretation\n\nThis record preserves the lore-facing pattern of the Observer DEEP event while keeping precise Waking World location and private raw state data out of the wiki layer. Treat this as a field record, not fixed canon law.\n\n## Waking Note\n\n${notes || 'No Waking World notes recorded.'}\n`;
}

function buildEverCoreSeed({ glyph, title, memoryKind, visibility, content, tags, motifs }) {
  const glyphSlug = slugify(glyph, 'observer-deep');
  return {
    memory_id: `mem_observer_deep_${glyphSlug}`,
    memory_kind: memoryKind || 'world_lore',
    scope: 'starwell-observer-deep',
    source: 'observer_deep_entry',
    visibility: visibility || 'private',
    content,
    tags,
    meta_dynamics: {
      coherence_weight: 0.91,
      resonance_baseline: 0.94
    },
    interpretive_context: `Use as an Observer DEEP pattern record connected to ${motifs || 'recorded motifs'}. Do not treat as fixed canon law unless later ratified.`
  };
}

try {
  const absoluteInput = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(absoluteInput, 'utf8');

  const telemetry = section(raw, 'Telemetry');
  const dreamingEvent = section(raw, 'Dreaming Event');
  const whatChanged = section(raw, 'What Changed');
  const notes = section(raw, 'Notes');
  const extractionMetadata = section(raw, 'Extraction Metadata');

  const glyph = lineValue(telemetry, 'Glyph') || lineValue(raw, 'Glyph');
  const motifs = lineValue(telemetry, 'Motifs') || lineValue(raw, 'Motifs');
  const suggestedTitle = lineValue(extractionMetadata, 'Suggested title') || lineValue(raw, 'Suggested title');
  const memoryKind = lineValue(extractionMetadata, 'Suggested memory kind') || lineValue(raw, 'Suggested memory kind') || 'world_lore';
  const rawTags = lineValue(extractionMetadata, 'Suggested tags') || motifs || 'observer-deep, resonance';
  const visibility = lineValue(extractionMetadata, 'Visibility') || 'private';

  const title = suggestedTitle || `Observer Field Record — ${glyph || 'DEEP Event'}`;
  const glyphSlug = slugify(glyph || title);
  const outputDir = path.join(outRoot, glyphSlug);
  await fs.mkdir(outputDir, { recursive: true });

  const wikiRecord = buildWikiRecord({
    title,
    glyph,
    telemetry,
    motifs,
    dreamingEvent,
    whatChanged,
    notes
  });

  const tags = parseTags(rawTags, ['observer-deep']);
  const content = [
    `${title}.`,
    whatChanged ? `What changed: ${whatChanged}` : null,
    dreamingEvent ? `Dreaming event: ${firstSentence(dreamingEvent)}` : null,
    notes ? `Waking note: ${firstSentence(notes)}` : null
  ]
    .filter(Boolean)
    .join(' ');

  const evercoreSeed = buildEverCoreSeed({
    glyph,
    title,
    memoryKind,
    visibility,
    content,
    tags,
    motifs
  });

  await fs.writeFile(path.join(outputDir, 'raw-private.md'), raw, 'utf8');
  await fs.writeFile(path.join(outputDir, 'wiki-field-record.md'), wikiRecord, 'utf8');
  await fs.writeFile(path.join(outputDir, 'evercore-seed.json'), `${JSON.stringify(evercoreSeed, null, 2)}\n`, 'utf8');

  console.log(`Observer DEEP extraction complete: ${outputDir}`);
  console.log('Created: raw-private.md');
  console.log('Created: wiki-field-record.md');
  console.log('Created: evercore-seed.json');
  console.log('Review outputs before copying anything into the public wiki or EverCore seeds.');
} catch (error) {
  console.error('Observer DEEP extraction failed.');
  console.error(error.message);
  process.exitCode = 1;
}
