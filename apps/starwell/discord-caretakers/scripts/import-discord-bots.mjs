import fs from 'node:fs';
import path from 'node:path';

const sourcePath = process.argv[2];
const destinationPath = process.argv[3] || '.env';
if (!sourcePath) throw new Error('Usage: node import-discord-bots.mjs <DISCORD BOTS.txt> [destination .env]');

const allowedNames = new Set([
  'DISCORD_GUILD_ID',
  'DISCORD_ALLOWED_USER_IDS',
  'DISCORD_ALLOWED_CHANNEL_IDS',
  'DISCORD_CALADNAUR_APPLICATION_ID',
  'DISCORD_CALADNAUR_TOKEN',
  'DISCORD_NEN_APPLICATION_ID',
  'DISCORD_NEN_TOKEN',
  'DISCORD_YGGDRASIL_APPLICATION_ID',
  'DISCORD_YGGDRASIL_TOKEN',
  'DISCORD_BLUEBIRD_APPLICATION_ID',
  'DISCORD_BLUEBIRD_TOKEN',
  'DISCORD_VETHRLAUF_APPLICATION_ID',
  'DISCORD_VETHRLAUF_TOKEN',
]);

function parseEnv(text) {
  const entries = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const match = raw.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

const imported = new Map();
for (const raw of fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/)) {
  const separator = raw.search(/[:=]/);
  if (separator < 1) continue;
  const name = raw.slice(0, separator).trim();
  const value = raw.slice(separator + 1).trim();
  if (allowedNames.has(name) && value) imported.set(name, JSON.stringify(value));
}

const existing = fs.existsSync(destinationPath) ? parseEnv(fs.readFileSync(destinationPath, 'utf8')) : new Map();
for (const [name, value] of imported) existing.set(name, value);

const output = [
  '# Local Hearthweave Caretaker configuration. Never commit this file.',
  ...[...existing.entries()].map(([name, value]) => `${name}=${value}`),
  '',
].join('\n');

fs.mkdirSync(path.dirname(path.resolve(destinationPath)), { recursive: true });
fs.writeFileSync(destinationPath, output, { mode: 0o600 });
fs.chmodSync(destinationPath, 0o600);
console.log(`Imported ${imported.size} Discord fields into ${destinationPath}; values were not printed.`);
