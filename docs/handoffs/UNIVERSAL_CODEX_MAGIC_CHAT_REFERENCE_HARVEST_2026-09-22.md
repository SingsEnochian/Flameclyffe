# Universal Codex Magic Chat reference harvest

**Date:** 2026-09-22

## Sources inspected

### Nova — Cyberpunk AI Chatbot

Source: `dragonpilee/Nova---Cyberpunk-AI-Chatbot`  
License: MIT (copyright Alan Cyril, 2025)

Useful mechanisms, not aesthetic copying:

- resident identity is visually persistent in the chat surface;
- user and AI turns are strongly distinguished;
- conversation auto-scrolls to the newest reply;
- the composer remains simple and responsive;
- the chat surface is allowed to feel like an environment rather than a generic form.

The Universal Codex does **not** adopt Nova's cyberpunk visual language. Its useful lesson is that the resident's identity should be legible at every conversational turn.

### Blink cyberpunk multimodal ChatGPT reference build

Public showcase: `cyberpunk-multimodal-chatgpt-ccezgyio`

Useful product ideas:

- text and image model selection;
- file attachment/read support;
- session memory with bounded/pruned context;
- chat management;
- user/avatar and AI naming;
- code copy/share affordances;
- image generation and cached media;
- multimodal input while preserving one conversation surface.

The Codex translates these into resident continuity rather than a generic multi-model dashboard.

## Harvest applied in PR #375

`codex-magic-chat-multimodal-sidecar.js` adds the first portable layer:

- text/code/document attachments are read into a bounded attachment context;
- images can be attached but are explicitly represented as metadata until a true multimodal receiver is connected;
- attachment chips can be removed before send;
- the last resident reply can be copied;
- the whole resident thread/context can be exported as JSON;
- the UI exposes the resident thread window so pruning is visible instead of hidden;
- all of this speaks through `globalThis.__arcsweepCodexResident`, keeping the Magic Chat UI independent of whichever model process is invoked for a turn.

## Next harvest

1. Add a true multimodal Bluebird/Qwen receiver so image attachments become inspectable content rather than metadata.
2. Add receiver selection that changes the runtime while keeping one Richie continuity address and thread.
3. Add code-block parsing with per-block copy actions.
4. Add image-generation cards that send directly into the existing Codex Generator Atelier and return receipts into Magic Chat.
5. Back the browser continuity vessel with durable SQLite/Supabase storage while preserving the same resident contract.
