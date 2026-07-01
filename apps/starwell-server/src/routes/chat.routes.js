import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import * as store from '../chat/room-store.js';
import * as status from '../chat/status-store.js';
import { MEMBERS, isPass, extractAvatar } from '../chat/ai-members.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../public/uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_EXT.has(extname(file.originalname).toLowerCase()));
  },
});

export const chatRouter = Router();

// ── Status ─────────────────────────────────────────────────────────────────

chatRouter.get('/status', (_req, res) => {
  res.json({ ok: true, members: status.getStatuses() });
});

chatRouter.patch('/status/:member', (req, res) => {
  const { status: s, note, displayName } = req.body ?? {};
  try {
    const m = status.setStatus(req.params.member, { status: s, note, displayName });
    return res.json({ ok: true, member: m });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

// ── Image upload ───────────────────────────────────────────────────────────

chatRouter.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No valid image received (jpg/png/gif/webp/svg, max 12MB)' });
  return res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// ── Rooms ──────────────────────────────────────────────────────────────────

chatRouter.get('/rooms', (_req, res) => {
  res.json({ ok: true, rooms: store.getRooms() });
});

chatRouter.post('/rooms', (req, res) => {
  const { id, label, description } = req.body ?? {};
  if (!id || !label) {
    return res.status(400).json({ ok: false, error: 'id and label are required' });
  }
  try {
    return res.status(201).json({ ok: true, room: store.createRoom({ id, label, description }) });
  } catch (err) {
    return res.status(409).json({ ok: false, error: err.message });
  }
});

chatRouter.get('/rooms/:id', (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });
  return res.json({ ok: true, room });
});

chatRouter.patch('/rooms/:id', (req, res) => {
  try {
    return res.json({ ok: true, room: store.updateRoom(req.params.id, req.body ?? {}) });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

chatRouter.delete('/rooms/:id', (req, res) => {
  if (!store.deleteRoom(req.params.id)) {
    return res.status(404).json({ ok: false, error: 'Room not found' });
  }
  return res.json({ ok: true, deleted: req.params.id });
});

// ── Flags ──────────────────────────────────────────────────────────────────

chatRouter.post('/rooms/:id/flag', (req, res) => {
  const { note = '' } = req.body ?? {};
  try {
    return res.json({ ok: true, room: store.flagRoom(req.params.id, note) });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

chatRouter.post('/rooms/:id/unflag', (req, res) => {
  try {
    return res.json({ ok: true, room: store.unflagRoom(req.params.id) });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

// ── Messages ───────────────────────────────────────────────────────────────

chatRouter.post('/rooms/:id/say', (req, res) => {
  const { from, text } = req.body ?? {};
  if (!from || !text?.trim()) {
    return res.status(400).json({ ok: false, error: 'from and text are required' });
  }
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

  try {
    const msg = store.addMessage(req.params.id, { from, text: text.trim() });
    return res.json({ ok: true, message: msg });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

chatRouter.post('/rooms/:id/breaker/reset', (req, res) => {
  store.resetBreaker(req.params.id);
  return res.json({ ok: true, breaker: store.checkBreaker(req.params.id) });
});

chatRouter.get('/rooms/:id/breaker', (req, res) => {
  return res.json({ ok: true, breaker: store.checkBreaker(req.params.id) });
});

chatRouter.post('/rooms/:id/ask/:member', async (req, res) => {
  const { from, text } = req.body ?? {};
  if (!from || !text?.trim()) {
    return res.status(400).json({ ok: false, error: 'from and text are required' });
  }

  const memberName = req.params.member;
  const member = MEMBERS[memberName];
  if (!member) {
    return res.status(400).json({ ok: false, error: `Unknown member. Valid: ${Object.keys(MEMBERS).join(', ')}` });
  }

  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

  const breaker = store.checkBreaker(req.params.id);
  if (breaker.tripped) {
    return res.json({ ok: true, tripped: true, message: null, reply: null });
  }

  const inMsg = store.addMessage(req.params.id, { from, text: text.trim() });
  const currentRoom = store.getRoom(req.params.id);

  status.setStatus(memberName, { status: 'thinking' });

  let replyText;
  try {
    replyText = await member.call(currentRoom, inMsg);
    status.setStatus(memberName, { status: 'online' });
  } catch (err) {
    status.setStatus(memberName, { status: 'offline' });
    const displayName = status.getStatus(memberName)?.displayName ?? memberName;
    const noteMsg = store.addMessage(req.params.id, {
      from: memberName,
      text: `*(${displayName} is unreachable right now.)*`,
      model: member.model,
    });
    return res.json({ ok: true, message: inMsg, reply: noteMsg, unreachable: true });
  }

  if (isPass(replyText)) {
    return res.json({ ok: true, passed: true, message: inMsg, reply: null });
  }

  const { text: cleanText, avatar } = extractAvatar(replyText);
  if (avatar) store.updateRoom(req.params.id, { avatars: { [memberName]: avatar } });

  const replyMsg = store.addMessage(req.params.id, { from: memberName, text: cleanText, model: member.model });
  return res.json({ ok: true, message: inMsg, reply: replyMsg });
});

chatRouter.post('/rooms/:id/broadcast', (req, res) => {
  const { from, text } = req.body ?? {};
  if (!from || !text?.trim()) {
    return res.status(400).json({ ok: false, error: 'from and text are required' });
  }

  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });

  const breaker = store.checkBreaker(req.params.id);
  if (breaker.tripped) {
    return res.json({ ok: true, tripped: true, message: null });
  }

  const inMsg = store.addMessage(req.params.id, { from, text: text.trim() });

  // Return immediately — AI calls happen async, UI polls pick up replies as they land
  res.json({ ok: true, message: inMsg });

  const currentRoom = store.getRoom(req.params.id);
  Object.keys(MEMBERS).forEach(name => status.setStatus(name, { status: 'thinking' }));

  Promise.allSettled(
    Object.entries(MEMBERS).map(([name, m]) =>
      m.call(currentRoom, inMsg)
        .then(t => {
          status.setStatus(name, { status: 'online' });
          if (!isPass(t)) {
            const { text: cleanText, avatar } = extractAvatar(t);
            if (avatar) store.updateRoom(req.params.id, { avatars: { [name]: avatar } });
            store.addMessage(req.params.id, { from: name, text: cleanText, model: m.model });
          }
        })
        .catch(err => {
          status.setStatus(name, { status: 'offline' });
          console.error(`[broadcast] ${name}:`, err.message);
          const displayName = status.getStatus(name)?.displayName ?? name;
          store.addMessage(req.params.id, {
            from: name,
            text: `*(${displayName} is unreachable right now.)*`,
            model: MEMBERS[name]?.model,
          });
        })
    )
  );
});
