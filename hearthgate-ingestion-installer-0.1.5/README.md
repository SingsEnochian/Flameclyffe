# Hearthgate ingestion and installer bundle — 0.1.5

This bundle contains the tested Flameclyffe source changes for Hearthgate's
first-light population, provenance catalogue, document and image ingestion,
offline English OCR, API readiness registry, setup wizard, and Windows NSIS
installer verification.

## Apply to Flameclyffe

Extract this archive into the root of the `SingsEnochian/Flameclyffe`
repository and allow the matching paths to merge or overwrite. The archive
contains only files belonging to this change; it does not contain
`node_modules`, secrets, user data, build output, or source documents.

Then run:

```text
cd apps/starwell-server
npm ci
npm test
npm run stage:starwell
npm run check:packaging
```

The Windows installer is produced by the repository workflow at
`.github/workflows/hearthgate-windows-installer.yml` or, on a suitable Windows
build machine, with `npm run electron:build:win`.

## Supported ingestion

- PDF and DOCX
- TXT, Markdown, CSV/TSV, JSON/JSONL, YAML, XML, HTML and RTF
- PNG, JPEG, WebP, TIFF, BMP and GIF using bundled offline English OCR

Ingestion records SHA-256 provenance, deduplicates matching content, stores
extracted text and receipts in Electron's per-user data directory, and leaves
the source original in the user's chosen archive.

## Important boundary

Glyph Studio and the FontForge bridge remain experimental foundations. This
bundle does not represent the glyph-to-font art system as complete.

## Validation completed

- Hearthgate focused tests: 4 passed
- Existing STARWELL tests: 54 passed
- Packaging preflight: passed
- JavaScript syntax and Git whitespace checks: passed
- Live PDF, DOCX, image OCR, API readiness and first-light smoke tests: passed
