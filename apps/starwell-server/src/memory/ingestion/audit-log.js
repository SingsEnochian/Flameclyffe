import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_DIR = path.resolve(__dirname, '../audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'memory-ingest.audit.jsonl');

export async function appendAuditLog(entry) {
  await fs.mkdir(AUDIT_DIR, { recursive: true });

  const record = {
    at: new Date().toISOString(),
    ...entry,
  };

  await fs.appendFile(AUDIT_FILE, `${JSON.stringify(record)}\n`, 'utf-8');

  return record;
}

export async function readAuditLog({ limit = 50 } = {}) {
  try {
    const raw = await fs.readFile(AUDIT_FILE, 'utf-8');
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
