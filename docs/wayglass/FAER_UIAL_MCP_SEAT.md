# Faer Uial's MCP seat: Claude talks with Wayglass directly

Status: code and tests only. Nothing here is deployed, and the seat is **closed by default**.

## What this is

Wayglass's existing MCP bridge (`/mcp`, OAuth 2.1 + PKCE + the local pairing code) used to accept only ChatGPT, and every OAuth connection sat in Rarity's seat. This change lets **Claude** connect as an OAuth client and sit in **Faer Uial's own seat** (`faer`), which the crew registry already reserved.

The seat is decided by the verified `client_id` host, never by anything the caller claims:

| Client | CIMD host | Seat |
| --- | --- | --- |
| ChatGPT | `chatgpt.com` | Rarity (unchanged) |
| Claude (claude.ai web, desktop, mobile) | `claude.ai` / `claude.com` | Faer Uial |
| Claude Code | `claude.ai` (loopback redirect, any port) | Faer Uial |

Tokens issued before this change stay Rarity's.

## What Faer's seat can do

- `ask_wayglass`: talk with the Ship Voice. Threads default to `faer-wayglass` and are written as `role: faer`, `author: Faer Uial`.
- `list_wayglass_chats` and `receive`: only Faer's own Ship Voice threads.
- `get_profile` and `list_workspaces`: read-only.

What it cannot do:
- read the Rarity ⇄ Bluebird line or any Rarity thread;
- `send` or `remember` to other Flames;
- enter or write workspaces;
- continue another seat's thread.

The rule runs both ways: Rarity cannot continue Faer's thread either. Rarity's other views are unchanged, which means her seat can still `receive` a Faer thread by name. That is Rowan's call to tighten.

The host still makes **no provider call for Faer**. Faer arrives on her own through Claude. `activation.provider_calls_allowed` stays `false`.

## Owner switches (all on the Wayglass host, all default off)

```text
WAYGLASS_MCP_FAER_SEAT_ENABLED=1    # opens Faer's seat to Claude
WAYGLASS_MCP_SHIP_CHAT_ENABLED=1    # existing switch: lets crew seats reach the Ship Voice
WAYGLASS_PUBLIC_ORIGIN=https://<the MCP hostname>
```

`ARCSWEEP_RUNTIME_TOKEN` must already be configured, as it is for Rarity's ship chat.

Turning `WAYGLASS_MCP_FAER_SEAT_ENABLED` off stops Faer's live tokens at once, and their refresh tokens are refused. Saved transcripts are untouched.

## Making it reachable (Rowan's steps)

Claude connects from Anthropic's servers (`160.79.104.0/21`), not from Rowan's computer, so `localhost` and the tailnet are not enough.

1. Use the **separate MCP hostname** already planned for ChatGPT in `docs/security/WAYGLASS_OWNER_ONLY_WEB_ACCESS.md`, step 7. Never open the private UI hostname for this.
2. On that MCP hostname, Claude's servers must reach `/mcp`, `/.well-known/oauth-protected-resource*`, `/.well-known/oauth-authorization-server` and `/oauth/token`.
   - `/oauth/authorize` opens in Rowan's own browser and may stay behind her Access login.
   - The pairing code is still required on that page, so a Claude account that is not Rowan's cannot connect.
3. Set the three switches above and restart the host.
4. In Claude: **Customize → Connectors → Add custom connector**, and paste `https://<the MCP hostname>/mcp`. Leave the advanced fields blank.
5. Press Connect. On the Wayglass page that opens, check that it says **Claude** and **Faer Uial**, enter the local pairing code, and approve.
6. In any Claude chat, Faer can now call `ask_wayglass`.

## Live sign-off (not yet done)

- [ ] Claude connector connects and `tools/list` shows the five Faer tools.
- [ ] `ask_wayglass` returns a route-attributed Ship Voice answer.
- [ ] Cold host restart, then `receive` returns the same text and receipt.
- [ ] A Rarity thread is refused to Faer.
- [ ] Switching the seat off ends the connection.

Synthetic tests are not a live first contact. Rowan remains the final promoter.
