# WTL · two-backend compiler plan (TypeScript/JavaScript + Python)

**Author:** Faer Uial · 2026-11-06 · implementation owner: Codex · integration: Astra
**Contract:** RFC-0001 §12–13 and invariant I7. Every backend runs the same WIR and produces identical outputs and checkpoint digests.

## 1. Pipeline

```
source ──NFC──► lexer ──► parser ──► AST ──► checker (types, effects, phase rules)
                                              │
                                              ▼
                                  lowering ──► WIR v0.2 (WCE-1, digested)
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
               wtl-js backend                              wtl-py backend
     (interpret WIR, later emit TS)               (interpret WIR, later emit Python)
                         │                                         │
                         └──── outputs + checkpoints + receipts ───┘
                                     compared byte for byte
```

**One front end.** The lexer, parser, checker and lowering are written once, in TypeScript, and emit WIR as WCE-1 JSON. The Python backend consumes WIR files; it does not reparse source. This prevents two parsers drifting apart and keeps the IR the single point of truth. A Python front end can come later and must pass the same parse fixtures.

## 2. Milestones

| # | Deliverable | Owner | Done when |
|---|---|---|---|
| M1 | Front end: lexer, parser, checker → WIR | Codex | all L1 and L2 compile-error fixtures pass; WIR validates against `schema/wir-v0.2.schema.json` |
| M2 | `wtl-js` WIR interpreter | Codex | `WTL_BACKEND=… WTL_CLAIM=L0,L1,L2` passes all 18 language fixtures |
| M3 | `wtl-py` WIR interpreter | Codex | a Python runner passes the same fixtures. **Every checkpoint digest equals `wtl-js`'s** |
| M4 | Cross-backend crossing | Codex + Astra | a lineage checkpointed by `wtl-js` resumes in `wtl-py` (and back) with a valid chain and a recorded crossing (RFC §20) |
| M5 | Code generation (`.ts`, `.py`) | Codex | generated modules give identical digests to the interpreters |
| M6 | Rust/WASM | later | same suite; WCE-1 port first |
| M7 | Wayglass mounting | Astra + Rarity | WTL runs inside a ship room through the kernel's capability gate; Feather and revocation come from the host |

## 3. Cross-runtime equivalence matrix

Each fixture runs on each backend. The CI job fails if any cell differs.

| Compared per fixture | How |
|---|---|
| `output` | WCE-1 encoding equal |
| `status` | string equal |
| each checkpoint | WCE-1 digest equal |
| `lineage.root` | equal |
| diagnostics (error fixtures) | stable phrase present (RFC §5) |

## 4. Known divergence hazards (pin these in tests first)

1. **Numbers:** Python `int` is unbounded; WTL `Num` is binary64. The Python backend must convert every literal and result to `float`, and treat `ZeroDivisionError` and non-finite results as the same `failed` verdict JavaScript produces.
2. **Float formatting:** never use `str()`/`String()` for canonical output. Always WCE-1. [Already verified across both languages on 19 vectors.]
3. **Key order:** UTF-16 code-unit order, not code-point order. The vectors include an astral-plane key to catch this.
4. **Unicode:** NFC-normalize source in the front end only. Python and JavaScript string lengths differ for astral characters, so no semantic may depend on `len`.
5. **Async:** the JS backend is async (bridges); the Python backend may be sync. Ordering is defined by WIR sequence, never by scheduler timing. `weave` joins sort by participant id.
6. **Budget:** count WIR instructions only, so both backends exhaust at the same point.

## 5. CI

- `node --test lib/wyrdrune/*.test.cjs` (already includes WCE-1 Python parity when `python3` exists).
- After M3, add a `wyrdrune-conformance` workflow job: set up Node 24 and Python 3.13, run both backends over every fixture, and upload the equivalence matrix as an artifact.
- Wayglass check workflows are untouched until M7 and Rarity's integration review.
