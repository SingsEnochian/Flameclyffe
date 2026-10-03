'use strict';

const express = require('express');
const {
  publicWayglassRoutes,
  resolveWayglassRoute,
} = require('../../../lib/wayglass-route-registry.cjs');

const router = express.Router();
const MAX_HISTORY = 16;
const MAX_TEXT = 12000;

function cleanText(value, max = MAX_TEXT) {
  return String(value || '').trim().slice(0, max);
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY)
    .filter((item) => item && ['user', 'assistant'].includes(item.role))
    .map((item) => ({ role: item.role, content: cleanText(item.content, 8000) }))
    .filter((item) => item.content);
}

function cleanOwnership(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.slice(0, 24).map((entry) => ({
    character: cleanText(entry?.character, 120),
    owner: cleanText(entry?.owner, 120),
    permission: ['owned', 'shared', 'temporary-handoff'].includes(entry?.permission)
      ? entry.permission
      : 'owned',
  })).filter((entry) => entry.character && entry.owner);
}

function buildInstructions(interaction = {}) {
  const channel = interaction.channel === 'OOC' ? 'OOC' : 'IC';
  const owner = cleanText(interaction.turn_owner, 120) || 'unspecified';
  const ownership = cleanOwnership(interaction.character_ownership);
  const ownershipLines = ownership.length
    ? ownership.map((entry) => '- ' + entry.character + ': ' + entry.owner + ' (' + entry.permission + ')').join('\n')
    : '- no character ownership declared';

  return [
    'You are participating through Wayglass OS on an attached ArcSweep co-writing surface.',
    'The core rule is: do not write for the author. Write with the author.',
    'Current channel: ' + channel + '. Current turn owner: ' + owner + '.',
    channel === 'IC'
      ? 'Advance the fiction. Respect declared character ownership. Do not decide another owner\'s character\'s private thoughts, irreversible choices, or unoffered outcomes. Leave playable hooks rather than closing the other participant\'s turn.'
      : 'Speak in the writer-room. Discuss craft, canon, intent, pacing, continuity, and handoffs. OOC text does not become in-world fact by default.',
    'Character ownership:',
    ownershipLines,
    'Bring your own perception, questions, alternatives, and creative contribution. Do not imitate the author as a substitute for collaboration.',
  ].join('\n\n');
}

function outputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  if (!Array.isArray(data?.output)) return '';
  return data.output
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .filter((block) => block?.type === 'output_text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

async function callOpenAI(route, payload) {
  const key = route.api_key();
  if (!key) {
    const error = new Error('OpenAI is not configured for Wayglass.');
    error.status = 503;
    throw error;
  }

  const input = [
    ...cleanHistory(payload.history),
    { role: 'user', content: cleanText(payload.input) },
  ];

  const response = await fetch(route.endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model: route.model(),
      instructions: buildInstructions(payload.interaction),
      input,
      max_output_tokens: Math.max(64, Math.min(4000, Number(payload.max_output_tokens) || 1400)),
      store: false,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || 'Wayglass OpenAI route failed.');
    error.status = response.status;
    throw error;
  }

  return {
    output: outputText(data),
    response_id: data.id || null,
    usage: data.usage || null,
  };
}

router.get('/routes', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    schema: 'wayglass.route-catalogue/v0.1',
    routes: publicWayglassRoutes(),
  });
});

router.post('/respond', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const payload = req.body || {};
  const route = resolveWayglassRoute(payload.route_id || 'openai:gpt');
  if (!route) return res.status(404).json({ error: 'Unknown Wayglass route.' });
  if (!cleanText(payload.input)) return res.status(400).json({ error: 'input required.' });

  try {
    if (route.provider !== 'openai') return res.status(501).json({ error: 'Provider adapter not implemented yet.' });
    const result = await callOpenAI(route, payload);
    return res.json({
      schema: 'wayglass.route-turn/v0.1',
      route_id: route.route_id,
      provider: route.provider,
      model: route.model(),
      output: result.output,
      receipt: {
        response_id: result.response_id,
        session_id: cleanText(payload.session_id, 160) || null,
        surface_id: cleanText(payload.surface_id, 160) || null,
        channel: payload?.interaction?.channel === 'OOC' ? 'OOC' : 'IC',
        completed_at: new Date().toISOString(),
        stored_by_provider_request: false,
        usage: result.usage,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Wayglass route failed.' });
  }
});

module.exports = router;
