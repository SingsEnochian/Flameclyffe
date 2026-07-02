import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultConfigPath = path.join(repoRoot, 'hearth', 'config', 'hearth.config.json');
const fallbackConfigPath = path.join(repoRoot, 'hearth', 'config', 'hearth.config.example.json');

function todayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function loadConfig() {
  const requestedPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultConfigPath;
  try {
    return JSON.parse(await readFile(requestedPath, 'utf8'));
  } catch (error) {
    if (requestedPath !== defaultConfigPath) throw error;
    return JSON.parse(await readFile(fallbackConfigPath, 'utf8'));
  }
}

function projectIdFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0] || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

function readCredentials(config) {
  const url = process.env[config.supabaseUrlEnv || 'SUPABASE_URL'] || config.supabaseUrl || '';
  const key = process.env[config.supabaseServiceRoleKeyEnv || 'SUPABASE_SERVICE_ROLE_KEY'] || config.supabaseServiceRoleKey || '';
  return { url, key };
}

function makeManifest(config, outputDirectory) {
  return {
    schemaVersion: '0.1.0',
    timestamp: new Date().toISOString(),
    sourceProjectId: config.sourceProjectId || 'unknown',
    outputDirectory,
    tablesAttempted: [],
    rowCounts: {},
    omissions: [],
    errors: [],
    status: 'failed'
  };
}

function fieldValue(row, names) {
  for (const name of names || []) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  return undefined;
}

function isTruthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'yes';
}

function omissionReason(row, table, config) {
  const privacy = config.privacy || {};
  const privateChatTables = new Set(config.privateChatTables || []);
  const shareable = isTruthy(fieldValue(row, privacy.shareableFields || []));

  if (privateChatTables.has(table) && privacy.requireShareableForPrivateChat !== false && !shareable) {
    return 'raw private chat requires explicit shareable marker';
  }

  if (privacy.omitPrivateByDefault !== false && !shareable) {
    const privateValue = fieldValue(row, privacy.privateFields || []);
    if (isTruthy(privateValue)) return 'private or sensitive row omitted by default';

    const visibility = String(fieldValue(row, privacy.visibilityFields || []) || '').toLowerCase();
    if ((privacy.blockedVisibilityValues || []).includes(visibility)) {
      return `blocked visibility: ${visibility}`;
    }
  }

  return '';
}

function addOmission(manifest, table, reason, count = 1) {
  const found = manifest.omissions.find(item => item.table === table && item.reason === reason);
  if (found) found.count += count;
  else manifest.omissions.push({ table, reason, count });
}

async function fetchTable(client, table, config, manifest) {
  const pageSize = Number(config.pageSize || 1000);
  let from = 0;
  const exported = [];
  let omitted = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client.from(table).select('*').range(from, to);
    if (error) throw error;
    const rows = data || [];

    rows.forEach(row => {
      const reason = omissionReason(row, table, config);
      if (reason) {
        omitted += 1;
        addOmission(manifest, table, reason);
      } else {
        exported.push(row);
      }
    });

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { exported, omitted };
}

async function main() {
  const config = await loadConfig();
  const outputRoot = path.resolve(repoRoot, config.outputRoot || 'hearth/mirror');
  const outputDirectory = path.join(outputRoot, todayStamp());
  await mkdir(outputDirectory, { recursive: true });

  const manifest = makeManifest(config, path.relative(repoRoot, outputDirectory).replaceAll('\\\\', '/'));
  const tables = Array.isArray(config.tables) ? config.tables.filter(Boolean) : [];
  const { url, key } = readCredentials(config);
  manifest.sourceProjectId = config.sourceProjectId && !config.sourceProjectId.startsWith('replace-')
    ? config.sourceProjectId
    : projectIdFromUrl(url);

  if (!url || !key) {
    manifest.errors.push({ scope: 'credentials', message: 'Missing Supabase credentials. Mirror failed closed before fetching any table.' });
    await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  if (!tables.length) {
    manifest.errors.push({ scope: 'config.tables', message: 'No tables configured for mirror export.' });
    await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const table of tables) {
    manifest.tablesAttempted.push(table);
    try {
      const { exported, omitted } = await fetchTable(client, table, config, manifest);
      manifest.rowCounts[table] = { exported: exported.length, omitted };
      await writeFile(path.join(outputDirectory, `${table}.json`), `${JSON.stringify(exported, null, 2)}\n`);
    } catch (error) {
      manifest.rowCounts[table] = manifest.rowCounts[table] || { exported: 0, omitted: 0 };
      manifest.errors.push({ scope: table, message: error.message || String(error) });
    }
  }

  manifest.status = manifest.errors.length ? 'partial' : 'ok';
  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch(async error => {
  console.error(error.message || error);
  process.exitCode = 1;
});

// TODO(seed extraction): emit curated seed candidates from explicitly shareable mirror rows only.
// TODO(witness extraction): emit witness fragments from explicitly shareable observation rows only.
