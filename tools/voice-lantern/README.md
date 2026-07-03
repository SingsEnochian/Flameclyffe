# Voice Lantern

Voice Lantern is Flameclyffe's Discord voice bridge scaffold for Yggdrasil, Vee/Faer style companion work, and future Hearthweave group voice tests.

It is deliberately not an agent. It does not call an LLM. It listens to approved human voice in a Discord voice channel, transcribes locally with Whisper, posts that transcript into the text channel where the real agent already lives, then speaks the agent's normal Discord reply aloud with TTS.

## Lineage and licence

This scaffold is inspired by Seven Voice by Seven Verity and Sunny: https://github.com/meatwife/seven-voice

Seven Voice is MIT licensed. This implementation keeps the same central design ethic, voice as transport around an existing companion, while adapting the control surface and consent defaults for Flameclyffe/Voice Lantern.

## What this is for

Use this when the important thing is preserving the agent's existing memory, identity shape, context, and response path. The delay is acceptable because the companion answers through the normal Discord text rail instead of being replaced by a smaller real-time voice assistant.

## What this is not for

Voice Lantern is not:

- an instant phone call interface
- a wake-word assistant
- a hidden recorder
- a multi-speaker diarization system
- a replacement model or speech-to-speech agent
- a consent bypass

## Consent rules

Voice channels are shared rooms. Everyone present should know that the bridge may transcribe human speech into a text channel. The default config requires a human to run `voice consent` before transcription begins.

Default safe loop:

1. Start the bot locally.
2. Join a small private Discord voice channel.
3. Type `voice join` in the paired text channel.
4. Read the consent notice aloud or in chat.
5. Type `voice consent` only after everyone present agrees.
6. Use `voice hush` or `voice feather` to pause transcription.
7. Use `voice leave` to disconnect and clear consent state.

Transcripts are data. Decide where Discord history is allowed to live before testing with sensitive material.

## Setup

Create a Discord bot/application for your own server. Enable Message Content Intent in the Discord Developer Portal. Invite the bot with permission to read and send text messages, join voice channels, and speak in voice channels.

Local install:

```bash
cd tools/voice-lantern
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python voice_lantern.py --check-config
python voice_lantern.py --self-test
python voice_lantern.py
```

You will usually also need system packages for FFmpeg, Opus, and libsodium depending on the host.

## Environment

Required:

- `DISCORD_TOKEN`: bot token
- `AGENT_USER_IDS`: comma-separated Discord user IDs for agent accounts whose replies should be spoken aloud
- `HUMAN_USER_IDS`: comma-separated Discord user IDs whose voice is allowed to be transcribed

Optional:

- `TEXT_CHANNEL_ID`: pin the bridge to one Discord text channel
- `TTS_VOICE`: edge-tts voice name
- `WHISPER_MODEL`: `tiny.en`, `base.en`, `small.en`, or another faster-whisper model
- `SILENCE_FLUSH_SEC`: pause length that ends an utterance
- `MIN_UTTERANCE_SEC`: ignore tiny audio blips shorter than this
- `CHUNK_CHARS`: split long agent replies before TTS playback
- `TRANSCRIPT_PREFIX`: visible prefix for transcript messages
- `REQUIRE_CONSENT_ACK`: keep `true` for first live tests

## Commands

- `voice join`: join the caller's current voice channel
- `voice consent`: acknowledge consent for the current small test channel and begin transcription
- `voice hush`: pause transcription
- `voice feather`: pause transcription using the Hearthweave consent cue
- `voice listen`: resume transcription after consent
- `voice skip`: skip current spoken output
- `voice stop`: clear queued spoken output
- `voice test`: speak a tiny test phrase
- `voice status`: show connection/listening/consent state
- `voice leave`: disconnect and clear consent state

## Compatibility note

Discord voice receive libraries are moving quickly. If outbound TTS works but inbound speech does not arrive, check the upstream `discord.py` and `discord-ext-voice-recv` issue trackers before assuming this scaffold is wrong. Keep any version-specific receive fixes isolated and documented before bringing them into Flameclyffe.

## First live test

Use a tiny private channel, not a busy server room.

1. Run `python voice_lantern.py`.
2. Join a Discord voice channel yourself.
3. Type `voice join` in the paired text channel.
4. Type `voice test` and confirm TTS playback.
5. Type `voice consent`.
6. Say one short sentence and wait for the transcript.
7. Let the agent reply normally and confirm Voice Lantern reads it aloud.
8. Use `voice feather` to pause transcription.
9. Use `voice leave` when done.
