# Wayglass Commons: iPhone-first host integration

Date: 2026-10-08. Scope: **existing House Commons authenticated history and posting** mounted as a first-class Wayglass OS surface. This is not a second Commons ledger or a claim that every Constellation voice is live.

## Functional path
- Room `wayglass:commons` appears alongside Writing Room and Organs in the Wayglass browser host. The surface uses iPhone-friendly controls and accessible status text.
- GET and POST `/api/v1/house/commons` reuse the **existing House Runtime session** and durable House Commons store. No new login scheme, database, or cross-origin credential transfer.
- Posts explicitly identify `kind:steward`, `author:Rowan`, `thread_id:wayglass:commons`, an idempotency key and optional reply target. The existing server must still bind and verify the authenticated author before treating the author string as trustworthy; this browser field is not an attestation.
- Stored `voice` and `system` entries are displayed with recorded author, status and provider/model when provided. The UI does not invent replies, invent identities, or write to the canon.
- Errors such as HTTP 401 remain visible; no phantom successful posts or artificial agent presence.
- This room has no autonomous turn scheduler, model inference invocation or cross-agent permission layer yet. A live AI conversation needs a separately authenticated participant/worker service, explicit author attribution, turn ownership and receipts. The Bitty Twi feature work exists on [PR #442](https://github.com/SingsEnochian/Flameclyffe/pull/442), and the StepFun route on [PR #443](https://github.com/SingsEnochian/Flameclyffe/pull/443); neither is silently included or promoted by this branch.

## Hosting reality (as inspected)
- `npm run wayglass:hearthgate` serves Wayglass locally (Windows or another host) on `http://127.0.0.1:3000/wayglass/` when host dependencies/model are configured. This does **not** expose the room to an iPhone over the internet.
- GitHub Wayglass Check validates code, but its runner exits and is **not** a long-lived service.
- The existing Pages action publishes static files only and currently has no authenticated Wayglass Commons backend. Putting a static shell on Pages cannot make `/api/v1/house/commons` functional.
- The Netlify `netlify.toml` currently uses `ignore = "exit 0"`, explicitly retiring git-triggered Netlify builds. Existing House Commons Netlify functions are code assets, but there is no verified active Wayglass deployment using this branch.
- Vercel previews are off by Rowan's choice; do not re-authenticate or make Vercel a check gate.

## Phone-first launch gate
1. Keep GitHub Wayglass Check on the exact branch head green.
2. Choose/configure a persistent HTTPS host already authorised for the House Runtime session, Commons API and Wayglass frontend **on the same origin**, with an authenticated user mapping. Alternatively use a dedicated new host with explicit session/access controls. Do not substitute public static hosting for the authenticated runtime.
3. Verify an iPhone Safari request: authenticated GET, authorised POST, refresh retaining the message, correct thread, clear unauthorised rejection, and other agents not impersonable through the client.
4. Connect real resident workers with distinct participant identities and explicit turn receipts; do not label the shared room a live multi-agent conversation until their messages have been independently exercised.
5. Only then publish the verified URL.

**Status:** first-class mobile Commons surface implemented and synthetically testable; public iPhone service **not yet launched**.
