# Wayglass · FAEpunk Living Ship · First Touch
**Design/implementation:** 2026-11-13 integration branch, PR #623  
**Source:** Native Wayglass (not a standalone faux preview)  
**Ship role:** Living Watercolour is the first interface, the five-locus helm is the passage network, Wyrdrune is the native execution language.

## Visual grammar

The FAEpunk aesthetic is **dark opaline glass**, moss, oxidised copper, labradorite and watercolour pigment illuminated from inside. The existing living fluid canvas remains a *functional surface*, not a screenshot. A tactile opal orb is positioned inside the field, with two modes, **Soothe** and **Bloom**, connected to Wyrdrune's repair and expansion programmes respectively. On iPad and small screens, the five-locus navigation becomes a floating lower dock with 44 px-or-larger control targets, safe-area spacing and a persistent Feather control above. Desktop retains the wide paper + workbench layout.

The background is CSS geometry and gradients; no remote stock image, external font, media autoplay or unnecessary network request. Motion reacts to touches, not invented internal states. The field's visual events are provenance-bearing. The paper is dark by default but the owner can switch to bright paper; real Chromium tests exercise both.

## Interaction contract

1. **Enter:** Watercolour opens without model-provider login. Painting responds immediately to pointer/Pencil/mouse/touch and to keyboard canvas arrows/Enter.
2. **Touch the Wyrdrune orb:** `#wc-first-touch` sends an *explicit* user gesture to `/api/v1/wayglass/wyrdrune/first-touch`, selecting `repair` or `expand` and bounded touch intensity. If no authenticated House Steward session is present, the existing server gate denies the request.
3. **Reciprocal simulation:** The host creates a **labelled synthetic fixture**, not a live observation. Wyrdrune executes the paired infrastructure/intelligence transformations and verifies the proposed trial. The Wyrdrune Mythience membrane contributes a separate fictional relationship/consent record. The tensor engine computes true numerical deltas on the supplied fixture. The Autopoietic Runtime anchors the shared Eightfold cycle, and the Observer retains source states, including `unavailable`.
4. **Return:** The original Wayglass Return verifier accepts or declines the immutable context and source references. A successful host response is transformed by `first-touch-client.js` into a `fold:witness` event on the **existing** watercolour activity bus, so the same fluid canvas acquires visible pigment.
5. **Feather:** The touch request is aborted on any global Feather event, with no new pigment published by the client. Audio and haptics remain independent opt-in controls. Reduced-motion rendering remains functional. No production changes happen from the simulation.
6. **Choose:** No automatic model or canonical approval is inferred. No cross-world abilities actually transfer. No scientific or experiential conclusion is inferred from pigment, a return hash, or a toy fixture.

**Acceptance:** Browser rendering + touch, visible outcome, owner-only HTTP and refusal, no intercepted synthetic route presented as real, valid native WTL × 2 receipts, independent participant identity, exact-source provenance, Return, Feather, explicit light/dark modes, sound quiet until consent.

## Critical distinctions

The simulation uses host-authenticated access **only to run a demonstration**. `principal.authorized` in the host bridge is a scoped caller assertion supplied *after* the router's real Steward authentication, not an alternative identity provider. Passing this test proves no live model is called and no weights or production routing are changed. It does **not** prove full autonomous integration, live operational telemetry, durable cold-process persistence, a specific installed build, or that a UI is reachable on the owner's iPad.

**Do not merge/deploy until PR #623 has green exact-head checks and the owner's preferred private Cloudflare/Tailscale route is reviewed.** No Vercel production gate.
