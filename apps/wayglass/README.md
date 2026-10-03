# Wayglass OS v0.1

Wayglass is the host route OS. ArcSweep attaches to it as an interaction surface.

This first vertical slice proves:

- a server-side, extensible route catalogue;
- a GPT route through the OpenAI Responses API;
- no provider key in the browser;
- an attached ArcSweep writing surface;
- round-robin turns;
- IC/OOC semantic state;
- explicit character ownership and temporary-handoff vocabulary;
- route receipts;
- a refractive Three.js background field;
- glass controls with restrained audio/haptic feedback.

## Run

```bash
npm run wayglass:dev
```

The Vite host runs on port 5186 and proxies `/api/v1` to the existing local server on port 3000.

The GPT route requires `OPENAI_API_KEY` (or the existing compatible server-side key fallback). `WAYGLASS_OPENAI_MODEL` may override the model without changing the client.

## Boundary

Wayglass is not ArcSweep renamed.

Wayglass owns route hosting, route registration, and attached-surface orchestration. ArcSweep remains an attached cognitive/spatial workspace. Return Engine remains the continuity substrate. Models and trained agents remain registered routes.

Training completion does not imply promotion to a live route.
