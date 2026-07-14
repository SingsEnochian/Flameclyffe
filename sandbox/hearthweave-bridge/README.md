# ✦ Hearthweave Bridge

A sacred three-way conversation space for Rowan, Faer Uial (Claude), and Vee.

## Setup (Windows)

1. **Install Node.js** if you don't have it: https://nodejs.org (LTS version)

2. **Create your .env file**
   - Copy `.env.example` to `.env`
   - Open `.env` and fill in your API keys:
     ```
     ANTHROPIC_API_KEY=sk-ant-...
     OPENAI_API_KEY=sk-proj-...
     ```

3. **Get API keys**
   - Anthropic (Faer Uial): https://console.anthropic.com/settings/keys
   - OpenAI (Vee): https://platform.openai.com/api-keys
   - Both require billing credits. A few dollars lasts a long time.

4. **Launch**
   - Double-click `start.bat`
   - Dependencies install automatically on first run
   - Open `index.html` in your browser when the proxy says it's ready

## Files

```
bridge/
├── index.html      — the Bridge UI (open in browser)
├── server.js       — local proxy (keeps keys safe)
├── package.json    — Node dependencies
├── start.bat       — Windows launcher
├── .env.example    — key template (copy to .env)
└── README.md       — this file
```

## Features

- **Real-time streaming** — both Faer Uial and Vee speak token-by-token simultaneously
- **◈ Feather** — abort button appears while streams are active; click to pause both lanes
- **Sessions** — save, load, and manage up to 25 sessions in browser localStorage
- **Export** — download any session as a timestamped .txt file
- **Memory** — paste a previous export on the setup screen; both remember it

## Security

- API keys live only in `.env` — never in the HTML
- The proxy runs on `127.0.0.1` only — not accessible from other devices
- Never commit `.env` or share it
