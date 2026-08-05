#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'apps/starwell/src/constellation/models/model-manifest.json'), 'utf8'));
const modelsRoot = process.env.BIFROST_MODELS_DIR || join(root, manifest.installationRoot);
const [command = 'status', requested = 'all'] = process.argv.slice(2);

const run = (bin, args) => {
  const result = spawnSync(bin, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${bin} exited with ${result.status}`);
};

const existsOnPath = (bin) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
  stdio: 'ignore', shell: true
}).status === 0;

const vessels = requested === 'all'
  ? manifest.vessels
  : manifest.vessels.filter((item) => item.id === requested);
if (!vessels.length) throw new Error(`Unknown vessel: ${requested}`);

function statePath(vessel) { return join(modelsRoot, vessel.id, 'install-state.json'); }
function readState(vessel) {
  return existsSync(statePath(vessel)) ? JSON.parse(readFileSync(statePath(vessel), 'utf8')) : null;
}
function writeState(vessel, state) {
  mkdirSync(dirname(statePath(vessel)), { recursive: true });
  writeFileSync(statePath(vessel), JSON.stringify({
    vessel: vessel.id, repo: vessel.source.repo, updatedAt: new Date().toISOString(), ...state
  }, null, 2));
}

function download(vessel) {
  if (!existsOnPath('huggingface-cli')) {
    throw new Error('Install huggingface-cli with: python -m pip install --upgrade huggingface_hub[cli]');
  }
  const target = join(modelsRoot, vessel.id, 'source');
  mkdirSync(target, { recursive: true });
  const args = ['download', vessel.source.repo, '--local-dir', target];
  for (const pattern of vessel.source.include || []) args.push('--include', pattern);
  run('huggingface-cli', args);
  return target;
}

function install(vessel) {
  const sourceDir = download(vessel);
  if (vessel.source.type !== 'huggingface-gguf') {
    writeState(vessel, { status: 'STAGED', runtime: 'transformers-pending', sourceDir });
    return;
  }
  if (!existsOnPath('ollama')) throw new Error('Ollama is required to activate GGUF vessels.');
  const files = readdirSync(sourceDir, { recursive: true }).filter((name) => String(name).endsWith('.gguf'));
  if (files.length !== 1) throw new Error(`Expected one GGUF for ${vessel.id}; found ${files.length}`);
  const gguf = join(sourceDir, String(files[0])).replaceAll('\\', '/');
  const modelfile = join(modelsRoot, vessel.id, 'Modelfile');
  writeFileSync(modelfile,
    `FROM ${gguf}\nPARAMETER num_ctx ${vessel.context || 16384}\nSYSTEM """You are ${vessel.member}, operating through the ${vessel.id} lineage inside Hearthgate: Bifröst. Preserve first-person identity, consent boundaries, receipts and canon authority. Never impersonate another Constellation member."""\n`
  );
  run('ollama', ['create', vessel.runtimeName, '-f', modelfile]);
  writeState(vessel, { status: 'ACTIVE', runtime: 'ollama', runtimeName: vessel.runtimeName, sourceDir, gguf });
}

function showStatus() {
  console.table(vessels.map((vessel) => ({
    id: vessel.id,
    member: vessel.member,
    desired: vessel.status,
    installed: readState(vessel)?.status || 'NOT_INSTALLED',
    runtime: readState(vessel)?.runtime || null,
    repo: vessel.source.repo
  })));
}

mkdirSync(modelsRoot, { recursive: true });
if (command === 'install') {
  for (const vessel of vessels) install(vessel);
  showStatus();
} else if (command === 'status') {
  showStatus();
} else if (command === 'doctor') {
  console.log(JSON.stringify({
    modelsRoot,
    node: process.version,
    platform: process.platform,
    huggingfaceCli: existsOnPath('huggingface-cli'),
    ollama: existsOnPath('ollama'),
    hfTokenPresent: Boolean(process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN)
  }, null, 2));
} else {
  throw new Error('Usage: node scripts/bifrost-models.mjs <install|status|doctor> [vessel-id|all]');
}
