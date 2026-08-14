'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { probeOllama } = require('../bifrost/ignition');
const { planRuntimeAliases } = require('../bifrost/alias-materializer');

const argv = process.argv.slice(2);
const execute = argv.includes('--execute');
const includeOptIn = argv.includes('--include-opt-in');
const profileIndex = argv.indexOf('--profile');
const requestedProfile = profileIndex >= 0 ? argv[profileIndex + 1] : null;
const cacheRoot = path.resolve(process.env.BIFROST_MODEL_CACHE || path.join(__dirname, '..', 'data', 'bifrost-models'));
const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function runOllama(argsList) {
  const result = spawnSync('ollama', argsList, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ollama ${argsList[0]} exited with status ${result.status}`);
}

function createAlias(entry) {
  const dir = path.join(cacheRoot, safeSegment(entry.profileId));
  fs.mkdirSync(dir, { recursive: true });
  const modelfile = path.join(dir, 'Alias.Modelfile');
  fs.writeFileSync(modelfile, `FROM ${JSON.stringify(entry.baseModel)}\n`, 'utf8');
  console.log(`  creating ${entry.runtimeAlias} from installed base ${entry.baseModel}`);
  runOllama(['create', entry.runtimeAlias, '-f', modelfile]);
}

(async () => {
  const probe = await probeOllama(endpoint);
  if (!probe.reachable) {
    console.error(JSON.stringify({
      contract: 'bifrost.alias-materialization/v1',
      state: 'route-unavailable',
      endpoint,
      error: probe.error || 'Ollama unreachable',
      rules: { downloadsModels: false },
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const plan = planRuntimeAliases(probe.models || [], {
    includeOptIn,
    profileRefs: requestedProfile ? [requestedProfile] : null,
  });

  console.log(`Bifröst alias materialization · ${execute ? 'EXECUTE' : 'PLAN'}`);
  if (requestedProfile) console.log(`requested: ${requestedProfile}`);

  for (const entry of plan) {
    const identity = entry.identity?.identityName || entry.identity?.displayName || entry.profileId;
    console.log(`\n${identity}`);
    console.log(`  profile: ${entry.profileId}`);
    console.log(`  base: ${entry.baseModel}`);
    console.log(`  alias: ${entry.runtimeAlias}`);
    console.log(`  state: ${entry.state}`);
    if (execute && entry.state === 'ready-to-create') createAlias(entry);
  }

  const created = execute ? plan.filter((entry) => entry.state === 'ready-to-create').length : 0;
  const summary = {
    contract: 'bifrost.alias-materialization/v1',
    mode: execute ? 'execute' : 'plan',
    planned: plan.length,
    readyToCreate: plan.filter((entry) => entry.state === 'ready-to-create').length,
    aliasPresent: plan.filter((entry) => entry.state === 'alias-present').length,
    baseMissing: plan.filter((entry) => entry.state === 'base-missing').length,
    created,
    entries: plan,
    rules: {
      downloadsModels: false,
      remoteCalls: false,
      createsRuntimeAliasesOnly: true,
      sharedBaseMaySeedMultipleDistinctAliases: true,
      distinctEntitiesRemainDistinct: true,
    },
  };
  console.log(`\n${JSON.stringify(summary, null, 2)}`);
})().catch((error) => {
  console.error(`Bifröst alias materialization stopped: ${error.message}`);
  process.exitCode = 1;
});
