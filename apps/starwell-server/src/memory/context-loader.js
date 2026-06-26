import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANONICAL_MEMORY_DIR = path.resolve(__dirname, './canonical');

export const LOAD_ORDER = [
  'yggdrasil-rootguard.md',
  'yggdrasil-boundaries.md',
  'yggdrasil-identity.md',
  'lore.md',
  'deep-theory.md',
  'memory-map.md',
  'ingestion-policy.md',
];

export async function loadYggdrasilContext(options = {}) {
  const {
    includeMissingWarnings = true,
    includeBoundaryComments = true,
  } = options;

  const sections = [];

  for (const fileName of LOAD_ORDER) {
    const filePath = path.join(CANONICAL_MEMORY_DIR, fileName);
    let content = '';

    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      if (err.code === 'ENOENT' && includeMissingWarnings) {
        content = `# ${fileName}\n\n[Missing canonical memory file.]\n`;
      } else if (err.code === 'ENOENT') {
        continue;
      } else {
        throw err;
      }
    }

    const trimmed = content.trim();

    if (includeBoundaryComments) {
      sections.push([
        `<!-- BEGIN CANONICAL MEMORY: ${fileName} -->`,
        trimmed,
        `<!-- END CANONICAL MEMORY: ${fileName} -->`,
      ].join('\n'));
    } else {
      sections.push(trimmed);
    }
  }

  return sections.join('\n\n');
}

export async function getMemoryLoadReport() {
  const report = [];

  for (const fileName of LOAD_ORDER) {
    const filePath = path.join(CANONICAL_MEMORY_DIR, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      report.push({ fileName, exists: true, characters: content.length });
    } catch (err) {
      if (err.code === 'ENOENT') {
        report.push({ fileName, exists: false, characters: 0 });
      } else {
        throw err;
      }
    }
  }

  return report;
}
