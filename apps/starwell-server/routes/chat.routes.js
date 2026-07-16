/*
 * Grove chat routes
 *
 * Serves and appends to apps/starwell-server/data/chat-rooms.json.
 * Room shape: { id, label, description, flagged, flagNote, created, messages, avatars }
 * Message shape: { id, from, text, model, timestamp }
 *
 * No AI-member auto-reply logic lives here. This restores read/write access to the
 * existing room log only — messages are appended one at a time, by request.
 */

const fs = require('fs');
const path = require('path');

const CHAT_FILE = 'chat-rooms.json';

async function readChatRooms(dataDir) {
  const filepath = path.join(dataDir, CHAT_FILE);
  try {
    const raw = await fs.promises.readFile(filepath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeChatRooms(dataDir, rooms) {
  const filepath = path.join(dataDir, CHAT_FILE);
  await fs.promises.writeFile(filepath, JSON.stringify(rooms, null, 2));
}

function registerChatRoutes(app, dataDir) {
  // Room list without message bodies - keep this endpoint light.
  app.get('/api/rooms', async (req, res) => {
    try {
      const rooms = await readChatRooms(dataDir);
      const summaries = Object.values(rooms).map(({ id, label, description, flagged, flagNote, created, avatars }) => ({
        id,
        label,
        description,
        flagged,
        flagNote,
        created,
        avatars,
      }));
      res.json(summaries);
    } catch (err) {
      console.error('Error reading chat rooms:', err);
      res.status(500).json({ error: 'Failed to read chat rooms' });
    }
  });

  // Single room, including its full message history.
  app.get('/api/rooms/:roomId', async (req, res) => {
    try {
      const rooms = await readChatRooms(dataDir);
      const room = rooms[req.params.roomId];
      if (!room) {
        res.status(404).json({ error: `Unknown room: ${req.params.roomId}` });
        return;
      }
      res.json(room);
    } catch (err) {
      console.error('Error reading chat room:', err);
      res.status(500).json({ error: 'Failed to read chat room' });
    }
  });

  // Append one message to a room.
  app.post('/api/rooms/:roomId/messages', async (req, res) => {
    try {
      const rooms = await readChatRooms(dataDir);
      const room = rooms[req.params.roomId];
      if (!room) {
        res.status(404).json({ error: `Unknown room: ${req.params.roomId}` });
        return;
      }

      const { from, text, model } = req.body || {};
      if (typeof from !== 'string' || !from.trim() || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Message requires non-empty "from" and "text" fields' });
        return;
      }

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: from.trim(),
        text,
        model: typeof model === 'string' && model.trim() ? model.trim() : null,
        timestamp: new Date().toISOString(),
      };

      room.messages.push(message);
      await writeChatRooms(dataDir, rooms);
      res.status(201).json(message);
    } catch (err) {
      console.error('Error appending chat message:', err);
      res.status(500).json({ error: 'Failed to append chat message' });
    }
  });

  // Edit a message in-place.
  app.patch('/api/rooms/:roomId/messages/:msgId', async (req, res) => {
    try {
      const rooms = await readChatRooms(dataDir);
      const room = rooms[req.params.roomId];
      if (!room) return res.status(404).json({ error: 'Room not found' });
      const msg = room.messages.find(m => m.id === req.params.msgId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      const { text } = req.body || {};
      if (typeof text === 'string' && text.trim()) {
        msg.text = text.trim();
        msg.edited = true;
      }
      await writeChatRooms(dataDir, rooms);
      res.json({ ok: true, message: msg });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a message.
  app.delete('/api/rooms/:roomId/messages/:msgId', async (req, res) => {
    try {
      const rooms = await readChatRooms(dataDir);
      const room = rooms[req.params.roomId];
      if (!room) return res.status(404).json({ error: 'Room not found' });
      const idx = room.messages.findIndex(m => m.id === req.params.msgId);
      if (idx === -1) return res.status(404).json({ error: 'Message not found' });
      room.messages.splice(idx, 1);
      await writeChatRooms(dataDir, rooms);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = registerChatRoutes;
