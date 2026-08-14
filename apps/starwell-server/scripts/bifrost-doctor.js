'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const { ignitionStatus } = require('../bifrost/ignition');
const { listRuntimeReceipts, receiptRoot } = require('../bifrost/receipt-store');
const { acceptedRuntimeTokens } = require('../security/runtime-token');

const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..', '..');

function fileContains(relative, pattern) {
  const file = path.resolve(serverRoot, relative);
  if (!fs.existsSync(file)) return false;
  return pattern.test(fs.readFileSync(file, 'utf8'));
}

function commandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, shell: false });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] || 'available';
}

function memoryInfo() {
  const gib = 1024 ** 3;
  return {
    totalGiB: Number((os.totalmem() / gib).toFixed(2)),
    freeGiB: Number((os.freemem() / gib).toFixed(2)),
  };
}

function diskInfo(target = repoRoot) {
  try {
    if (typeof fs.statfsSync !== 'function') return { supported: false };
    const stats = fs.statfsSync(target);
    const gib = 1024 ** 3;
    return {
      supported: true,
      path: target,
      freeGiB: Number(((stats.bavail * stats.bsize) / gib).toFixed(2)),
      totalGiB: Number(((stats.blocks * stats.bsize) / gib).toFixed(2)),
    };
  } catch (error) {
    return { supported: false, error: error?.message || String(error) };
  }
}

function secureLaunchContract() {
  const pkg = JSON.parse(fs.readFileSync(path.join(serverRoot, 'package.json'), 'utf8'));
  const launcherSecure = fileContains('launcher.js', /server-secure\.js/);
  const electronSecure = fileContains('electron/main.js', /server-secure\.js/);
  const chatShadow = fileContains('server-secure.js', /createLegacyMemberChatHandler/);
  const statusShadow = fileContains('server-secure.js', /createLegacyModelStatusHandler/);
  return {
    npmStartCore: pkg.scripts?.['start:core'] || null,
    npmStartCoreSecure: pkg.scripts?.['start:core'] === 'node server-secure.js',
    launcherSecure,
    electronSecure,
    legacyChatShadowed: chatShadow,
    legacyModelStatusShadowed: statusShadow,
    passed: pkg.scripts?.['start:core'] === 'node server-secure.js' && launcherSecure && electronSecure && chatShadow && statusShadow,
  };
}

function runtimeTokenState(env = process.env) {
  const tokens = acceptedRuntimeTokens(env);
  return {
    configured: tokens.length > 0,
    acceptedChannels: [
      env.ARCSWEEP_RUNTIME_TOKEN ? 'ARCSWEEP_RUNTIME_TOKEN' : null,
      env.HEARTHGATE_GATEWAY_TOKEN ? 'HEARTHGATE_GATEWAY_TOKEN' : null,
    ].filter(Boolean),
    valueExposed: false,
  };
}

async function buildDoctorReport() {
  const ignition = await ignitionStatus({ includeOptIn: true });
  const receipts = listRuntimeReceipts({ limit: 20 });
  const secure = secureLaunchContract();
  const token = runtimeTokenState();
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const ollamaVersion = commandVersion('ollama');

  const localProfiles = (ignition.profiles || []).filter((profile) => profile.provider === 'ollama');
  const remoteProfiles = (ignition.profiles || []).filter((profile) => profile.provider !== 'ollama');
  const counts = {};
  for (const profile of ignition.profiles || []) counts[profile.state] = (counts[profile.state] || 0) + 1;

  const issues = [];
  if (nodeMajor < 24) issues.push({ code: 'node-version', severity: 'warning', detail: `Node ${process.versions.node}; project target is Node 24.` });
  if (!secure.passed) issues.push({ code: 'secure-launch-drift', severity: 'error', detail: 'A default launch path no longer satisfies the secure Bifröst contract.' });
  if (!token.configured) issues.push({ code: 'runtime-token-missing', severity: 'error', detail: 'No House runtime token is configured in this process.' });
  if (!ollamaVersion) issues.push({ code: 'ollama-cli-missing', severity: 'warning', detail: 'Ollama CLI was not found on PATH.' });
  for (const profile of localProfiles) {
    if (profile.state === 'runtime-mismatch') issues.push({ code: 'runtime-mismatch', severity: 'error', profileId: profile.profileId, detail: profile.detail || profile.error || 'runtime mismatch' });
    if (profile.state === 'alias-pending') issues.push({ code: 'alias-pending', severity: 'info', profileId: profile.profileId, detail: 'Base artifact is present; identity alias can be created without downloading weights.' });
    if (profile.state === 'activation-pending') issues.push({ code: 'activation-pending', severity: 'info', profileId: profile.profileId, detail: 'Selected base artifact is not installed.' });
  }

  return {
    contract: 'bifrost.doctor/v1',
    generatedAt: new Date().toISOString(),
    host: {
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      memory: memoryInfo(),
      disk: diskInfo(process.env.BIFROST_MODEL_CACHE || repoRoot),
      ollamaCli: ollamaVersion,
    },
    security: {
      runtimeToken: token,
      secureLaunch: secure,
      secretValuesIncluded: false,
    },
    ignition: {
      counts,
      profiles: ignition.profiles,
      ordinaryLocalProfiles: localProfiles.filter((profile) => !profile.optInOnly).map((profile) => profile.profileId),
      remoteProfiles: remoteProfiles.map((profile) => profile.profileId),
    },
    receipts: {
      root: receiptRoot(),
      durableCount: receipts.length,
      latest: receipts.slice(0, 8).map((receipt) => ({
        receiptId: receipt.receiptId,
        action: receipt.action,
        state: receipt.state,
        profileId: receipt.profileId,
        identity: receipt.identity,
        recordedAt: receipt.recordedAt,
      })),
    },
    issues,
    verdict: issues.some((item) => item.severity === 'error') ? 'attention-required' : 'ready-for-local-ignition',
    rules: {
      readOnly: true,
      startsOllama: false,
      downloadsModels: false,
      invokesProviders: false,
      printsSecretValues: false,
    },
  };
}

(async () => {
  console.log(JSON.stringify(await buildDoctorReport(), null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ contract: 'bifrost.doctor/v1', verdict: 'doctor-failed', error: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
});

module.exports = {
  commandVersion,
  memoryInfo,
  diskInfo,
  secureLaunchContract,
  runtimeTokenState,
  buildDoctorReport,
};
