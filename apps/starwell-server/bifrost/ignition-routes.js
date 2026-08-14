'use strict';

const express = require('express');
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

router.get('/', async (_req, res) => {
  try {
    res.json(await ignitionStatus());
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

router.get('/profile/:profile_id', async (req, res) => {
  try {
    const result = await inspectProfile(req.params.profile_id);
    res.status(result.state === 'profile-missing' ? 404 : 200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'ignition-profile-status-failed', detail: error?.message || String(error) });
  }
});

router.get('/profile/:profile_id/receipt', (req, res) => {
  const receipt = ignitionReceipt(req.params.profile_id);
  if (!receipt) return res.status(404).json({ error: 'ignition-receipt-not-found', profileId: req.params.profile_id });
  res.json(receipt);
});

router.post('/profile/:profile_id', requireExplicitConfirmation, async (req, res) => {
  const profileId = req.params.profile_id;
  try {
    const options = {
      startOllama: req.body?.start_ollama === true,
      allowRemoteProbe: req.body?.allow_remote_probe === true,
    };
    const receipt = req.body?.opt_in === true
      ? await igniteOptionalProfile(profileId, options)
      : await igniteProfile(profileId, options);
    const status = receipt.state === 'runtime-verified' ? 200
      : receipt.state === 'activation-pending' ? 409
        : receipt.state === 'credential-needed' ? 409
          : receipt.state === 'remote-probe-not-authorised' || receipt.state === 'opt-in-required' ? 403
            : receipt.state === 'route-unavailable' ? 503
              : 422;
    res.status(status).json({
      contract: 'bifrost.ignition-receipt/v1',
      ...receipt,
      rules: {
        installedWeightsOnly: true,
        downloadsModels: false,
        runtimeVerifiedRequiresChallengeRoundTrip: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'ignition-failed', detail: error?.message || String(error), profileId });
  }
});

module.exports = router;
