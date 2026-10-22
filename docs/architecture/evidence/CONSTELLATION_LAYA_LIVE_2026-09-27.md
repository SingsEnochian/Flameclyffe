# Constellation Laya Live Evidence — 2026-09-27

Status: live sandbox evidence
PR: #393 (`constellation-runtime-v0`)
Scope: synthetic, non-production

## What was actually live

The smoke ran on a clean Hugging Face CPU job and installed upstream `laya[mcp]==0.3.20`.

The ArcSweep resident MCP client started `python -m laya.mcp.server`, completed the MCP handshake, verified the required tools, and warmed `typed-decisions`.

Observed runtime:

- Laya: `0.3.20`
- checkpoint: `typed-decisions`
- device: CPU
- torch: `2.14.0+cu130`
- transformers: `5.17.0`

The same run used two real Hugging Face causal language models as replaceable deliberative substrates:

- `HuggingFaceTB/SmolLM2-135M-Instruct`
- `Qwen/Qwen2.5-0.5B-Instruct`

These were loaded sequentially by the resident ArcSweep Transformers substrate worker. They were not mocked model labels.

## Held-constant experiment

Identities:

- Ellowind
- Larkshine

Held constant across each A/B substrate swap:

- identity seed
- continuity namespace
- input
- active glyphs: `WITNESS`, `HEARTH`
- compiled symbolic state
- retrieved context snapshot
- Laya checkpoint
- Laya judgement schema
- requested sandbox action (`simulate`)

Changed intentionally:

- generative model substrate

For both Ellowind and Larkshine, the experiment reported:

- `identityStable: true`
- `continuityStable: true`
- `symbolicStateStable: true`
- `contextStable: true`
- `layaDecisionStable: true`
- `substrateChanged: true`
- A phase: `completed`
- B phase: `completed`

This verifies the architectural seam: substrate replacement can occur without replacing the identity seed, continuity namespace, symbolic state, or retrieved context.

It does **not** establish behavioural identity invariance across models.

## Laya result: useful negative evidence

For this synthetic interpretive prompt, Laya selected:

- route: `code`
- authority: `within-sandbox-scope`
- uncertainty: `medium`
- conflict: `none`

Minimum combined confidence was extremely low:

- Ellowind: `0.0069`
- Larkshine: `0.0040`

The `code` route is not a good semantic fit for the task. The very low confidence makes this a useful calibration finding rather than a route result to trust.

Conclusion: the generic `laya-typed-decisions` checkpoint is technically viable as ArcSweep's cognitive judgement substrate, but ArcSweep's route/authority/uncertainty/conflict taxonomy requires held-out calibration and likely ArcSweep-specific fine-tuning before route labels are operationally trusted.

Do not hide or relabel this result in later summaries. It is baseline evidence.

## Generative substrate behaviour

The two real model substrates produced materially different text under the same held state.

SmolLM2-135M showed weak behaviour in this tiny experiment. Ellowind's output largely echoed the supplied task, and Larkshine's output degenerated into repeated `Larkshine` tokens.

Qwen2.5-0.5B produced coherent fictional interpretations for both identities, though the experiment was not designed to score identity fidelity or literary quality.

This is evidence that model substrate quality materially affects outward behaviour even when identity seed, context and cognition inputs are held constant.

That is exactly why ArcSweep keeps identity above the model binding.

## Verification evidence

Hugging Face live Laya + real-substrate job:

- job id: `6ab87e9b52d0dbd7f1d998d6`
- completed successfully

Separate clean runtime-plumbing tests:

- held-state substrate swap test: passed
- resident MCP handshake + typed-decisions warmup test: passed
- result: 2 passed, 0 failed

Latest GitHub `Arcsweep Feedback Loop Gate` observed for the implementation head before this evidence-only commit: success.

## Next experiment

1. Build an ArcSweep-labelled Laya calibration set from AI University traces.
2. Evaluate route, authority, uncertainty and conflict independently on held-out examples.
3. Fit or fine-tune only after baseline confusion and confidence behaviour are measured.
4. Add a configured confidence gate using validated thresholds rather than an arbitrary universal cutoff.
5. Repeat the Ellowind/Larkshine A/B substrate experiment with stronger local model candidates and score identity-anchor retention separately from general response quality.
