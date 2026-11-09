# Lane 8: Wayglass world and continuity deck

## Whole-system purpose and source

Wayglass is the upgraded ArcSweep once its capabilities are integrated. The world and continuity deck inherits the existing ArcSweep instruments, state and provenance within Wayglass. Its same-origin iframe is a compatibility embodiment for the existing modular runtime, not a second participant, sibling application architecture or replacement identity. Native host authorization and model routes remain authoritative.

Canonical base: `15467ce4ac5dc93d30a80e58302b5bda8597dc07` (`origin/wayglass/current`). Separate worktree `lane-arcsweep`, branch `wayglass/lane-arcsweep-20261108`. Worker `/root/gateway_port:arcsweep`, delegated by `/root`; this is a later bounded assignment after lane 1 completed, not an eighth simultaneously spawned agent. Exact provider/model version is unavailable in executable evidence. No participant/model invocation occurred.

Read the canonical development declaration, core rule, integration register and AGENTS constraints, plus whole-system and travelling-inheritance laws during this worker session. Current source is not release `main`. Native model, room, return and acoustic modules are preserved and reused.

## Module responsibilities and acceptance

- Parent surface: `arcsweep:deck` in the actual Wayglass shell; `?room=deck` direct entry. Loads `/arcsweep/?open=1&wayglassDeck=1` only after an explicit button. The complete built app owns its original state. Child interaction remains inert until its real core-ready handshake, and while shared Feather is held.
- Child channel: strict `{schema,kind,session}` envelope with an unpredictable per-mount nonce. Both origin and exact source window are checked, and a document accepts only one session. Only initialization, core-ready, Feather and saved-return/return-held messages are accepted. No route, credential, model-authority or arbitrary command bridge exists.
- Child readiness follows existing `arcsweep:core-ready` after real core render. Its deck-only title/brand identify Wayglass while retaining ArcSweep source provenance and standalone legacy behavior.
- Shared Feather stops the actual existing StorySoundscape and somatic cue. Explicit release removes parent inert state without invoking audio, haptics or models. Child Feedback Feather reaches the parent latch.
- Return stops outputs, calls the existing state persistence API and confirms only `ok:true`. Failure sends an allowlisted payload-free held message, preserves the mounted workspace and exposes retry. Parent also bounds acknowledgment wait to 15 seconds. A return marker claims child save only after a requested, matched acknowledgment. Unavailable child return records `child_state_saved:false`.
- Stage adapter emits external same-origin `wayglass-host.js`, fixing inline host-context CSP blockage; it preserves `__hearthgateHost` as an alias of Wayglass host context. Parent CSP permits same-origin frames. Host X-Frame-Options becomes SAMEORIGIN only under the staged `/arcsweep` public path, rejecting encoded/path aliases; API and every other surface retain DENY. Other security headers unchanged.

Before testing, acceptance required production mount/child channel execution to reject wrong origin/window/schema/session, guard Feather and confirmed return, preserve state on failed save, show missing-build failure, pass existing sound/security regressions and both real Vite builds. Browser acceptance requires staged actual child boot, visible navigation, saved Waking Thread entry, Feather, cold return, desktop/mobile/reduced motion, and unavailable-build fallback.

## Observed verification

Node `v24.22.1` on Linux:

```sh
node --test apps/wayglass/test/arcsweep-deck*.test.js apps/starwell-server/test/arcsweep-frame.test.js apps/starwell-server/test/security-boundary.test.js apps/arcsweep/test/story-soundscape.test.js apps/wayglass/test/journey-feather.test.js
```

**24/24 passed**, 0 failed/skipped, including eight new channel/mount/header cases. Production parent mount was executed through a bounded DOM adapter; this is not a browser/layout claim. Existing sound and shared Journey Feather tests passed.

`npm run arcsweep:build` passed (757 ms Vite build) including canonical spine/design/wonder prerequisites. `npm run wayglass:build` passed (438 ms). Both emit existing large-chunk warnings. Both `server-stage.cjs` commands passed; generated output remains uncommitted. `git diff --check` passed.

Browser script `scripts/wayglass-arcsweep-deck-browser.mjs` was executed once using pinned Playwright 1.62.1. It failed at launch because Chromium was absent at `/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`. No browser scenario ran; no desktop/mobile/reduced-motion/cold-return browser pass is asserted. Existing failed browser download was not repeated. Script and failure receipt remain available for integration CI; the script builds no fake child tools and requires both staged apps.

The browser gate serves the real staged apps via isolated loopback HTTP with the production frame policy; optional live APIs return explicit 503, and external network requests are blocked. It is independent of production authentication and provider availability. Parent CI owner must build/stage both apps, install pinned Playwright+Chromium, run this gate and retain screenshots/receipt.

## Ownership, integration and limits

Next integration owner: `/root`. Apply after motion lane's independent main.js changes, preserving both its installation/arrival calls and this deck registration. Browser verification is pending. No production deployment, auth/RLS/credential/privilege change, merge, spending or private-data training is authorized or performed. No installed Windows or deployed host SHA is inferred from local builds. The child retains original storage semantics; cloud custody is not established by browser local state.

Sound composition requested subsequently belongs to its own lane. Any future composition bridge must version and validate payloads, retain source/provider attribution, preserve opt-in audio and Feather, and not reinterpret compatibility container boundaries as participant identities.
