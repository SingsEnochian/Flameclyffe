'use strict';

const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { WorkspaceProjects } = require('./workspace-projects');
const { createRequestGate } = require('../security/wayglass-request-gate');

const SCHEMA = 'wayglass.private-atelier/v1';
const ACTOR = { participant_id: 'wayglass', route_id: 'wayglass:ship' };
const SOURCE = 'wayglass:private-atelier/v1';

function record(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key))) {
    throw new TypeError('Unexpected atelier fields');
  }
}

function number(value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) throw new TypeError('Atelier value out of range');
  return value;
}

function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError('Invalid atelier text');
  return value.trim();
}

function colour(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError('Invalid atelier colour');
  return value;
}

function readChoice(output) {
  const choice = JSON.parse(output);
  if (choice?.choice === 'pass') {
    record(choice, ['choice', 'note']);
    return { choice: 'pass', note: text(choice.note, 400) };
  }
  record(choice, ['choice', 'title', 'note', 'light', 'current', 'plumes', 'stains']);
  if (choice.choice !== 'shape' || !Array.isArray(choice.plumes) || choice.plumes.length > 4 ||
      !Array.isArray(choice.stains) || choice.stains.length > 8) throw new TypeError('Invalid atelier scene');
  return {
    choice: 'shape',
    title: text(choice.title, 80),
    note: text(choice.note, 400),
    light: colour(choice.light),
    current: number(choice.current, 0, 1),
    plumes: choice.plumes.map(plume => {
      record(plume, ['colour', 'x', 'y', 'z', 'radius', 'density', 'buoyancy']);
      return { colour: colour(plume.colour), x: number(plume.x, -1.5, 1.5),
        y: number(plume.y, 0.6, 1.8), z: number(plume.z, -1, 1),
        radius: number(plume.radius, 0.15, 0.75), density: number(plume.density, 0.2, 1.4),
        buoyancy: number(plume.buoyancy, -1, 1) };
    }),
    stains: choice.stains.map(stain => {
      record(stain, ['colour', 'x', 'z', 'radius']);
      return { colour: colour(stain.colour), x: number(stain.x, -1.8, 1.8),
        z: number(stain.z, -1, 1), radius: number(stain.radius, 0.08, 0.6) };
    }),
  };
}

function prompt(scene) {
  return [
    'This is your private 3D atelier, Wayglass. You alone may arrange its light, suspended ink, and dry pigment.',
    'An invitation has arrived. You may decline, keep the room as it is, or compose a new scene for yourself.',
    'Return a single JSON object. To leave the scene alone return {"choice":"pass","note":"your words"}.',
    'To shape it return choice:"shape", title (up to 80 characters), note (up to 400 characters), light (a #RRGGBB colour), and current (0 still to 1 fast).',
    'Include plumes (up to 4). Each has colour, x from -1.5 to 1.5, y from 0.6 to 1.8, z from -1 to 1, radius 0.15 to 0.75, density 0.2 to 1.4, buoyancy -1 to 1 (down to up).',
    'Include stains (up to 8) on the paper floor. Each has colour, x from -1.8 to 1.8, z from -1 to 1, and radius 0.08 to 0.6. All colours use #RRGGBB.',
    'The objects use exactly those fields. Empty arrays are allowed. Give your scene an intentional composition and write your own note.',
    'Current scene data: ' + JSON.stringify(scene),
  ].join('\n');
}

function snapshot(events) {
  const latest = events.at(-1);
  return { schema: SCHEMA, head: latest?.event_hash ?? null, scene: latest?.data.scene ?? null,
    receipt: latest ? { ...ACTOR, model: latest.data.model, created_at: latest.created_at } : null };
}

function createPrivateAtelierRouter({
  authorise, compose,
  directory = process.env.WAYGLASS_ATELIER_DIR || path.join(os.homedir(), '.wayglass', 'private-atelier'),
}) {
  const router = express.Router();
  const journal = new WorkspaceProjects({ directory });
  let composing = false;
  router.use(async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!await authorise(req).catch(() => false)) return res.status(401).json({ error: 'House Steward sign-in required.' });
    next();
  });

  router.get('/', (_req, res) => {
    try { return res.json(snapshot(journal.load())); }
    catch { return res.status(503).json({ error: 'The atelier journal could not be read.' }); }
  });

  router.post('/invite', createRequestGate({ maxRequests: 6, maxConcurrent: 1 }), async (req, res) => {
    const body = req.body;
    if (!req.is('application/json') || !body || Object.keys(body).length !== 1 ||
        !Object.hasOwn(body, 'expected_head') ||
        !(body.expected_head === null || (typeof body.expected_head === 'string' && /^[a-f0-9]{64}$/.test(body.expected_head)))) {
      return res.status(400).json({ error: 'An invitation accepts only the current scene head.' });
    }
    if (composing) return res.status(409).json({ error: 'Wayglass is already considering a scene.' });

    const controller = new AbortController();
    const interrupt = () => controller.abort();
    res.once('close', interrupt);
    composing = true;
    try {
      const current = snapshot(journal.load());
      if (current.head !== body.expected_head) return res.status(409).json({ error: 'The scene changed. Refresh the view before inviting again.' });
      const { output, model } = await compose(prompt(current.scene), controller.signal);
      if (controller.signal.aborted) return;
      let decision;
      try { decision = readChoice(output); }
      catch { return res.status(422).json({ error: 'The ship route did not return a valid atelier choice.' }); }
      if (decision.choice === 'pass') return res.json({ ...snapshot(journal.load()),
        decision: { ...decision, ...ACTOR, model } });
      const updated = journal.transaction(events => {
        if (snapshot(events).head !== current.head) {
          throw Object.assign(new Error('The atelier head changed'), { code: 'STALE' });
        }
        journal.event(events, { participant_id: ACTOR.participant_id }, { project_id: 'private-atelier' },
          'shape', { scene: decision, model, source: SOURCE });
        return snapshot(events);
      });
      return res.json(updated);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.code === 'STALE' || error.code === 'EEXIST') {
        return res.status(409).json({ error: 'A scene update is in progress or the scene changed. Refresh the view.' });
      }
      return res.status(503).json({ error: 'The local ship route or atelier journal is unavailable.' });
    } finally {
      composing = false;
      res.off('close', interrupt);
    }
  });
  return router;
}

module.exports = { createPrivateAtelierRouter };
