# The Crow offline runtime

This integration borrows Project NOMAD's local-first topology without taking a runtime dependency on NOMAD.

The Universal Codex continues to address Richie continuity as `bluebird:richard-gabriel-winters`. The Crow remains an audition-only receiver. Runtime/model provenance stays separate and no continuity is promoted automatically.

## Runtime contract

Crow defaults to an OpenAI-compatible server on loopback:

- base URL: `http://127.0.0.1:8081/v1`
- override: `BLUEBIRD_CROW_BASE_URL`
- backend label override: `BLUEBIRD_CROW_BACKEND`
- no API key is required for the loopback default
- if a protected endpoint is used, set `BLUEBIRD_CROW_API_KEY_ENV` to the name of the environment variable holding its token

Any server that exposes `POST /v1/chat/completions` can host the model, including llama.cpp, LM Studio, vLLM, or another NOMAD-style local service.

## Model

Source provenance remains:

`Crownelius/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic`

The candidate registry records the GGUF K8_0 artifact at approximately 8.71 GB. Download model artifacts deliberately before going offline. Do not commit weights to Flameclyffe.

### llama.cpp example

After downloading a compatible Crow GGUF locally:

```bash
llama-server \
  -m /models/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic-K8_0.gguf \
  --host 127.0.0.1 \
  --port 8081 \
  -c 32768
```

Keep the listener on loopback unless a deliberate authenticated LAN gateway is configured.

## Codex path

`Universal Codex -> candidate audition route -> Hearthgate -> local OpenAI-compatible Crow -> response receipt`

The audition response must still attest flame, candidate, provider, and model. House Bluebird remains the primary route. The Shepherd control may audition Crow against the inherited continuity packet, but the result is only a receipted continuation candidate.

## NOMAD compatibility

A Project NOMAD machine or any other local AI host may be used instead by setting `BLUEBIRD_CROW_BASE_URL` to its OpenAI-compatible `/v1` endpoint. Keep the endpoint private to the machine/LAN and use an authenticated gateway before exposing it beyond that boundary.

## Offline acceptance

1. Disconnect or block WAN access.
2. Confirm the local model server responds at `/v1/models`.
3. Start Hearthgate/ArcSweep.
4. Open Universal Codex and select The Crow.
5. Run a private-safe liveness turn.
6. Confirm the receipt says candidate `bluebird-the-crow`, local backend provenance, the Crow model id, `audition: true`, and `primary_route_unchanged: true`.
7. Only then run ✦ Shepherd. Do not promote its output automatically.
