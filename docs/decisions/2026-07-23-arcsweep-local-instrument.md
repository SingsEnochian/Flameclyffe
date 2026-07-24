# Hearthgate: Arcsweep Local Instrument

**Date:** 2026-07-23  
**Status:** In implementation  
**Source lineage:** Community LIFA app concepts, user-supplied reference screenshots, Hearthweave Shifting Wiki, Gateway practice architecture

## Decision

Arcsweep is a local-first Hearthgate instrument for Desired Reality design, continuity, visualisation, timing, scripting, and return. It is not a clone of any existing LIFA application and does not retain clone terminology.

## Reference findings

The supplied screenshots reveal a useful information architecture beneath a sparse interface:

- a portal representing one Desired Reality;
- a configurable home-button or applet deck;
- separate world-detail and personal-detail spaces;
- scripts, scenarios, diary, calendar, playlists, visualisations, relationships, timeline, appearance, wardrobe, belongings, places, gallery, and theme modules;
- per-world date and time controls;
- portal-specific background, icon, text colour, tint, and naming;
- import/export and local access controls;
- optional specialist applets such as school, hero/villain, music group, social profiles, and AI chat.

## Arcsweep translation

Arcsweep keeps the modular dashboard idea while replacing weak or misleading boundaries:

- `clone` becomes **Waking Thread** and **Continuity Log**;
- `safe word` becomes the configurable **Return Anchor**, with Notch as the default;
- DR time is an explicit calculation or authored world clock, never silently presented as an externally measured fact;
- manifestation becomes **Forge**, connecting intention to assets, actions, evidence, and review;
- AI chat is an optional local model adapter, not a simulation of autonomous access to people in a DR;
- Notion scripts become imported or linked script sources with provenance;
- no feature is locked behind a subscription inside the local Hearthgate build.

## Core navigation

1. Portal
2. Worlds
3. Applet Deck
4. Scripts
5. Waking Thread
6. Forge
7. Settings

Each world owns:

- identity and embodiment profile;
- world summary, location, history, and rules;
- time model and authored current date;
- applet visibility, order, names, and icons;
- theme and background assets;
- scripts and scenarios;
- relationships and family structures;
- timeline, diary, calendar, and continuity notes;
- visualisations, playlists, wardrobe, belongings, and places;
- Return Anchor and fixed consent foundation.

## Data boundary

All data remains local by default. External integrations require an explicit adapter and explicit user action. Arcsweep may display imported calendar, Notion, image, or audio data, but it records provenance and does not imply automatic knowledge of events outside its connected sources.

## Naming contract

Preferred language:

- Waking World
- Desired Reality or named world
- Waking Thread
- Continuity Log
- Return Anchor
- arc
- portal
- applet
- Forge

Forbidden interface term:

- clone

## Governing sentence

> The portal is a map, the arc is a practice, and the return remains yours.
