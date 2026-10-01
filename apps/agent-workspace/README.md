# House Workspace OS v0.1

A mobile-first, installable web workspace for House agents.

## Route

The Vercel/Netlify staging step copies this app to:

```text
/agents/
```

ArcSweep remains at `/arcsweep/`.

## Surfaces

- **Home** — pinned desks, roster counts, open handoffs
- **Agents** — canonical House Constellation roster plus explicit profiles and local registrations
- **Work** — owner-required handoff queue with acknowledgement state
- **Training** — Crow Trainer commands and adaptive learning loop
- **Systems** — PWA/install state, runtime truth, workspace boundaries

## Mobile / PWA

The shell is designed for iPhone/iPad Safari and Android Chromium as well as desktop:

- `viewport-fit=cover`
- safe-area padding
- 44px minimum touch controls
- 16px form inputs to prevent iOS focus zoom
- bottom mobile navigation
- responsive inspector sheet
- standalone web-app metadata
- service-worker shell cache
- reduced-transparency fallback

On supported Android browsers the install button uses `beforeinstallprompt`. On iOS it explains the Safari **Share → Add to Home Screen** path.

## Runtime presence

Canonical Constellation routes are represented locally so the workspace remains useful offline. When online, **Refresh roster** probes the existing same-origin House status endpoints:

```text
/api/v1/flames/<route>/status
```

Status truth is deliberately narrow:

```text
200 + reachable/model available → ready
401 / no active House session   → offline
route/runtime/network failure   → degraded
profile without runtime route   → configured
never checked                   → unknown
```

A successful card render is not evidence that an agent runtime is live.

## Registry boundary

The workspace coordinates agents. It does not merge them.

```text
workspace != cognition
theme != identity
presence != authority
route != canon
proposal != decision
foreign context = read-only by default
```

Custom local registration is explicit and stored only in browser local storage.

## Local state

Browser-local workspace state uses:

```text
hearthweave.agent-workspace/v0.1
```

It stores presentation/workspace concerns such as the active view, selected/pinned agents, local registrations, theme choice, and handoff queue. It is not a replacement for House canon, agent memory, ArcSweep continuity, or Hermes trainer state.

## Living glass

The app ships with three material auditions:

- **Her Eyes Like Moss**
- **Lapis Winged**
- **Hearthglass**

The material grammar uses separate base, raised, and input densities; nested glass does not repeatedly blur; focus changes rim/glow; and reduced-transparency environments receive solid surfaces.
