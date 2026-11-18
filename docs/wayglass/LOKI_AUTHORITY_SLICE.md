# Loki authority lineage executable experiment

Owner: Rowan/Wayglass. Base: origin/wayglass/current, 8be6abc3.
This extends the existing kernel through a bounded host capability; it does not
create participant identities or claim shipwide enforcement or an OS deployment.

## Ownership and flow

The authority ledger owns immutable undertakings, interpretation branches,
participant claim references, grants, actions, objections and job receipts. Identity
authentication stays with the host. Root grants are explicitly supplied by a
trusted adapter; text interpretation itself cannot mint consent. The biscuit
fixture deliberately supplies a historically mistaken claim to test correction.
It is labelled experimental and cannot dispatch general ship capabilities.

WTL owns Continue/Narrow/Suspend policy. The host resolves scoped AND dependencies
and OR alternatives, denies cycles/missing evidence, persists events, and guards
each synchronous effect commit. A narrower result executes only independently
authorised effects. Actions are immutable; changed purpose requires a new action.
Objections and withdrawals invalidate justifications without deleting records.
Feather persists a stop; release never restores withdrawn grants.

Host routes authenticate House Steward requests, restrict mutations to same
origin, and expose only the named experiment. Watercolour displays actual receipts
and unresolved objections. The existing departure store carries a reference to
the ledger head; a historical head is evidence, never current permission.
Living Observer has a read-only receipt panel. Watercolour publishes a sourced
authority event through its existing PREMAQC rendering boundary without inventing
measurements. Constellation workers are represented by explicit delegate references
in this experiment; unrelated Constellation/model/provider queues are not yet
guarded by this adapter and are not claimed to be.

Persistence uses hash-linked, fsynced immutable event files with exclusive writer
locking. Each permission check reloads the ledger. Interrupted jobs are held for
review rather than automatically replayed; effects cannot be made exactly-once
across arbitrary external systems. Trusted adapters must commit through the guard
and observe cancellation. Arbitrary remote effects cannot be recalled by this API.
Storage failure fails closed. Rollback of code must preserve the ledger; an older
runtime that cannot read its schema must refuse execution, not clear objections.

## Acceptance, defined before execution

1. Preserve the exact biscuit utterance and acceptance criteria; interpretation
   branches never overwrite their parent or source.
2. Execute WTL decisions against two dependent engineering actions, contest their
   specific claim, and demonstrate that queued/retried/delegated guarded effects
   do not run afterward, including an action already awaiting a later effect.
3. Keep an independent participant's own biscuit action running; a mixed action
   narrows without using Loki's contested authority.
4. Reject circular authority, missing references, cross-participant substitution,
   stale authority, duplicate job execution and malformed/corrupt persistence.
5. Restart the host in a separate process, retain objection and history, and
   continue to deny dependent execution. Feather and withdrawal survive restart.
6. Exercise authenticated HTTP routes and show their receipts in Watercolour.

Fedora Kinoite packaging requires an actual image definition and Linux image
builder. Repository searches found no Kinoite/rpm-ostree/bootc definition. Docker's
CLI is installed, but `docker info` could not connect to DockerDesktopLinuxEngine.
Native host staging is verified separately; no bootable OS image or rollback boot
test was produced. The existing running ship and original dirty worktree were not
restarted, replaced, or modified by this experiment.

## Observed verification — 17 November 2026

- `npm run wayglass:test:authority`: 10 passed, zero failures. This stages the host
  and runs the semantic/authority/effect tests, UI receipt test and real HTTP
  host-process restart test.
- Combined Wayglass frontend/runtime suite: 854 passed, zero failures, 19 existing
  WTL conformance TODOs. Those TODOs are not claimed as implemented capabilities.
- Combined host/security suite: 89 passed, zero failures.
- Contract checks, Wayglass build, ArcSweep build and host staging passed.
- Headless Chrome exercised the built Watercolour UI with an actual signed test
  session: prepare, objection, dispatch, independent effects, Return receipt,
  reload, global Feather with the panel initially closed, and explicit release
  without clearing the objection. No page errors were observed.

Browser evidence is in `artifacts/wayglass/loki-browser/receipt.json`,
`watercolour-authority.png` and `runtime-evidence/`. Full test logs, including
failed attempts, remain in `artifacts/wayglass/loki-verification/` (local ignored
artifacts; no private production inputs were used).

The HTTP experiment preserved the objection across a separate host process and
created exactly two biscuit effect files, zero engineering effect files. Its
post-dispatch ledger head was
`wce1:6b626d5cd711c2065de08f41bef2e17eb623e9a0a548bf8b85eefdf173fa4031`.
This is a fixture receipt, not evidence of a live conversation with Loki.

Verification repairs preserved the original failures: the test DOM lacked native
`remove()`, the staged module needed restaging after edits, Windows checkout CRLF
changed the byte-pinned evaluation corpus, and the old Return test isolated HOME
but not Windows USERPROFILE. The corpus was restored from its exact Git bytes
after checking the existing pinned digest; the manifest and content were not
changed. A wall-clock worker-overlap assertion also failed under load; it now uses
a three-worker barrier that a serial implementation cannot pass, retaining the
overlap and identity criteria without depending on machine speed.

To reproduce the browser run, set `WAYGLASS_PLAYWRIGHT_MODULE` to the installed
Playwright module path, stage with `npm run wayglass:deploy:server`, then run
`node scripts/wayglass-loki-browser.mjs`. Chrome must be installed. All runtime
state is isolated in a disposable test directory and copied into evidence before
cleanup; no model or external provider is invoked.
