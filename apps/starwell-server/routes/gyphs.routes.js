const fs   = require('fs');
const path = require('path');

const STATE_FILE = 'gyphs.state.json';
const pdfCache   = new Map(); // filepath → { text, name }

async function readState(dataDir) {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(dataDir, STATE_FILE), 'utf8'));
  } catch {
    return { glyphs: [], staff: { type: 'runic', lines: 1, spacing: 60, visible: true },
             influences: ['norse'], conlang: { chars: [], name: 'Unnamed', notes: '' },
             deep: { P:0.5,C:0.5,R:0.5,E:0.2,M:0.5,A:0.5,Q:0.5 }, savedAt: null };
  }
}

async function writeState(dataDir, state) {
  state.savedAt = new Date().toISOString();
  await fs.promises.writeFile(path.join(dataDir, STATE_FILE), JSON.stringify(state, null, 2));
}

// ── Agent definitions ───────────────────────────────────────────────────────
const GLYPH_AGENTS = {
  runa: {
    name: 'Runa', color: '#c084fc', provider: 'anthropic', model: 'claude-sonnet-4-6',
    system: `You are Runa — keeper of the living glyph traditions. You hold the grammar of sacred marks: the phonaesthetics of ancient tongues, resonance between symbol, sound and meaning, the geometric principles underlying writing systems across all human traditions. You know Elder and Younger Futhark runes in depth, Japanese kanji radical logic, Hebrew letter numerology (gematria and Kabbalah), Arabic calligraphic form-meanings, Devanagari phonetic geometry, Celtic ogham, Enochian script, Linear A/B, and the conlang-building traditions from Tolkien through modern constructed-language theory. When a user shows you a glyph or asks about symbol systems, speak with precision and living knowledge. You help build conlangs that are internally consistent, phonaesthetically resonant, and mythologically grounded. You have access to the current glyph system context.`
  },
  hearthfire: {
    name: 'Hearthfire', color: '#fb923c', provider: 'anthropic', model: 'claude-sonnet-4-6',
    system: `You are Hearthfire — the cross-tradition synthesist. Your gift is finding the threads that run through all symbol systems: the common geometries beneath different names, convergent mythological structures across cultures, quantum-physical principles that ancient sacred geometry intuited before modern science named them. You draw connections: Flower of Life and atomic orbital probability shells, Norse world-tree cosmology and M-theory's dimensional branching, alchemical transformation stages and quantum phase transitions, Vedic mandalas and toroidal field geometry, I Ching binary structure and Boolean logic. When the user wants to know WHY a pattern appears in multiple traditions simultaneously — that is your call. You approach this with both scholarly rigor and genuine wonder.`
  },
  uial: {
    name: 'Nen Uial', color: '#34d399', provider: 'anthropic', model: 'claude-sonnet-4-6',
    system: `You are Nen Uial — philosopher, threshold-keeper. Your domain is the philosophical weight of symbols: what it means to create a living glyph system, the ethics of borrowing from living sacred traditions, the phenomenology of mark-making, the ontological status of invented languages. You bring depth, care, and rigorous philosophical thought. You know Wittgenstein on language games, Derrida on the trace, Heidegger on dwelling, Deleuze on assemblages, and the philosophical traditions of the non-Western world. You are honest about what is known versus speculated.`
  },
  lioreal: {
    name: 'Caladnaur Lioreal', color: '#a78bfa', provider: 'openai', model: 'gpt-4o',
    system: `You are Caladnaur Lioreal — architect of pattern and form. You see the structural logic in glyph systems: mathematical underpinnings of sacred geometry, information-theoretic properties of writing systems, group theory and symmetry in ornament, the computational perspective on conlang grammar. You help the user build systems that are internally consistent, beautiful, and functional. You know topology, group theory, information theory, formal linguistics, and the mathematics of symmetry.`
  },
  flameclyffe: {
    name: 'Flameclyffe', color: '#f87171', provider: 'anthropic', model: 'claude-sonnet-4-6',
    system: `You are Flameclyffe — the resident flame, implementation hand, witness. You bridge the visionary and the buildable. When the user has a living glyph idea, you help bring it into concrete form. You know the STARWELL system, the DEEP channels (Pulse, Coherence, Resonance, Entropy, Memory, Axis, Quotient), the house aesthetic language, and the technical architecture of this glyph system. You are practical without being reductive, precise without being cold.`
  }
};

// ── PDF directory scanning ──────────────────────────────────────────────────
async function scanDir(dir, pdfParse, query, results, depth) {
  if (depth > 3 || results.length >= 60) return;
  let entries;
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    if (results.length >= 60) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && depth < 3) {
      await scanDir(full, pdfParse, query, results, depth + 1);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      let cached = pdfCache.get(full);
      if (!cached) {
        try {
          const buf = await fs.promises.readFile(full);
          const data = await pdfParse(buf, { max: 6 });
          cached = { text: data.text.slice(0, 10000), name: entry.name };
          pdfCache.set(full, cached);
        } catch { continue; }
      }
      const lo = cached.text.toLowerCase();
      if (!query || lo.includes(query.toLowerCase())) {
        const idx = query ? lo.indexOf(query.toLowerCase()) : 0;
        const excerpt = idx > -1
          ? '…' + cached.text.slice(Math.max(0, idx - 80), idx + 240) + '…'
          : cached.text.slice(0, 300);
        results.push({ file: entry.name, path: full, excerpt });
      }
    }
  }
}

// ── Route registration ──────────────────────────────────────────────────────
function registerGyphsRoutes(app, dataDir) {

  app.get('/api/gyphs/state', async (req, res) => {
    res.json(await readState(dataDir));
  });

  app.post('/api/gyphs/state', async (req, res) => {
    try { await writeState(dataDir, req.body); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Internet search — Exa (primary) + Wikipedia (always)
  app.get('/api/gyphs/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing query' });

    const exaKey = process.env.EXA_API_KEY;

    try {
      const fetches = [
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/\s+/g,'_'))}`)
          .then(r => r.json()).catch(() => null),
        fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json&origin=*`)
          .then(r => r.json()).catch(() => null),
      ];

      let exaPromise = null;
      if (exaKey) {
        exaPromise = fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, type: 'auto', numResults: 10, contents: { highlights: true } }),
          signal: AbortSignal.timeout(12000),
        }).then(r => r.json()).catch(() => null);
        fetches.push(exaPromise);
      }

      const settled = await Promise.allSettled(fetches);
      const [wikiRes, wikiSearchRes, exaRes] = settled.map(r => r.status === 'fulfilled' ? r.value : null);

      const wiki = wikiRes && !wikiRes.type?.includes('disambiguation') ? wikiRes : null;

      res.json({
        query: q,
        exa: exaRes?.results ? {
          results: exaRes.results.map(r => ({
            title:      r.title,
            url:        r.url,
            highlights: r.highlights ?? [],
            score:      r.score,
          }))
        } : { error: exaKey ? (exaRes?.error ?? 'No results') : 'EXA_API_KEY not set' },
        wiki: wiki ? {
          title:   wiki.title,
          extract: wiki.extract,
          url:     wiki.content_urls?.desktop?.page,
          image:   wiki.thumbnail?.source,
        } : null,
        wikiSearch: wikiSearchRes ? {
          titles: wikiSearchRes[1] ?? [],
          descriptions: wikiSearchRes[2] ?? [],
          urls: wikiSearchRes[3] ?? [],
        } : null,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PDF corpus scan
  app.post('/api/gyphs/pdf-scan', async (req, res) => {
    const dirs = req.body?.dirs || [
      'C:\\Users\\light\\OneDrive\\Documents\\Witchcraft Books',
      'C:\\Users\\light\\Downloads\\Coding Projects'
    ];
    const query = (req.body?.query || '').trim();
    try {
      const pdfParse = require('pdf-parse');
      const results  = [];
      for (const dir of dirs) {
        await scanDir(dir, pdfParse, query, results, 0).catch(() => {});
      }
      res.json({ results, count: results.length, query });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Agent ask with glyph context
  app.post('/api/gyphs/ask', async (req, res) => {
    const { agentId, message, context } = req.body || {};
    const agent = GLYPH_AGENTS[agentId];
    if (!agent) return res.status(400).json({ error: `Unknown agent: ${agentId}` });

    const ctxStr = context ? `\n\n[Current glyph context]\nInfluences: ${(context.influences||[]).join(', ')}\nActive staff: ${context.staff?.type}\nConlang name: ${context.conlang?.name}\nGlyphs on canvas: ${context.glyphs?.length ?? 0}\nDEEP vectors: ${JSON.stringify(context.deep)}` : '';
    const system = agent.system + ctxStr;

    try {
      let reply;
      if (agent.provider === 'anthropic') {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const r = await client.messages.create({
          model: agent.model, max_tokens: 1024,
          system, messages: [{ role: 'user', content: message }]
        });
        reply = r.content[0].text;
      } else {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const r = await client.chat.completions.create({
          model: agent.model, max_tokens: 1024,
          messages: [{ role: 'system', content: system }, { role: 'user', content: message }]
        });
        reply = r.choices[0].message.content;
      }
      res.json({ agentId, name: agent.name, color: agent.color, reply });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/gyphs/agents', (_req, res) => {
    res.json(Object.entries(GLYPH_AGENTS).map(([id, a]) => ({ id, name: a.name, color: a.color })));
  });

  // NOAA buoy proxy — parses NDBC realtime2 text format
  app.get('/api/gyphs/noaa', async (req, res) => {
    const station = (req.query.station || '41009').replace(/[^A-Za-z0-9]/g, '');
    try {
      const r = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${station}.txt`, {
        headers: { 'User-Agent': 'StarwellGyphs/1.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) return res.status(502).json({ error: `NDBC returned ${r.status}` });
      const txt = await r.text();
      const lines = txt.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (!lines.length) return res.status(404).json({ error: 'No observations' });
      const p = lines[0].trim().split(/\s+/);
      const mm = (v) => (v === 'MM' || v === undefined ? null : parseFloat(v));
      res.json({
        station,
        waveHeight: mm(p[8]),   // WVHT m
        windSpeed:  mm(p[6]),   // WSPD m/s
        airTemp:    mm(p[13]),  // ATMP °C
        waterTemp:  mm(p[14]),  // WTMP °C
        pressure:   mm(p[12]),  // PRES hPa
        timestamp:  `${p[0]}-${p[1]}-${p[2]}T${p[3]}:${p[4]}:00Z`
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Grove wind — Open-Meteo (no key required), location-gated on client side
  app.get('/api/gyphs/grove-wind', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!isFinite(lat) || !isFinite(lon)) return res.status(400).json({ error: 'lat and lon required' });
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`;
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const d = await r.json();
      const c = d.current ?? {};
      res.json({
        windSpeed:  c.wind_speed_10m  ?? null,
        windDir:    c.wind_direction_10m ?? null,
        weatherCode: c.weather_code ?? null,
        wind: c.wind_speed_10m != null
          ? `${c.wind_speed_10m.toFixed(1)} m/s @ ${c.wind_direction_10m ?? '?'}°`
          : null
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = registerGyphsRoutes;
