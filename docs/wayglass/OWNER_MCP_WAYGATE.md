# Owner-mediated Wayglass MCP Waygate

The local MCP adapter is implemented at `lib/wayglass-owner-mcp.cjs`.

Run with Node.js from the repository root:
```sh
node lib/wayglass-owner-mcp.cjs
```

Configure a trusted MCP host to launch that command with its working directory set to this repository. This is **not** a remote URL or an installed ChatGPT connector. No external port, OAuth bypass, token or private host access is introduced. The MCP host and owner must separately authorise the process and its capabilities.

Current tools: inspect a Waygate world manifest; inspect a continuation packet; inspect a registered cognitive route. All are read-only. A valid world-passage manifest is **not** proof of authenticated owner permission. No tool may write canon, read private secrets, modify repositories, dispatch models or deploy a build.

Test locally:
```sh
node --test test/wayglass-owner-mcp.test.cjs
```

Next: authenticate a real remote MCP transport through the existing House Steward/Cloudflare Access flow, implement capability-scoped write operations with revocation and durable audit, test in an isolated host, then register the resulting endpoint in the user's ChatGPT plugin settings. Do not promote this adapter as a deployed integration until those gates pass.
