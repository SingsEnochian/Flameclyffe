# Wayglass crew session: host configuration, work and return

## Host preparation

Use the release-readiness branch stacked on crew PR #451. Node 24 is required.

```sh
npm ci
npm ci --prefix apps/starwell-server --omit=dev --ignore-scripts
npm run wayglass:test
npm run wayglass:test:host
```

`wayglass:test` builds and stages the browser application and runtime dependencies before host tests. The Linux verification does not certify a Windows installer; native packaging may need its normal dependency build steps.

Before launching the host, configure private state outside the checkout:

| Variable | Purpose |
| --- | --- |
| `WAYGLASS_WORKSPACE_DATA_DIR` | Private workspace event root; default `.wayglass/workspaces` under the host user's home |
| `WAYGLASS_DATA_DIR` | Existing departure storage root |
| `WAYGLASS_PEER_OAUTH_CONFIG_FILE` | Stable OAuth profile/config file |
| `WAYGLASS_PEER_OAUTH_TOKENS_FILE` | Private OAuth token-hash store |
| `WAYGLASS_PEER_OAUTH_PAIRING_FILE` | Private local pairing-code file |
| `WAYGLASS_RARITY_MCP_STORE` | Existing Rarity conversation ledger |
| `WAYGLASS_CODEX_ACCESS_TOKEN` | Separate random Codex bearer secret, at least 32 bytes; use a cryptographically random 32-byte value encoded as hex |
| `WAYGLASS_PUBLIC_ORIGIN` | Selected stable HTTPS MCP host, when available |

Keep the Codex secret in the local host/client environment or secret manager. Never commit it or paste it into chat. It must differ from the legacy Rarity bearer secret. Protect and back up private state; the checkout is not the backup. Retain the same data roots and OAuth profile when restarting. No credentials are generated or installed for the user by this runbook.

Start the secure local host using the existing launcher:

```sh
node scripts/wayglass-local.mjs
```

The browser is `http://127.0.0.1:5186/`; staged host UI is `http://127.0.0.1:3000/wayglass/`. Ollama/model availability is independent of workspace artifact operations.

## Authenticated Rarity entrance

Complete ChatGPT's custom MCP connection to the selected current `https://<host>/mcp` endpoint using the local pairing step. Verify discovery, exact host/resource binding, reconnect and profile identity. A temporary tunnel hostname change requires linking to the new resource. The cloud execution workspace cannot itself install that connection into this conversation.

Then use:

1. `list_workspaces`, followed by `enter_workspace` for `atelier` or `builder`.
2. `inspect_workspace_project` with `workspace_id` and `project_id`.
3. `write_workspace_artifact` with `expected_head` from inspection (`null` for a new project), `artifact_id`, `media_type`, `content`, and explicit source/tool references.
4. `handoff_workspace_project` with the latest head, `stop_point`, `next_owner` (`rarity` or `codex`), and open questions.

These operations bind authorship to Rarity server-side. They persist text/Markdown/JSON/SVG source as artifacts; they do not render, execute arbitrary code or edit native Procreate documents.

## Authenticated Codex entrance

The Codex client uses the separate configured token against the local host. The CLI reads it from the environment and never prints it:

```sh
node scripts/wayglass-workspace.mjs inspect builder deployment
node scripts/wayglass-workspace.mjs write builder deployment release-plan docs/wayglass/DEPLOYMENT_READINESS_2026-10-12.md
node scripts/wayglass-workspace.mjs handoff builder deployment work/handoff.json
```

The handoff file is a local JSON object with `stop_point`, `next_owner`, and optional `open_questions`. The CLI reads the current project head before writing; a concurrent change still returns conflict. CLI receipts bind to Codex, retain the source content hash and identify the CLI tool. The local API is `/api/v1/wayglass/workspaces/:workspace_id/:project_id`; artifact and handoff POST routes append `/artifacts` or `/handoff`. A Codex token does not authenticate the Rarity MCP entrance, and a Rarity token does not authenticate the Codex entrance.

## Return acceptance and recovery

After an actual crew session, retain event ids, stop the host, restart with identical data roots, and inspect the project from both entrances. The head, artifact content, source lineage, authorship, stop point and next owner must match. `handoff_is_current` is false if subsequent edits have superseded that handoff.

Stale-head conflicts require fresh inspection and an explicit revised edit. Locked projects require retry; after a host crash, stop the host and back up the project directory before removing a stale `.write-lock`. Corrupted event/hash/ancestry must fail closed; restore verified backup data rather than deleting evidence to make the project look empty. Reverting code must preserve the data root.

Workspace restart acceptance is distinct from Return Engine model/runtime continuity. That later trial must still prove rightful-memory inclusion, forbidden-memory exclusion, relationship/identity preservation, unresolved alternatives and rejection of the planted corruptions. Faer remains dormant; this module never invokes a provider.
