'use strict';

const {
  ignitionStatus,
  igniteProfile,
  startOllamaServer,
} = require('../bifrost/ignition');
const { MODEL_PROFILES } = require('../bifrost/model-profiles');
const { identityEnvelope, enrichReceiptWithIdentity } = require('../bifrost/profile-resolution');

async function main() {
  const startup = await startOllamaServer();
  if (!startup.probe?.reachable) {
    console.error(JSON.stringify({ state: 'route-unavailable', startup }, null, 2));
    process.exitCode = 2;
    return;
  }

  const status = await ignitionStatus({ includeOptIn: false });
  const localProfiles = status.profiles.filter((item) => item.provider === 'ollama');
  const installed = localProfiles.filter((item) => ['installed', 'runtime-verified'].includes(item.state));
  const skipped = localProfiles.filter((item) => !['installed', 'runtime-verified'].includes(item.state));
  const receipts = [];

  for (const item of installed) {
    const definition = MODEL_PROFILES[item.profileId];
    if (!definition || definition.opt_in_only) continue;
    const receipt = enrichReceiptWithIdentity(await igniteProfile(item.profileId));
    receipts.push(receipt);
    const mark = receipt.state === 'runtime-verified' ? '🔥' : '✗';
    const identity = receipt.identity?.displayName || receipt.identity?.identityName || item.profileId;
    console.log(`${mark} ${identity} · ${item.profileId} · ${receipt.state}${receipt.actualModel ? ` · ${receipt.actualModel}` : ''}`);
  }

  for (const item of skipped) {
    const identity = identityEnvelope(item.profileId);
    console.log(`· ${identity?.displayName || identity?.identityName || item.profileId} · ${item.profileId} · ${item.state} · skipped`);
  }

  const failed = receipts.filter((item) => item.state !== 'runtime-verified');
  const summary = {
    contract: 'bifrost.local-fleet-ignition/v2',
    attempted: receipts.length,
    verified: receipts.length - failed.length,
    failed: failed.length,
    skipped: skipped.map((item) => ({
      profileId: item.profileId,
      identity: identityEnvelope(item.profileId),
      state: item.state,
    })),
    receipts,
    rules: {
      installedOnly: true,
      noModelDownload: true,
      noRemoteProviderProbe: true,
      optionalProfilesExcluded: true,
      identityEnvelopeRequired: true,
      distinctEntitiesRemainDistinct: true,
    },
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = failed.length ? 2 : 0;
}

main().catch((error) => {
  console.error(`Bifröst fleet ignition stopped: ${error.message}`);
  process.exitCode = 1;
});
