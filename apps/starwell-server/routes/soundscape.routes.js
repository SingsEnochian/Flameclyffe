'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Anthropic = require('@anthropic-ai/sdk');
const { FLAMES } = require('../flames/manifests');

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

function profileDir(dataDir) {
  return path.join(dataDir, 'soundscape-profiles');
}

function profilePath(dataDir, slug) {
  return path.join(profileDir(dataDir), `${slug}.json`);
}

async function readStoredProfile(dataDir, slug) {
  try {
    const raw = await fs.promises.readFile(profilePath(dataDir, slug), 'utf8');
    const p = JSON.parse(raw);
    if (p && p.schema_version === 'hearthgate.world-hum/v0.1') return p;
  } catch { /* not found or invalid */ }
  return null;
}

async function generateViaRuna(slug) {
  const runa = FLAMES.runa;
  if (!runa) throw new Error('Runa flame not configured');
  const key = process.env[runa.platform.api_key_env];
  if (!key) throw new Error(`${runa.platform.api_key_env} not set`);

  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: runa.platform.model,
    max_tokens: 1024,
    system: runa.system_prompt,
    messages: [{ role: 'user', content: `Generate the acoustic profile for world: "${slug}"` }],
  });

  const text = msg.content[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Runa did not return valid JSON');
  const profile = JSON.parse(match[0]);

  // Enforce required fields
  if (!profile.layers || !Array.isArray(profile.layers)) throw new Error('Profile missing layers');
  profile.schema_version = 'hearthgate.world-hum/v0.1';
  profile.world_slug = slug;
  profile.generated_by = 'runa';
  profile.generated_at = new Date().toISOString();

  return profile;
}

async function storeProfile(dataDir, slug, profile) {
  const dir = profileDir(dataDir);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(profilePath(dataDir, slug), JSON.stringify(profile, null, 2), 'utf8');
}

function registerSoundscapeRoutes(app, dataDir) {
  // GET /api/soundscape/profile/:worldSlug
  // Returns stored profile; generates via Runa if not yet stored
  app.get('/api/soundscape/profile/:worldSlug', async (req, res) => {
    const slug = req.params.worldSlug;
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'Invalid world slug' });

    const stored = await readStoredProfile(dataDir, slug);
    if (stored) return res.json(stored);

    // Not stored — generate via Runa
    try {
      const profile = await generateViaRuna(slug);
      await storeProfile(dataDir, slug, profile);
      return res.json(profile);
    } catch (err) {
      console.error(`[runa] profile generation failed for ${slug}:`, err.message);
      return res.status(502).json({ error: `Runa generation failed: ${err.message}` });
    }
  });

  // POST /api/soundscape/profile/:worldSlug/generate
  // Force-regenerates via Runa and stores the result
  app.post('/api/soundscape/profile/:worldSlug/generate', async (req, res) => {
    const slug = req.params.worldSlug;
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'Invalid world slug' });

    try {
      const profile = await generateViaRuna(slug);
      await storeProfile(dataDir, slug, profile);
      return res.status(201).json({ ok: true, profile });
    } catch (err) {
      console.error(`[runa] profile regeneration failed for ${slug}:`, err.message);
      return res.status(502).json({ error: `Runa generation failed: ${err.message}` });
    }
  });

  // GET /api/soundscape/profiles
  // List all stored profiles
  app.get('/api/soundscape/profiles', async (req, res) => {
    const dir = profileDir(dataDir);
    try {
      const files = await fs.promises.readdir(dir);
      const slugs = files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
      return res.json({ profiles: slugs });
    } catch {
      return res.json({ profiles: [] });
    }
  });
}

module.exports = registerSoundscapeRoutes;
