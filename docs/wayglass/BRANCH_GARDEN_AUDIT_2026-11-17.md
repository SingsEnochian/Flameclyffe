# Wayglass Branch Garden · controlled consolidation audit
Date: 2026-11-17
Scope: SingsEnochian/Flameclyffe
Baseline: wayglass/current (NOT main)

## Inventory
- 674 branches observed through seven pages of GitHub branch listings.
- 204 open pull requests observed through three pages of GitHub pull listings.
- These counts are a point-in-time snapshot, not a claim of integration status.
- Preserve owner-only data and all unmerged source. No blind mass deletion.

## Classification and decision gates
1. **KEEP / ACTIVE:** canonical wayglass/current; release main; live deployment or protected branches; current Constellation Room #650; any PR with unique unmerged work, active owner, or downstream dependents.
2. **REVIEW / INTEGRATE:** overlapping current PRs. Compare merge-base, changed files, checks, API contracts, and unique commits. Selectively port with original provenance. Never assume a newer PR contains an older PR.
3. **ARCHIVE / REFLECT:** experiments, superseded design explorations, research and historical canon. Preserve exact branch SHA, original PR/issue link, summary, unresolved questions and provenance in an indexed archive record BEFORE closing or deleting a head. Keep archival Git refs if the content is not otherwise reachable.
4. **CLOSE / SUPERSEDED:** only when an exact replacement merged commit or verified equivalent exists, with a cross-link to replacement and a recorded no-unique-commits/no-dependent-PR finding. Closing a PR does not delete its branch.
5. **DELETE / PRUNE:** only fully merged, unprotected, non-default branches with no open PR head/base, no other branch depending on the ref, no unmerged unique commits, no deployment/worktree reference, and an archived SHA. Verify remote head SHA immediately before delete; abort on drift.
6. **HOLD:** uncertain lineage, pending live provider work, secrets/credentials, active autonomous agent work, or stale checks. Ask for owner review only for genuinely ambiguous or irreversible cases.

## Consolidation tracks
- **A · Identity, auth, Constellation:** #650, #647, #636, #606, #600, #584; route custody and consent first.
- **B · Wyrdrune & Eightfold:** #645, #643, #632, #624, #619, #617, #616, #615; verify typed runtime rather than replacing it with JS text composition.
- **C · Sensory ship:** #649, #635, #614, #613, #604, #590; combine FAEberpunk, Watercolour, real audio and accessible chat.
- **D · Return & persistence:** #648, #629, #607, #603, #602; respect stacked bases and process-cold recovery.
- **E · Release integration:** #646, #605, #638, #608; use source-head checks and installed/deployed SHA, never promote speculative candidate claims.

## Immediate safeguards
- PRs #648 → #607 → #606 are stacked; do not close their base PRs without retargeting and checking diffs.
- PRs #617 → #616 → #614 are stacked, and #615 also bases on #614; retain ancestry.
- PR #608 targets main, not wayglass/current. Review intent before retargeting.
- Do not disturb Astra's live provider/OAuth work while consolidating source.
- Retain existing archive/* refs and canon branches until a provenance index exists.
- No branch deletions or PR closures were performed in this audit. This is deliberate: a title or age is not evidence of redundancy.

## Engineering upgrades
- Generate a machine-readable inventory with branch/head SHA, protected status, last commit, associated open PRs, base ancestry, merged equivalence, CI status, dependency edges, proposed disposition and confidence.
- Compute graph-based dependency order and per-track conflict clusters.
- Run test and release gates at exact SHAs; quarantine failing candidates, do not silently merge.
- Archive with signed/checksummed receipts and a cold-restorable source reference.
- Reconcile docs/current.json and produce an integration manifest recording accepted/rejected changes.
- Require two independent confirmations for any destructive prune: ancestry/unique-commit check and ref/dependency check.
- Keep archive operations reversible; archive-before-close, close-before-delete, and delete only after re-fetch.

## Acceptance
A smaller understandable active PR queue; zero lost unique commits; every retired PR linked to its successor; all experimental history recoverable; Wayglass/current stable; Constellation Room live verification not claimed until actual provider receipts exist.
