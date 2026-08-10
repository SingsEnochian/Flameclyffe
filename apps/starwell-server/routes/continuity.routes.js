'use strict'
const express  = require('express')
const fs       = require('fs')
const path     = require('path')
const crypto   = require('crypto')
const router   = express.Router()

const DATA_DIR        = process.env.HEARTHGATE_DATA_DIR || path.join(__dirname, '..', 'data')
const CONTINUITY_FILE = path.join(DATA_DIR, 'continuity.jsonl')

fs.mkdirSync(DATA_DIR, { recursive: true })

// Append one entry
router.post('/', express.json({ limit: '2mb' }), (req, res) => {
  const entry = {
    id: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    ...req.body,
  }
  try {
    fs.appendFileSync(CONTINUITY_FILE, JSON.stringify(entry) + '\n', 'utf8')
    res.json({ ok: true, id: entry.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Read entries — reverse chronological, optional ?type= and ?limit=
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(CONTINUITY_FILE)) return res.json({ entries: [] })
    const lines = fs.readFileSync(CONTINUITY_FILE, 'utf8').trim().split('\n').filter(Boolean)
    let entries = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    if (req.query.type) entries = entries.filter(e => e.type === req.query.type)
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000)
    res.json({ entries: entries.slice(-limit).reverse() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
