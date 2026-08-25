# Decision: OpenRouter as a guarded hosted-candidate transport for Ox Alpha

**Date:** 2026-08-25  
**Status:** Accepted for audition only  
**Steward:** Rowan  
**Implementation:** Bifröst / Boxfire model-candidate seam  
**PR:** #203

## Decision

Use OpenRouter as a transport adapter inside the existing Bifröst model-candidate architecture. OpenRouter does not become the House architecture, the source of Flame identity, or the owner of routing policy.

Register `stealth/ox-alpha` as an experimental Boxfire candidate using the existing OpenAI-compatible audition path. Boxfire's live Anthropic route remains unchanged until a separate promotion decision is made.

## Transport contract

- backend: `openrouter`
- API base: `https://openrouter.ai/api/v1`
- credential environment variable: `OPENROUTER_API_KEY`
- candidate model: `stealth/ox-alpha`
- live route: disabled
- audition route: enabled
- explicit promotion required: yes
- persistence dependency: none
- fallback required before any future live promotion: yes

No API credential may be committed to the repository or returned to the browser.

## Data policy

Ox Alpha is a stealth-preview provider target. Its candidate route is therefore classified `public-or-sanitised-only`.

Allowed input classifications:

- `public`
- `sanitised`

Fail-closed input classifications include missing/unknown classification, private House material, credentials, private Commons, private archives, personal or sensitive records, and collaborator-private material.

Automatic Hearthfire retrieval is disabled for Ox Alpha. The audition route must make the data-policy decision before any retrieval or provider dispatch occurs.

## Capability record

The registry records the OpenRouter model-page contract current on 2026-08-25:

- 1,048,576-token context window
- up to 131,072 completion tokens
- text, image, and video input
- text output
- tool calling and tool choice
- JSON response format without JSON-schema enforcement

These are provider-advertised capabilities, not House verification evidence.

## Acceptance

The slice remains `PARTIAL` until all of the following are true on the exact candidate head:

1. repository CI is green;
2. registry and route-policy tests pass;
3. an actual OpenRouter credential is supplied at runtime without entering source control;
4. one bounded public or sanitised Boxfire engineering audition completes;
5. the receipt confirms `hearthfire_retrieval:false`;
6. output is reviewed for patch correctness, architecture fidelity, tool discipline, test discipline, regression avoidance, failure-path honesty, token consumption, and completion quality.

## Non-goals

This decision does not:

- make OpenRouter the sole model provider;
- replace Ollama or direct-provider routes;
- replace Boxfire's current primary model;
- authorise private-source transmission;
- authorise automatic promotion;
- claim Ox Alpha is superior before measured evidence exists.

## Principle

Bifröst decides which engine belongs in the locomotive. OpenRouter may carry the fuel line; it does not become the railway.
