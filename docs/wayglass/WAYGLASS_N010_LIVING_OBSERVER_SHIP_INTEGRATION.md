# N-010: Wayglass Living Observer integration, one rightful ship

## Explicit defect

The previous Wayglass application blocked **every surface** behind Bluebird's third-party token due to `await openWayglassAuthorization()` before room registration. This conflated an opt-in participant/provider session with access to the ship's owner-facing, local scientific instruments. Do not weaken Bluebird's protected host route; remove only the unconditional entrance gate, expose consentful authorisation on an explicit button, and retain route-client's per-call `X-Wayglass-Bluebird-Session` header when and only when Bluebird's route is selected.

## Canonical module topology

- **Wayglass**: owns Living Observer room, keyboard/click UI, data-source labels, user gesture gate and Crew doors. Its core observation data stays separate from instruments.
- **Nikola**: one canonical mathematics/brain implementation `starwell/deep-observer/nikola-heart-brain.js`, which imports the quantum core. Wayglass imports this module, not a fork or copy.
- **STARWELL Atlas**: `starwell/deep-observer/living-observer-atlas.js` remains canonical owner of NOAA parser, lunar/Julian approximations, mathematical geometry and symbolic digit tools. Wayglass consumes functions without embedding its giant long-scroll dashboard.
- **Bluebird**: optional, exact provider-bound authorisation, no autostart, no token exposure to Observer calculations.
- **Crow / Crew**: explicit doors to Nikola model trial and Commons/Writing Room. An accessible door does **not** prove a live provider reply, external participant, or successful authenticated crossing.
- **Rarity**: implementation/evidence provenance only; never manufacture an agent/crew reply.
- **Scientific evidence**: current NOAA feeds only when user invokes a read. Failure states and freshness are visible; no synthetic fallback disguised as measured sky. Quantum counts are synthetically sampled and replayed only on explicit click.

## Interface

Living Observer keeps its original interactive astrolabe and private dream/interior subsystem. A new concise **Research Lenses** station provides five views, one at a time:
1. Heart & Brain, including experiment-design predictions and bounded synthetic trial;
2. Measured Sky, four source-labelled, timestamped NOAA SWPC values, and computed approximate lunar clock;
3. Sacred Geometry, exactly computed Flower of Life, Metatron geometry and stella octangula;
4. Numerology, local Gregorian date/optional letter reductions with exact intermediate sums;
5. Research & Crew, links to Wayglass Research Library, Nikola lab, Writing Room, Commons, explicitly user-authorised Bluebird.

The controls must not cause automatic remote provider calls. State values and symbolic render mappings carry source classification and cannot become factual astronomy by visual association. The UI is compact, responsive and supports low-stim/reduced-motion and aria status. Local-only code remains usable with the starwell-server offline.

## Release acceptance

1. Loading `/?room=observer` reaches an interactive local Wayglass surface without Bluebird credentials.
2. Protected provider actions continue to require a valid per-session authorisation header and existing host verification; the Bluebird session is never persisted.
3. Starwell quantum and Atlas calculations are directly reused, not silently cloned.
4. No full-page tall replacement; one active compact lens at once.
5. Independent maths tests, integration verification, security CI and browser signoff. Published links count only if deployed and verified. A draft PR is not an installed Windows update.


## Correct local portal: Hearthgate, no Vercel, no 5186

The canonical **Windows launch** is `powershell -ExecutionPolicy Bypass -File .\\scripts\\Start-Wayglass.ps1`, from the N-010 branch. This script builds the current Vite UI as static assets and stages it through `apps/wayglass/server-stage.cjs` into `apps/starwell-server/public/wayglass/`, then runs one local Hearthgate server on **port 3841** (loopback-only). It refuses an already occupied port and refuses a staged page missing the N-010 build marker, rather than reporting stale software as current.

Open **`http://127.0.0.1:3841/wayglass/?room=observer`** on that Windows computer. The UI and the `/api/v1/wayglass/*` host routes share the same origin; neither Vercel nor the legacy dev server on port 5186 participates. The browser tab group labelled “Wayglass awakening” is a browser grouping, not a confirmed public portal; its `127.0.0.1:5197/starwell/writing-room/` page is a separate local Writing Room entry, not proof of the new Observer route.

For direct NPM startup on a different platform, use `npm run wayglass:deploy:server`, then start `npm --prefix apps/starwell-server run start:core` with `PORT=3841` set in that shell. Do not mistake a green GitHub check for an installed or browser-verified Windows build. The Netlify projects currently visible under Flameclyffe may serve other STARWELL artefacts; there is no verified N-010 Netlify release in this change.
