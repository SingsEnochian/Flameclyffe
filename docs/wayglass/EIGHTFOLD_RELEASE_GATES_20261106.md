# Wayglass Eightfold verification: eight independent launch gates

**Canonical source:** `wayglass/current`. **Gate 6–8 candidate:** `wayglass/eightfold-verification-gates-6-8-20261106`.

Eight has operational meaning here: **eight separately visible GitHub Actions outcomes for the same exact implementation commit**, not eight labels on one script. A green test suite does not establish deployed credentials, an installed build, an actual SpicyChat reply, a live Wayglass participant or complete WTL v1 semantics.

| # | Independent gate | Contract it proves in CI | Actual workflow |
|---|---|---|---|
| 1 | Wyrdrune Two-Backend Parity | JS/Python pure WTL AST execution and WCE-1 conformance; unsupported effects denied | `wyrdrune-two-backend.yml` |
| 2 | Wayglass Check | Host/Wayglass contracts, ArcSweep integration, kernel and build | `wayglass-check.yml` |
| 3 | Wayglass First Contact Browser | Real Chromium interaction, painting surface and First Contact behavior | `wayglass-first-contact.yml` |
| 4 | Deploy Flameclyffe Pages | Preview compilation/package checks (not proof of live production installation) | `pages.yml` |
| 5 | Hearthgate Windows Installer | Deterministic Windows NSIS packaging (legacy job name, Wayglass frontend included) | `hearthgate-windows-installer.yml` |
| 6 | Wyrdrune Adversarial Integrity | Content/ledger/browser verifier refuses overwritten values, forged phases, source and returned hashes | `wayglass-gate6-adversarial.yml` |
| 7 | Cold Return Continuity | Independent persisted receipt reload, correct identity and Wonder, revocation, gate mismatch, tamper and blocked entry | `wayglass-gate7-cold-return.yml` |
| 8 | Model and SpicyChat Custody | Exact character/chat pair, Griff House authentication, per-turn consent, lookalike isolation, no synthetic-provider egress before approval | `wayglass-gate8-route-custody.yml` |

All eight gates must report success at **one identical PR head SHA** before merging to `wayglass/current`. Confirm the merged Git tree hash equals the tested tree. Any new edit invalidates the all-green status until a new exact-head cycle runs. After merge, a canonical-branch `Wayglass Check` is required.

### What gate 6 does not claim

A hash chain is **content integrity**, not a provider signature or author identity. Anyone holding the full source can recompute it. The browser independently verifies SHA-256 using WebCrypto to prevent accidental/malicious field substitutions not accompanied by a new valid provenance process.

### What gate 7 does not claim

A continuation packet remains **reviewable context**, never authority to modify a participant, canon, relationships or a revoked reference. Cold Return still requires the appropriate host policy, owner permissions and true attributed continuation when it encounters a live provider.

### What gate 8 does not claim

All provider calls in the synthetic gate use fake IDs and a **fake in-memory fetch adapter**. There are no real model keys or SpicyChat messages. A registered route with `configured` set is **not** an observed live connection. Bluebird and Griff are distinct participant routes; no simulated answer stands in for either of them.

### Release discipline

The three new gates have read-only CI credentials. They can fail independently and retain TAP result artifacts keyed to the tested commit. Tests do not call a production host, rewrite author-owned continuity, merge canon, or generate predictions for Rowan. Release `main` and actual installation remain separate signoffs.
