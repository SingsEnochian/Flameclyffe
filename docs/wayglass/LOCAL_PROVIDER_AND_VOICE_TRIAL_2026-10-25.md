# Wayglass: local inference and voice trial boundary

25 October 2026. Research-to-execution note; no provider installation or voice credentials.

## Executable local-readiness step

`scripts/wayglass-local-provider-readiness.mjs` is a separate Node 24 opt-in probe. By default it prints a dry-run explanation. With `--probe` it only GETs Ollama's fixed loopback `/api/tags` on 127.0.0.1:11434 and LocalAI's OpenAI-compatible `/v1/models` on 127.0.0.1:8080. Redirects are blocked, requests have a three-second timeout, errors are redacted and no credentials, prompts or audio are supplied. The result reports model-catalogue reachability, NOT model function, compatibility, RAM, VRAM, GPU allocation, browser audio or host connection. A missing LocalAI response is not an installation failure; the service might not be installed or listen on a different port. No service starts automatically.

Run: `node scripts/wayglass-local-provider-readiness.mjs --probe` on the Windows machine actually hosting the services. Do not run from a remote CI runner and call it proof of the Windows machine.

## Inference benchmark after local signoff

Only after a responsive catalogue: choose one Ollama model and one suitable LocalAI model, use exactly the same synthetic prompt, cap token budget, record total time and first-token delay from actual streamed responses, measure separate GPU/CPU memory counters at the host, confirm stop behaviour, and compare tool-call syntax. No private manuscript, participant history or revoked-memory content in the benchmark. Any LocalAI install must be separately authorised and include the current 4.12.1 URL-handling security fix before allowing rich media URLs.

## Voxtral 3 / Wayglass voice experiment

Mistral released Voxtral 3 and a managed Voice Agents SDK on 20 October 2026. Their managed Voice Agents service operates STT, LLM and TTS as a complete pipeline, so it is NOT equivalent to preserving the existing user-selected Crow/Wayglass language-model substrate. For Wayglass, prefer separate, replaceable realtime transcription and speech synthesis stages behind the existing `apps/wayglass/src/voice-boundary.js` session/consent API, not a replacement persona.

Existing voice-boundary rules: explicit participant+room consent, bounded Uint8Array audio chunks, unreviewed transcription observations, no recording persistence or canon, immediate Feather/Icarus revocation before closing device/transport. Retain captions and accessible keyboard alternatives. Mistral credentials belong to a host service, never the browser. Verify current model IDs, session minting, pricing, retention and API data-handling terms for this account before any live call; no API key or microphone permission is present in this PR.

First trial: inject synthetic PCM audio into a mock transport; verify participant/room consent, labelled transcript provenance, interruption and Feather. Next, with explicit user operation and a configured credential, open one live authenticated transcription session using NONPRIVATE sample speech. Independently check actual Windows/Osia output; a browser rendered waveform is not device proof. Do not automatically enable capture, import Constellation content, or grant model-generated text signature authority.

Official docs (as of 25 October 2026): https://docs.mistral.ai/studio/audio/voice-agents/overview ; https://docs.mistral.ai/studio/audio/voice-agents/browser ; https://docs.mistral.ai/studio/audio/speech-to-text/transcribe-in-realtime ; https://github.com/mudler/LocalAI/releases

## Known absence

This draft adds the local model-readiness probe and tests only. It does NOT install LocalAI, benchmark model generation, wire Voxtral to Wayglass, obtain voice credentials, prove microphone capture, or calibrate Osia.
