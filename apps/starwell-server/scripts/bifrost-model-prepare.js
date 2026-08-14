'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { MODEL_PROFILES, materialiseModelProfile } = require('../bifrost/model-profiles');

const args = new Set(process.argv.slice(2));
const profileArgIndex = process.argv.indexOf('--profile');
const requestedProfile = profileArgIndex >= 0 ? process.argv[profileArgIndex + 1] : null;
const execute = args.has('--execute');
const includeOptIn = args.has('--include-opt-in');
const all = args.has('--all');
const cacheRoot = path.resolve(process.env.BIFROST_MODEL_CACHE || path.join(__dirname, '..', 'data', 'bifrost-models'));

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function repoApiUrl(repo) {
  return `https://huggingface.co/api/models/${repo.split('/').map(encodeURIComponent).join('/')}`;
}

function repoFileUrl(repo, filename) {
  const safeRepo = repo.split('/').map(encodeURIComponent).join('/');
  const safeFile = filename.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/${safeRepo}/resolve/main/${safeFile}?download=true`;
}

function chooseProfiles() {
  if (requestedProfile) {
    if (!MODEL_PROFILES[requestedProfile]) throw new Error(`Unknown Bifrost profile: ${requestedProfile}`);
    return [requestedProfile];
  }
  if (all) return Object.keys(MODEL_PROFILES);
  throw new Error('Choose --profile <profile-id> or --all. Add --execute to perform downloads/imports.');
}

function runOllama(argsList) {
  const result = spawnSync('ollama', argsList, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ollama ${argsList[0]} exited with status ${result.status}`);
}

async function resolveGgufFile(repo, quant) {
  const response = await fetch(repoApiUrl(repo), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Hugging Face model API ${response.status} for ${repo}`);
  const data = await response.json();
  const needle = String(quant || '').toUpperCase();
  const candidates = (data.siblings || [])
    .map((item) => item.rfilename)
    .filter(Boolean)
    .filter((filename) => filename.toLowerCase().endsWith('.gguf'))
    .filter((filename) => !/mmproj/i.test(filename))
    .filter((filename) => !needle || filename.toUpperCase().includes(needle));
  if (!candidates.length) throw new Error(`No ${quant || ''} GGUF artifact found for ${repo}`.trim());
  candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return candidates[0];
}

async function downloadFile(url, destination) {
  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    console.log(`  cached: ${destination}`);
    return destination;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`Download failed ${response.status}: ${url}`);
  const temporary = `${destination}.partial`;
  console.log(`  downloading: ${destination}`);
  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary));
    fs.renameSync(temporary, destination);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
  return destination;
}

function createOllamaAlias(profile, fromValue) {
  const profileDir = path.join(cacheRoot, safeSegment(profile.profile_id));
  fs.mkdirSync(profileDir, { recursive: true });
  const modelfile = path.join(profileDir, 'Modelfile');
  fs.writeFileSync(modelfile, `FROM ${JSON.stringify(fromValue)}\n`, 'utf8');
  console.log(`  creating Ollama alias: ${profile.runtime.model}`);
  runOllama(['create', profile.runtime.model, '-f', modelfile]);
}

async function prepareProfile(profileId) {
  const profile = materialiseModelProfile(profileId);
  if (!profile) throw new Error(`Unknown profile ${profileId}`);
  if (profile.opt_in_only && !includeOptIn) {
    console.log(`SKIP ${profileId} · opt-in profile (use --include-opt-in)`);
    return;
  }
  const artifact = profile.artifact || { strategy: 'profile-defined' };
  console.log(`\n${profile.label}`);
  console.log(`  profile: ${profile.profile_id}`);
  console.log(`  source: ${profile.source?.repo || 'n/a'}`);
  console.log(`  runtime: ${profile.runtime.provider} · ${profile.runtime.model}`);
  console.log(`  preparation: ${artifact.strategy}`);

  if (!execute) {
    if (artifact.repo) console.log(`  artifact repo: ${artifact.repo}${artifact.quant ? ` · ${artifact.quant}` : ''}`);
    if (artifact.model) console.log(`  Ollama model: ${artifact.model}`);
    console.log('  state: plan-only');
    return;
  }

  if (artifact.strategy === 'provider-credential') {
    const envVar = profile.runtime.api_key_env;
    console.log(`  state: ${envVar && process.env[envVar] ? 'credential-ready' : 'credential-needed'}`);
    return;
  }

  if (artifact.strategy === 'ollama-pull') {
    runOllama(['pull', artifact.model]);
    if (profile.runtime.model !== artifact.model) createOllamaAlias(profile, artifact.model);
    console.log('  state: installed');
    return;
  }

  if (artifact.strategy === 'gguf-import') {
    const filename = await resolveGgufFile(artifact.repo, artifact.quant);
    const destination = path.join(cacheRoot, safeSegment(profile.profile_id), path.basename(filename));
    await downloadFile(repoFileUrl(artifact.repo, filename), destination);
    createOllamaAlias(profile, destination);
    console.log('  state: installed');
    return;
  }

  throw new Error(`Preparation strategy ${artifact.strategy} is not executable.`);
}

(async () => {
  const profiles = chooseProfiles();
  console.log(`Bifröst model preparation · ${execute ? 'EXECUTE' : 'PLAN'}`);
  console.log(`cache: ${cacheRoot}`);
  for (const profileId of profiles) await prepareProfile(profileId);
  if (!execute) console.log('\nNo downloads or model changes were made. Re-run with --execute when ready.');
})().catch((error) => {
  console.error(`Bifröst model preparation stopped: ${error.message}`);
  process.exitCode = 1;
});
