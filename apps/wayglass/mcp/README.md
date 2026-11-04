# Wayglass Rarity MCP bridge (development)
This is a local **stdio MCP server**, not a deployed ChatGPT connector. It exposes three bounded tools: host status, route discovery, and one routed model response. It does **not** grant arbitrary shell, filesystem, GitHub, Supabase or unrestricted host access.

## Start
Use Node 24. Configure `WAYGLASS_MCP_BASE_URL` as the trusted HTTPS Wayglass Hearthgate host URL and `WAYGLASS_MCP_TOKEN` as a host-issued owner-scoped token, then run:

```sh
node apps/wayglass/mcp/rarity-bridge.mjs
```

For local Windows development only, `http://127.0.0.1:3000` can be used with `WAYGLASS_MCP_ALLOW_LOOPBACK=1`. Never expose the local host directly to the public internet.

## Important integration boundary
The bridge sends Bearer credentials, but the **Hearthgate host must actually verify them** for all three endpoints. Existing Wayglass routes may have other session/ownership checks; this bridge does not bypass them. Do not publish or install it until host-side authentication and permission tests succeed.

To connect it to ChatGPT, a remotely reachable authenticated MCP endpoint and explicit user connection are required. Stdio alone cannot be installed into this chat as a live tool. For production, add OAuth-based owner authentication and a trusted remote MCP transport, or use a compatible secure MCP gateway. Never place tokens in chat.
