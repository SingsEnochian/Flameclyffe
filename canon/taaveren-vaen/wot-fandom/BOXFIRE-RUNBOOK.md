# BOXFIRE RUNBOOK — WoT Fandom Ingest

**World:** T'averen Vaen  
**Source:** Wheel of Time Fandom Wiki  
**Script:** `scripts/ingest/pull-wot-fandom.mjs`

---

## Commands

### Full ingest (first run)

```bash
node scripts/ingest/pull-wot-fandom.mjs
```

Runs from the repo root. Enumerates all ~12 000 pages in NS 0, then fetches each one in batches of 20. Takes approximately 2–4 hours depending on network. Writes a progress counter in-place.

### Resume after interruption

```bash
node scripts/ingest/pull-wot-fandom.mjs --resume
```

Reads `canon/taaveren-vaen/wot-fandom/checkpoint.json` to pick up where enumeration stopped, and skips pages where the output file already exists.

### Include full revision history

```bash
node scripts/ingest/pull-wot-fandom.mjs --include-history
```

Adds a `revisionHistory` array to each page record containing all prior revision IDs, timestamps, users, and content hashes (not full wikitext). Significantly slower. Run only when historical drift analysis is needed for PREMAQ calibration.

---

## Output structure

After a complete run:

```
canon/taaveren-vaen/wot-fandom/
├── source-profile.json   ← tracked
├── README.md             ← tracked
├── BOXFIRE-RUNBOOK.md    ← tracked
├── manifest.json         ← tracked (written at completion)
├── pages/                ← gitignored (bulk corpus)
│   ├── rand-althor.json
│   ├── mat-cauthon.json
│   └── …
├── receipts/             ← gitignored
│   └── *.json
├── checkpoint.json       ← gitignored (delete after clean run)
└── failures.json         ← gitignored (review after run)
```

---

## What to check after a run

1. **`manifest.json`** — page count vs. expected. WoT Fandom has ~12 000 content pages.
2. **`failures.json`** — review failed pages. Common causes: MediaWiki errors on unusual titles, connection timeouts. Re-run with `--resume` to retry.
3. **`pages/rand-althor.json`** — spot-check a major character page. Verify `wikitext` is populated, `categories` include `Ta'veren`, `links` include major characters.

---

## Rate policy

- 350ms delay between each batch of 20 pages
- Max 3 retries per request with exponential backoff (800ms / 1600ms / 3200ms)
- User-Agent identifies as non-commercial research

Do not reduce the delay below 200ms. Fandom's API has rate limits and the wiki is a shared community resource.

---

## PREMAQ mapping

After ingest, the pages feed T'averen Vaen's Observer Ingest pipeline. The full mapping spec is in:

- `canon/taaveren-vaen/wot-fandom/source-profile.json` → `premaq_guidance`
- `docs/worlds/world-reception-profiles.md` → T'averen Vaen section

**Principle: data sets atmosphere, not fate.** The wiki content establishes the world's baseline tone, not a deterministic reading.

---

## Updating the corpus

Re-run without `--resume` to start fresh. The script uses content hashing (`sha256`) — identical pages will note if content has changed since the previous run only when you diff the output files manually. Automated delta-detection is a future feature.

---

## Notes for Box

- The WoT wiki is large. The first run takes hours. Start it, log a checkpoint in `box_logs.md`, and check back.
- If the process is interrupted mid-enumeration, `--resume` restores the title list. If interrupted during fetch, `--resume` also skips already-fetched page files.
- The manifest is only written on clean completion. If a run was interrupted, `manifest.json` from a previous run may be present — its `completedAt` tells you when.
- Fandom's MediaWiki API uses `formatversion=2` (new JSON shape) — all page records come from `query.pages` as an array, not a keyed object.
