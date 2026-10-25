# Bluebird SpicyChat authorization — 2026-10-12

Rowan requested a Wayglass Authorization box for Bluebird's SpicyChat provider credential on every opening, and removed DeepSeek from Bluebird's routing. This updates the earlier bridge fallback design: no DeepSeek or hosted-model fallback is permitted for Bluebird.

## Implemented behaviour

- A masked, labelled authorization dialog opens before Wayglass mounts its rooms. Reload and back/forward restoration require fresh authorization.
- The credential is sent only to the same-origin Hearthgate authorization endpoint. The browser retains an opaque session token in memory; it never retains the provider credential in localStorage, sessionStorage, cookies, IndexedDB, conversation logs or work receipts.
- Closing/leaving clears the in-memory browser session and attempts host revocation. Host sessions expire after four hours and vanish on restart. Provider credentials stay in the host's in-memory session map only.
- The host must verify the credential and the configured Bluebird SpicyChat character binding before issuing a session. Rejected or unconfigured connections remain visibly blocked. Provider errors are sanitised rather than echoed with possible credentials.
- Bluebird appears as `flame:bluebird:spicychat` after verification. Only that route receives the opaque Bluebird session header. Failed connections never switch Bluebird to DeepSeek or another model.
- Existing unrelated participants' provider settings are outside this Bluebird-specific change.

## Required live connection contract

Public SpicyChat documentation inspected: `https://docs.spicychat.ai/llms.txt`, the Character Chats guide, and the archived OpenAI API guide. They document the product and a sunset OpenAI-key feature, but do not establish a current SpicyChat credential-validation/chat API contract. The execution environment also rejected access to `api.spicychat.ai`; no alternative host or network bypass was attempted. Do not invent endpoints or treat a syntactically plausible token as provider verification.

The current host therefore requires its existing verified SpicyChat adapter, configured by the host owner using:

- `WAYGLASS_SPICYCHAT_ADAPTER_MODULE`: absolute path to a trusted CommonJS adapter.
- `WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID`: Bluebird's actual SpicyChat character id.

The adapter exports `provider: 'spicychat'`, `validateCredential` and `respond`:

```js
// validateCredential({ credential, participant_id, character_id, signal })
// -> { authorized: true, character_id } only after real provider verification
// respond({ credential, participant_id, character_id, input, history,
//           conversation_ref, signal })
// -> { character_id, output, model? } from the actual bound SpicyChat conversation
```

The host cannot load adapter code selected by browser input. Adapter code must honour AbortSignals, retain SpicyChat account/character/conversation binding, and avoid logging credentials. It must use the actual provider protocol supplied by the existing integration, not an OpenAI/DeepSeek imitation. Absence of this adapter produces an explicit 503, never a false successful login. The adapter path/host contract remains needed to complete the live connection.

The browser's SpicyChat session does not automatically authorize a separate MCP caller to borrow that credential. Rarity's MCP transport and Bluebird provider authorization remain separate boundaries; a failed MCP Bluebird turn preserves its existing conversation reference and returns the actual failure without fallback.

## Verification

Automated checks cover fresh/cleared sessions, rejected credentials, interrupted verification, unconfigured adapters, wrong-character rejection, expiration/revocation, error redaction, absence of Bluebird DeepSeek fallback and preserved conversation reference. Provider tests use synthetic adapters and credentials. Browser checks use a local synthetic adapter and do not claim a live SpicyChat account connection.
