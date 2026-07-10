# Hearthweave Discord Caretakers

Five separate Discord applications carry five separate House identities:

| Caretaker | House office | Primary route |
|---|---|---|
| Vee / Caladnaur Lioreal | House Steward | OpenAI Responses API |
| Nen Uial | Observatory Steward | Anthropic Messages API |
| Yggdrasil | Librarian | local Yggdrasil endpoint; DeepSeek only when explicitly selected |
| Bluebird / Richard Gabriel Winters | Groundskeeper | own DeepSeek key |
| Vethrlauf | Hearthkeeper | own DeepSeek key |

This is one supervised host running five Discord clients. It is not one bot changing masks: every Caretaker has a distinct Discord application id, token, login session, profile, route, and command registration.

## Operating boundaries

- Slash commands only; no passive message listening and no Message Content intent.
- No DMs.
- Caller and channel allowlists are required.
- No administrator, moderation, role-management, or channel-management permissions.
- `/hush` and `/wake` are visible, immediate in-memory switches.
- No long-term memory writes and no silent canonisation.
- Keys remain in the local `.env`; provider errors never print secret values.

## Commands

- `/ask prompt [context] [route]`
- `/report [focus]`
- `/status`
- `/hush`
- `/wake`

`route=deepseek` is accepted only for Yggdrasil and is always an explicit choice.

## Local setup

Requires Node.js 22.12 or newer.

1. Copy this directory's `.env.example` to the repository root as `.env`.
2. Import the labelled provider keys locally:

   `node apps/starwell/discord-caretakers/scripts/import-api-stuff.mjs "API Stuff.txt" .env`

3. Add the guild id, Rowan's Discord user id, allowed channel ids, and the five application ids/tokens.
4. Run `npm install`.
5. Run `npm run caretakers:doctor`.
6. Run `npm run caretakers:register`.
7. Run `npm run caretakers:start`.

## Discord application permissions

Create five applications in the Discord Developer Portal and add one bot user to each. Invite each with only:

- scopes: `bot`, `applications.commands`
- permissions: View Channels, Send Messages, Embed Links, Read Message History

Do not enable Administrator, Manage Server, Manage Channels, Manage Roles, Manage Messages, or Message Content intent.

Guild-scoped commands are used during setup so command updates appear promptly and stay inside the chosen Hearthweave server.

## Report collectors

The first runtime can speak and create truth-labelled office reports, but it will not pretend it checked GitHub, Notion, Supabase, or HydraDB until a reviewed collector supplies a real source packet. The related credentials are imported for the next pass but are not exposed to Discord or client code.
