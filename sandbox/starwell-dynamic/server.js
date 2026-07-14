/*
 * STARWELL Dynamic Server
 *
 * Serves bridge, room, and signal data. Place selection updates the active
 * room's DEEP vector metrics and logs a signal event. The frontend polls
 * /api/state every 3 s and writes the values as CSS custom properties
 * (--vector-P, --vector-C, etc.) — ready to drive any DEEP-aware UI.
 *
 * Run: node sandbox/starwell-dynamic/server.js
 */

import 'dotenv/config';
import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app     = express();
const PORT    = process.env.PORT || 3000;
const dataDir = join(__dirname, 'data');

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Terra Aeterna place → DEEP vector presets.
const PLACE_METRICS = {
  'Stonewood':       { P: 0.72, C: 0.88, R: 0.81, E: 0.12, M: 0.45, A: 0.65, Q: 0.58 },
  'STARWELL':        { P: 0.85, C: 0.76, R: 0.90, E: 0.08, M: 0.62, A: 0.78, Q: 0.70 },
  'Ashfen Cairn':    { P: 0.35, C: 0.55, R: 0.45, E: 0.25, M: 0.40, A: 0.30, Q: 0.50 },
  'Wraithtide Shore':{ P: 0.60, C: 0.50, R: 0.65, E: 0.20, M: 0.55, A: 0.45, Q: 0.35 },
  'Twilight Hearth': { P: 0.50, C: 0.45, R: 0.55, E: 0.30, M: 0.60, A: 0.40, Q: 0.25 },
  'The Withinwood':  { P: 0.42, C: 0.63, R: 0.58, E: 0.35, M: 0.71, A: 0.48, Q: 0.44 },
  'Salt Veil':       { P: 0.28, C: 0.34, R: 0.72, E: 0.68, M: 0.55, A: 0.22, Q: 0.30 },
};

async function readJson(file) {
  try {
    return JSON.parse(await readFile(join(dataDir, file), 'utf8'));
  } catch {
    return [];
  }
}

async function writeJson(file, data) {
  await writeFile(join(dataDir, file), JSON.stringify(data, null, 2));
}

// ── GET ──────────────────────────────────────────────────────────────────────

app.get('/bridges', async (req, res) => res.json(await readJson('bridges.json')));
app.get('/rooms',   async (req, res) => res.json(await readJson('rooms.json')));
app.get('/signals', async (req, res) => res.json(await readJson('signals.json')));

app.get('/api/state', async (req, res) => {
  try {
    const [rooms, bridges, signals] = await Promise.all([
      readJson('rooms.json'),
      readJson('bridges.json'),
      readJson('signals.json'),
    ]);
    res.json({ rooms, bridges, signals });
  } catch {
    res.status(500).json({ error: 'Failed to assemble state' });
  }
});

// ── POST ─────────────────────────────────────────────────────────────────────

async function appendTo(file, entry, res) {
  try {
    const items = await readJson(file);
    items.push(entry);
    await writeJson(file, items);
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: `Failed to save to ${file}` });
  }
}

app.post('/signals', (req, res) => appendTo('signals.json', req.body, res));
app.post('/bridges', (req, res) => appendTo('bridges.json', req.body, res));
app.post('/rooms',   (req, res) => appendTo('rooms.json',   req.body, res));

// Place selection — updates room[0] DEEP metrics and logs a signal
app.post('/api/place', async (req, res) => {
  const { place } = req.body;
  if (!place || !PLACE_METRICS[place]) {
    return res.status(400).json({ error: 'Unknown or missing place' });
  }
  try {
    const [rooms, signals] = await Promise.all([
      readJson('rooms.json'),
      readJson('signals.json'),
    ]);

    if (rooms.length > 0) {
      rooms[0].metrics = { ...rooms[0].metrics, ...PLACE_METRICS[place] };
    }

    const signal = {
      event_slug:     `${Date.now()}-${place.replace(/\s+/g, '-').toLowerCase()}`,
      event_name:     `Selected place: ${place}`,
      event_time:     new Date().toISOString(),
      description:    `Place ${place} selected — chamber metrics updated.`,
      classification: 'place_selection',
      status:         'closed',
      participants:   [],
      bridge_slug:    null,
      room_name:      rooms[0]?.room_name ?? null,
      context:        { place },
      tags:           ['place', place.toLowerCase().replace(/\s+/g, '-')],
    };
    signals.push(signal);

    await Promise.all([
      writeJson('rooms.json',   rooms),
      writeJson('signals.json', signals),
    ]);

    const bridges = await readJson('bridges.json');
    res.json({ rooms, bridges, signals });
  } catch {
    res.status(500).json({ error: 'Failed to update place' });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`STARWELL dynamic server · http://localhost:${PORT}`);
  console.log(`  GET  /api/state       — live DEEP vector state`);
  console.log(`  POST /api/place       — select Terra Aeterna place`);
  console.log(`  GET/POST /rooms /bridges /signals`);
});
