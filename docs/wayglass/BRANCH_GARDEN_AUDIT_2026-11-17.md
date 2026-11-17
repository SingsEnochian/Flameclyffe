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


## Owner decision: ONE ACTIVE PR PER SYSTEM (2026-11-17)
This supersedes the earlier assumption that each integration track may keep multiple competing active PRs indefinitely. A track is an engineering work queue; **each named system has exactly one canonical active integration PR** targeting `wayglass/current`. Related contributors submit commits or reviewed cherry-picks into that one PR; no parallel PRs with overlapping ownership remain active once their unique work is integrated and verified.

- **Wyrdrune:** one canonical WTL language/runtime PR. Candidate sources include #645 #643 #632 #624 #619 #617 #616 #615; also review #618 and historical WTL candidates. The canonical PR must cover typed IR, Möbius, ritual, sound/visual bridges and test gates. **No single source PR is presumed complete.**
- **Constellation:** #650 is the provisional canonical integration PR; reconcile #636 and other group-chat/seat/route contributions, keeping separate owner authentication as a clearly defined dependency.
- **FAEberpunk / Living Watercolour:** one canonical sensory-UI PR, combining #614 #613 #604 and relevant visual contributions; keep acoustic subsystem ownership separate only where its contracts truly differ.
- **Sound / Composition:** one canonical sound engine PR, reconciling #649 #635 #590 and the existing acoustic stack.
- **Return Engine:** one canonical continuity PR, reconciling #648 #629 #607 and predecessors in ancestry order.
- **Authentication / host:** one canonical owner-sign-in and provider-custody PR, reconciling #647 #600 and related transport changes under Astra's ownership.
- **Shipwide integration:** one final integration PR to reconcile completed subsystem PRs, not a competing implementation of each subsystem.

**Closure protocol:** For each noncanonical PR: inventory exact head SHA and unique commits, map every changed file/contract/test to canonical commit(s), confirm CI at the canonical head, check dependent PR bases, then post a link and disposition. Only then close the redundant PR. Retain archived refs for research and experiments. Do not delete source branches solely because the PR was closed.

**Release gate:** one active PR is a queue policy, not evidence of feature completeness. Never mark a PR superseded without its contributions either integrated, explicitly rejected with rationale, or preserved as an unresolved archived experiment. If any item remains unaccounted for, keep the source PR open temporarily with an explicit consolidation-blocked status.

**This document is the policy and inventory starting point, not proof that these consolidations have already been executed.**
