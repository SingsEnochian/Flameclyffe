# Yggdrasil Account and Customisation Contract v0.1

Status: draft contract for Portal Kernel v0.1

Yggdrasil may have accounts so people can return, customise their branch, and keep accessibility preferences. Portal Kernel v0.1 defines the shape of that doorway without enabling live login in the lab.

## Core vow

A login may remember preferences. It may not own the person.

Account data must remain user-owned, inspectable, exportable, and deletable. Customisation is for comfort, identity, accessibility, and continuity.

## v0.1 posture

Allowed:

- Local preview account creation in the lab.
- Contract schemas for future Supabase Auth wiring.
- User customisation data for palette, branch style, avatar glyph, accessibility, default sound preferences, and room preferences.
- Draft SQL for public profile/customisation tables protected by RLS.

Not allowed:

- Live signup/login in Portal Kernel v0.1.
- Password or access-token storage in client state.
- Service role or secret keys in browser code.
- Authorization decisions based on user-editable metadata.
- Public-by-default profiles.
- Audio playback as a side effect of login.

## Future auth provider

The intended production provider is Supabase Auth. The app should use a publishable browser key, not a service role or secret key. Auth user records stay in Supabase Auth. STARWELL stores app-owned profile and customisation records in public tables with Row Level Security enabled.

## Account records

A Yggdrasil account profile should hold only app-facing identity:

- `id`: auth user id, referencing `auth.users(id)` when live.
- `handle`: optional display handle.
- `display_name`: chosen display name.
- `avatar_glyph`: small symbolic avatar.
- `profile_visibility`: private/shared/public, private by default.

## Customisation records

A Yggdrasil customisation should hold preferences:

- palette and branch/root style.
- accessibility preferences: reduced motion, sensory quiet, captions, Plain Pass default.
- room preferences.
- sound preferences as future defaults only, never autoplay.
- privacy preferences.

## RLS requirements

Every account/customisation table must enable RLS. Users may select, insert, update, and delete only their own rows unless a future explicit sharing table grants access. UPDATE requires a matching SELECT policy.

## Lab preview

The lab may create a local preview account so users can test customisation before live auth exists. Preview accounts are not live sessions, do not persist to Supabase, and do not prove identity.
