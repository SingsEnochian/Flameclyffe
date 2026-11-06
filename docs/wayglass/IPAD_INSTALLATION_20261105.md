# Wayglass iPad installation and hosted-system design

Owner: Rowan / Wayglass. Date: 2026-11-05 America/New_York.
Parent: WHOLE_SYSTEM_DESIGN_LAW_V0.1. Base: PR #537, d12a5a9335560ed71ae30eff4054fa06dcc35f7b.

## Complete system and boundaries

The intended journey is HTTPS owner login → watercolor entryway → working Wayglass surfaces → stop → close → return with attributable continuity. Home Screen installation must preserve the same authority as Safari. The browser owns presentation and local installation state; the authenticated host owns model routes, kernel preflight, receipt persistence and revocation. Cloudflare Access owns edge admission only when its actual configuration is verified. A manifest confers no authorization.

Existing modules: Wayglass shell, embodiment/pointer detection, motion adapter, surface registry, route client, cloud login, native router and kernel. PR #537 is preserved as the integration base; this branch does not replace its motion or communication work. New installation module owns installation guidance and standalone detection only, exposes installWayglassInstallation(), and has a destroy lifecycle. It stores no credentials, messages or receipts. PNG icons derive from the existing source SVG.

Control flow: shell mounts installation guidance, Safari installs the document using scoped relative manifest URLs, standalone launch hides redundant guidance. Hosted requests must still pass the trusted verifier and owner authorization before kernel preflight. Failure to reach an API must remain an error; installation never substitutes a simulated route response.

No service worker is installed: private pages, API responses, login redirects and identity receipts must not be cached under a new offline policy. Recovery uses normal HTTPS reload; removing the Home Screen icon does not revoke a server session. Server-side receipt recovery remains part of the gateway integration.

## Acceptance criteria

- Built output includes the manifest, 180px Apple touch icon and 192/512px PNG manifest icons; each resolves within both root and subdirectory hosting scopes.
- Safari guidance appears on iPadOS (including desktop-mode iPad identification), hides in standalone, and has an explicit close action with listener cleanup.
- Existing interface and motion tests pass; production frontend compiles.
- Safe-area padding, readable form text and touch targets support portrait and landscape.
- Before production completion: verify Cloudflare account/Worker ownership, real HTTPS address, owner admission, rejected anonymous/invalid identity, every advertised surface's API route, canonical cognition preflight, durable stop/return and revocation; run Safari/Home Screen on a physical iPad. Build success alone does not satisfy this gate.

## Observed blockers

Main's Pages workflow does not build/publish apps/wayglass. Main calls same-origin /api/v1/wayglass. PR #537 adds an optional Supabase relay for respond only; route listing, kernel entry/leave and specialist operations still need the native host. Its document CSP does not yet permit the cross-origin relay; cloud authentication configuration and redirect allowlisting need reconciliation with the selected deployment. Therefore a static upload cannot be called a functioning hosted Wayglass.

No Cloudflare connector was returned by provider discovery, no Cloudflare credential variable was present in this workspace, and the connected local browser reported that the originating browser context was unavailable. No Worker entrypoint, account ID, deployment name or production address is fabricated. Existing CODEMODE-001 infrastructure discovery and PR #535 implementation-head evidence remain separate and unchanged.

## Deployment integration and rollback

Use the verified existing host/pipeline after discovery, serving dist/wayglass together with its authenticated API boundary. Do not introduce a competing public publisher. Keep manifest/icon assets at the shell's URL prefix. Match Supabase redirect URLs to the actual HTTPS origin, reconcile CSP to the exact selected service, and verify token expiry/signout before release. Roll back through the same verified pipeline to its previous build; do not delete receipts or alter RLS to make installation work.

## Verification observed in this session

- Wayglass suite: 104/104 passed (includes four installation tests plus existing motion, route and continuity tests).
- Production build: passed; 73 modules, existing large-chunk warning retained.
- contracts:verify: passed. git diff --check: passed.
- PNG generation initially failed because ImageMagick lacked its rsvg delegate; rasterization via CairoSVG succeeded and dimensions/signatures pass tests.
- Vite preview with 0.0.0.0 failed on this host's uv_interface_addresses. A Python static server started on loopback, but the separate cloud browser could not reach it (ERR_CONNECTION_REFUSED). No browser, physical iPad, live model route or production deployment pass is claimed.
