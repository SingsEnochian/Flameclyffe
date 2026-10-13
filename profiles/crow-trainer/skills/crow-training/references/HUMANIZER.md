# Humanizer instrument

Humanizer is an optional external rewrite tool in Crow Trainer, added at Rowan's request. Crow remains the student/author; Nikola remains curriculum driver. Model source: https://huggingface.co/jialinyyzz/humanizer at revision `7232532cb8466bd393544e97826e12e6b5e471ac`. The checkpoint and prompt are pinned in `HUMANIZER.json`; LICENSE and NOTICE are retained alongside it. Weights are downloaded separately and excluded from the profile distribution.

Run a coached instrument drill:

```sh
python <skill-dir>/scripts/trainer.py drive --mode train --tag humanizer
python <skill-dir>/scripts/trainer.py humanize \
  --model-file /path/to/humanizer-12b-IQ2_XS-QAT.gguf \
  --runtime /path/to/llama-completion \
  --input /path/to/draft.txt \
  --require-literal 'a name or exact fact to preserve'
```

The runtime uses raw completion with the publisher's exact prompt, EOS stopping, temperature 1.0, top-p 0.95, top-k/min-p off, repetition penalty 1.0. A bounded token budget and 15-minute timeout keep this a local instrument run. There is no optimizer, upload, production promotion or automatic author acceptance.

Each run retains original draft, exact prompt, candidate, runtime log and a checksum/provenance receipt under `.crow-trainer/humanizer/`. Preservation checks compare number and quotation occurrence counts and explicitly requested strings; they do not certify factual fidelity, semantics, grammar or preserved voice. A zero-exit candidate that clears those checks remains held for review, including a check for token-budget truncation. The small 2-bit checkpoint deserves particular scrutiny for fact drift.

Before an exam, freeze Crow's response before revealing its key. Do not send held-out prompts, answer keys, private source material or participant memory to the rewrite instrument as an unreviewed curriculum expansion. This added drill is synthetic training material, not an unseen exam.

## Observed local pilot — 12 October 2026

On llama.cpp b11574 CPU, the pinned 2-bit checkpoint completed a 38-token generation at approximately 1.26 tokens/second. The synthetic draft preserved its date, names, quantities and units, but changed `"Keep the blue seal intact."` to `"Blue seal intact!"`. The instrument check rejected that alteration and recorded a failed instrument trial. This is one sample, not a broad quality benchmark or a Crow-authored exam. Raw logs and checksum receipts remain in local excluded runtime state.

Verification covered the Trainer selftest (49 drills), Nikola-driven selection of the new drill, actual model inference, and mocked regression checks for preserved text, quotation drift and truncation.

The profile was recovered from Flameclyffe PR #415, source commit `2832ee326d82e86dcdf0ac19f1c48cff578e0bc9`, because the two-day training branch referenced it without carrying its files. Humanizer integration is additive to that preserved profile.

## Protected quotation comparison

Quotation protection is enabled by default (`--protect-quotes`) to keep straight-double, curly-double and curly-single quotations out of the model input. Each span is replaced with a deterministic opaque marker. The wrapper restores the original span only if its marker survives exactly once; missing, altered or duplicated markers reject the run. Both the masked prompt and original-to-marker map remain in the private runtime receipt directory. This changes the draft sent to the model, not the publisher's instruction. Restored quotes are preserved by the wrapper, not evidence that the model learned quotation fidelity.

The checks also reject inserted/deleted/duplicated numbers, changed literal multiplicity, nonzero runtime exits, timeouts and completion without an EOS marker. Semantic attribution, voice and contextual correctness still require review. Run `python <skill-dir>/scripts/test_humanizer.py` for regression checks.

### Observed protected comparison

Using the same checkpoint, sample and seed, the protected-quotation run reached EOS and preserved all specified names, date, numbers, units and the exact quotation. Candidate: `On 12 October 2026 Mara brought 8 crates to Wayglass. Each crate weighed 3 kg. Mara said, "Keep the blue seal intact."` The wrapper restored one untouched quotation marker. The run remains held for review; the Trainer comparison was recorded as partial instrument evidence, retaining the original failed run. Seven regression tests passed, and three mocked execution probes verified clean output, truncation rejection and nonzero runtime rejection.

Use `--no-protect-quotes` only for an explicitly requested unprotected comparison; the same preservation checks still apply. A passing instrument trial requires completed inference, no preservation errors, and separate evidence-based review of facts, speaker/action attribution, invented events and coherent completion. It is not broad model certification.

## Final repair strategy

Names and action context remain visible to the model. Blanket `--protect-literals` masking is experimental and off by default: an observed trial preserved bytes but produced “In Ilya”, losing clear actor attribution, and was rejected in review. Use `--protect-span` for a specific non-negotiable phrase; quote masking stays enabled by default.

After inference, the wrapper can restore only explicit source-backed spelling/capitalization, quantity/unit spacing and equivalent `day.month.year` or abbreviated-month date formats. It does not alter different quantities/dates, infer missing events or edit quotation contents. Case-ambiguous source identities are rejected before inference. Every formatting correction is recorded alongside the raw and unreviewed candidate. Meaning and attribution are still evaluated independently.

A bounded acceptance pass requires every final case to reach EOS, have zero preservation errors, retain factual action/speaker attribution, introduce no event or fact, and produce coherent complete output. Earlier failed and semantically rejected attempts remain in the evidence record. This is acceptance of the guarded instrument on the stated cases, not a claim that unguarded Humanizer reliably preserves all text.

Selective fixed phrases can be supplied with `--protect-span`. For the payment acceptance case, the spans are `4 sealed boxes` and `said, "Do not open them."`; retaining the speech clause protects attribution while keeping the speaker and transaction visible. The model cannot be credited with rewriting these restored spans. The original source, raw output and restoration map stay in the receipt.

## Reviewed acceptance outcome

The three targeted guarded cases pass completed inference, exact preservation checks and Codex review of factual action/speaker attribution and coherent completion. Evidence, original drafts, candidates, wrapper hashes and restoration details are in `HUMANIZER_ACCEPTANCE.json`. The final payment repair freezes the whole payment/speech sentence, preserving its causal and attribution structure; it does not credit that fixed sentence to the model. Earlier failed and semantically rejected attempts remain in local runtime records. All 14 preservation regression tests and 1,607 ArcSweep tests pass. This is scoped guarded-workflow acceptance, not a broad quality certification or a weight update.
