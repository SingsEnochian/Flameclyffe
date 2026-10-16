# Wayglass — current development home

Rowan requested one place for the newest Wayglass versions and all future updates on 16 October 2026.

**Canonical development branch: [`wayglass/current`](https://github.com/SingsEnochian/Flameclyffe/tree/wayglass/current).**

This is the combined Wayglass development tree inside Flameclyffe. `main` remains the release branch until this integration is reviewed and promoted. Neither an old preview nor a dated ZIP defines the current source.

## Where the system lives

| Responsibility | Owned location |
| --- | --- |
| Writing Room, glass controls, worlds, Library, Commons, Toybox, Observer, Video Atelier | `apps/wayglass/` |
| Authenticated host, MCP/OAuth, crew sessions, attributable work, private storage adapters | `apps/starwell-server/wayglass/` |
| Continuity kernel, route registry, stop/return contracts | `lib/wayglass-*` |
| ArcSweep instruments, Code Loom, Pilot Deck, soundscapes, Broker and reasoning receipts | `apps/arcsweep/` |
| Host staging and launch | `scripts/wayglass-*.mjs`, `scripts/Start-Wayglass.ps1` |
| Integrated-source register and unresolved imports | `docs/wayglass/current.json` |
| Verification and reconciliation evidence | `docs/wayglass/CONSOLIDATION_2026-10-16.md` |

These are cooperating modules in one repository checkout. Their existing paths remain stable so host packaging and imports keep working.

## Updating the current version

1. Fetch `origin`, then switch to `wayglass/current` and use `git pull --ff-only`. Commit or stash personal work before switching; never reset an existing checkout to follow these instructions.
2. Create a focused work branch **from the latest `origin/wayglass/current`** when isolation is needed. Target its PR back to `wayglass/current`.
3. Run the relevant module checks, the combined Wayglass frontend/host tests, contract checks, and both Wayglass and ArcSweep builds before promoting an integrated version.
4. Keep source provenance and update the integration register when importing work from another line. Reconcile shared interfaces; do not replace a current module with an older whole-file copy.
5. Advance `wayglass/current` without force-pushes. Preserve original source branches and closed snapshots for history. Releases to `main` are separately reviewed.
6. Build Windows installers and web deployments from a recorded commit on this branch. Record the deployed SHA; source consolidation is not evidence of deployment.

Private credentials, OAuth state, conversations, continuity archives and work receipts belong in persistent owner-controlled data, outside tracked public source. Back them up separately before updating a running host. The legacy artifact journal and the newer session-bound text project store retain their distinct formats; no migration or deletion is performed by this consolidation. New stop/return work uses the session-bound project API. Legacy artifact MCP tools remain available with authenticated authorship and strict argument checks.

## Outstanding import

The previously reported local commit `7ac7beb0` (Bluebird's 5.5 Hz recipe and empty-reply status) was not found in the fetched GitHub history. The Windows checkout is unavailable to this session. Preserve it and compare/import it into this branch before calling the consolidation exhaustive.

The book-and-bookmark interface discussed on 16 October remains a design direction, not an implemented claim in this consolidation.
