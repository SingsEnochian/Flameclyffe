// ── Circuit breakers (in-memory, per room, not persisted) ─────────────────────
// Trips after MAX_AI_TURNS consecutive non-human messages. Resets on human turn.

const MAX_AI_TURNS = 5;
const breakers = new Map();

function breaker(roomId) {
  if (!breakers.has(roomId)) breakers.set(roomId, { turns: 0, tripped: false });
  return breakers.get(roomId);
}

export function checkBreaker(roomId) { return { ...breaker(roomId) }; }

export function resetBreaker(roomId) {
  const b = breaker(roomId);
  b.turns = 0;
  b.tripped = false;
}

// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const STORE_FILE = join(DATA_DIR, 'chat-rooms.json');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const BACKUP_KEEP = 48; // 4 hours of 5-minute backups

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

const rooms = new Map();

function persist() {
  writeFileSync(STORE_FILE, JSON.stringify(Object.fromEntries(rooms), null, 2));
}

function backup() {
  if (!existsSync(STORE_FILE)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  writeFileSync(join(BACKUP_DIR, `chat-rooms-${stamp}.json`), readFileSync(STORE_FILE));

  // Prune oldest backups beyond BACKUP_KEEP
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('chat-rooms-') && f.endsWith('.json'))
    .sort();
  for (const old of files.slice(0, Math.max(0, files.length - BACKUP_KEEP))) {
    try { unlinkSync(join(BACKUP_DIR, old)); } catch { /* ignore */ }
  }
}

function load() {
  if (!existsSync(STORE_FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8'));
    for (const [id, room] of Object.entries(raw)) rooms.set(id, room);
  } catch { /* fresh start */ }
}

load();
backup(); // snapshot on startup
setInterval(backup, BACKUP_INTERVAL_MS).unref();

export function getRooms() {
  return [...rooms.values()].sort((a, b) => (b.flagged ? 1 : 0) - (a.flagged ? 1 : 0));
}

export function getRoom(id) {
  return rooms.get(id) ?? null;
}

export function createRoom({ id, label, description = '' }) {
  if (!id || !label) throw new Error('id and label are required');
  if (rooms.has(id)) throw new Error(`Room "${id}" already exists`);
  const room = {
    id,
    label,
    description,
    flagged: false,
    flagNote: '',
    avatars: {},
    created: new Date().toISOString(),
    messages: [],
  };
  rooms.set(id, room);
  persist();
  return room;
}

export function addMessage(roomId, { from, text, model = null }) {
  const room = rooms.get(roomId);
  if (!room) throw new Error(`Room "${roomId}" not found`);
  const msg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from,
    text,
    model,
    timestamp: new Date().toISOString(),
  };
  room.messages.push(msg);
  persist();

  // Track turns for circuit breaker
  const b = breaker(roomId);
  if (from === 'rowan') {
    b.turns = 0;
    b.tripped = false;
  } else {
    b.turns++;
    if (b.turns >= MAX_AI_TURNS) b.tripped = true;
  }

  return msg;
}

export function flagRoom(roomId, note = '') {
  const room = rooms.get(roomId);
  if (!room) throw new Error(`Room "${roomId}" not found`);
  room.flagged = true;
  room.flagNote = note;
  persist();
  return room;
}

export function unflagRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) throw new Error(`Room "${roomId}" not found`);
  room.flagged = false;
  room.flagNote = '';
  persist();
  return room;
}

export function updateRoom(roomId, { label, description, avatars } = {}) {
  const room = rooms.get(roomId);
  if (!room) throw new Error(`Room "${roomId}" not found`);
  if (label !== undefined) room.label = label;
  if (description !== undefined) room.description = description;
  if (avatars !== undefined) room.avatars = { ...(room.avatars ?? {}), ...avatars };
  persist();
  return room;
}

export function deleteRoom(roomId) {
  const existed = rooms.delete(roomId);
  if (existed) persist();
  return existed;
}
