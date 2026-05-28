# Observer DEEP Extraction Kit

This sandbox turns one raw Observer DEEP entry into three safer outputs:

1. **Private raw log** — preserves the original entry locally.
2. **Wiki field record** — removes precise Waking World location and sensitive telemetry while preserving the lore event.
3. **EverCore seed JSON** — creates a compact structured memory for STARWELL / EverCore ingestion.

## Why this exists

Observer DEEP entries often braid together:

- Waking World telemetry
- sky / weather / space-weather context
- glyph and state-vector information
- Dreaming narrative events
- creative or resonance notes

Those layers should not all go to the same place.

The raw version may be private.
The wiki version should be public-safe or semi-public-safe.
The EverCore seed should be compact, structured, and retrieval-friendly.

## Safety rule

Do not commit real raw Observer logs with precise coordinates, private health/medical details, legal/financial details, or third-party identifying information.

Use local input files ignored by git.

## Local input

Put local raw entries in:

```text
sandbox/observer-deep/raw/
```

That folder is ignored by git.

Use the template:

```text
sandbox/observer-deep/templates/observer-deep-entry.template.md
```

## Run extraction

From repo root:

```bash
npm run observer:extract -- sandbox/observer-deep/raw/my-entry.md
```

Or directly:

```bash
node sandbox/observer-deep/extract-observer-deep.mjs sandbox/observer-deep/raw/my-entry.md
```

Outputs are written to:

```text
sandbox/observer-deep/out/<glyph-slug>/
```

That folder is ignored by git.

## Output files

```text
raw-private.md
wiki-field-record.md
evercore-seed.json
```

## Current target use case

The first real use case is the Nightwing Colour Resonance / Elara Tone Threshold event:

- rain-linked DEEP Observer entry
- Nightwing song
- temporary colour shift in several Nightwings
- resonance peak
- music / Enochian / Elara Tones clarity

This should become a private raw log, a wiki-safe Nightwing field record, and a private EverCore memory seed.
