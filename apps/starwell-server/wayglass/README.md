# Wayglass in Hearthgate

Canonical Wayglass host and client live under `apps/starwell-server/wayglass/`.

- `client/` contains the browser source, Vite configuration, local development scripts, assets and tests.
- The sibling host modules (`router.js`, `mcp-bridge.js`, `inquiry-loom.js`, etc.) provide authenticated HTTP/MCP entrances and durable local journal boundaries.
- `../wayglass-runtime/` now contains the tracked, canonical CommonJS runtime and House-session bridge. Root `lib/wayglass-*.cjs` paths are thin compatibility exports for ArcSweep and external callers; staging never copies an implementation over these source files.

Run all source commands at the repository root:

```bash
npm run wayglass:test
npm run wayglass:deploy:server
npm run wayglass:dev
```

The deployment continues to serve the built browser application at `/wayglass/`; source location does not grant any new participant authority or change OAuth/House security boundaries. On Windows, prepare the runtime before host tests with `npm --prefix apps/starwell-server run prepare:wayglass`.
