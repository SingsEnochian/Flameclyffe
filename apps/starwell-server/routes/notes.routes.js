const fs   = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const NOTES_FILE = 'notes.state.json';
const IMAGES_DIR = 'note-images';

async function readNotes(dataDir) {
  try {
    const raw = await fs.promises.readFile(path.join(dataDir, NOTES_FILE), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { notes: [], selectedNoteId: null };
  }
}

async function writeNotes(dataDir, state) {
  await fs.promises.writeFile(path.join(dataDir, NOTES_FILE), JSON.stringify(state, null, 2));
}

function registerNotesRoutes(app, dataDir) {
  const imagesDir = path.join(dataDir, IMAGES_DIR);
  fs.mkdirSync(imagesDir, { recursive: true });

  const imgStorage = multer.diskStorage({
    destination: imagesDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  });
  const imgUpload = multer({ storage: imgStorage, limits: { fileSize: 12 * 1024 * 1024 } });

  // Serve note images
  const express = require('express');
  app.use('/api/notes/images', express.static(imagesDir));

  // Upload an image, returns { url }
  app.post('/api/notes/images', imgUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    res.json({ url: `/api/notes/images/${req.file.filename}` });
  });

  // List notes — optional ?search= ?scope= query params
  app.get('/api/notes', async (req, res) => {
    try {
      const state = await readNotes(dataDir);
      let notes = state.notes;
      if (req.query.scope) notes = notes.filter(n => n.scope === req.query.scope);
      if (req.query.search) {
        const q = req.query.search.toLowerCase();
        notes = notes.filter(n =>
          n.title.toLowerCase().includes(q) ||
          (n.content || '').replace(/<[^>]+>/g, ' ').toLowerCase().includes(q)
        );
      }
      // Return without full content for the list view — lighter payload
      const list = notes.map(({ id, title, scope, projectId, metadata }) => ({ id, title, scope, projectId, metadata }));
      res.json({ notes: list, selectedNoteId: state.selectedNoteId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get a single note with full content
  app.get('/api/notes/:id', async (req, res) => {
    try {
      const state = await readNotes(dataDir);
      const note = state.notes.find(n => n.id === req.params.id);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      res.json(note);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create note
  app.post('/api/notes', async (req, res) => {
    try {
      const state = await readNotes(dataDir);
      const { title = 'Untitled', content = '', scope = 'global', projectId = null } = req.body || {};
      const note = {
        id: `note-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        title: title.trim() || 'Untitled',
        content,
        scope,
        projectId,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 0,
        },
      };
      // Bump existing sortOrders so new note sorts first
      state.notes.forEach(n => { n.metadata.sortOrder = (n.metadata.sortOrder || 0) + 1; });
      state.notes.unshift(note);
      state.selectedNoteId = note.id;
      await writeNotes(dataDir, state);
      res.status(201).json(note);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update note (partial)
  app.patch('/api/notes/:id', async (req, res) => {
    try {
      const state = await readNotes(dataDir);
      const note = state.notes.find(n => n.id === req.params.id);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      const { title, content, scope, projectId } = req.body || {};
      if (title  !== undefined) note.title  = title.trim() || 'Untitled';
      if (content !== undefined) note.content = content;
      if (scope   !== undefined) note.scope   = scope;
      if (projectId !== undefined) note.projectId = projectId;
      note.metadata.updatedAt = new Date().toISOString();
      state.selectedNoteId = note.id;
      await writeNotes(dataDir, state);
      res.json(note);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete note
  app.delete('/api/notes/:id', async (req, res) => {
    try {
      const state = await readNotes(dataDir);
      const idx = state.notes.findIndex(n => n.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Note not found' });
      state.notes.splice(idx, 1);
      if (state.selectedNoteId === req.params.id) {
        state.selectedNoteId = state.notes[0]?.id ?? null;
      }
      await writeNotes(dataDir, state);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = registerNotesRoutes;
