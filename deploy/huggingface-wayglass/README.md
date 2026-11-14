---
title: Wayglass Kernel Entrance
emoji: 💎
colorFrom: blue
colorTo: green
sdk: gradio
app_file: app.py
pinned: false
---
# Wayglass kernel entrance

**Staged source only. Not deployed.**

Configure private Space secrets: `WAYGLASS_RESPOND_URL` (full HTTPS URL of the authenticated Wayglass router's existing `/respond` endpoint), `WAYGLASS_GATEWAY_TOKEN` (a credential actually accepted by the host's House Steward authorisation), `WAYGLASS_OWNER_USER` and `WAYGLASS_OWNER_PASSWORD`. Keep the Space private too. Never copy credentials into source.

The request uses the real Wayglass ship route `wayglass:ship`, `character_id: wayglass`, and OOC interaction. The response must have `schema: wayglass.route-turn/v0.1`, the same ship route and a receipt with `character_id: wayglass` and `observation_id`. This is a provenance check, **not** proof of persistence or independent model identity.

The source router is `apps/starwell-server/wayglass/router.js` in the canonical `wayglass/current` branch. This deployment must be tested against the real authenticated host before any promotion. The candidate fails closed if credentials or URL are missing. Do not expose a public inference API.
