'use strict';

// Adapt the existing House session contract to Hearthgate; do not turn a
// loopback address, MCP crew token or display label into Steward authority.
const express = require('express');
const { createHash, timingSafeEqual } = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequestGate } = require('../security/wayglass-request-gate');

function createHouseSessionRouter({ environment = process.env, loadSession } = {}) {
  const router = express.Router();
  const env = { get: name => environment[name] };
  const load = loadSession || (() => import(pathToFileURL(path.join(__dirname, '../wayglass-runtime/house-session.mjs')).href));
  const configured = () => Boolean(environment.ARCSWEEP_RUNTIME_TOKEN ||
    (environment.ARCSWEEP_STEWARD_KEY && environment.HOUSE_SESSION_SECRET));
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.post('/', createRequestGate({ maxRequests: 10, maxConcurrent: 2 }), async (req, res, next) => {
    try {
      if (!configured()) return res.status(503).json({ connected: false, error: 'Local House sign-in is not configured. Set a private ARCSWEEP_RUNTIME_TOKEN on Hearthgate and restart it.' });
      const api = await load();
      const credential = req.body?.credential;
      const digest = value => createHash('sha256').update(value).digest();
      const permitted = typeof credential === 'string' && credential.length > 0 && credential.length <= 4096 &&
        [environment.ARCSWEEP_RUNTIME_TOKEN, environment.ARCSWEEP_STEWARD_KEY].filter(Boolean).some(key => timingSafeEqual(digest(credential), digest(key)));
      if (!permitted) {
        return res.status(401).json({ connected: false, error: 'Steward identity refused.' });
      }
      const session = api.issueHouseSession(env);
      const request = new Request(`${req.protocol}://${req.get('host')}/api/v1/house/session`);
      res.setHeader('Set-Cookie', api.houseSessionCookie(request, session.token, session.ttl));
      return res.status(201).json({ connected: true, role: 'steward', mode: 'credential' });
    } catch (error) { next(error); }
  });
  router.get('/', async (req, res, next) => {
    try {
      if (!configured()) return res.status(503).json({ connected: false, error: 'Local House sign-in is not configured. Set a private ARCSWEEP_RUNTIME_TOKEN on Hearthgate and restart it.' });
      const api = await load();
      const request = new Request('http://localhost/api/v1/house/session', { headers: {
        cookie: req.get('cookie') || '', authorization: req.get('authorization') || '',
      } });
      const session = api.authoriseHouseRequest(request, env);
      return session ? res.json({ connected: true, role: 'steward', mode: session.mode })
        : res.status(401).json({ connected: false, error: 'Sign in with your local House Steward credential.' });
    } catch (error) { next(error); }
  });
  router.delete('/', async (_req, res, next) => {
    try { const api = await load(); res.setHeader('Set-Cookie', api.clearHouseSessionCookies()); res.json({ connected: false }); }
    catch (error) { next(error); }
  });
  return router;
}
module.exports = { createHouseSessionRouter };
