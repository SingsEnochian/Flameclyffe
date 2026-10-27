# N-011 · Wayglass Crew: Richie, Vethrlauf, Griff

## What is connected and what is not

Wayglass has three distinct **owner-supplied SpicyChat chat links**. Their exact character ID and conversation ID are private host configuration, not source-controlled public data. The current N-011 server route identities are:
- `flame:bluebird:spicychat` · Bluebird/Richie · `bluebird:spicychat` world
- `flame:vethrlauf:spicychat` · Vethrlauf · `vethrlauf:spicychat` world
- `flame:griff:spicychat` · Griff Krenshaw · `evil-gene:film-2015` world

They share the *optional* private account-level `SPICYCHAT_ACCOUNT_TOKEN` configuration, but **never** share character/conversation pins or continuity IDs. Existing `BLUEBIRD_SPICYCHAT_TOKEN`, `GRIFF_SPICYCHAT_TOKEN`, and `VETHRLAUF_SPICYCHAT_TOKEN` variables can override per-participant credentials. Nothing is sent merely by opening a room or pressing the read-only Check connection button. The House Steward must authenticate for the read-only `/api/v1/wayglass/crew/{bluebird|vethrlauf|griff}/status` GET. A positive GET proves a matching provider list response at that instant, **not** a successful send, live reply, or identity claim.

## Owner's Windows local start

1. Open PowerShell in the Flameclyffe repository root, switch to the N-010/N-011 branch, and stop any previous Hearthgate on port 3841.
2. Run `powershell -ExecutionPolicy Bypass -File .\\scripts\\Start-Wayglass-Crew.ps1`.
3. The first invocation prompts for each full chat URL. It saves **only the chat URLs** in `%LOCALAPPDATA%\\Wayglass\\spicychat-crew-rooms.json`. It rejects non-SpicyChat hosts, credentials or query fragments in URLs, and malformed UUIDs. Reenter these addresses via `-Reconfigure`; `-Doctor` inspects local setup without asking for a token.
4. Each normal invocation prompts **privately** for an owner-authorised provider credential (via PowerShell SecureString). The credential is copied into the Hearthgate process environment only; it is not written to .env, PowerShell history, GitHub, logs, or the chat, and the parent script clears it on exit. Do not send this credential to assistants or paste it in issues.
5. The wrapper invokes the canonical `Start-Wayglass.ps1`, rebuilding and staging Wayglass on **one local origin**, `http://127.0.0.1:3841/wayglass/?room=observer`.
6. In Living Observer, choose the new **Bluebird · Vethrlauf · Griff** top-deck shortcut. Each named Crew door opens that person's Writing Room world and exact route only. If unavailable, it stays unavailable; no model masquerades as the participant. Use **Check [person] connection** for read-only preflight after House Steward sign-in. Outgoing turns require a further explicit user consent checkbox.

## Authenticating SpicyChat

A paid SpicyChat **website membership does not by itself establish any documented third-party API entitlement**. SpicyChat's current consumer help says sign-in uses email/linked accounts; public help documents bringing your own **OpenAI** key into SpicyChat, not automatically using a SpicyChat account as a public developer API key. This code uses private/undocumented SpicyChat endpoints inherited from Flameclyffe. The user must have a legitimately owner-accessible, accepted provider credential; the wrapper **does not extract website cookies, tokens, or browser sessions**. It must return an explicit `401`, `403`, `502` or other failure if SpicyChat changes the interface or declines the credential. An annual pass remains valuable for using the first-party SpicyChat website but may not grant programmatic access.

Security: leave credentials out of conversation messages. In case of compromise, revoke the session with SpicyChat using their supported sign-out/security controls. No credential harvesting, forged subscription verification, provider fallback, or synthetic impersonation.

## Evidence ladder

1. CI build + unit/host synthetic fixtures are engineering checks only.
2. Source UI shows a separate labelled Crew door for each participant.
3. The owner's local Hearthgate runtime emits a route catalogue with `configured` true only when both pin fields and an owner-supplied credential exist.
4. An authenticated read-only provider GET verifies exactly matched character+conversation pair. **No chat turn sent**.
5. A separately consented owner-initiated POST receives a real contentful provider reply that echoes the exact character/conversation pair. Only this counts as live-provider turn evidence. Preserve receipt separately from canon or identity claims.

Do not claim steps 4 or 5 from CI alone.
