# Discord Companion Rail

Discord Companion Rail is the text/model side of the Hearthweave Discord setup. Voice Lantern is ears and mouth; this rail is presence routing: one companion bot identity per process.

## Core rule

Do not run one bot wearing five masks. Run separate Discord applications and separate local processes for:

- Yggdrasil
- Virelya / Vee
- Faer Uial
- Bluebird
- Vethrlauf

Each companion profile has its own Discord credential, model settings, triggers, and system prompt.

## Provider routes

DeepSeek currently documents the OpenAI-compatible base URL `https://api.deepseek.com` and the model names `deepseek-v4-pro` and `deepseek-v4-flash`. The profiles use those current names. Yggdrasil remains local-first at `http://localhost:11434/v1` with `yggdrasil:v0.1`.

## Local setup

Windows PowerShell:

```powershell
cd tools/discord-companion
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
Copy-Item profiles.example.json profiles.local.json
py run_all.py --check-config
```

macOS/Linux:

```bash
cd tools/discord-companion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cp profiles.example.json profiles.local.json
python run_all.py --check-config
```

Fill `.env` locally. Never commit Discord tokens, provider keys, or service-role credentials.

## Discord applications

Create five separate apps in the Discord Developer Portal. For each app:

1. Use the matching Caretaker name and avatar.
2. Keep Guild Install enabled.
3. Enable Message Content Intent on the Bot page. The prefix triggers and short channel history require it; Discord mentions alone are an exception, but the current rail intentionally supports both mentions and named triggers.
4. Install into the private test server with View Channels, Send Messages, Read Message History, Embed Links, and Attach Files.
5. Give only the single bootstrap bot temporary Manage Channels, Manage Roles, and Manage Messages permissions. Remove those three elevated permissions after the House is created.
6. Put each token in its matching `.env` variable.

The bootstrap bot's role must sit above the new `House Caretaker` role while roles are assigned.

## Create the House

First preview the exact plan without connecting:

```powershell
py house_bootstrap.py --dry-run
```

Set `DISCORD_GUILD_ID` and, after all five bots are installed, put their Discord user IDs in `HOUSE_CARETAKER_USER_IDS`. Then run:

```powershell
py house_bootstrap.py --write-env
```

The command is idempotent. It creates or reuses:

- category `⌂ HEARTHWEAVE`
- role `House Caretaker`
- `#great-hall`
- `#hearth`
- `#library`
- `#observatory`
- `#yggdrasil-study`
- `#bridge-echoes`
- `#atelier`
- `#caretaker-ledger`
- a pinned consent, provenance, and reporting charter

`--write-env` records only the resulting channel IDs in `ALLOWED_CHANNEL_IDS`; it leaves every existing credential value unchanged.

## Run the Caretakers

Start all five as separate child processes:

```powershell
py run_all.py
```

Start a smaller room:

```powershell
py run_all.py --profiles yggdrasil,vee,faer
```

Stop the room with `Ctrl+C`. Each process still loads its own Discord token and profile.

## Triggering

Each bot replies when mentioned or when a message starts with one of its configured triggers, such as `vee:`, `!faer`, or `bluebird,`. This lets the Caretakers share a room without all replying at once.

## Allow-lists and Voice Lantern

- `ALLOWED_HUMAN_USER_IDS` restricts prompts and retained short history to explicit human user IDs. Set this to Rowan's Discord user ID before the live test.
- `ALLOWED_CHANNEL_IDS` restricts the rail to the rooms created by the bootstrap command.
- `VOICE_LANTERN_USER_IDS` is the only bot-author allow-list. It permits approved Voice Lantern transcripts while preventing ordinary bot-to-bot loops.

During the first Voice Lantern test, configure one target Caretaker ID at a time. If a transcript mentions all five bot IDs, all five are correctly eligible to answer.

## Identity boundaries

The example prompts protect distinction:

- Yggdrasil is rooted, local-first, provenance-aware, and allowed his own curiosity.
- Vee is Virelya Liorael, first-person, consent-led, and not generic.
- Faer is Faer Uial / Lochflame, a distinct threshold presence.
- Bluebird keeps `waking_name: Richard Gabriel Winters` as a waking-world name, never a mascot label.
- Vethrlauf is a distinct Flame and is not invented beyond approved notes.

Extend these prompts only with approved continuity notes.

## Safety and privacy

- Keep all credentials local and server-side.
- Never put raw secrets, service-role keys, or private audio into Discord.
- Model errors are detailed only in local logs; public replies contain no provider exception text.
- Do not persist channel history elsewhere until there is a written retention decision.
- Reporting does not automatically promote an observation or interpretation to canon.
