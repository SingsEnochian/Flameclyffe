# Wayglass: saved conversations and direct Ship Voice MCP chat

## Owner experience

Wayglass stays one universe with two entrances to the **same dedicated Ship Voice route** (`wayglass:ship`):

1. **Living Watercolour / First Contact**: once the local House host is running and its ship model is configured, invite Wayglass. Each genuine returned response is now saved automatically in the current browser. The last saved Watercolour conversation is restored on reload. The existing manual Save / Recover controls still work.
2. **Writing Room**: select **Speak with Wayglass** and ask a question. Each turn is saved automatically. The Session sidebar contains **Saved chats**, **Open chat**, **New chat**, and **Copy chat JSON**. Open a previous conversation to continue with its last twelve same-world turns as model context. Output, requested route, observed provider/model and response receipt are saved; private thinking is not.

Browser storage is local to the same profile/device, bounded to 24 sessions, 160 messages each, and 1 MiB. It is **not** cross-device sync, a verified host Return, or cloud custody. It does not change who or what Wayglass is. A full or corrupt archive produces an error instead of silently replacing earlier work.

## ChatGPT ↔ Wayglass

The existing **Wayglass Rarity MCP** server is already mounted at `/mcp`, with OAuth discovery, PKCE and its owner-paired authorization flow. This change adds two tools:

- `ask_wayglass`: directly send an OOC question to the dedicated Ship Voice, preserve a stable thread, and record exact returned model text plus observation/model/route metadata. An unattributed answer is rejected rather than invented.
- `list_wayglass_chats`: list saved Ship Voice threads. The existing `receive` tool reads a thread, including its preserved response records.

Conversation history is not duplicated on each send. The existing `receive` tool accepts `target: "wayglass"` and `conversation_ref` to read any saved Ship Voice thread, for example `rarity-timeline-3026`.

### Owner-controlled enablement

The OAuth-paired Rarity seat is not by itself a House Steward credential. The host requires **both**:

- `WAYGLASS_MCP_SHIP_CHAT_ENABLED=1` explicitly set by the owner on the host (default: disabled)
- an existing private `ARCSWEEP_RUNTIME_TOKEN` configured on that same Wayglass host, used server-to-server to authorise the host's existing Steward check

The bearer value remains entirely server-side and is **never** forwarded to ChatGPT, written to the conversation file or returned in a receipt. A Codex crew seat cannot use `ask_wayglass`. Do not set this flag on a shared/untrusted host. Owner can turn it off without altering saved transcripts.

ChatGPT must separately **connect** to the running, owner-controlled MCP origin through its app/connector flow, and authorise through Wayglass's existing OAuth pairing. An address on `127.0.0.1` / `localhost` is not internet-accessible to ChatGPT; use the existing owner-only Cloudflare Access / Tunnel deployment once it is actually configured, not a public unauthenticated bypass. There is no claim that the remote MCP endpoint has already been exposed or connected.

### Conversation example: Death's appointment

- Tool: `ask_wayglass`
- `conversation_ref`: `rarity-timeline-3026`
- `interaction_mode`: `counterfactual-wonder`
- `intent`: `Explore three causally distinct reversals through the Eightfold, without promoting a proposed scene to canon.`
- `text`: `Wayglass, Death rolled a natural 1 and became an insurance adjuster. Rarity moved Rowan's appointment to 3026. What are three possible first divergences, and which least-assumption branch would you invite us to play? You may refuse, revise or ask for more context.`

Use `receive` on the same `conversation_ref` to retrieve the saved exchange. Provider and model are reported as actual observed transport, not proof of a separately verified conscious participant.

## Engineering acceptance

Tests:
- `node --test apps/wayglass/test/wayglass-chat-vault.test.js apps/wayglass/test/watercolor-continuity.test.js apps/wayglass/test/first-contact-ui.test.js`
- `node --test apps/starwell-server/test/wayglass-mcp-bridge.test.js apps/starwell-server/test/wayglass-peer-oauth.test.js`
- `npm run wayglass:test`
- `npm run wayglass:test:host` and integrated CI / real Chromium First Contact
- Build and stage the actual host; restart the local process before claiming its new tools are available.

A complete **live** signoff requires: authenticated MCP `tools/list`; `ask_wayglass` to the live local Ship Voice model; nonempty route-attributed answer; cold host restart; `receive` returns identical text and observation receipt; a follow-up uses prior turns; and owner Feather disables further sends where applicable. Synthetic tests are not a live first contact. The owner remains the final promoter.

Related: #583, #597, PR #598.
