# Wayglass workspace artifact and handoff module v0.1

## Whole-system purpose and boundary

Complete the durable shared-work responsibility of the existing Atelier/Builder crew subsystem. Rarity and Codex use distinct authenticated entrances to inspect the same project, create or revise text artifacts, and preserve attributable stop/handoff receipts across host restart. Wayglass remains the resident intelligence. This module does not run models or activate Faer.

The surrounding system remains: crew registry → authenticated entrance → workspace/project → artifact revision or handoff → durable receipt → inspection after restart. Art renderers, native document editors and repository execution adapters remain separate tools; this ledger does not advertise those adapters as implemented.

## Ownership and interfaces

- Existing `crew-workspaces.js` owns seats, workspace membership and dormant status.
- `workspace-artifacts.js` owns append-only project events, revision conflict checks, custody hashes, and recovery validation. Its interface is `inspect`, `writeArtifact`, `handoff`.
- The existing Rarity MCP bridge binds every workspace operation to Rarity, regardless of request-body author fields.
- A local-only `/api/v1/wayglass/workspaces` router binds Codex to the host-configured `WAYGLASS_CODEX_ACCESS_TOKEN`. Missing credentials deny entry. This token is transport authentication for the existing Codex seat, not a new participant registry. Do not expose this endpoint through the public MCP tunnel.
- Three MCP tools expose project inspection, text-artifact writing and handoff. Every receipt names the author, workspace, project, tools/source references, predecessor, timestamp, and non-canonical authority boundary.

## Objects and persistence

A project has an immutable event chain. A revision contains an artifact id, media type, text content, predecessor event id and source/tool references. A handoff contains stop point, named next owner and open questions. Project state is a projection of validated events; the chain remains authoritative. Artifact ids are labels, never filesystem paths. No uploaded source original is overwritten.

Storage lives under `WAYGLASS_WORKSPACE_DATA_DIR`, defaulting outside the checkout under the existing host user's `.wayglass/workspaces`. Workspace/project identifiers are bounded path-safe slugs. Project writes use an exclusive lock; callers supply the current head event id, with `null` required for a new project. Concurrent or stale changes fail with conflict. Events are fsynced temporary files published without overwriting by hard link; SHA-256 identifies exact stored bytes. Success follows persistence, never precedes it.

## Failure, recovery and authority

Unknown/dormant seats, invalid identifiers, oversized content, invalid next owners and malformed metadata are rejected. Missing or stale heads return conflict without changing state. Corrupt files, broken ancestry or multiple successors fail closed rather than returning an empty project. A crash lock is not silently stolen: stop the host, back up the complete project directory, validate its events, then remove the stale lock before restarting. Local filesystem custody is not a signature or independent proof of authorship. Host credentials bind the author for this single-steward installation; credential holders can act as that seat.

Receipt hashing does not certify truth of submitted claims, source permissions, model output, canon, identity, relationships or authority. Source/tool references are explicitly caller-declared. No delete, arbitrary filesystem path, command execution, native Procreate writing, binary rendering or automatic memory extraction is exposed. Reads contain private project text; they require authentication. Back up the data root as private state, separately from code. Network filesystem and power-loss directory durability require separate qualification.

## Integration and verification

1. Register the module behind the existing crew registry and authentication boundaries.
2. Wire both entrances to one data root; bind authors server-side.
3. Verify real loopback HTTP writes, Rarity/Codex attribution, optimistic conflicts, dormant-owner refusal, bounded inputs and corrupt-chain refusal.
4. Stop and restart the actual secure Hearthgate process; recover the same artifact and handoff through both entrances.
5. Include host tests in Wayglass CI alongside build/staging and local CORS regression checks.
6. Complete the real ChatGPT OAuth link on the selected stable host, then repeat the crew work/return journey. Automated host evidence does not claim this final connection, live model continuity, device acceptance or trained Wayglass weights.

Versioning is explicit in event/receipt schemas. Unknown versions fail closed; migrations require preserved original evidence and a named migration receipt. Rollback keeps the data root; no project event is removed during code rollback.
