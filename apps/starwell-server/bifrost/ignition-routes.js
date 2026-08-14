'use strict';

const express = require('express');
const {
  resolveProfileRef,
  enrichReceiptWithIdentity,
  identityEnvelope,
} = require('./profile-resolution');
const {
  ignitionStatus,
  inspectProfile,
  igniteProfile,
  igniteOptionalProfile,
  ignitionReceipt,
  startOllamaServer,
} = require('./ignition');

const router = express.Router();

function requireExplicitConfirmation(req, res, next) {
  if (req.body?.confirm !== true) {
    return res.status(400).json({
      error: 'explicit-confirmation-required',
      message: 'Set confirm=true for ignition actions. Read-only probes do not require confirmation.',
    });
  }
  next();
}

function resolveOr404(ref, res) {
  const resolved = resolveProfileRef(ref);
  if (!resolved) {
    res.status(404).json({ error: 'unknown-profile-or-identity', ref });
    return null;
  }
  return resolved;
}

router.get('/', async (_req, res) => {
  try {
    const status = await ignitionStatus();
    res.json({
      ...status,
      profiles: (status.profiles || []).map((item) => ({
        ...item,
        identity: identityEnvelope(item.profileId),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'ignition-status-failed', detail: error?.message || String(error) });
  }
});

router.post('/start-ollama', requireExplicitConfirmation, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
    const result = await startOllamaServer({ endpoint });
    const status = result.probe?.reachable ? 200 : 503;
    res.status(status).json({
      contract: 'bifrost.ollama-start/v1',
      ...result,
      rules: { installsModels: false, explicitAction: true },
    });
  } catch (error) {
    res.status(500).json({ error: 'ollama-start-failed', detail: error?.message || String(error) });
  }
});

router.get('/profile/:profile_ref', async (req, res) => {
  const resolved = resolveOr404(req.params.profile_ref, res);
  if (!resolved) return;
  try {
    const result = await inspectProfile(resolved.profileId);
    res.json({
      ...result,
      identity: resolved.identity,
      resolvedFrom: req.params.profile_ref,
    });
  } catch (error) {
    res.status(500).json({ error: 'ignition-profile-status-failed', detail: error?.message || String(error) });
  }
});

router.get('/profile/:profile_ref/receipt', (req, res) => {
  const resolved = resolveOr404(req.params.profile_ref, res);
  if (!resolved) return;
  const receipt = ignitionReceipt(resolved.profileId);
  if (!receipt) return res.status(404).json({ error: 'ignition-receipt-not-found', profileId: resolved.profileId, identity: resolved.identity });
  res.json({
    ...enrichReceiptWithIdentity(receipt),
    resolvedFrom: req.params.profile_ref,
  });
});

router.post('/profile/:profile_ref', requireExplicitConfirmation, async (req, res) => {
  const resolved = resolveOr404(req.params.profile_ref, res);
  if (!resolved) return;
  const { profileId, profile: definition, identity } = resolved;
  if (definition.opt_in_only && req.body?.opt_in !== true) {
    return res.status(403).json({
      contract: 'bifrost.ignition-receipt/v1',
      error: 'opt-in-required',
      profileId,
      identity,
      state: 'opt-in-required',
      rules: { downloadsModels: false, optionalProfileRequiresExplicitOptIn: true },
    });
  }

  try {
    const options = {
      startOllama: req.body?.start_ollama === true,
      allowRemoteProbe: req.body?.allow_remote_probe === true,
    };
    const rawReceipt = definition.opt_in_only
      ? await igniteOptionalProfile(profileId, options)
      : await igniteProfile(profileId, options);
    const receipt = enrichReceiptWithIdentity(rawReceipt);
    const status = receipt.state === 'runtime-verified' ? 200
      : receipt.state === 'activation-pending' || receipt.state === 'credential-needed' ? 409
        : receipt.state === 'remote-probe-not-authorised' ? 403
          : receipt.state === 'route-unavailable' ? 503
            : 422;
    res.status(status).json({
      contract: 'bifrost.ignition-receipt/v1',
      ...receipt,
      resolvedFrom: req.params.profile_ref,
      rules: {
        installedWeightsOnly: true,
        downloadsModels: false,
        runtimeVerifiedRequiresChallengeRoundTrip: true,
        identityAliasesResolveToOneProfile: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'ignition-failed', detail: error?.message || String(error), profileId, identity });
  }
});

module.exports = router;
