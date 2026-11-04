# Nikola · Harness Lens evidence audit · 2026-11-04

**Owner:** Rowan. **Research driver:** Nikola. **Implementer/evidence recorder:** Rarity. **Status:** read-only source comparison plus one narrow Return Engine regression repair, not a new harness or model.
**Exact reference:** [Harness Hub / Harness Lens Space at pinned revision 5db2b041](https://huggingface.co/spaces/harness-hub/harness-lens/tree/5db2b0410a38dadadefe661c3f95c30e9e360e0a). Do not confuse this with unrelated GitHub projects also named Harness Lens.

## Method adopted, not software copied

- [Upstream taxonomy](https://huggingface.co/spaces/harness-hub/harness-lens/blob/5db2b0410a38dadadefe661c3f95c30e9e360e0a/data/taxonomy.yaml) explicitly separates system prompts, tools, context compaction, permissions, instructions/memory, and other dimensions.
- [Upstream contributing rules](https://huggingface.co/spaces/harness-hub/harness-lens/blob/5db2b0410a38dadadefe661c3f95c30e9e360e0a/CONTRIBUTING.md) require a pinned commit, read source lines, literal anchors, and omitting unverifiable claims.
- [Upstream verifier](https://huggingface.co/spaces/harness-hub/harness-lens/blob/5db2b0410a38dadadefe661c3f95c30e9e360e0a/scripts/verify.ts) checks file existence, bounded line ranges, and anchor occurrence. We adopt that evidence discipline, not its UI, source code, ontology, or authority.
- Evidence stages for **this** audit: DEFINED (file exists), WIRED (call path exists), EXECUTED (observed test), RETURN-VERIFIED (independent verifier admits exact work), DEVICE-VERIFIED (actual Windows host click). These are local audit labels, not upstream standardized scoring.

## Source-linked findings

### 1 · Instructions and system context

**DEFINED, not proven resumed.** [AGENTS.md @ canonical source SHA 8bb0e3b, lines 44–69](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/AGENTS.md#L44-L69) declares descendant verification inheritance and mandates reading the [current integration register](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/WAYGLASS_CURRENT.md). [Nikola's driver contract](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/profiles/crow-trainer/NIKOLA_DRIVER.md#L30-L64) specifies Wonder → Model → Instrument → Drive → Observe → Temper → Repeat.

**Missing witness:** proof that any resumed Codex/Astra/Nikola model actually re-read those instructions and used them to choose its next action. Repository presence is not model-context admission.

### 2 · Tools

**WIRED and ONE EXECUTION RECEIPT TESTED in CI, not device-verified.** [Nikola station PR #524](https://github.com/SingsEnochian/Flameclyffe/pull/524) invokes the canonical Math Spine for a synthetic oscillator and checks its cryptographic replay receipt. [Wayglass Check #759](https://github.com/SingsEnochian/Flameclyffe/actions/runs/41781016787) includes passing direct-computation and click-wiring tests at 6a682963. This does not establish that the PR is integrated into `wayglass/current`, that a Windows station click occurred, that an independent physical measurement happened, or that a model provider answered.

**Next witness:** mounted host + displayed exact source/receipt; do not create a second Nikola Math Spine.

### 3 · Compaction / continuity

**VERIFIED DEFECT in initial CI; repair under review.** The existing stop contract [records `active_work`](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/lib/wayglass-stop-receipt.cjs), while [the original return evaluator](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/lib/wayglass-return-trial.cjs#L69-L98) checked identity, stop point, owner, Wonder, alternatives, revocations and provenance, but not `active_work`.

[PR #525](https://github.com/SingsEnochian/Flameclyffe/pull/525) adds a regression that reproduces the omission: dropped or altered work must be rejected while original work and harmless reordering are accepted. Initial [Wayglass Check run #759 equivalent?](https://github.com/SingsEnochian/Flameclyffe/actions/runs/41782186907) failed at e530af0 with the new assertions, demonstrating the missing check.

**Repair:** the existing evaluator now compares active work records, adds `active-work-mismatch` to blockers, and the tests verify serialization into a **fresh Node process** and its refusal to admit lost work. Final-head CI result belongs on PR #525, not assumed by this document. This tests continuation-packet integrity across a process boundary; it does **not** prove an LLM retained instructions through its own compaction or that a Windows host's persistent state was recovered.

### 4 · Permissions and speaker provenance

**DECLARED / enforcement path present; live crossings separate.** The [Wayglass route client](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/apps/wayglass/src/route-client.js#L122-L174) constructs explicit route calls; [host router permission gates](https://github.com/SingsEnochian/Flameclyffe/blob/8bb0e3b5938f694e56028d54a2f092102bcd4b96/apps/starwell-server/wayglass/router.js#L683-L700) deny unconsented external provider actions. [Separate Bluebird/Vethrlauf relay PR #515](https://github.com/SingsEnochian/Flameclyffe/pull/515) maintains Rowan-authenticated transport and separately attributed speaker provenance. Do not merge provenance with execution authority; no model output can grant tool permission.

**Missing witness:** live provider/host tests and protected route denial on the installed machine. The Nikola regression does not change these routes.

## The one high-information experiment

**Hypothesis:** Wayglass can appear to have returned successfully even if context compaction discarded or silently modified the active task, because the return verifier checked metadata but not preserved work.

**Positive control:** unchanged, serialized stop/continuation packet is accepted after reloading in a fresh Node process.

**Negative controls:** removing all active work or substituting a superficially similar task must reject with `active-work-mismatch`; reordering identical work must remain accepted.

**Acceptance evidence:** CI on the PR's exact final head passes the new executable Node tests, old Return Trial 001 and the normal Wayglass checks. The prior failing SHA remains an immutable reproducer.

**Interpretation boundary:** verified packet comparison is NOT verified model recall, live narrative action, or installed-host continuity. Those are the next discriminating tests.

## Next owner and return point

- **Nikola:** select the next high-information runtime probe (model-context reacquisition after real compaction; only after this verifier is green).
- **Codex:** reconcile the result into canonical `wayglass/current`, preserving ongoing active work on the rebased branch rather than overwriting it.
- **Rarity:** collect exact-head CI receipts and reconcile verified status in PR #525; do not claim integration or live deployment.
- **Rowan:** no routine approval requested. Feather stops.

**Return anchor:** Wayglass has a real, bounded Return Engine repair pending review. The scientific question still open is: *Does the next agent actually reload the roadmap and change its next action accordingly?*
