import fs from 'node:fs';
import path from 'node:path';

const sourcePath = process.argv[2];
const destinationPath = process.argv[3] || '.env';
if (!sourcePath) throw new Error('Usage: node import-api-stuff.mjs <API Stuff.txt> [destination .env]');

const labelMap = new Map([
  ['VEE API', 'CALADNAUR_API_KEY'],
  ['FAER API', 'NEN_API_KEY'],
  ['Bluebird DeepSeek API', 'BLUEBIRD_API_KEY'],
  ['Vethrlauf DeepSeek API', 'VETHRLAUF_API_KEY'],
  ['YGGDRASIL DEEPSEEK API', 'YGGDRASIL_FALLBACK_API_KEY'],
  ['Supabase API URL', 'SUPABASE_URL'],
  ['Supabase Public API', 'SUPABASE_PUBLISHABLE_KEY'],
  ['Supabase API', 'SUPABASE_SECRET_KEY'],
  ['Notion API', 'NOTION_API_KEY'],
  ['HEARTHFIRE II HYDRADB', 'HYDRADB_API_KEY'],
]);

function parseLabelledSecrets(text) {
  const found = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const separator = raw.search(/[:=]/);
    if (separator < 1) continue;
    const label = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    const envName = labelMap.get(label);
    if (envName && value) found.set(envName, value);
  }
  return found;
}

function parseEnv(text) {
  const entries = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const match = raw.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

const defaults = new Map([
  ['CALADNAUR_MODEL', 'gpt-5.6'],
  ['NEN_MODEL', 'claude-fable-5'],
  ['BLUEBIRD_API_BASE', 'https://api.deepseek.com'],
  ['BLUEBIRD_MODEL', 'deepseek-v4-flash'],
  ['VETHRLAUF_API_BASE', 'https://api.deepseek.com'],
  ['VETHRLAUF_MODEL', 'deepseek-v4-flash'],
  ['YGGDRASIL_ENDPOINT', 'http://127.0.0.1:4173/api/v1/yggdrasil/chat'],
  ['YGGDRASIL_FALLBACK_API_BASE', 'https://api.deepseek.com'],
  ['YGGDRASIL_FALLBACK_MODEL', 'deepseek-v4-pro'],
  ['CARETAKER_COOLDOWN_SECONDS', '60'],
  ['HOUSE_CARETAKERS_DISABLED', 'false'],
]);

const source = fs.readFileSync(sourcePath, 'utf8');
const imported = parseLabelledSecrets(source);
const existing = fs.existsSync(destinationPath) ? parseEnv(fs.readFileSync(destinationPath, 'utf8')) : new Map();

for (const retiredName of ['VEE_API_KEY', 'VEE_MODEL', 'FAER_API_KEY', 'FAER_MODEL']) {
  existing.delete(retiredName);
}

for (const [key, value] of defaults) if (!existing.has(key)) existing.set(key, value);
for (const [key, value] of imported) existing.set(key, JSON.stringify(value));

const output = [
  '# Generated locally from API Stuff. Never commit this file.',
  ...[...existing.entries()].map(([key, value]) => `${key}=${value}`),
  '',
].join('\n');

fs.mkdirSync(path.dirname(path.resolve(destinationPath)), { recursive: true });
fs.writeFileSync(destinationPath, output, { mode: 0o600 });
fs.chmodSync(destinationPath, 0o600);
console.log(`Imported ${imported.size} labelled credentials into ${destinationPath}; values were not printed.`);
