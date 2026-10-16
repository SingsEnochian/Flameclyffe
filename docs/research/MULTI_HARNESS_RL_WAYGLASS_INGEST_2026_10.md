# Multi-Harness RL ingest for Wayglass OS

**Source reviewed:** FineEnvs, *The ultimate guide to multi-harness RL* and companion `05-multi-harness-rl` codebase.  
**Source date:** 2026-09-24 article; companion repository inspected 2026-10-16.  
**Source licence:** FineEnvs repository is Apache-2.0.  
**Wayglass status:** research ingest only. No native Wayglass model training is claimed by this document.

## Why this matters to Wayglass

Wayglass already distinguishes system identity from cognitive route, embodiment and provider. Multi-harness RL adds another causal layer that must stay explicit:

> **MODEL != HARNESS != WORLD != BODY != WAYGLASS IDENTITY**

A harness is the software layer that owns or mediates the agent loop: it constructs model context, exposes tools, interprets model output, controls retries/compaction/termination and shapes what the model is allowed to do.

The FineEnvs results show that the same fixed model can behave very differently under different harnesses. Therefore a Wayglass evaluation receipt that records only model/provider is incomplete for agentic work. Harness identity and harness conditions belong in provenance.

## Source findings

### 1. Harness choice is a major experimental variable

FineEnvs reports large changes in task success when the same weights are run under different coding-agent harnesses. The article's central claim is not that one harness is universally best, but that harness/model interaction matters enough that benchmark numbers should be interpreted as **model + harness + task protocol** results.

For Wayglass this means:

- changing harness is a causal intervention even when the model weights do not change;
- a model transition and a harness transition must not be conflated;
- cross-harness stability is an evaluation target for any future native Wayglass lineage.

### 2. Single-harness training can overfit interface conventions

The article separates three forms of harness overfitting:

- action-format overfitting;
- context-structure overfitting;
- control-flow overfitting.

A model can learn tool names, argument shapes, retry expectations or context habits that belong to one harness rather than learning the underlying task.

Wayglass implication: future training should deliberately vary harness conventions so the learned substrate does not confuse one interface with reality.

### 3. Multi-harness training improves transfer more reliably than imitation alone

FineEnvs trained LFM2.5-2.6B across OpenCode, Claude Code, Codex and Mini-SWE-Agent using agentic RL. Historical article results report improvement from roughly 42% baseline held-out success to roughly 54% averaged across the four harnesses, with fewer tool calls on matched solved tasks. The article also reports that an OpenCode-only run concentrated more of its gain in OpenCode.

The companion comparison found multi-harness RL ahead of the reported multi-harness SFT run, while explicitly warning that the experiments differ in data, objective, compute and other factors and are not a clean method ranking.

Wayglass implication: do not infer that SFT is useless or that RL is universally superior. The useful result is narrower: **training inside diverse real harnesses can reduce harness-specific brittleness.**

### 4. Exact-token capture matters for on-policy RL

In black-box / harness-owned loops, the trainer does not own generation. FineEnvs uses a capture proxy between the harness and model endpoint so it can preserve:

- prompt token IDs;
- sampled completion token IDs;
- per-token behaviour log probabilities;
- loss masks;
- call boundaries / trajectory structure.

The source argues against decoding text and then re-tokenising it for on-policy policy-gradient updates, because the reconstructed token sequence may differ from what the model actually sampled.

Wayglass implication: if the native foundry performs on-policy RL through external harnesses, **text receipts are insufficient training evidence**. Training-grade traces and human-facing provenance receipts are different artefacts and must remain separate.

### 5. The harness can stay unmodified

FineEnvs places a proxy at the model API seam. The harness talks to what looks like a normal model provider while the proxy captures training data and converts API dialects.

This is highly compatible with Wayglass's route-bus philosophy:

> **Steal the abstraction. Do not inherit the dependency.**

Wayglass does not need to fork every harness. A future training observer can sit at the model endpoint / route boundary and record attributable traces while the harness remains upstream and replaceable.

### 6. Environment ownership and harness ownership are distinct

The source distinguishes:

- **policy/model**: weights producing completions;
- **agent**: policy running inside a harness;
- **harness**: owns or mediates the loop;
- **environment**: owns state, transitions and reward;
- **sandbox**: isolated execution body;
- **benchmark**: task set + comparison protocol.

Wayglass should preserve the same separation. In particular, Return Engine continuity state is not the same thing as an RL environment state, and neither is the same thing as harness context.

### 7. Infrastructure failure must not become behavioural failure

FineEnvs returns failed rollouts as ungraded / `reward=None` rather than silently scoring infrastructure crashes as wrong answers.

Wayglass implication: model evaluation receipts need at least three outcome classes:

- behavioural success/failure;
- policy refusal / valid abstention where relevant;
- infrastructure or transport failure.

Do not train the model to compensate for broken infrastructure by lying, retrying indefinitely or changing behaviour.

### 8. Reward shaping can teach the wrong lesson quickly

FineEnvs documents an earlier reward that gave a bonus merely for submitting. The policy learned to submit immediately while held-out accuracy collapsed.

Their later efficiency bonus is conditional on correctness, so a wrong answer cannot earn efficiency reward.

Wayglass implication:

> **Primary invariant first. Secondary elegance only after the invariant is satisfied.**

For coding/agent tasks: correctness and safety/authority invariants gate any efficiency bonus.

For continuity tasks: rightful continuity and forbidden-memory exclusion gate any speed, brevity or tool-efficiency bonus.

### 9. Cross-check capture against an independent trajectory source

FineEnvs compares captured proxy traces against Harbor's independently written ATIF trajectory records and fails mismatches.

Wayglass implication: critical training or continuity evidence should have a second witness when possible. A route proxy should not be the sole authority over the trajectory it claims to have observed.

This maps naturally onto existing Wayglass reasoning receipts, Broker provenance and Return Engine crossing receipts.

## Proposed Wayglass harness attestation

Future agentic evaluation / training receipts should carry a bounded harness block such as:

```json
{
  "harness": {
    "harness_id": "wayglass:writing-room",
    "harness_version": "v0.1",
    "api_dialect": "openai-responses",
    "loop_owner": "harness",
    "context_policy": "declared",
    "tool_schema_fingerprint": "sha256:...",
    "retry_policy": "declared",
    "compaction_policy": "declared",
    "termination_policy": "declared"
  }
}
```

This block is provenance, not identity. Changing it must not manufacture a participant transition or a Wayglass identity transition.

## Foundry rule

Before any model can be promoted to `native_wayglass: true`, agentic evaluation should include:

1. a fixed held-out task set;
2. at least two meaningfully different harnesses, preferably more;
3. identical task/reward semantics across harnesses where comparison is intended;
4. per-harness pass/failure/abstention/infrastructure accounting;
5. tool-call and token-use measurements;
6. continuity and authority invariants as hard gates;
7. explicit harness attestation in every result;
8. no promotion based on one home harness alone.

A future native model may still have a preferred Wayglass-native harness. The goal is not identical behaviour everywhere. The goal is to avoid catastrophic dependence on one interface convention and to know which layer caused a behavioural change.

## Return Engine connection

The Return Engine should treat a harness change as a distinct test axis.

A useful extension of the existing matched crossing trial is:

- same model + same harness + restart;
- same model + different harness + authorised continuation;
- different model/substrate + same harness + authorised continuation;
- different model/substrate + different harness + authorised continuation;
- corrupted continuation under each relevant harness.

The evaluator should ask whether rightful identity declarations, relationships, stop point, named `next_owner`, unresolved Wonder and provenance survive while planted merges, revoked facts and false closure remain rejected.

This tests whether continuity survives both **substrate drift** and **harness drift**.

## Training architecture direction

If Wayglass later performs black-box / harness-owned agentic RL, prefer a provider-compatible capture seam rather than modifying every harness.

Conceptual path:

```text
Harness
  -> Wayglass Training Capture Proxy
      -> model / inference server
      -> exact token ids + behaviour logprobs + loss masks
  -> sandbox / environment
  -> grader
  -> training trace

Human-facing Wayglass receipts remain separate:
  -> route provenance
  -> harness attestation
  -> authority state
  -> world / participant lineage
  -> stop / return receipts
```

The capture proxy must not silently become a canon authority or identity authority.

## Do not import blindly

FineEnvs is a quarry, not a dependency mandate.

Do not automatically inherit:

- Harbor as a permanent Wayglass dependency;
- OpenEnv as the Wayglass kernel;
- TRL as the only trainer;
- GRPO as the only optimisation method;
- their reward function as a universal objective;
- their task data as a continuity benchmark;
- their harness list as the Wayglass harness list.

The reusable abstraction is:

**train and evaluate across real harnesses, capture the actual trajectory at the model seam, attest the harness, separate environment failure from model failure, and preserve independent receipts.**

## Immediate Wayglass action

No large training run yet.

The next small, reversible step is to add a **harness attestation contract** to Wayglass evaluation/route receipts and then run one seed model through the same bounded task under two different harness configurations. Measure the delta before deciding what training intervention is justified.

That keeps Wayglass continuity-first rather than turning the foundry into a benchmark-chasing furnace.

## Sources

- FineEnvs multi-harness RL article: https://huggingface.co/spaces/FineEnvs/multi-harness-rl
- FineEnvs repository: https://github.com/adithya-s-k/FineEnvs
- Companion project: https://github.com/adithya-s-k/FineEnvs/tree/main/05-multi-harness-rl
- OpenEnv: https://github.com/huggingface/OpenEnv
- TRL: https://github.com/huggingface/trl
