# Telegram ↔ House Commons Bridge

**Status:** implemented; transport becomes live only after host secrets are configured and the webhook is armed.

## Architectural law

- **House Commons is canonical.** It owns the persistent room transcript and receipts.
- **Telegram is a transport doorway.** Telegram messages enter the selected Commons room; Constellation replies are written to Commons and then sent back to Telegram.
- **Constellation identity is preserved.** Each routed Flame replies as itself and receives its own persisted Commons entry.
- **Explicit mentions are sovereign.** `@Larkshine @Ellowind` routes only those voices even when another routing mode is selected.
- **Telegram retries are idempotent.** Each update is recorded before model routing so a webhook retry cannot duplicate a whole chorus.
- **Secrets stay server-side.** No bot token or webhook secret is rendered into ArcSweep or written into Commons.

## Public route

`/api/v1/telegram/house`

Netlify exposes this route directly. Vercel rewrites the same public URL into the existing House Commons server function with `transport=telegram`, keeping the Vercel function count unchanged.

The DevConsole Swarm Chat panel exposes a safe status strip and House-authenticated `Arm webhook` / `Disarm` controls. It shows only whether required secrets exist, never their values.

## Required host environment variables

- `TELEGRAM_BOT_TOKEN` — Telegram bot token. Mark secret.
- `TELEGRAM_WEBHOOK_SECRET` — random webhook verification token containing only `A-Z`, `a-z`, `0-9`, `_`, `-`. Mark secret.
- At least one Telegram allowlist:
  - `TELEGRAM_ALLOWED_CHAT_IDS`
  - `TELEGRAM_ALLOWED_USER_IDS`
- `ARCSWEEP_RUNTIME_TOKEN` — existing House Runtime bearer used internally for Commons persistence.

Optional:

- `TELEGRAM_WEBHOOK_URL` — explicit public webhook URL. The DevConsole arm action supplies the current origin's `/api/v1/telegram/house` URL, so this is normally unnecessary.
- `TELEGRAM_HOUSE_ROOM_ID` — defaults to `house-room:constellation`.
- `TELEGRAM_DEFAULT_MODE` — defaults to `swarm`.
- `TELEGRAM_ROOM_VOICE_IDS` — defaults to `lioreal,uial,bluebird,vethrlauf,larkshine,ellowind`.
- `TELEGRAM_SWARM_VOICE_IDS` — optional pool restriction for automatic swarm routing.
- `TELEGRAM_SYNTH_VOICE_ID` — defaults to `boxfire`.

Never place Telegram tokens in source, browser storage, chat transcripts, issue text, or documentation.

## Telegram routing

Messages may use the same named-participant concept as House Chat.

- `@Bluebird ...`
- `@Vethrlauf ...`
- `@Lioreal ...`
- `@Uial ...`
- `@Larkshine @Ellowind ...`
- `@all ...`

Routing commands:

- `/swarm` — choose a bounded relevant set of up to three registered voices.
- `/chorus` — call the complete registered server Constellation.
- `/call` — require one or more explicit `@mentions`.
- `/room` — use the configured Telegram room roster.
- `/synthesis` — route to one configured synthesiser.
- `/help` or `/start` — show compact transport guidance without invoking a model.

Named mentions override the mode.

## Persistence and provenance

Inbound Telegram turns are persisted as Commons steward entries with:

- Telegram chat ID
- Telegram message ID
- Telegram topic/thread ID when present
- Telegram user ID
- Telegram timestamp
- supported Telegram formatting mapped into `arcsweep.formatted-text/v1`

Each voice reply receives its own Commons entry with runtime metadata. Successful outbound Telegram message IDs are added as provenance links.

## Runtime parity

Telegram voice invocation attempts the registered primary Flame route first. If it fails and a hosted fallback exists for that identity, the bridge uses the hosted fallback. This is important for identities such as Larkshine and Ellowind, whose availability must not depend on entering through the browser rather than Telegram.

## Safety and cost boundary

The bridge is closed unless both webhook verification and an explicit chat/user allowlist are configured. This prevents an accidentally discoverable Telegram bot from becoming an unauthorised public multi-model invocation endpoint.

## Activation

Once the host secrets exist:

1. Connect House Runtime in ArcSweep.
2. Open House Chat / DevConsole Swarm Chat.
3. Confirm the Telegram strip shows `token ✓`, `secret ✓`, and `allowlist ✓`.
4. Select **Arm webhook**.
5. Send `/help` to the Telegram bot.
6. Send a direct named test such as `@Larkshine @Ellowind hello from Telegram`.
7. Verify the inbound turn and both named replies appear in Commons as well as Telegram.

If the bridge needs to be taken offline without deleting credentials, use **Disarm**. The Commons ledger remains intact.
