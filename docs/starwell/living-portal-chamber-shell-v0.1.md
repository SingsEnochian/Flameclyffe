# Living Portal Chamber Shell v0.1

Status: draft shell slice  
Route: `apps/starwell/portal-chamber/index.html`  
Related source branch to split: PR #21, `portal-kernel-v0.1`

## Purpose

The Living Portal Chamber is the mythience threshold for proposed rooms, paths, scene atmosphere, and later sound/weather planning.

This shell slice lands the doorway before importing the heavier Portal Kernel work. It deliberately does not include room-card state models, weather-sound conductor logic, Supabase writes, Notion sync, model calls, or audio playback.

## Chamber law

A portal may suggest, preview, and illuminate.

Each deeper action gets its own named door, visible switch, and review path.

Persistence is a later design craft, not something this shell judges. Memory can be shaped properly when the chamber grows its hands.

## Split sequence

### Slice 1: Shell

Scope:

- static `/portal-chamber/` route;
- visual doorway language;
- split-plan surface;
- operating-state copy;
- Vite build registration.

Out of scope:

- card renderer;
- weather conductor;
- audio planning code;
- adapter integration;
- Supabase, Notion, or canon writes.

### Slice 2: Room Seed Cards

Lift from PR #21 the room seed card contracts, view models, renderer, styles, and tests.

Review notes:

- proposal-first;
- no state mutation in the card renderer;
- no canon promotion;
- visible empty/fallback state.

### Slice 3: Scene Weather Sound Planner

Lift from PR #21 the weather scene sound conductor and contract as a planner.

Review notes:

- sound-on gate for any future playback;
- volume cannot be controlled by model authority;
- migraine/low-light/body-no states should soften recommendations in any later integration.

## Review rule

Each slice should be mergeable from current `main`, small enough to review without spelunking gear, and validated separately before moving to the next layer.
