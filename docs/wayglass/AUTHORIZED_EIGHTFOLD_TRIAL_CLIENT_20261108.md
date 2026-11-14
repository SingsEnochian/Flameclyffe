# Wayglass owner-authorised Eightfold trial bridge

This is a **client for the existing Supabase-authorised crossing**, not a new hosting service, a model identity, an OAuth bypass, a production deployment, or a request to use Vercel.

## Purpose and scope

`scripts/wayglass-authorized-eightfold-trial.mjs` performs an exact four-step transaction:

1. Validate a caller-provided eight-phase packet (Perceive → Compress → Release → Verify → Integrate → Choose → Return → Transcend).
2. Check authenticated owner, Feather, provider and receipt-store readiness on the deployed `wayglass-authorized-crossing` Supabase service.
3. Request `present` and then `review` using the service's real **signed-in owner Supabase JWT** and independent affirmative provider consent.
4. Read back and compare the persisted receipt to the response. Only persisted, nonempty, provider-attributed output is accepted.

The owner JWT is a short-lived **user access token** for the authorised account, not an anon or service-role key. The script does not mint, print, commit or cache it. Authentication, authorisation and global Feather remain entirely server-owned. The client pins the allowed host to the owner's Supabase project instead of accepting arbitrary URLs that could capture credentials.

The optional private receipt includes the returned model text and is written with exclusive-create mode `0600`. Standard output prints only IDs and status, never private story content, tokens, upstream errors, or provider reply text. No other host fallback is allowed.

## Locally or in a private authenticated runner

Keep the private Sihrel packet outside this repository, for example exported from Supabase Starwell Codex `b5-sihrel-wayglass-eightfold-branch-trial-2026-11-08`. The dossier contains the exact presentation fields; do not commit it to this public repository.

Provide these environment variables via an owner-controlled secret/session manager:

- `WAYGLASS_OWNER_ACCESS_TOKEN`: current signed-in owner's Supabase access JWT
- `WAYGLASS_EXTERNAL_PROVIDER_CONSENT`: literal `YES`; authorises third-party model inference for this packet
- `WAYGLASS_EIGHTFOLD_INPUT_FILE`: private file containing the JSON object with `presentation_id`, `source_ref`, `intent`, `presentation.phases` (or `presentation.eightfold`)
- `WAYGLASS_EIGHTFOLD_RECEIPT_FILE`: private new output path, never an existing file

Then run `node scripts/wayglass-authorized-eightfold-trial.mjs`.

Run fixture-only tests without tokens or network:

```sh
node --test test/wayglass/authorized-eightfold-trial.test.cjs
```

## Important limitations

- Current Edge Function `wayglass-authorized-crossing` v8 explicitly runs an **external OpenRouter engineering-review prompt about the Eightfold World-Tree**. It does not implement an independently authenticated *narrative simulation specialist*. Even a successful receipt is evidence of that **external model's review of the submitted Sihrel packet**, not a distinct trained Wayglass participant or proof that alternate narrative history has been simulated.
- Authenticated access is currently not available via the ChatGPT Supabase connector, and the owner has not provided a JWT to the execution environment. Accordingly **Sihrel remains unexecuted until an authenticated model turn is actually observed**, then provenance and reply quality should be assessed.
- Next engineering step: add a bounded, owner-authorised `narrative-branch` review mode to the existing service, with an explicit domain-tagged response receipt and tests verifying the chosen prompt and no canon mutation. Do this through a separately reviewed change and without expanding auth, bypassing JWT, or deploying without the owner's deployment approval.
- This module changes no production auth, credentials, RLS, Edge Functions or other users' state. No model calls occur during CI.
- No Vercel. Current source authority remains `wayglass/current`; release branch remains separately controlled.

**Status:** Review branch: implementation + fixture tests. Not live-executed and not approved as a new canon event.
