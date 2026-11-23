# Crow Humanizer Runtime Attestation v0.1

This is an **optional rewriting instrument**, not The Crow's identity, training base, or a canon-writing agent. The original draft remains authoritative. Model output remains held for independent review, never silently promoted.

## Why the runtime dependency gate exists

An executable SHA-256 does not prove which library code executed. On a dynamically linked `llama-completion`, a same-user process may replace a `ggml`/runtime library without modifying the pinned `.exe`/ELF file. Earlier successful receipts lacked dependency evidence. The wrapper now **fails closed** when it cannot substantiate the loader boundary.

The current proof mode is deliberately narrow:

- **Linux, static ELF only:** parse the on-disk ELF program headers; reject `PT_INTERP` and `PT_DYNAMIC`, and require a supported loadable ELF. Capture the executable into a sealed Linux `memfd`, hash its opened descriptor, execute that descriptor and compare the same descriptor afterward. This prevents pathname substitution of the primary executable, but does not attest a malicious kernel, static-code `dlopen` behaviour, remote resources, or a compromised host.
- **Linux dynamic ELF:** **failed receipt**; no `held-for-review` or inference is permitted until a separately reviewed dependency-bundle attestation mechanism is implemented.
- **Windows:** the native test verifies a retained OS handle prevents the executable snapshot being overwritten or renamed while held. However, Windows PE import dependencies are **not yet independently attested**, so the full Humanizer wrapper fails closed instead of claiming successful trusted inference.
- **macOS and unknown platforms:** dependency gate currently fails closed. There is no disguised fallback to an unaudited loader.

The `runtime_dependency_mode`, `runtime_execution_binding`, `runtime_sha256`, `runtime_sha256_after`, `runtime_integrity_verified` and `runtime_error` receipt fields must be reviewed together. `runtime_integrity_verified=true` verifies only the declared narrowed boundary and is **not** equivalent to OS or model supply-chain attestation.

## Reproduction

```sh
python profiles/crow-trainer/skills/crow-training/scripts/test_humanizer.py
python profiles/crow-trainer/skills/crow-training/scripts/trainer.py humanize \
  --model-file /private/pinned-humanizer.gguf \
  --runtime /private/llama-completion \
  --input /private/draft.txt
```

The GGUF must match the SHA-256 and byte size in `HUMANIZER.json`. Do not place proprietary drafts, model paths, binaries, tokens, or local run receipts in the public repository.

**GitHub proof:** the `Crow Humanizer Native Integrity` job runs the Python suite on both Ubuntu and Windows. The Linux test compiles and runs an actual static C executable from a sealed descriptor after the on-disk path changes; the Windows test verifies the OS file-handle lock. This is security-boundary evidence, not a live Humanizer GGUF inference receipt.

## Next implementation seam

To enable an actual Windows Humanizer run without weakening the gate, add a **reviewed native dependency manifest and immutable loader resolution** with per-dependency hashes and launch-time binding, plus an adversarial DLL substitution/replacement test. Keep the Windows failure verdict until those tests exist. A simpler first live inference trial can run under Linux with a reviewed static `llama-completion` build.

## Ownership and stop point

- Next owner: Crow Trainer runtime implementer and independent reviewer.
- Stop: the quotation/unit and primary executable substitution bypasses have focused regressions; dynamic dependency attestation remains deliberately unsupported. Do not merge/promote solely because unit tests are green.
