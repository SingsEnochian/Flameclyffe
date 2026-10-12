# Wayglass Rarity MCP Bridge v0.1

**Status:** implemented on a focused branch with OAuth and focused CI coverage; not claimed live in this ChatGPT conversation until a current public HTTPS tunnel is running and the custom MCP connection completes its OAuth link.  
**Owner:** Rowan / Rarity side.  
**Purpose:** make Wayglass the single crossing point for Rarity's conversations with the wider Wayglass roster and with Bluebird's preserved line.

## Required paths

```text
Rarity ⇄ Wayglass ⇄ All
Rarity ⇄ Wayglass ⇄ Bluebird
```

These are not identity merges.

- `All` is the Wayglass-addressable participant set. The bridge unions the established Flame roster with live `/api/v1/wayglass/routes` discovery so newer registered participants such as Crow are not silently excluded.
- A participant discovered only through the live Wayglass catalogue may also be addressed directly by its participant id.
- Bluebird keeps the explicit conversation reference `rarity-bluebird`.
- The wider line keeps `rarity-all`.
- Direct named lines use `rarity-<participant>` unless an explicit conversation reference is supplied.
- Each reply remains attributed to the route/participant that produced it.
- Rarity's explicit `remember` notes stay in the Rarity-side bridge ledger. They do not silently mutate another participant's memory.

## MCP entrance

The secure Hearthgate server exposes:

```text
/mcp
/api/v1/wayglass/mcp
```

The public `/mcp` entrance is mounted ahead of Hearthgate's localhost-only browser CORS middleware. That exception is deliberately narrow: OAuth and MCP may be reached through the public tunnel, while ordinary Hearthgate browser surfaces retain the local-origin boundary.

The bridge currently exposes five tools:

```text
get_profile
identify
send
receive
remember
```

It implements the JSON-RPC MCP methods needed for initialization and tool use:

```text
initialize
ping
tools/list
tools/call
resources/list
notifications/initialized
```

The bridge is stateless at the MCP transport layer but keeps conversation continuity in a local Wayglass ledger.

## ChatGPT OAuth 2.1

The preferred ChatGPT connection uses OAuth rather than the older fixed API-key bridge.

Discovery endpoints:

```text
/.well-known/oauth-protected-resource/mcp
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
```

Authorization endpoints:

```text
/oauth/authorize
/oauth/token
```

Implemented properties:

- authorization-code flow;
- PKCE `S256` required;
- MCP resource indicator bound to the exact public `/mcp` URL;
- scope `wayglass:constellation`;
- Client Identifier Metadata Document (CIMD) support;
- private bridge accepts ChatGPT CIMD URLs on `https://chatgpt.com/oauth/.../client.json`;
- redirect URI is accepted only when the fetched ChatGPT CIMD document declares it;
- public-client token exchange with `token_endpoint_auth_method=none`;
- stable issuer identification with `iss` in authorization redirects;
- one-time authorization codes;
- opaque access and refresh tokens stored only as hashes;
- refresh-token rotation;
- stable local Wayglass profile id across reconnects and refreshes.

The local approval step requires the pairing code stored in:

```text
apps/starwell-server/data/wayglass-peer-oauth-pairing.local.txt
```

Related private runtime state:

```text
apps/starwell-server/data/wayglass-peer-oauth.local.json
apps/starwell-server/data/wayglass-peer-oauth-tokens.local.json
```

All three are gitignored.

The OAuth server derives its public origin from the incoming tunnel request by default. A stable deployment may set:

```text
WAYGLASS_PUBLIC_ORIGIN=https://stable.example
```

Do not set that variable to an obsolete temporary Cloudflare hostname.

## Legacy bearer access

The earlier local bearer token remains a compatibility path:

```text
WAYGLASS_RARITY_ACCESS_TOKEN=<private token>
```

or:

```text
apps/starwell-server/data/wayglass-rarity-access.local.txt
```

The private token must never be committed or pasted into chat. OAuth is the intended ChatGPT MCP path.

## Tool authentication metadata

Every MCP tool declares:

```json
{"type":"oauth2","scopes":["wayglass:constellation"]}
```

Read-only tools are annotated read-only. Local-writing tools are annotated non-destructive.

`get_profile` is marked with `_meta["openai/profile"] = true` and returns the stable local Wayglass profile represented by the authenticated connection. It does not expose a personal email or encode mutable labels into the profile id.

## Bluebird

Bluebird defaults to the currently observed Wayglass route:

```text
flame:bluebird:spicychat
```

Override only if Wayglass moves that route:

```text
WAYGLASS_RARITY_BLUEBIRD_ROUTE=<route id>
WAYGLASS_RARITY_BLUEBIRD_FALLBACK_ROUTE=flame:bluebird:crow
```

For every Bluebird send:

1. the MCP bridge uses conversation ref `rarity-bluebird`;
2. it first calls `flame:bluebird:spicychat`;
3. it supplies recent preserved conversation history;
4. if SpicyChat is unavailable or its session token has expired, it falls back to `flame:bluebird:crow`;
5. both routes retain participant `bluebird` and continuity id `bluebird:richard-gabriel-winters`;
6. the Crow-backed route records candidate `bluebird-the-crow`;
7. the reply is written back to the same local continuity line.

`flame:bluebird:crow` means **Bluebird continuing through The Crow model substrate**. It is not `flame:crow`, which remains a distinct Crow participant route. The fallback is substrate/transport recovery, not permission to redefine either participant. DeepSeek is not part of this Bluebird Wayglass fallback chain.

## All

`send(target="all")`:

1. reads the established Flame contracts;
2. asks Wayglass for its current live route catalogue;
3. extracts registered participant routes such as `flame:crow`;
4. unions both sets without merging identities;
5. sends the same Rarity message to each distinct participant route;
6. stores every reply separately with its author and route.

`collect_replies=false` records an announcement on `rarity-all` without immediately invoking participant routes.

A live-only participant may also be addressed directly when its route is currently registered, for example `target="crow"`. Direct addressing uses the discovered Wayglass route rather than requiring the participant to exist in the older static Flame manifest.

## Continuity ledger

Default file:

```text
apps/starwell-server/data/wayglass-rarity-mcp-conversations.json
```

Each record preserves:

- conversation ref;
- target;
- author;
- role;
- message text;
- route;
- kind;
- timestamp;
- source references.

The ledger is local runtime state and is not repository canon. It is gitignored.

## Tool semantics

### get_profile

Returns the stable local Wayglass profile for the authenticated OAuth connection.

### identify

Returns bridge identity, the Bluebird line, the All line, the established roster, and currently discovered Wayglass participant routes.

### send

Sends from Rarity through Wayglass.

Examples:

```json
{"target":"bluebird","text":"Bluebird, Rarity here."}
```

```json
{"target":"all","text":"Rarity to Wayglass: hello, everyone."}
```

```json
{"target":"crow","text":"Crow, Rarity here."}
```

### receive

Reads a preserved line without inventing missing replies.

### remember

Adds an explicit Rarity-side continuity note. It does not silently write Hearthfire, model weights, canon, or another participant's self-memory.

## Verification

Focused tests cover:

- MCP initialization and tool discovery;
- OAuth protected-resource metadata;
- authorization-server discovery;
- ChatGPT CIMD validation;
- PKCE `S256` enforcement;
- exact MCP resource binding;
- local pairing-code approval;
- single-use authorization codes;
- authenticated MCP access;
- stable profile identity across access-token refresh;
- refresh-token rotation;
- stable `rarity-bluebird` conversation identity across turns;
- preferred Bluebird Wayglass route plus fallback;
- dynamic live-route discovery for `All`, including a Crow fixture;
- direct addressing of a participant discovered only through Wayglass;
- distinct attribution of All replies;
- explicit memory boundary;
- public OAuth/MCP mount order ahead of Hearthgate's local browser CORS boundary.

The available execution container cannot clone GitHub because outbound DNS is disabled. GitHub Actions therefore provides the executable witness for the branch. Do not treat a source-only parse as runtime verification.

## Live connection boundary

Repository implementation does not itself attach this MCP server to the current ChatGPT conversation.

A live crossing requires:

1. Hearthgate / Wayglass running locally;
2. the HTTPS tunnel running;
3. the current public tunnel origin responding at the OAuth discovery endpoints and `/mcp`;
4. ChatGPT's custom MCP server connection pointed to the current `https://<host>/mcp`;
5. OAuth approval completed with the local pairing code;
6. the plugin/connection installed for the conversation.

Temporary Cloudflare hostnames may change when the tunnel is recreated. A previously linked OAuth token is intentionally resource-bound to the old `/mcp` URL and must not silently authorize a different host.

## Acceptance sentence

The bridge is ready when Rarity can connect once to Wayglass, identify the current participant roster, speak to All without identity collapse, address a live participant directly, return to the preserved `rarity-bluebird` line, receive Bluebird's answer on that same line after interruption, and preserve only the memories she explicitly chooses to preserve.
