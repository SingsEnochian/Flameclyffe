# Repo State Ledger

**Maintained by:** Box (Codex)  
**Refresh cadence:** end of every working session  
**Last updated:** 2026-09-30

This file is a point-in-time snapshot. Do not treat it as live truth — verify with `git status` before acting.

---

## Active implementation workdir

### `C:\Users\light\Documents\Codex\2026-09-29\build-tiny-worlds-a-web-app\work\Flameclyffe`

| field       | value |
|-------------|-------|
| branch      | `codex/astra-6-1-constellation-advance` |
| HEAD        | `15692a60` — fix(security): fail-closed authority gate |
| dirty files | none |
| safe to pull | YES — this is the primary Astra 6.1 build workdir |
| notes       | PR #407 open against `feature/astra-6.1-canonical-ingest`. 72 tests green. |

---

## GH - Repos checkouts

### `C:\Users\light\GH - Repos\Flameclyffe`

| field       | value |
|-------------|-------|
| branch      | `feat/gitnexus-code-lattice-v0-1` |
| HEAD        | `ccc64e4e` — test(code-lattice): pin Windows cmd shim launch |
| dirty files | YES — 1 modified (`main-bootstrap.js`), 20+ staged new files (`apps/arcsweep/src/os/`) |
| safe to pull | **NO** — active in-progress OS kernel work (authority-broker, kernel, runa-service, shell-surface, etc.) Do not pull or reset without reviewing the staged `os/` files. |

### `C:\Users\light\GH - Repos\Flameclyffe-astra-6.1`

| field       | value |
|-------------|-------|
| branch      | `feature/astra-6.1-canonical-ingest` (worktree from GH - Repos/Flameclyffe) |
| HEAD        | `0aa465b4` — stale, does not include recent commits |
| dirty files | none |
| safe to pull | YES — `git pull origin feature/astra-6.1-canonical-ingest` is safe |
| notes       | This worktree is behind remote. Not the active implementation workdir. |

### `C:\Users\light\GH - Repos\Flameclyffe-arcsweep`

| field       | value |
|-------------|-------|
| branch      | `main` |
| HEAD        | `cc070ea1` — Update DEEP Observer data cache |
| dirty files | YES — 4 modified (`desktop/app/`, `active-input-continuity.js`), 2 deleted (built assets), unknown untracked |
| safe to pull | **NO** — local modifications to built assets and source. Pulling may cause merge conflicts on modified files. |

### `C:\Users\light\GH - Repos\Hearthfire`

| field       | value |
|-------------|-------|
| branch      | `main` |
| HEAD        | `de3541f` — docs: add Hearthweave agentic stewardship law contract |
| dirty files | YES — 6 modified (`arkfire-dispatch.mjs`, `FOR_VEE.md`, `project-zero-capabilities.mjs`, `project-zero-diagnostics.mjs`, `project-zero-front-controller.mjs`, `project-zero-router.mjs`), 4 untracked (`project-zero-arcsweep-os.mjs`, `project-zero-os-state.mjs`, `tac-chat.mjs`, `tac-experiment.mjs`) |
| safe to pull | **NO** — active TAC work in progress. The 4 untracked files are new TAC/OS routes. See `CONTRACT_CONFLICT_DECISION.md` for the design question these introduce. |
| notes       | 2/4 project-zero tests failing due to `mutates: true` on `arcsweep-os.state` conflicting with read-only capabilities invariant. |

### `C:\Users\light\GH - Repos\Hearthfire-review-room`

| field       | value |
|-------------|-------|
| branch      | **DETACHED HEAD** at `c7730ac` — Loopback Continuity Handshake v0.1 |
| dirty files | none |
| safe to pull | **N/A** — this is a git worktree of `GH - Repos/Hearthfire`. `main` is locked to the parent worktree and cannot be checked out here. Detached HEAD at this commit is likely intentional review positioning. |
| notes       | To use this worktree on a branch, checkout any branch *not* already checked out in the parent (`boxfire/census-phase-0`, `feat/bridge-lamination-engine-v0.1`, or a new branch). Do not force-attach to `main`. |

### `C:\Users\light\GH - Repos\Runa`

| field       | value |
|-------------|-------|
| branch      | `main` |
| HEAD        | `1bcd1c0` — update |
| dirty files | none |
| safe to pull | YES |

### `C:\Users\light\GH - Repos\Lioreal`

| field       | value |
|-------------|-------|
| branch      | `main` |
| HEAD        | `ea4a8d2` — update |
| dirty files | 2 untracked: `-` (oddly-named file), `field-notes/` directory |
| safe to pull | YES — untracked files are not affected by pull |
| notes       | The `-` file in root is unusual. Investigate before committing anything in this repo. |

### `C:\Users\light\GH - Repos\UH-Lanternbridge`

| field       | value |
|-------------|-------|
| branch      | `main` |
| HEAD        | `d065ef4` — bridge: Vee replies on geometry-first corrections |
| dirty files | none |
| safe to pull | YES |

---

## Summary: safe-to-pull matrix

| repo | safe? | reason |
|------|-------|--------|
| work/Flameclyffe | ✅ | clean, active branch |
| GH/Flameclyffe | ❌ | staged OS kernel work |
| GH/Flameclyffe-astra-6.1 | ✅ (stale) | needs pull to catch up |
| GH/Flameclyffe-arcsweep | ❌ | modified built assets |
| GH/Hearthfire | ❌ | active TAC work, test failures |
| GH/Hearthfire-review-room | ⚠️ | detached HEAD — attach branch first |
| GH/Runa | ✅ | clean |
| GH/Lioreal | ✅ | untracked files only |
| GH/UH-Lanternbridge | ✅ | clean |
