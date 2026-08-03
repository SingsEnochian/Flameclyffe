# Hearthgate Archivist Ingest Boundary

**Status:** Review-only local service  
**Version:** 1.0.0  
**Authority:** No canon or persistence authority

## Governing flow

```text
explicit local request
→ token authentication
→ domain allowlist
→ HTTPS and address validation
→ bounded fetch
→ deterministic text extraction
→ source and text hashes
→ immutable ingest proposal
→ Arcsweep Canon Gate review
→ Bifröst validation
→ explicit human acceptance
→ canonical store write
```

The Archivist stops at the proposal boundary. It never mutates a global Hearthgate state,
sets consent values, writes canon or treats scraped prose as an experiential record.

## Why the direct webhook implementation was rejected

The replaced implementation contained these failures:

- arbitrary URL fetching and SSRF exposure;
- synchronous `requests.get()` inside an async server route;
- no domain allowlist;
- no redirect revalidation;
- no response-size or content-type limit;
- optional authentication;
- fabricated consent and provenance tensors;
- an untrained byte embedding presented as classification;
- direct global-state mutation;
- scraped text promoted toward canon before review;
- fresh network errors collapsed into print statements;
- no source hash, exact text hash or immutable receipt;
- proxy rotation proposed as a way around source access controls.

## Service route

```text
GET  /v1/archivist/health
GET  /v1/archivist/contracts
POST /v1/archivist/propose
```

The proposal route returns HTTP `202 Accepted` with
`arcsweep.canon-ingest-proposal/v1`. Accepted means the proposal was constructed, not that
canon changed.

## Configuration

Install the optional network dependencies:

```bash
cd ml-lab
python -m pip install -e '.[service,ingest]'
```

Set a long local token and explicit source domains:

```bash
export HEARTHGATE_INGEST_TOKEN='<local-secret>'
export HEARTHGATE_INGEST_ALLOWLIST='wikipedia.org,mlp.fandom.com,wot.fandom.com'
flameclyffe-living-engine
```

The service itself binds to `127.0.0.1:8765`.

Example proposal request:

```bash
curl -X POST 'http://127.0.0.1:8765/v1/archivist/propose' \
  -H 'Content-Type: application/json' \
  -H "X-Hearthgate-Ingest-Token: $HEARTHGATE_INGEST_TOKEN" \
  -d '{
    "target_url": "https://mlp.fandom.com/wiki/Fluttershy",
    "world_id": "starsong",
    "source_authority": "community-wiki",
    "requested_by": "rowan",
    "consent_receipt_id": "rowan-ingest-approval-2026-08-03"
  }'
```

## Network controls

The fetcher enforces:

- HTTPS only;
- standard HTTPS port only;
- exact or subdomain allowlist matching;
- no credentials in URLs;
- public-address resolution checks;
- redirect limit and revalidation;
- proxy-environment isolation;
- bounded response bytes;
- HTML, XHTML or plain text only;
- bounded paragraph extraction;
- scripts, styles, templates and SVG removed.

The allowlist remains the primary network boundary. Deployments outside localhost require a
separate outbound proxy with DNS pinning and request logging.

## Proposal contents

Each proposal contains:

- requested and final URL;
- retrieval timestamp;
- HTTP status and content type;
- raw response SHA-256;
- extracted text SHA-256;
- deterministic chunk hashes;
- measured document statistics;
- explicit `requires-human-annotation` experiential shore;
- consent receipt identifier;
- source-authority class;
- pending review state;
- input, source and output receipt hashes.

## Arcsweep and Bifröst integration

Arcsweep imports the proposal into Canon Gate quarantine. It deduplicates by source hash and
shows extracted chunks, provenance and authority before acceptance. Bifröst validates the
proposal against the active world anchor and returns a crossing receipt. Neither step may
silently alter the scraped source.

The final write uses the canonical Arcsweep store only after Rowan or another authorised
reviewer accepts the proposal. The existing Canon Gate branch remains the target store
implementation.

## Scheduling

A scheduler may submit the same authenticated proposal request at a declared cadence, but
scheduled retrieval must retain domain allowlists, rate limits, source terms and review.
No proxy rotation or access-control evasion belongs in Hearthgate.
