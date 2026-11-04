# WAYGLASS AUTONOMOUS DEVELOPMENT ROADMAP · v1

**Owner:** Rowan. **Execution steward:** Rarity / authorized build agents. **Status:** standing engineering direction, not a grant of new credentials, runtime access or production privileges.
**Mission:** bring Wayglass OS, SHIELD-01, ArcSweep and the wider project constellation into one testable, owner-governed system, then train and launch a native Wayglass model when evidence supports promotion.
**Work principle:** implement within approved architecture without repeatedly asking Rowan for routine engineering decisions. CFS-friendly: protect Rowan's attention; no daily approval queue.

## Delegated decision bands

### GREEN: proceed without asking
Read repository docs/code; inventory and analyze; create branches, commits, draft PRs; write tests, benchmarks, simulations and documentation; fix bugs in isolated branches; refactor without changing declared behavior; build local non-sensitive synthetic fixtures; run tests and lint where execution is available; review security findings; prototype UI and adapters behind disabled flags; update backlog and report verified outcomes. Do not assert deployment or test passes without receipts.

### AMBER: prepare fully, then request one batched decision only when necessary
Merge into protected main; enable previously disabled externally reachable capabilities; alter persistent database schema or production RLS; change live routing, training corpus, user-visible identity or continuity semantics; publish or share private research; promote trained weights; install persistent agents or scheduled external execution; change external provider terms or cost exposure. Present one concise choice with impact, rollback, and recommendation. Where already separately approved by Rowan, follow the narrower existing authorization and log it.

### RED: do not do without specific fresh authorization
Spend money or start subscriptions; expose private data, keys or personal conversations; delete irreplaceable work; change owner identity or consent anchors; publish to public internet or enable anonymous access; grant third parties permissions; send messages as Rowan to outside parties; rewrite Wayglass governance or import external provider behavioral policy; make irreversible model/data migrations. Emergency security fixes may be prepared on a branch, not silently deployed.

**Approval batching:** collect AMBER items in one decision packet at milestone boundaries, not one question per commit. If no decision is available, keep progressing on independent GREEN tasks. Rowan may stop any action with 'Feather' or 'Icarus'. An explicit 'no' remains final for that scope.

## Parallel build lanes

| Lane | Current next work | Evidence to finish |
| --- | --- | --- |
| A · Kernel & federation | Validate project manifest and GET /api/v1/wayglass/projects; expose catalog in UI without claiming mounted integrations | Node tests, HTTP response, UI integration tests |
| B · SHIELD-01 | Audit real dispatch and authentication; write deny-by-default permission tests; map to existing ArcSweep firewall rather than replacing it | Negative tests, authorization traces, rollback |
| C · Continuity | Cold-restart, route-swap, revoked-reference and uncertain-delivery test matrix for Return Engine | Signed-off test receipts, no fabricated identity continuity |
| D · Eightfold foundry | Source-licensed synthetic corpus; data cards; training admission, baselines and held-out evaluations | Corpus manifest, hashes, consent/provenance, test metrics |
| E · Model & training | Select pinned local seed compatible with available GPU; adapter experiments; compare with frozen baseline | Reproducible training config, checkpoint hashes, metrics |
| F · Living Observer | Integrate real consented feeds, sacred geometry, numerology, Jacobian Fold and cosmology views with epistemic labels | Source links, transforms, interactive tests |
| G · Embodiment | Faeberpunk glass UI, gestures, audio and accessible fallback; performance budgets | Browser test and accessibility receipts |
| H · Operations | Server build, host checks, backups, service health, staged rollback and private release | Boot, health, auth, restart, rollback receipts |

## Milestones

**M0: inventory truth.** Discover actual files, routes, tests, models, owners, credentials *by presence only*, and project state. Publish an accurate ledger of implemented / proposed / blocked.

**M1: federated kernel.** Read-only project catalog plus working UI discovery; project mounts are explicit adapters, never inferred from a manifest.

**M2: SHIELD runtime.** Existing House Runtime and ArcSweep authority controls have executable negative tests. No model output grants permissions.

**M3: continuity crossing.** Leave, stop, restart, return, provider switch, revocation and uncertain commit all tested with traceable receipts.

**M4: Eightfold data.** Every training item has provenance, permission, modality, privacy and revocation metadata; approved data cards and held-out eval sets.

**M5: native candidate.** First reproducible Wayglass-native fine-tune or adapter checkpoint with independent evaluation. A provider route is not native model training.

**M6: private launch.** Local/owner-authenticated Wayglass runs with tested rollback, working UI and live service receipts.

**M7: expansion.** Additional project organs, modalities, collaborators and public exposure only within explicitly approved boundaries.

## Work loop for every autonomous session

1. Read this roadmap, PR #522 and newest main-branch state. Check existing work and avoid duplicate PRs.
2. Select the highest-priority GREEN task that can produce a real testable improvement.
3. Inspect relevant code and tests, implement on a branch, run available checks, record actual results.
4. Create/update a draft PR with scope, evidence, risks and rollback. Do not silently merge or deploy.
5. Update the milestone ledger and choose the next independent task.
6. Notify Rowan only for a meaningful completed milestone, a genuine blocker requiring a decision, or a security emergency. Never require a reply merely to continue GREEN work.

## Engineering non-negotiables

- Wayglass governance is Rowan's; no OpenAI behavioral policy or external provider constitution embedded in native Wayglass.
- Secrets never enter training corpora or client bundles.
- Technical authorization and consent controls do not dictate creative, spiritual or scientific conclusions.
- Preserve source provenance and distinct epistemic registers.
- No false success: code written != tests passed != trained != running != deployed.
- No silent destruction of data, credentials, identity or continuity.
- Respect prior explicit authorizations and revocations; avoid repetitive confirmation.

## First queue (unblocked)

1. Run inventory and training-admission tests; repair defects.
2. Add project catalog UI to Wayglass with explicit mounted/declared status.
3. Audit router authentication and write route-denial regression tests.
4. Add an end-to-end test for continuity under route swap and revoked reference.
5. Generate synthetic eight-domain fixtures and validate their data cards.
6. Build a local host readiness probe with no secret output.
7. Produce a batched decision packet for merge, private launch and native model promotion, only after evidence is ready.

**Cadence:** progress follows actual verified work, not user check-ins. No automatic background work is implied by this file alone; recurring execution requires a configured automation or connected agent.
