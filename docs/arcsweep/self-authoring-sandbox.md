# Self-authoring agent sandbox

Open ArcSweep's OS panel, then **Self-authoring agent · sandbox**. Set a learning task, optional operator feedback, a probe task, and an existing House voice ID (default `oxalpha`). Connect the House Runtime session through the existing Settings flow before running. Press **Run experiment**. No model requests are made on boot.

The OS service makes five sequential calls through the existing authenticated Constellation gateway:

1. Answer the probe with the current playbook and previous handoff (baseline).
2. Perform the learning task with that same initial memory.
3. Reflect on that experience and operator feedback. The agent authors incremental add/revise/remove operations and reasons. Zero edits is a valid result.
4. Write a compacted handoff for the next context.
5. Answer the identical probe with the revised playbook and new handoff, in a new gateway session, without the original transcript or baseline answer.

The model supplies all memory guidance and the handoff. The harness supplies no target guidance or prewritten behavioural change. The role identity and provider's system instructions still come from the selected House voice. This is prompt/context adaptation, not model weight training. It is inspired by Letta and ACE, not an installation of either framework.

## Evidence and interpretation

The panel shows each stage's model output, memory edits with reasons, and both probe answers. **Export experiment** downloads the full JSON including prompts, outputs, route/provider/model provenance, revisions, and timestamps. The current playbook, handoff and last ten completed runs persist under `arcsweep.self-authoring-sandbox.v1` in this browser. Failed attempts remain visible/exportable in the current page; they are not committed as memory. Memory survives reload on the same browser/origin; it is not cloud-synchronised.

A text difference is not evidence of improvement, intent, or spontaneous self-modification. Reflection and self-instruction are explicitly enabled by the harness. This paired observation also changes the handoff, so it cannot isolate the causal effect of playbook edits from retained experience or sampling. Use repeat experiments and independent outcome scoring for stronger conclusions. The gateway may use a fallback model; per-step provenance makes this visible.

The client sends a fresh session ID per stage, empty conversation context, and an empty world context to avoid adding the currently selected world. Existing gateway identity, routing, and audit behaviour remain in effect; server-side provider or local gateway augmentation must be audited separately before claiming strict experimental isolation.

## Bounds and failure behaviour

Runs are manual, one at a time, at most five model calls. Each call has a 60-second client timeout. Stop aborts pending client requests and prevents committing that attempt; upstream work may have already started. Feather prevents further stages and memory commits. Model output is displayed as text and never dispatched as tool calls or executed as code. Sandbox guidance does not enter the Guide's promoted-learning store.

Unknown memory references, malformed JSON, oversized prompts/outputs, unverified model responses, and failed persistence fail visibly. Successful memory writes are read back. Corrupt existing snapshots are reported and preserved rather than overwritten. There is no automatic retry or automatic promotion into other agents' memory.

If the stored snapshot is corrupt or unreadable, the panel shows an error and disables **Run experiment**. Press **Clear stored state** (or invoke `sandbox.self-authoring.reset` with `operate` authority) to wipe the local snapshot and return to an empty playbook. This does not affect other browser storage. The voice ID field accepts 1–80 characters; blank or overlong values are rejected before any model call.

## Verification

Run:

```sh
node --test apps/arcsweep/test/self-authoring-sandbox.test.js apps/arcsweep/test/arcsweep-os-boot-lifecycle.test.js apps/arcsweep/test/arcsweep-os-integration.test.js
npm run arcsweep:build
```

These tests use labelled test doubles, not live LLM results. They exercise actual orchestration, fresh-context construction, incremental edits, reload, capability dispatch, offline failure, malformed reflection, cancellation, concurrency, timeout, Feather, and storage failure.

## Research basis

- Letta agent-edited memory and compaction-triggered consolidation: https://docs.letta.com/agent-sdk/memory
- Letta compaction: https://docs.letta.com/v1-sdk/messages/compaction
- ACE incremental playbook updates: https://github.com/ace-agent/ace
- Hermes agent-authored procedural skills: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
