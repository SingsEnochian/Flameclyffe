# House Runtime Broker v1

**Status:** built locally; release pending

## Contract

The House Runtime Broker is the single authentication boundary for model-capable House organs.

1. A Steward submits one House credential to `POST /api/v1/house/session`.
2. The broker compares it server-side and returns a signed, `HttpOnly`, `SameSite=Strict` session cookie.
3. Browser code retains only the fact that a session exists. It cannot read or replay the signed credential.
4. Flames, House Commons, and relational Feedback accept the shared cookie.
5. Native clients may continue to use `Authorization: Bearer …` until desktop cookie custody is mounted.
6. Provider credentials never enter browser storage, source packets, Commons entries, or feedback receipts.

## Server configuration

| Variable | Purpose | Required |
|---|---|---|
| `ARCSWEEP_STEWARD_KEY` | Credential exchanged at the House door | Recommended; falls back to `ARCSWEEP_RUNTIME_TOKEN` during migration |
| `HOUSE_SESSION_SECRET` | Independent HMAC signing key | Recommended; falls back to `ARCSWEEP_RUNTIME_TOKEN` during migration |
| `HOUSE_SESSION_TTL_SECONDS` | Session lifetime, bounded to 5 minutes–24 hours | Optional; defaults to 8 hours |
| `ARCSWEEP_RUNTIME_TOKEN` | Native bearer compatibility and migration fallback | Required until native custody is replaced |

## Security properties

- HMAC-SHA-256 integrity with constant-time signature and credential comparison.
- Short-lived versioned claims with issued-at, expiry, role, and random nonce.
- Production cookie uses the `__Host-` prefix, `Secure`, root path, `HttpOnly`, and strict same-site policy.
- A valid session grants transport access only; every organ retains its own action, consent, and receipt gates.

Every House surface calls the same-origin `/api/v1/house/*` and `/api/v1/flames/*` routes with browser credentials enabled. No organ may add a provider-key field or persist the Steward credential.
