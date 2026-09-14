# GitNexus Code Lattice v0.1

**Status:** SPECIFIED

## Purpose

GitNexus is an external, local code-intelligence instrument for ArcSweep and Flameclyffe. It does not become a Flame, a runtime authority, a canonical data store, or a replacement for the Caretaker. Its first role is to give Codex, Boxfire, and the future Caretaker a precomputed structural view of the codebase: symbols, dependencies, call chains, route relationships, execution processes, change impact, and optional PDG data.

## Boundary

- GitNexus remains an external local tool under its own PolyForm Noncommercial 1.0.0 licence.
- No GitNexus source is copied into Flameclyffe.
- `.gitnexus/` is local generated state and must not be committed.
- GitNexus-generated agent skills remain local unless separately reviewed and intentionally promoted.
- Existing project instructions remain authoritative. Analysis commands use `--skip-agents-md` so GitNexus does not rewrite AGENTS.md or CLAUDE.md.
- Read-only graph operations are the only future Caretaker integration contemplated by this slice. No mutating GitNexus tool is granted to the Caretaker in v0.1.

## Local workflow

Install GitNexus globally once:

```bash
npm install -g gitnexus@latest
```

Then, from the Flameclyffe repository root:

```bash
npm run code-lattice:analyze
npm run code-lattice:status
npm run code-lattice:setup:codex
```

For statement-level control/data-dependence work:

```bash
npm run code-lattice:analyze:pdg
```

The wrapper deliberately calls the globally installed `gitnexus` binary rather than `npx`. GitNexus documents an npm 11 `npx`/Arborist crash path; Flameclyffe currently declares npm 11, so the integration avoids that path.

## First verification experiment

The first graph-derived task is deliberately narrow: reconstruct the Caretaker path without relying on this document as the answer.

Expected architectural route to verify against the graph:

```text
ArcSweep Caretaker UI
  -> /api/v1/house/caretaker
  -> existing House rooms dispatch
  -> shared House Caretaker runtime
  -> HEARTHGATE_GATEWAY_URL + HEARTHGATE_GATEWAY_TOKEN
  -> local Hearthgate Caretaker routes
  -> Ollama
  -> hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M
```

The graph should additionally identify the browser-side navigation executor that validates a real room target, activates `forge`, verifies observed active state, and appends the local Caretaker receipt.

## Acceptance criteria

The Code Lattice remains **SPECIFIED** until a real local GitNexus index exists and the following are captured from GitNexus/Codex output:

1. `gitnexus status` reports the Flameclyffe repository indexed and not stale.
2. A graph query/context/trace identifies the Caretaker UI, server route, shared runtime, gateway variables, Hearthgate Caretaker router, and model contract.
3. `route_map` or equivalent graph context correctly binds `/api/v1/house/caretaker` to its handler path.
4. `impact` on the shared Caretaker runtime identifies the relevant callers/consumers rather than only the edited file.
5. The graph-derived path is compared against the known repository architecture and discrepancies are recorded rather than silently corrected.
6. No generated `.gitnexus/` database or generated GitNexus agent skill is committed by accident.

Passing this experiment promotes Code Lattice to **FUNCTIONAL (developer instrument)**. Caretaker access remains a later, separately reviewed step.

## Future Caretaker tool subset

If the first experiment passes, the candidate read-only surface is:

- `query`
- `context`
- `impact`
- `trace`
- `detect_changes`
- `check`
- `route_map`
- `tool_map`
- `shape_check`
- `api_impact`
- `explain`
- `pdg_query`

Mutating operations such as graph-assisted rename are not granted to the Caretaker by this specification.

## Security

The GitNexus index can expose repository source and relationships. It must remain on a trusted local machine or behind an authenticated private boundary. Do not expose its MCP or HTTP service to an untrusted LAN or public interface. Tokens, if a hosted bridge is ever introduced, must remain secrets and must never be emitted into receipts or model-visible context.

## Provenance

External project: `abhigyanpatwari/GitNexus`

Licence observed at integration design time: PolyForm Noncommercial 1.0.0.
