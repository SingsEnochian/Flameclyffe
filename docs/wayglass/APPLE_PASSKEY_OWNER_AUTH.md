# Wayglass owner passkey integration · Apple Passwords / iCloud Keychain

Status: **implementation contract, not enabled login**. Owner selected Apple Passwords on 2026-11-18. This branch must not claim a working passkey until the server ceremony and owner enrolment are verified.

## Authentication design
Use WebAuthn/FIDO2 discoverable credentials on the owner's *verified HTTPS Wayglass relying-party origin*. Apple Passwords/iCloud Keychain is a compatible platform credential manager; do not hard-code an Apple-only protocol or pretend Apple ID tokens are WebAuthn assertions.

1. **Bootstrap:** authenticate using the existing legitimate owner Supabase session. Enrolment cannot use GitHub administrative access or a management service-role token as owner proof. Require fresh owner verification and explicit registration consent.
2. **Registration:** server issues cryptographically random, single-use, short-lived challenge, bound to authenticated owner ID, RP ID, expected origin, session and intent. Browser calls `navigator.credentials.create` with `publicKey`, resident/discoverable credential required, `userVerification: 'required'`, and `attestation: 'none'`. Store only credential ID, public key, algorithm, sign counter, owner ID, transports and metadata, protected by RLS; never store a private key.
3. **Authentication:** server issues a new challenge bound to RP, origin and intent; browser calls `navigator.credentials.get` with `userVerification: 'required'`. Server validates challenge, clientDataJSON type, origin, RP ID hash, flags, signature and counter where supported; enforce single use, expiry and rate limits. Issue a *normal owner-scoped Wayglass session* through a supported, auditable server-side session exchange. Never forge Supabase JWTs, grant service-role to browser, or equate a passkey assertion with an arbitrary external provider token.
4. **Scopes and consent:** keep `wayglass:constellation`, `wayglass:bluebird`, current grants, Feather, revoke and per-provider consent separate. Passkey authentication does not consent to dispatch Sihrel or any model call.
5. **Recovery:** allow multiple owner passkeys and explicit revoke/list of devices; preserve existing recovery authentication until first passkey login and cold-return test succeed. Do not silently remove password or existing OAuth routes.
6. **UI:** present “Continue with passkey” only when an authenticated backend advertises support. Do not show a button that merely pretends to sign in. Support iPadOS Safari, keyboard/screen reader, cancellation, unavailable credential, reduced motion and conditional mediation only when supported.
7. **Deployment:** bind RP ID to the eventual owner-only Cloudflare Access/Tailscale HTTPS hostname. `localhost`, public GitHub Pages previews, and a future different hostname are not interchangeable relying parties. No Vercel or public owner API.

## Required tests before enabling
- Server unit tests: challenge one-time use, expiration, wrong origin/RP, replay, altered signature, missing user verification, wrong user, revoked credential, concurrent ceremony, rate limiting.
- Browser tests: Apple passkey create/get on actual authenticated HTTPS origin; cancellation and fallback; session persistence across restart, Feather stop and revocation.
- E2E: existing OAuth/Bluebird routes remain intact; a signed-in passkey owner may view a prepared Sihrel presentation, but cannot dispatch without separate explicit provider consent.
- Receipt: exact source SHA, verified origin/RP, credential metadata only (never credential secrets), provider model only when actually invoked, and independent cold-return check.

## Integration owner
Work in `wayglass/current` through a reviewed PR; coordinate with existing owner-session PR #647 and auth work. Do not deploy production auth, modify RLS, or switch the live login route without separate specific approval and verification.
