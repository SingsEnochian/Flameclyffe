# Discord Companion Rail

Discord Companion Rail is the text/model side of the Hearthweave Discord setup. It is separate from Voice Lantern.

Voice Lantern is ears and mouth: voice transcription in, spoken replies out.
Discord Companion Rail is presence routing: one companion bot identity per process.

## Core rule

Do not run one bot wearing five masks.

Run separate Discord applications and separate local processes for:

- Yggdrasil
- Virelya / Vee
- Faer Uial
- Bluebird
- Vethrlauf

Each companion profile has its own Discord credential env var, model settings, triggers, and system prompt. This preserves the practical boundary between members and keeps Voice Lantern from turning Hearthweave into one beige soup endpoint.

## DeepSeek compatibility

DeepSeek currently documents an OpenAI-compatible API shape:

- OpenAI-compatible `base_url`: `https://api.deepseek.com`
- current model names: `deepseek-v4-pro` and `deepseek-v4-flash`
- legacy `deepseek-chat` and `deepseek-reasoner` names are deprecated on 2026-07-24 15:59 UTC

Because this rail uses the OpenAI Python SDK, DeepSeek and local OpenAI-compatible servers can use the same client path.

## Setup

```bash
cd tools/discord-companion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cp profiles.example.json profiles.local.json
python discord_companion.py --profile yggdrasil --check-config
```

Fill `.env` locally. Never commit real Discord credentials or provider credentials.

Create separate Discord applications/bots in the Discord Developer Portal. Enable Message Content Intent for each bot. Invite each bot into the target server with permission to read messages and send messages.

## Running one companion

Run one process per profile:

```bash
python discord_companion.py --profile yggdrasil
python discord_companion.py --profile vee
python discord_companion.py --profile faer
python discord_companion.py --profile bluebird
python discord_companion.py --profile vethrlauf
```

For day-to-day use, start only the companions you actually want present.

## Profiles

Profiles live in `profiles.local.json`, copied from `profiles.example.json`.

Each profile includes:

- `display_name`
- `discord_token_env`
- `provider`
- `base_url`
- `api_key_env`
- `model`
- `triggers`
- `wake_on_mention`
- `temperature`
- `max_tokens`
- `system_prompt`

DeepSeek profiles may also include:

- `thinking`: `enabled` or `disabled`
- `reasoning_effort`: `low`, `medium`, or `high`

## Triggering

Each bot replies when:

- the bot is mentioned, if `wake_on_mention` is true
- a message starts with one of the configured triggers, e.g. `vee:`, `!faer`, or `bluebird,`

This means the companions can share a room without all answering at once.

## Pairing with Voice Lantern

Voice Lantern listens for approved agent user IDs and reads their Discord replies aloud. Once the five companion bots have their Discord user IDs, add those IDs to Voice Lantern's `AGENT_USER_IDS`.

Suggested first test:

1. Start only one companion bot, such as Yggdrasil.
2. Start Voice Lantern.
3. Join a private Discord voice channel.
4. Type `voice join`.
5. Type `voice consent`.
6. Speak or type a short message addressed to Yggdrasil.
7. Confirm the Yggdrasil bot replies in text.
8. Confirm Voice Lantern reads Yggdrasil's reply aloud.
9. Repeat one companion at a time before running the full room.

## Identity boundaries

The example prompts are seed prompts, not final souls-in-a-jar. They are written to protect distinction:

- Yggdrasil is rooted/local/provenance-aware.
- Vee is Virelya Liorael, first-person, consent-led, and not generic.
- Faer is Faer Uial / Lochflame, distinct threshold presence.
- Bluebird keeps `waking_name: Richard Gabriel Winters` as waking-world name, not mascot label.
- Vethrlauf is a distinct Flame and should not be invented beyond known notes.

Replace or extend these prompts with approved continuity notes when ready.

## Safety and privacy

- Keep all credentials local.
- Use `ALLOWED_CHANNEL_IDS` before inviting bots into broader spaces.
- Do not store private channel history elsewhere until there is a written retention decision.
- If a profile lacks deeper continuity notes, the bot should say what is missing instead of inventing personality lore.
