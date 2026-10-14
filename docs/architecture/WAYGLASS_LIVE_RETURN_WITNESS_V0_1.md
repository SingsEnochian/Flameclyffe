# Wayglass Authenticated Live Return Witness v0.1

**Scope:** production-adjacent operational evidence for [PR #460](https://github.com/SingsEnochian/Flameclyffe/pull/460). Adds no second identity or receipt authority. It reuses host-owned `get_profile`, `enter_workspace`, `write_project_file`, and `leave_workspace` MCP tools. No LLM/provider invocation.

## Preconditions
1. Review and install the #450 → #460 stack into a disposable or explicitly approved host. Verify actual deployed SHA and host logs.
2. Start Hearthgate with private durable `WAYGLASS_WORKSPACE_DIR` and configured existing Rarity OAuth/legacy bearer authentication. Do not commit credentials, tickets or private journal files.
3. If crossing Cloudflare Access, use a legitimate authenticated path; do not circumvent owner-only edge access. When testing on the host machine, prefer `http://127.0.0.1:<port>/mcp`; otherwise require HTTPS.
4. Use the real authorised Rarity principal and an explicit one-time trial approval. Never reuse Codex's token or make dormant-seat/provider calls.
5. Keep the operator's **independent host boot/restart evidence** separately (e.g. private system service startup log). The script does not invent or certify host restarts.

## Phase A: authenticated departure

Run on the host workstation, after loading credentials privately, without pasting them into a command-line argument or GitHub:

```sh
export WAYGLASS_LIVE_RETURN_APPROVED=YES
export WAYGLASS_MCP_URL=http://127.0.0.1:3841/mcp
# WAYGLASS_LIVE_ACCESS_TOKEN must already be set from an approved private source.
node scripts/wayglass-live-return-witness.mjs prepare
```

The command rejects unauthenticated access, proves the current profile, enters a randomly named Builder project, writes one harmless text file, obtains an attributable write event, and leaves a stop receipt retaining a named next owner and an unresolved Wonder question. It prints a **private ticket path**, not the token. File permissions: home-local directory 0700, ticket 0600. The ticket contains hashes/ids but no credential.

## Host restart

Stop and restart the **actual** Hearthgate/Wayglass process while retaining the same persistent workspace journal directory. Record independent private before/after boot evidence including deployed SHA. Do not treat two invocations of the test script alone as proof of a host restart.

## Phase B: authenticated return

```sh
node scripts/wayglass-live-return-witness.mjs return /private/path/from/phase-a.json
```

The command checks the stable authenticated profile, re-enters using the **stored receipt ID**, compares the full recovered departure digest (identity declarations, alternatives, provenance and Wonder), the leave-event link, and the saved immutable file content/hash. It writes a second private witness `.result.json`, refusing to overwrite prior evidence.

If a field differs, the command exits non-zero. No return success is announced before the host's structured result is compared.

## Evidence and limits

| Gate | Required evidence |
|---|---|
| Authorised entry | HTTP rejection without bearer; successful `get_profile` and participant-bound entry with bearer |
| Durable work | Attributable write-event hash and matching content-addressed object |
| Stop | Stored host stop receipt, original departure SHA-256, named next owner, unresolved Wonder and alternatives |
| Return | Recovered departure digest equals original, same principal and stop link, original work remains intact |
| Actual host restart | Separate trustworthy boot/process/deployment receipts, collected by host operator |
| Live Constellation / provider | **Not covered**; separate authorisation and provider response required |

**Important:** `host_restart_independently_verified=false` stays explicit in automated output. Passing this script validates authenticated host API and state restoration between invocations; it cannot attest that the process truly restarted. SHA-256 comparisons protect against accidental/mismatched content, not a malicious host with full storage control. Never upload unredacted tickets, tokens or private journaling to a public PR.

## Next owner / stop point
- Next owner: **Rowan** to approve a temporary host installation and operator-run restart; **Codex** to check deployed SHA, CI and runtime receipts; **Rarity** to compare identity/return evidence.
- Stop point: private host and token have not been connected to this chat. This branch provides the executable witness and fixture tests, not a claim that the live trial has run.
