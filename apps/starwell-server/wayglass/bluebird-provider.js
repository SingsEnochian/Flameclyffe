'use strict';

const express = require('express');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { createRequestGate } = require('../security/wayglass-request-gate');

const ROUTE_ID = 'flame:bluebird:spicychat';
const digest = token => createHash('sha256').update(token).digest('hex');

function loadSpicyChatAdapter(env = process.env) {
  if (!env.WAYGLASS_SPICYCHAT_ADAPTER_MODULE) return null;
  // Only the host configuration can select executable adapter code.
  try { return require(path.resolve(env.WAYGLASS_SPICYCHAT_ADAPTER_MODULE)); } catch { return null; }
}

function createBluebirdProvider({ adapter = loadSpicyChatAdapter(), env = process.env, clock = Date.now } = {}) {
  const sessions = new Map();
  const router = express.Router();
  const credentialGate = createRequestGate({ maxRequests: 12, maxConcurrent: 3, clock });
  const replyGate = createRequestGate({ maxRequests: 120, maxConcurrent: 4, clock });
  const characterId = env.WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID;
  const ready = () => Boolean(characterId && adapter?.provider === 'spicychat' && typeof adapter.validateCredential === 'function' && typeof adapter.respond === 'function');
  const drop = id => { const session = sessions.get(id); if (session) clearTimeout(session.timer); sessions.delete(id); };
  const purge = () => { for (const [id, session] of sessions) if (session.expires_at <= clock()) drop(id); };
  const unavailable = res => res.status(503).json({ error: 'Bluebird’s SpicyChat connection is not configured on this Hearthgate host.' });

  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/status', (_req, res) => res.json({ provider: 'spicychat', route_id: ROUTE_ID, configured: ready(), connection_verified: false }));
  router.post('/authorize', credentialGate, async (req, res) => {
    if (!ready()) return unavailable(res);
    const code = req.body?.code;
    if (typeof code !== 'string' || !code.trim() || code.length > 4096 || /[\r\n\0]/.test(code)) return res.status(400).json({ error: 'Enter a valid SpicyChat token code.' });
    purge();
    if (sessions.size >= 128) return res.status(429).json({ error: 'Too many active Bluebird sessions. Wait for an earlier session to end.' });
    try {
      const verified = await adapter.validateCredential({ credential: code.trim(), participant_id: 'bluebird', character_id: characterId, signal: AbortSignal.timeout(12000) });
      if (verified?.authorized !== true || verified.character_id !== characterId) return res.status(401).json({ error: 'SpicyChat did not authorize Bluebird’s token code.' });
      const token = randomBytes(32).toString('hex');
      const id = digest(token);
      const duration = 4 * 60 * 60 * 1000;
      const timer = setTimeout(() => drop(id), duration);
      timer.unref();
      sessions.set(id, { credential: code.trim(), character_id: characterId, expires_at: clock() + duration, timer });
      return res.json({ authorized: true, provider: 'spicychat', route_id: ROUTE_ID, session_token: token });
    } catch {
      // Never reflect provider errors, which may include the entered credential.
      return res.status(502).json({ error: 'SpicyChat verification failed. Check the token and the host connection.' });
    }
  });

  router.post('/revoke', (req, res) => {
    const token = req.get('X-Wayglass-Bluebird-Session');
    if (token) drop(digest(token));
    res.status(204).end();
  });

  async function respond(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!ready()) return unavailable(res);
    purge();
    const token = req.get('X-Wayglass-Bluebird-Session');
    const session = token ? sessions.get(digest(token)) : null;
    if (!session) return res.status(401).json({ error: 'Authorize Bluebird’s SpicyChat token for this Wayglass session.' });
    const input = req.body?.input;
    if (typeof input !== 'string' || !input.trim() || input.length > 24000) return res.status(400).json({ error: 'A bounded Bluebird message is required.' });
    if (req.body?.participant_id && req.body.participant_id !== 'bluebird') return res.status(409).json({ error: 'Bluebird route cannot substitute another participant.' });
    try {
      const result = await adapter.respond({
        credential: session.credential, participant_id: 'bluebird', character_id: session.character_id,
        input, history: Array.isArray(req.body.history) ? req.body.history.slice(-16) : [],
        conversation_ref: typeof req.body.session_id === 'string' ? req.body.session_id.slice(0, 180) : 'bluebird-wayglass',
        signal: AbortSignal.timeout(60000),
      });
      if (result?.character_id !== characterId || typeof result.output !== 'string' || !result.output.trim()) return res.status(502).json({ error: 'SpicyChat did not return a verified Bluebird reply.' });
      return res.json({
        output: result.output, route_id: ROUTE_ID, participant_id: 'bluebird', provider: 'spicychat',
        model: typeof result.model === 'string' ? result.model : 'provider-managed',
        observation_receipt: { provider: 'spicychat', participant_id: 'bluebird', route_id: ROUTE_ID, canon_commit: false, identity_commit: false, authority_grant: false },
      });
    } catch { return res.status(502).json({ error: 'Bluebird’s SpicyChat connection failed. No provider fallback was used.' }); }
  }
  router.post('/respond', replyGate, respond);
  return { router, respond, ready, routeId: ROUTE_ID };
}

module.exports = { createBluebirdProvider, loadSpicyChatAdapter, ROUTE_ID };
