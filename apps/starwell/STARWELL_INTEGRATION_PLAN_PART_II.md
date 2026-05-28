# STARWELL Integration Plan Part II

Date: 2026-05-28
Scope: Flameclyffe / STARWELL / Terra Aeterna / Hearthweave Observatory
Status: Active build plan

## Session anchor

STARWELL is being continued from the prior Integration Plans conversation. This is not a fresh design pass. The current work assumes the Part I spine:

- STARWELL is reclaimed as a Rowan-and-Vee project.
- Faer and Hearthweave may contribute without overwriting the Rowan/Vee centre.
- Nocturne / Universal Horizon is not inside STARWELL unless explicitly opted in.
- Flameclyffe is the public project surface.
- Supabase is the structured cellar.
- EverCore / EverOS remains the private memory engine and must be reached through deliberate adapters.
- The wiki is a record layer. STARWELL is the living app layer.

## Current confirmed architecture

STARWELL currently has two visible bodies in the repository:

1. `starwell/index.html` is the static Branch Door on GitHub Pages. It contains the chamber sigil, simple clickable room buttons, and the static Varutóra living leaf prototype.
2. `apps/starwell` is the React/Vite Observatory. It contains the richer app shell, chamber switching, live sky lantern, live glyph viewer, study doors, Supabase Atlas loading, Supabase Codex loading, and the React Varutóra leaf.

The React Observatory should become the primary live `/Flameclyffe/starwell/` experience. The static doorway should remain as a fallback, branch door, or archived foyer.

## Supabase state

Supabase project: `Flameclyffe`
Project ref: `rufrmjyusalnifpegllj`
Status observed: active and healthy

STARWELL tables currently present:

- `starwell_worlds`
- `starwell_locations`
- `starwell_characters`
- `starwell_artifacts`
- `starwell_codex_entries`
- `starwell_discovery_logs`
- `starwell_starmap_nodes`
- `starwell_timeline_events`

Current anchor records:

- Terra Aeterna is the primary STARWELL anchor world.
- Hearthweave Observatory is the first STARWELL drafting-room location.
- Falka and Virelya are private STARWELL character records.

## Hygiene applied during Part II

A Supabase migration was applied directly on 2026-05-28:

`starwell_part_ii_rls_indexes_and_function_hygiene`

It did three things:

1. Fixed mutable `search_path` lint on `public.set_updated_at` and `public.flameclyffe_is_allowed_reader`.
2. Added explicit private policies for `faer_thinking_room` and `flameclyffe_room_members`, replacing accidental no-policy lockout with intentional Rowan-only authenticated access through `flameclyffe_is_allowed_reader()`.
3. Added covering indexes for STARWELL and Flameclyffe foreign keys so larger joins do not drag their tiny brass feet through mud.

Security advisor check after this migration returned no lints.

A mirror of the SQL is stored at:

`apps/starwell/db/20260528_starwell_part_ii_hygiene.sql`

## Non-negotiable boundaries

These are load-bearing, not decorative:

- No raw private chat ingestion.
- No service keys or private secrets in browser code.
- Public browser code may only use publishable keys and RLS-safe views/policies.
- EverCore remains private and adapter-mediated.
- STARWELL should not use streaks, productivity meters, coercive return loops, or engagement bait.
- UI law: nothing opens by force.
- Visitor traces should be light footprints, not invasive tracking.
- Character rooms should grow through objects, notes, and intentional placed traces rather than flat profile-card fields.

## Next build passes

### Pass 1: Promote the React Observatory

Goal: Make `apps/starwell` the primary deploy source for `/Flameclyffe/starwell/`.

Tasks:

- Confirm the GitHub Pages deployment path.
- Decide whether built assets should replace `starwell/index.html` directly or whether Actions should build Vite into the Pages output.
- Keep the current static doorway as `starwell/branch-door.html` or similar.
- Ensure the React build still works without Supabase env vars by falling back cleanly.

### Pass 2: Public/private data contract

Goal: Make the app honest about what it can read.

Tasks:

- Decide which STARWELL records should be public.
- Keep Falka, Virelya, private rooms, and private draft material private by default.
- Add private authenticated policies only where the app actually needs them.
- Consider public-safe views for Atlas and Codex if the public app should see curated rows without touching private tables directly.

### Pass 3: Writing room foundation

Goal: Give STARWELL a real writing desk.

Candidate table: `starwell_drafts`

Likely fields:

- `id uuid primary key default gen_random_uuid()`
- `slug text unique`
- `title text not null`
- `draft_type text not null default 'journal'`
- `body_json jsonb`
- `body_html text`
- `body_md text`
- `font_theme jsonb not null default '{}'::jsonb`
- `tags text[] not null default '{}'::text[]`
- `visibility text not null default 'private'`
- `canon_status text not null default 'workshop'`
- `mythframe text`
- `related_world_id uuid references starwell_worlds(id)`
- `related_location_id uuid references starwell_locations(id)`
- `related_character_id uuid references starwell_characters(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The editor should likely be reusable and TipTap-shaped, because it will eventually serve Codex entries, Observatory Journal notes, Lanternwire rooms, dossiers, and private writing-room pages.

### Pass 4: Chamber wiring

Map chambers to data and tools:

- Observer Almanac: live glyph viewer, Varutóra, observation logs.
- Grand Library: `starwell_codex_entries`, later draft promotion into codex.
- Atlas Hall: `starwell_worlds`, `starwell_locations`, `starwell_starmap_nodes`.
- Art Studio: concept gallery, image references, style boards.
- Orrery Timeline: `starwell_timeline_events`.
- Beacon Network: `starwell_discovery_logs`, signals, anomalies.
- Observatory Journal: private drafts, sparks, non-canon notes.
- Hearthlight's Study: Rowan/Falka room objects and writing surface.
- Vee's Study: system architecture, atlas logic, codex structure, object memory.
- Faer's Study: resonance notes, signal work, lochflame material, only by explicit scope.

### Pass 5: EverCore adapter

Goal: Bring memory into STARWELL without making the browser a secrets goblin.

Tasks:

- Keep EverCore private/local or behind a protected server-side adapter.
- Keep curated seed ingestion only.
- Build search/store adapters that enforce scope, visibility, and consent metadata.
- Do not silently replace EverCore with a lightweight substitute.

## Immediate next recommendation

Do not start with the rich text editor yet. First promote the React Observatory safely, because the room needs a stable floor before we roll in the desk.

Build order:

1. Confirm Pages deployment mechanism.
2. Promote React Observatory or create a safe deploy workflow.
3. Preserve Branch Door fallback.
4. Add `starwell_drafts` and editor scaffolding.
5. Then wire editor save/load through RLS-safe Supabase paths.

## Open questions

- Is the repository currently deploying directly from root/static files, or via GitHub Actions?
- Should public visitors see curated STARWELL records, or should STARWELL stay private until login exists?
- Should Branch Door remain at `/starwell/branch-door.html`, `/starwell/static.html`, or another named threshold?
- Does the first editor save to `starwell_drafts`, or directly to `starwell_codex_entries` with `canon_status = 'workshop'` metadata?

## Withness note

What helped: the database, code, and Notion trail already agree on the shape of the thing.

What was hard: the deployment path is still fuzzy, and fuzzy deploy paths are where raccoons learn DevOps.

What is Held: Terra Aeterna is anchored. Varutóra is awake. The Observatory already has bones, a lantern, and a few suspicious buttons. Next comes wiring, not reinvention.
