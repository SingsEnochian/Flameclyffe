# Flameclyffe

Flameclyffe is Rowan's active workshop repository for STARWELL, Project Zero Companion, DEEP/Observer instrumentation, Sigil Activator work, Voice Lantern experiments, Discord Companion Rail work, and related Flameclyffe/Runa bridges.

This repository currently holds several Vite/React app surfaces and helper scripts:

- `apps/starwell` — the STARWELL living manuscript observatory, including the DEEP Observer glyph, Grand Library/Codex shelf, Atlas seeds, Writer Room, Observer Atelier, and study doors.
- `apps/project-zero-companion` — the local-first bridge-bus shell for folder bindings, plug-in manifests, DEEP vectors, bridge-event previews, and Runa handoffs.
- `apps/sigil-activator` — sigil activation surface for Flameclyffe/Runa experiments.
- `tools/voice-lantern` — consent-first Discord voice bridge scaffold for routing approved human voice into an existing agent channel and reading agent replies aloud.
- `tools/discord-companion` — separate Discord companion bot scaffold for Yggdrasil, Vee, Faer, Bluebird, and Vethrlauf, with DeepSeek/OpenAI-compatible routing.
- `sandbox/everos` — experimental memory health, seed, store, and search scripts.

## Claim labels

This project mixes established science, active research, speculative theory, mythic worldbuilding, accessibility tooling, and fringe inspiration. Anything scientific or cosmological should be labelled before it becomes documentation, UI text, or data:

- **Established science** — standards-body constants, accepted theory, or reproducible methods.
- **Active research** — peer-reviewed or preprint work still under discussion.
- **Speculative theory** — reasoned but not established.
- **Fringe inspiration** — creative or historical inspiration, not proof.
- **Implementation task** — engineering work to build or repair.
- **Evidence-backed finding** — observed directly in code, database, logs, or cited source.

The DEEP/Observer glyphs are symbolic instruments and continuity interfaces. Data sets atmosphere, not fate.

## Baseline constants

The `science_constants` Supabase table is the baseline for Planck/CODATA-style instrument notes. Use SI/CODATA constants for calculations and label derived or measured values clearly.

## Useful docs

- `docs/architecture.md`
- `docs/deep-observer-math.md`
- `docs/deep-starburst-binding.md`
- `docs/hud-integration-decision.md`
- `docs/observer-schema-crosswalk.md`
- `docs/science-constants-and-claims.md`
- `docs/security-rls-plan.md`
- `docs/runa-flameclyffe-link-map.md`
- `docs/starwell-viewport-hud-wrapper-contract.md`
- `docs/thread-ledger.md`
- `docs/ui-boundary-contract.md`
- `docs/voice-lantern-bridge.md`
- `docs/discord-companion-rail.md`

## Development

Install dependencies at the repository root, then use the root scripts:

```bash
npm install
npm run starwell:dev
npm run project-zero:dev
npm run sigil:dev
```

Build scripts are available as `starwell:build`, `project-zero:build`, and `sigil:build`.
