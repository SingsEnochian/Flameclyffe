# Concordance Anchor Registry Contract

Status: v0.1 contract draft. No migration has been applied from this document.

The Anchor Registry is the persistence layer that turns an AR overlay into a returnable relation.

A local Pocket Concordance Lens anchor can exist in browser storage. The Anchor Registry defines how that anchor later becomes durable, searchable, privacy-scoped, and readable by DEEP / STARWELL.

## Core rule

An anchor should not be treated as cleanly integrated unless it records:

- layer
- confidence
- consent scope
- anchor surface or target
- relation
- return state
- visibility

## Proposed table

Table name: `concordance_anchors`

Recommended columns:

```sql
id uuid primary key default gen_random_uuid(),
slug text unique,
display_name text not null,
anchor_kind text not null,
layer text not null,
visibility text not null default 'private',
status text not null default 'active',
confidence_mode text not null default 'observed',
consent_scope text not null default 'private',
device_mode text not null,
waking_context jsonb not null default '{}',
relation_context jsonb not null default '{}',
visual_state jsonb not null default '{}',
deep_state jsonb not null default '{}',
tags text[] not null default '{}',
metadata jsonb not null default '{}',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
last_seen_at timestamptz
```

## Suggested values

`anchor_kind`: `surface`, `room_zone`, `chair`, `desk`, `wall`, `object`, `sigil`, `presence_token`, `ar_marker`, `manual`

`layer`: `waking_world`, `terra_aeterna`, `dreaming_worlds`, `verge`, `mixed`

`visibility`: `private`, `circle`, `public`

`status`: `draft`, `active`, `dormant`, `drifted`, `archived`, `cleared`

`confidence_mode`: `observed`, `symbolic`, `inferred`, `theoretical`, `external`, `mixed`, `unknown`

`consent_scope`: `private`, `circle`, `explicit-invitation-only`, `no-passive-inheritance`, `public-safe`

## Minimum JSON contract

```json
{
  "display_name": "First Concordance Window",
  "anchor_kind": "surface",
  "layer": "waking_world",
  "visibility": "private",
  "status": "active",
  "confidence_mode": "observed",
  "consent_scope": "private",
  "device_mode": "pocket_lens",
  "waking_context": {
    "label": "desk surface",
    "placement": {
      "type": "screen_percent",
      "x": 50,
      "y": 50
    },
    "camera_required": true,
    "recording": false
  },
  "relation_context": {
    "world": "terra_aeterna",
    "verge_state": "listening",
    "relation": "first_concordance_window",
    "linked_artifacts": [
      "pocket-concordance-lens",
      "deep-instrument",
      "sigil-grammar"
    ]
  },
  "visual_state": {
    "lantern": "hearth_lantern",
    "overlay": "stonewood_window_v0",
    "sigils": ["anchor", "witness", "waking", "gate", "concordance"],
    "low_motion": true
  },
  "deep_state": {
    "coherence": 0.72,
    "drift": 0.08,
    "bleed": 0,
    "anchor_strength": 0.64,
    "reading": [
      "Anchor recognised.",
      "Waking layer stable.",
      "Verge contact listening.",
      "Concordance invited, not forced.",
      "Return-point formed."
    ]
  },
  "tags": [
    "#Concordance",
    "#PocketLens",
    "#Anchor",
    "#WakingWorld",
    "#Private"
  ]
}
```

## Return comparison

When the user returns to an anchor, the system should compare the current observation to the saved state.

First comparison values:

- `stable`
- `drifted`
- `unrecognised`
- `cleared`

```json
{
  "comparison_state": "stable",
  "previous_anchor_id": "uuid",
  "observed_at": "timestamp",
  "deltas": {
    "screen_distance": 0.05,
    "sigil_set_changed": false,
    "device_mode_changed": false
  },
  "deep_update": {
    "coherence": 0.78,
    "drift": 0.04,
    "anchor_strength": 0.72
  }
}
```

## DEEP event integration

Saving or returning to an anchor should be loggable as a DEEP Observer event.

Suggested event types:

- `concordance.anchor.created`
- `concordance.anchor.returned`
- `concordance.anchor.drifted`
- `concordance.anchor.cleared`
- `concordance.ar.window.opened`
- `concordance.ar.window.closed`

## Privacy and RLS intent

The first implementation should avoid public anchor writes.

- Private anchors visible only to authorised owner / service context.
- Public-safe anchors require review before public display.
- No camera image or video is stored by default.
- No health, body, or private-room detail is stored unless explicitly enabled.
- Clear/delete remains available.

## Prototype integration order

1. Keep the current localStorage anchor as fallback.
2. Add a client-side Anchor Registry contract module.
3. Add Supabase environment variables only through safe local or deployment settings.
4. Save anchor metadata only, not images/video.
5. Add saved-anchor list.
6. Add return comparison state: stable / drifted / unrecognised.
7. Add DEEP event logging after anchor save.
8. Review RLS before turning sync on.
