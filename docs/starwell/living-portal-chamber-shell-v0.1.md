# Living Portal Chamber Shell v0.1

Status: draft shell slice  
Route: `apps/starwell/portal-chamber/index.html`  
Related source branch to split: PR #21, `portal-kernel-v0.1`

## Purpose

The Living Portal Chamber is the review-safe surface for proposed rooms, paths, scene atmosphere, and later explicit-consent sound/weather planning.

This shell slice exists to land the doorway before importing the heavier Portal Kernel work. It deliberately does not include room-card state models, weather-sound conductor logic, Supabase writes, Notion sync, model calls, audio playback, or persistence.

## Chamber law

A portal may suggest, preview, and illuminate.

A portal may not:

- write canon without explicit consent;
- persist private material without explicit consent;
- start audio or haptics automatically;
- alter volume from model authority;
- treat generated proposals as commands;
- hide state changes behind decorative language.

## Split sequence

### Slice 1: Shell

Scope:

- static `/portal-chamber/` route;
- visual doorway language;
- split-plan surface;
- explicit guardrail copy;
- Vite build registration.

Out of scope:

- card renderer;
- weather conductor;
- audio planning code;
- adapter integration;
- Supabase, Notion, or canon writes.

### Slice 2: Room Seed Cards

Lift from PR #21 only the read-only room seed card contracts, view models, renderer, styles, and tests.

Required guardrails:

- proposal-only;
- no state mutation;
- no hidden persistence;
- no canon promotion;
- visible empty/fallback state.

### Slice 3: Scene Weather Sound Planner

Lift from PR #21 only the weather scene sound conductor and contract as a proposal planner.

Required guardrails:

- no autoplay;
- no playback in this slice unless separately approved;
- no hidden audio;
- explicit sound-on gate for any future playback;
- volume cannot be controlled by model authority;
- migraine/low-light/body-no states must suppress or soften recommendations in any later integration.

## Review rule

Each slice should be mergeable from current `main`, small enough to review without spelunking gear, and validated separately before moving to the next layer.
