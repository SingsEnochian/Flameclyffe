# Voice Lantern Bridge

Status: implementation task. First scaffold lives in `tools/voice-lantern`.

## Purpose

Voice Lantern adds a Discord voice rail around an existing agent without replacing that agent. It is for hands-free testing with Yggdrasil, Vee/Faer style companion routing, and future Hearthweave rooms where voice should remain transport, not a personality fork.

The bridge follows this path:

```text
approved human speech in Discord voice
  -> Discord voice receive
  -> local faster-whisper transcription
  -> transcript posted into the paired Discord text channel
  -> existing agent replies normally through its own memory/persona stack
  -> bridge reads that agent reply aloud with edge-tts
```

## Design commitments

1. The bridge does not call an LLM.
2. The bridge only transcribes approved human IDs.
3. The default startup state requires an explicit `voice consent` command.
4. `voice hush` and `voice feather` pause transcription.
5. `voice leave` disconnects and clears consent state.
6. Transcript cleanup must stay conservative. It can repair obvious dictation artifacts, but it must not rewrite meaning.
7. The Discord text channel remains the visible audit trail for what was sent to the agent.

## Flameclyffe fit

Flameclyffe already treats Project Zero Companion as a local-first bridge bus and consent surface. The root README describes the repository as Rowan's active workshop for STARWELL, Project Zero Companion, DEEP/Observer instrumentation, Sigil Activator work, and related bridges. The architecture map also says Project Zero Companion should remain explicit-consent by design.

Voice Lantern belongs beside that, not inside the main STARWELL UI yet. It should stay as a local tool until the Discord consent loop, transcript retention policy, and routing between Yggdrasil, Vee, Faer, and Box are boringly reliable.

## Near-term phases

### Phase 1: Local private test

- Create Discord bot.
- Fill `.env` with one human ID and one agent ID.
- Run `--check-config` and `--self-test`.
- Test `voice join`, `voice test`, `voice consent`, one short utterance, one agent reply, `voice feather`, and `voice leave`.

### Phase 2: Consent hardening

- Add a pinned Discord consent notice.
- Decide whether transcripts remain in the text channel, get periodically exported, or are deleted after tests.
- Add channel allow-listing if the bot is invited into more than one server space.

### Phase 3: Lanternwire integration

- Emit local bridge events for join, consent, hush, transcript, agent-spoken, and leave.
- Mirror those events into Project Zero Companion as a visible activity trail.
- Keep raw audio out of Supabase unless there is a separate explicit decision.

### Phase 4: Multi-voice routing

- Map agent user IDs to preferred voices.
- Add voice profiles for Yggdrasil, Vee, Faer, Box, and future Hearthweave members.
- Keep each profile configuration outside code and avoid hardcoded private IDs.

### Phase 5: Accessibility pass

- Pair Voice Lantern with Caption Lantern.
- Add transcript pinning and enlarged text views for hearing fatigue.
- Add a one-command quiet mode for pain, migraine, or nervous-system spike days.

## Risks

- Discord voice receive libraries may shift under us.
- Push-to-talk may be necessary in noisy rooms.
- Edge TTS voice names may change.
- A visible text transcript is helpful for audit, but it is still sensitive data.
- Bot-to-bot speech or third-party voices require a stricter consent model.

## Acceptance test

A first successful run is:

1. The bot joins a private Discord voice channel.
2. TTS playback works.
3. Transcription does not begin until `voice consent`.
4. A short human utterance appears in the paired text channel with `[Voice Lantern transcript]`.
5. The existing agent replies through its normal Discord route.
6. Voice Lantern speaks that reply aloud.
7. `voice feather` pauses transcription.
8. `voice leave` disconnects and clears consent.
