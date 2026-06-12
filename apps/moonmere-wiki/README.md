# Moonmere Archive

A custom Next.js front end for **The Luna Who Called Down the Moon** wiki. Notion remains the editorial source of truth. The site renders its public characters, visual assets, and mapped hub pages inside the forest, emerald, soft-gold, and parchment-ivory Moonmere Archive theme.

## What is included

- Next.js App Router starter
- TypeScript
- Current Notion JavaScript SDK data-source queries
- Mock mode when no token is configured
- Public and featured content gates
- Dynamic character routes
- Mapped book, magic, timeline, and Windmere hub pages
- Visual asset gallery with focal-point and aspect-ratio handling
- Accessible responsive shell
- Secure manual revalidation endpoint
- Netlify configuration

## Requirements

- Node.js 20.9 or newer
- A Notion internal integration
- The relevant Notion pages and databases shared with that integration

## Start locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Without a Notion token, the starter runs with mock Eira, Iestyn, and visual asset data so the interface can still be reviewed.

## Environment

Copy `.env.example` to `.env.local`.

```text
NOTION_TOKEN=
NOTION_CHARACTER_DATA_SOURCE_ID=c2066399-029a-4d58-bf13-8743473276f2
NOTION_ASSET_DATA_SOURCE_ID=68143630-059f-429a-885d-902948b45c4a
NOTION_OVERVIEW_PAGE_ID=37c70290d9c48163ba7ee668e04b1e33
NOTION_BOOK_ONE_PAGE_ID=37c70290d9c4819caf5ec6842ce6b286
NOTION_COSMOLOGY_PAGE_ID=37c70290d9c48128b286ccf2e1db5683
NOTION_TIMELINE_PAGE_ID=37c70290d9c4812cb64ee2906df39e3d
NOTION_WINDMERE_PAGE_ID=37c70290d9c481e98d6eefaf6f58e442
NOTION_MAGIC_PAGE_ID=37c70290d9c481e892efcd708be21dd3
NOTION_VISUAL_LIBRARY_PAGE_ID=37c70290d9c481a2948df77fc4689a41
REVALIDATE_SECRET=replace-with-a-long-random-string
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Notion setup

1. Create an internal Notion integration.
2. Share the Series Wiki, Character Index, and Visual Asset Library with the integration.
3. Paste the integration secret into `NOTION_TOKEN`.
4. Mark only approved rows `Public`.
5. Add stable Slugs before publishing.
6. Add useful Alt Text to public visual assets.

## Editorial behaviour

- Blank Public is treated as false.
- Blank Slug falls back to a derived title slug and logs a warning.
- Blank Portrait uses the Moonmere placeholder.
- Working Canon may be public, but retains its visible status marker.
- Retired content is omitted from normal navigation.
- Revalidation defaults to 15 minutes.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
```

## Manual revalidation

Send a POST request to `/api/revalidate` with the configured secret.

```bash
curl -X POST \
  -H "x-revalidate-secret: YOUR_SECRET" \
  -H "content-type: application/json" \
  -d '{"path":"/characters"}' \
  http://localhost:3000/api/revalidate
```

## Deploy to Netlify

1. Push this folder to a Git repository.
2. Create a Netlify site from that repository.
3. Add the same environment variables in Netlify.
4. Deploy. The included `netlify.toml` uses the Next.js runtime.

## Replace before production

- Set `NEXT_PUBLIC_SITE_URL` to the final domain.
- Review every public asset's Alt Text and Focal Point.
- Add real Portrait files to public character records.
- Configure a long random `REVALIDATE_SECRET`.
- Replace or expand the mapped future book pages as those Notion pages are created.

## Project map

```text
src/app/                  routes and page composition
src/components/           Moonmere interface components
src/lib/notion/           Notion query, parsing, and block adapters
src/lib/page-map.ts       mapped Notion hub pages
src/app/globals.css       complete Moonmere theme
public/                   banner and placeholder art
docs/                     theme and schema references
```
