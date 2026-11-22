# Crow Writer v0.4 bounded pilot — 2026-10-02

The QLoRA training seam is executable end-to-end.

## What ran
- Baseline: `Crownelius/Crow-9B-HERETIC-4.6`
- Hardware: A10G small
- 12 SFT examples
- 2 sealed held-out probes
- 4 optimizer steps
- LoRA rank 8 / alpha 16
- Baseline model remained untouched

## Result
Training completed in 13.47 seconds after model load. Step loss moved:
`4.052 -> 3.786 -> 3.706 -> 3.664`.

This proves the adapter pipeline works. It does **not** prove a meaningful writing-quality improvement.

The yearning probe became slightly more craft-specific after training, naming subtext, proximity, and unsaid material. The metaphor/revision probe was effectively unchanged in its opening behaviour. With only twelve lessons and four steps, that is the expected result.

## Failures encountered
- r1: startup/tooling failure because the runtime image did not contain `curl`.
- r2: functional on T4, but Qwen 3.5 fallback kernels made behavioural probes too slow for a deliberately bounded pilot; canceled.
- r3: moved to A10G, shortened held-out probes, trained successfully.

## Promotion state
**NOT PROMOTED.**

The next meaningful run should use author-approved examples harvested from real co-writing, not merely scale synthetic tips. Target 250–500 approved SFT examples and 150–300 genuine preference pairs, with 15–20% fully held out.

Credential values are deliberately absent from this receipt.
