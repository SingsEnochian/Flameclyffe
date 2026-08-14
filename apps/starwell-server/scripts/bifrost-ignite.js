'use strict';

const { MODEL_PROFILES } = require('../bifrost/model-profiles');
const {
  resolveProfileRef,
  identityEnvelope,
  enrichReceiptWithIdentity,
} = require('../bifrost/profile-resolution');
const {
  ignitionStatus,
  igniteProfile,
  igniteOptionalProfile,
  startOllamaServer,
} = require('../bifrost/ignition');

const argv = process.argv.slice(2);
const command = argv[0] || 'status';
const yes = argv.includes('--yes');
const startOllama = argv.includes('--start-ollama');
const allowRemote = argv.includes('--allow-remote');
const optIn = argv.includes('--opt-in');

function requireYes(action) {
  if (!yes) throw new Error(`${action} requires --yes. Status is read-only.`);
}

function printProfiles(status) {
  const rows = (status.profiles || []).map((item) => {
    const identity = identityEnvelope(item.profileId) || {};
    return {
      identity: identity.displayName || identity.identityName || item.owner,
      profile: item.profileId,
      provider: item.provider,
      model: item.model,
      state: item.state,
      verified: item.verifiedAt || '',
    };
  });
  console.table(rows);
}

async function runStatus() {
  const status = await ignitionStatus();
  printProfiles(status);
  return 0;
}

async function runStartOllama() {
  requireYes('Starting Ollama');
  const result = await startOllamaServer();
  console.log(JSON.stringify(result, null, 2));
  return result.probe?.reachable ? 0 : 2;
}

async function runProfile(profileRef) {
  requireYes('Ignition');
  const resolved = resolveProfileRef(profileRef);
  if (!resolved) throw new Error(`Unknown profile or identity: ${profileRef || '<missing>'}`);
  const { profileId, profile, identity } = resolved;
  if (profile.opt_in_only && !optIn) throw new Error(`${profileId} is optional; add --opt-in.`);
  const rawReceipt = profile.opt_in_only
    ? await igniteOptionalProfile(profileId, { startOllama })
    : await igniteProfile(profileId, { startOllama, allowRemoteProbe: allowRemote });
  const receipt = enrichReceiptWithIdentity(rawReceipt);
  console.log(JSON.stringify({ ...receipt, resolvedFrom: profileRef, resolvedIdentity: identity }, null, 2));
  return receipt.state === 'runtime-verified' ? 0 : 2;
}

async function runAllLocal() {
  requireYes('All-local ignition');
  const ids = Object.entries(MODEL_PROFILES)
    .filter(([, profile]) => profile.runtime?.provider === 'ollama')
    .filter(([, profile]) => !profile.opt_in_only || optIn)
    .map(([id]) => id);

  if (startOllama) {
    const startup = await startOllamaServer();
    if (!startup.probe?.reachable) {
      console.error(JSON.stringify(startup, null, 2));
      return 2;
    }
  }

  let failures = 0;
  for (const profileId of ids) {
    const definition = MODEL_PROFILES[profileId];
    const rawReceipt = definition.opt_in_only
      ? await igniteOptionalProfile(profileId)
      : await igniteProfile(profileId);
    const receipt = enrichReceiptWithIdentity(rawReceipt);
    const mark = receipt.state === 'runtime-verified' ? '🔥' : '·';
    const identity = receipt.identity?.displayName || receipt.identity?.identityName || profileId;
    console.log(`${mark} ${identity} · ${profileId} · ${receipt.state}${receipt.actualModel ? ` · ${receipt.actualModel}` : ''}${receipt.error ? ` · ${receipt.error}` : ''}`);
    if (receipt.state !== 'runtime-verified') failures += 1;
  }
  return failures ? 2 : 0;
}

async function main() {
  let code;
  if (command === 'status') code = await runStatus();
  else if (command === 'start-ollama') code = await runStartOllama();
  else if (command === 'profile') code = await runProfile(argv[1]);
  else if (command === 'all-local') code = await runAllLocal();
  else throw new Error('Usage: bifrost-ignite <status|start-ollama|profile PROFILE_OR_IDENTITY|all-local> [--yes] [--start-ollama] [--allow-remote] [--opt-in]');
  process.exitCode = code;
}

main().catch((error) => {
  console.error(`Bifröst ignition stopped: ${error.message}`);
  process.exitCode = 1;
});
