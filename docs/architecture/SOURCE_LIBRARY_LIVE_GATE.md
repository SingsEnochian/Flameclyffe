# Source Library Live Gate

Status: **BLOCKED — NOT PASSED; outer Vercel Deployment Protection authority is unresolved**

This receipt records the exact acceptance boundary for Source Library v1. A blocked gate must not be interpreted as a Source Library, Supabase, search, compare, or Ox Alpha inference failure unless the hosted smoke endpoint was actually reached. Repository CI is allowed to remain green when the only observed condition is the explicitly classified outer-authority blocker below; that does **not** satisfy this live acceptance gate and does **not** permit promotion.

## Acceptance braid

The exact-head Vercel preview must prove, in one hosted server-side smoke:

1. House Runtime authority is available server-side.
2. Source Library `list` sees at least two documents whose extraction and full-text index are actually ready.
3. A text search scoped to one book returns one or more exact source segments with item ID, segment ID, and text hash and never bleeds into another book.
4. Compare returns exactly the selected books with evidence partitioned by document identity.
5. Ox Alpha Author Lens retrieves source evidence for the selected book and invokes the Hugging Face route.
6. The response is non-empty and attests `flame_id=oxalpha`, `display_name=Ox Alpha`, provider `huggingface-inference-providers`, and model `zai-org/GLM-5.3-Flash`.
7. The response envelope remains explicitly `author_reconstruction` with `simulated_author=true`.
8. The receipt preserves exact evidence segment IDs/hashes plus model route and response hash; no source excerpt is emitted into CI logs.

The executable preview-only endpoint is `api/source-library-live-smoke.js`; the CI gate is `.github/workflows/source-library-live-smoke.yml`.

## Current database readiness

Two real books are already extracted/indexed sufficiently to make the compare gate meaningful:

- `Astral Projection`
- `The Greater Ritual of the Pentagram` — author attribution extracted from front matter as Sir Aleister Crowley; editorial credit to David Cherubim is preserved separately.

The latter was deliberately added as a second independent evidence-bearing book so the compare smoke cannot pass against duplicated or synthetic fixtures.

## Current hosted blocker

The workflow successfully:

- checks out the exact PR head rather than the GitHub PR merge SHA;
- mints a GitHub Actions OIDC token;
- discovers the exact-head Vercel preview from Vercel check output;
- attempts the documented `x-vercel-trusted-oidc-idp-token` route;
- supports the documented automation bypass secret if present;
- supports authenticated `vercel curl` if a Vercel token is present.

The exact-head preview currently rejects the minted GitHub OIDC token at Deployment Protection. GitHub Actions currently has neither `VERCEL_AUTOMATION_BYPASS_SECRET` nor `VERCEL_TOKEN` configured. Therefore the request is rejected **before `api/source-library-live-smoke.js` executes**.

The classified condition is:

`PREVIEW_PROTECTED_NO_AUTHORITY`

For this condition alone, the workflow emits a GitHub warning and a `BLOCKED — NOT PASSED` step summary rather than failing the entire repository check suite. Any reachable-endpoint failure — missing route, invalid JSON, Source Library query failure, evidence-contract failure, Hugging Face failure, empty Ox Alpha response, or provenance mismatch — remains a hard CI failure.

## Alternate runtime investigation

The connected Supabase runtime was checked as a possible server-side inference broker. It has its own Supabase URL and service-role authority, but it currently has **no `HF_TOKEN`, `HFTOKEN`, or Arcsweep runtime token configured**. A temporary environment-presence probe was retired immediately after the check and now returns `410 PROBE_RETIRED`; no credential values were emitted or stored in this document.

The connected Hugging Face account is authenticated for Hub access, but the available remote Jobs path returned `402 Payment Required`, so it is not a currently usable substitute for the protected Vercel preview. No successful Ox Alpha inference receipt has therefore been produced through either alternate route.

Do not weaken the smoke, make the preview public merely to turn CI green, or claim an HF inference failure from the Vercel-protection state. The preferred repair remains authorizing GitHub Actions as a Vercel Trusted Source for the Flameclyffe project. An automation bypass secret or scoped Vercel token is an acceptable alternate authority path.

## Promotion law

PR #211 remains draft until the exact hosted braid reaches Ox Alpha and returns the full receipt. Search/compare database readiness and a green repository check suite are not equivalent to live hosted inference readiness.
