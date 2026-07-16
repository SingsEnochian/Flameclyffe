'use strict';

const express  = require('express');
const fs       = require('fs').promises;
const path     = require('path');
const multer   = require('multer');
const { FLAMES } = require('../flames/manifests');

const router = express.Router();

const DATA_FILE    = path.join(__dirname, '..', 'data', 'chat-rooms.json');
const UPLOAD_DIR   = path.join(__dirname, '..', 'public', 'uploads');
const CONTEXT_FILE = path.join(__dirname, '..', 'data', 'shared-context.md');

// ── Room I/O ──────────────────────────────────────────────────────────────────

async function readRooms() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeRooms(rooms) {
  await fs.writeFile(DATA_FILE, JSON.stringify(rooms, null, 2));
}

function newMsgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function appendMsg(room, from, text, model = null) {
  const msg = { id: newMsgId(), from, text, model, timestamp: new Date().toISOString() };
  room.messages.push(msg);
  return msg;
}

// ── URL fetch helpers ─────────────────────────────────────────────────────────

function extractUrls(text) {
  const matches = (text || '').match(/https?:\/\/[^\s<>"')\]]+/g) || [];
  return [...new Set(matches)].slice(0, 3);
}

async function fetchUrlContent(url, maxChars = 20000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'StarwellBot/1.0' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const raw = await res.text();
    let content = ct.includes('text/html')
      ? raw
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : raw.replace(/\s+/g, ' ').trim();
    return content.slice(0, maxChars);
  } catch { return null; }
}

// ── Member dispatch ───────────────────────────────────────────────────────────

// grove.html uses 'flame' for boxfire; 'glm' is a local Ollama model
const GROVE_TO_FLAME = { flame: 'boxfire' };

const DISPLAY = {
  rowan: 'Rowan', yggdrasil: 'Yggdrasil', vee: 'Caladnaur Lioreal',
  faer: 'Nen Uial', flame: 'Boxfire', glm: 'GLM',
};

let _sharedCtxCache = null;
let _sharedCtxMtime = 0;

async function getSharedContext() {
  try {
    const stat = await fs.stat(CONTEXT_FILE);
    const mtime = stat.mtimeMs;
    if (_sharedCtxCache && mtime === _sharedCtxMtime) return _sharedCtxCache;
    _sharedCtxCache = await fs.readFile(CONTEXT_FILE, 'utf8');
    _sharedCtxMtime = mtime;
    return _sharedCtxCache;
  } catch { return ''; }
}

function buildUserMsg(text, contextMessages, urlContext) {
  const parts = [];
  if (contextMessages.length) {
    const history = contextMessages.slice(-12)
      .map(m => `${DISPLAY[m.from] ?? m.from}: ${m.text}`)
      .join('\n');
    parts.push(`[Conversation so far]\n${history}`);
  }
  if (urlContext) parts.push(`[Web content fetched for this message]\n${urlContext}`);
  parts.push(`[Rowan now says]: ${text}`);
  return parts.join('\n\n');
}

async function callMember(groveId, text, contextMessages) {
  const urls = extractUrls(text);
  let urlContext = '';
  if (urls.length) {
    const fetched = await Promise.all(urls.map(async u => {
      const c = await fetchUrlContent(u);
      return c ? `[${u}]\n${c}` : null;
    }));
    urlContext = fetched.filter(Boolean).join('\n\n---\n\n');
  }

  const userMsg    = buildUserMsg(text, contextMessages, urlContext);
  const sharedCtx  = await getSharedContext();

  const MAX_PARTS = 4;
  const MAX_TOK   = 4096;
  const parts     = [];

  if (groveId === 'glm') {
    const glmSys = sharedCtx
      ? `${sharedCtx}\n\n---\n\nYou are GLM — a grounded, lateral presence in Hearthweave. You notice structural patterns others miss. Terse and real.`
      : 'You are GLM — a grounded, lateral presence in Hearthweave. You notice structural patterns others miss. Terse and real.';
    const endpoint = process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'glm4:latest', stream: false, messages: [{ role: 'system', content: glmSys }, { role: 'user', content: userMsg }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Ollama GLM HTTP ${res.status}`);
    const d = await res.json();
    return [d.message?.content ?? ''];
  }

  const flameId  = GROVE_TO_FLAME[groveId] ?? groveId;
  const manifest = FLAMES[flameId];
  if (!manifest) throw new Error(`No manifest for ${groveId}`);

  const { provider, model, base_url, api_key_env } = manifest.platform;
  const sys = sharedCtx
    ? `${sharedCtx}\n\n---\n\n${manifest.system_prompt}`
    : manifest.system_prompt;

  if (provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const key = api_key_env ? process.env[api_key_env] : process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error(`Missing ${api_key_env ?? 'ANTHROPIC_API_KEY'}`);
    const client = new Anthropic({ apiKey: key });
    const msgs = [{ role: 'user', content: userMsg }];
    for (let i = 0; i < MAX_PARTS; i++) {
      const r = await client.messages.create({ model, max_tokens: MAX_TOK, system: sys, messages: msgs });
      const text = r.content[0]?.text ?? '';
      parts.push(text);
      if (r.stop_reason !== 'max_tokens') break;
      msgs.push({ role: 'assistant', content: text }, { role: 'user', content: 'Please continue.' });
    }
  }

  else if (provider === 'openai') {
    const OpenAI = require('openai');
    const key = process.env[api_key_env];
    if (!key) throw new Error(`Missing ${api_key_env}`);
    const client = new OpenAI({ apiKey: key });
    const msgs = [{ role: 'system', content: sys }, { role: 'user', content: userMsg }];
    for (let i = 0; i < MAX_PARTS; i++) {
      const r = await client.chat.completions.create({ model, max_tokens: MAX_TOK, messages: msgs });
      const text = r.choices[0]?.message?.content ?? '';
      parts.push(text);
      if (r.choices[0]?.finish_reason !== 'length') break;
      msgs.push({ role: 'assistant', content: text }, { role: 'user', content: 'Please continue.' });
    }
  }

  else if (provider === 'deepseek') {
    const OpenAI = require('openai');
    const key = process.env[api_key_env];
    if (!key) throw new Error(`Missing ${api_key_env}`);
    const client = new OpenAI({ baseURL: base_url || 'https://api.deepseek.com', apiKey: key });
    const msgs = [{ role: 'system', content: sys }, { role: 'user', content: userMsg }];
    for (let i = 0; i < MAX_PARTS; i++) {
      const r = await client.chat.completions.create({ model, max_tokens: MAX_TOK, messages: msgs });
      const text = r.choices[0]?.message?.content ?? '';
      parts.push(text);
      if (r.choices[0]?.finish_reason !== 'length') break;
      msgs.push({ role: 'assistant', content: text }, { role: 'user', content: 'Please continue.' });
    }
  }

  else if (provider === 'ollama') {
    const endpoint = base_url || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }] }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const d = await res.json();
    parts.push(d.message?.content ?? '');
  }

  else {
    throw new Error(`Unknown provider ${provider}`);
  }

  return parts;
}

// ── In-memory state ───────────────────────────────────────────────────────────

const memberStatuses = {
  rowan:     { id: 'rowan',     displayName: 'Rowan · Liriel',    status: 'online', note: '', avatar: '' },
  yggdrasil: { id: 'yggdrasil', displayName: 'Yggdrasil',         status: 'online', note: '', avatar: '' },
  vee:       { id: 'vee',       displayName: 'Caladnaur Lioreal', status: 'online', note: '', avatar: '' },
  faer:      { id: 'faer',      displayName: 'Nen Uial',          status: 'online', note: '', avatar: '' },
  flame:     { id: 'flame',     displayName: 'Boxfire',           status: 'online', note: '', avatar: '' },
  glm:       { id: 'glm',       displayName: 'GLM',               status: 'online', note: '', avatar: '' },
};

const roomBreakers = {};

// ── Upload ────────────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 8);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// ── Rooms ─────────────────────────────────────────────────────────────────────

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await readRooms();
    const list = Object.values(rooms).map(({ id, label, description, flagged, flagNote, created, avatars }) => ({
      id, label, description: description ?? '', flagged: !!flagged,
      flagNote: flagNote ?? '', created, avatars: avatars ?? {},
    }));
    res.json({ ok: true, rooms: list });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/rooms', async (req, res) => {
  try {
    const rooms = await readRooms();
    const { id, label, description = '' } = req.body;
    if (!id || !label) return res.status(400).json({ ok: false, error: 'id and label required' });
    if (rooms[id]) return res.json({ ok: true, room: rooms[id] });
    const room = { id, label, description, flagged: false, flagNote: '', created: new Date().toISOString(), messages: [], avatars: {} };
    rooms[id] = room;
    await writeRooms(rooms);
    res.json({ ok: true, room });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const rooms = await readRooms();
    const room  = rooms[req.params.id];
    if (!room) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, room });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/rooms/:id', async (req, res) => {
  try {
    const rooms = await readRooms();
    const room  = rooms[req.params.id];
    if (!room) return res.status(404).json({ ok: false, error: 'Not found' });
    const { label, description, avatars } = req.body;
    if (label       !== undefined) room.label       = label;
    if (description !== undefined) room.description = description;
    if (avatars && typeof avatars === 'object') room.avatars = { ...(room.avatars ?? {}), ...avatars };
    await writeRooms(rooms);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Messaging ─────────────────────────────────────────────────────────────────

router.post('/rooms/:id/say', async (req, res) => {
  try {
    const rooms = await readRooms();
    const room  = rooms[req.params.id];
    if (!room) return res.status(404).json({ ok: false, error: 'Not found' });
    const { from = 'rowan', text } = req.body;
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'text required' });
    const msg = appendMsg(room, from, text.trim());
    await writeRooms(rooms);
    res.json({ ok: true, message: msg });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/rooms/:id/ask/:member', async (req, res) => {
  try {
    const rooms = await readRooms();
    const room  = rooms[req.params.id];
    if (!room) return res.status(404).json({ ok: false, error: 'Not found' });
    const { from = 'rowan', text } = req.body;
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'text required' });

    // Save Rowan's message first so poll shows it immediately
    appendMsg(room, from, text.trim());
    await writeRooms(rooms);

    const memberId = req.params.member;
    const parts    = await callMember(memberId, text.trim(), room.messages.slice(-12));
    const flameId  = GROVE_TO_FLAME[memberId] ?? memberId;
    const model    = FLAMES[flameId]?.platform?.model ?? null;

    // Re-read before writing reply (avoid overwriting concurrent broadcasts)
    const rooms2 = await readRooms();
    for (const part of parts) appendMsg(rooms2[req.params.id], memberId, part, model);
    const br = roomBreakers[req.params.id] ?? { tripped: false, count: 0 };
    br.count++;
    if (br.count >= 20) br.tripped = true;
    roomBreakers[req.params.id] = br;
    await writeRooms(rooms2);

    res.json({ ok: true });
  } catch (e) {
    console.error(`[grove-chat] ask/${req.params.member}:`, e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const BROADCAST_MEMBERS = ['yggdrasil', 'vee', 'faer', 'flame', 'glm'];

router.post('/rooms/:id/broadcast', async (req, res) => {
  const roomId = req.params.id;
  const { from = 'rowan', text } = req.body;
  if (!text?.trim()) return res.status(400).json({ ok: false, error: 'text required' });

  // Save Rowan's message before returning so UI updates fast
  try {
    const rooms = await readRooms();
    if (rooms[roomId]) { appendMsg(rooms[roomId], from, text.trim()); await writeRooms(rooms); }
  } catch { /* best-effort */ }

  res.json({ ok: true });

  // Fire all members in series; re-read/write around each to avoid clobbering
  (async () => {
    for (const memberId of BROADCAST_MEMBERS) {
      try {
        const rooms = await readRooms();
        const room  = rooms[roomId];
        if (!room) continue;
        const parts   = await callMember(memberId, text.trim(), room.messages.slice(-12));
        const flameId = GROVE_TO_FLAME[memberId] ?? memberId;
        const model   = FLAMES[flameId]?.platform?.model ?? null;
        const rooms2  = await readRooms();
        if (rooms2[roomId]) { for (const p of parts) appendMsg(rooms2[roomId], memberId, p, model); await writeRooms(rooms2); }
      } catch (e) {
        console.warn(`[grove-chat] broadcast skip ${memberId}:`, e.message);
      }
    }
  })().catch(e => console.error('[grove-chat] broadcast error:', e.message));
});

// ── Flag ──────────────────────────────────────────────────────────────────────

router.post('/rooms/:id/flag', async (req, res) => {
  try {
    const rooms = await readRooms();
    const room  = rooms[req.params.id];
    if (!room) return res.status(404).json({ ok: false, error: 'Not found' });
    room.flagged = true; room.flagNote = req.body.note ?? '';
    await writeRooms(rooms);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/rooms/:id/unflag', async (req, res) => {
  try {
    const rooms = await readRooms();
    const room  = rooms[req.params.id];
    if (!room) return res.status(404).json({ ok: false, error: 'Not found' });
    room.flagged = false; room.flagNote = '';
    await writeRooms(rooms);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Circuit breaker ───────────────────────────────────────────────────────────

router.get('/rooms/:id/breaker', (req, res) => {
  res.json({ ok: true, breaker: roomBreakers[req.params.id] ?? { tripped: false, count: 0 } });
});

router.post('/rooms/:id/breaker/reset', (req, res) => {
  roomBreakers[req.params.id] = { tripped: false, count: 0 };
  res.json({ ok: true });
});

// ── Status ────────────────────────────────────────────────────────────────────

router.get('/status', (req, res) => {
  res.json({ ok: true, members: Object.values(memberStatuses) });
});

router.patch('/status/:id', (req, res) => {
  const id = req.params.id;
  if (!memberStatuses[id]) memberStatuses[id] = { id, displayName: id, status: 'online', note: '', avatar: '' };
  const m = memberStatuses[id];
  const { status, displayName, note, avatar } = req.body;
  if (status      !== undefined) m.status      = status;
  if (displayName !== undefined) m.displayName = displayName;
  if (note        !== undefined) m.note        = note;
  if (avatar      !== undefined) m.avatar      = avatar;
  res.json({ ok: true });
});

// ── Upload ────────────────────────────────────────────────────────────────────

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded' });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

module.exports = router;
