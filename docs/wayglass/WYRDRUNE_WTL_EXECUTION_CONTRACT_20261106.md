# Wyrdrune Technomancy Language (WTL) · executable recovery candidate 0.1
Date: 2026-11-06
Source basis: `wayglass/first-contact-integration-20261105` at `eacc506afeced025818aad595727ebab2d70afed`. Target this integration branch; `main` is not canonical development.

## Canon and provenance
WTL is the **entire executable general-purpose language project**, not a synonym for Kelyran or a new replacement for its existing tools. **Skýrunor** owns glyph/runic/geometric expression; **Kelyran** owns linguistic and semantic foundations; **Loki Chaos Star** owns the eight-point computation/geometry; **Withness** is the coordinating ninth center; **Wayglass** is the authoring and execution environment. Ritual, myth, philosophy, mathematics, science, magic and computational semantics are complementary aspects of the intended language. No external participant identity may be inferred from a runtime.

Historical locally tested **Loki Chaos Star v0.1–v0.8** Python prototypes were reported (v0.8: 34 local tests; typed variables, geometry, portals, ritual compression/release, rotations, receipts, SVG). Their archived source bytes, SHA, glyph canonical mapping and GitHub provenance have **not** been recovered or verified in this session. This candidate is independent of that archive and must be reconciled rather than claimed as its successor.

## Current runnable candidate
`lib/wyrdrune/wyrdrune.cjs` implements source tokenizer, parser, structured IR, interpreter, deterministic eight-ray `star(radius)`, phase-level provenance receipts, explicit host-supplied polyglot bridge dispatch, stop and bounded-operation handling. `lib/wyrdrune/wyrdrune.test.cjs` tests the current candidate.

Example WTL:
```wyrdrune
mobius {
 perceive { let energy = 2; }
 compress { set energy = energy * 4; }
 release { set energy = energy + 1; }
 verify { emit energy; }
 integrate { emit star(3); }
 choose { set energy = energy - 3; }
 return { emit energy; }
 transcend { emit energy / 2; }
}
```
Execution: `node --test lib/wyrdrune/wyrdrune.test.cjs` (run at the PR exact head before integration).
The eight ordered **execution phases** are Perceive, Compress, Release, Verify, Integrate, Choose, Return, Transcend. They must not be mistaken for the distinct eight observability lenses or eight technical capability domains. `withness` is a center in geometric output and an execution coordinator in the result, not an additional phase.

`bridge("python","operation", value)` is a capability request through an owner-supplied handler map. It does not evaluate Python source or automatically authorize network, file, tool or model actions. The supplied principal must be verified by the embedding host; this candidate checks a flag but **does not implement trusted production authorization**. External effects need separate capability scopes, consent, revocation, durable receipts and a host-owned authority boundary.

## Required work toward the fully official polyglot language
1. **Recover provenance:** locate original Python v0.8 ZIP/source, test vectors, Skýrunor glyph assets and approved Kelyran canon. Compare against this candidate and retain lineage; do not overwrite.
2. **Language specification:** versioned Unicode lexical rules, full AST/IR, types and modules, composition, functions, control flow, diagnostics, imports, concurrency, ritual-intention semantics, signed reproducible builds, reversible Eightfold state transitions and visual glyph projection.
3. **Polyglot tooling:** independent Python and TypeScript/JavaScript backends over the *same versioned IR*, explicit capability adapters for Rust/WASM and other requested languages, cross-runtime semantic-equivalence fixtures. Do not confuse bridge existence with executing those languages.
4. **Eightfold semantics everywhere:** parser metadata, type/effect system, geometry, evaluator, scheduler, transaction/rollback, receipts, provenance and UI, using the nine-center topology, phase order, and separate observability/capability taxonomies.
5. **Wayglass mounting:** editor/REPL and glyph studio in existing ship rooms; owner-authenticated native router; model/worker identity separation; return/cold-restart and Feather; CI cross-lane matrix; functional tests on the real installed build.
6. **Acceptance:** independent runtime replay, negative permission tests, same semantics in at least Python and JavaScript backends, approved glyph mapping, provable stop/return with cold restart, full branch/PR provenance and explicit owner review before any canon mutation or release declaration.

## Evidence and next owner
- Locally on Node v22.16.0 a source-equivalent working candidate passed 7 focused tests on 2026-11-06. This does **not** prove CI of this GitHub head; independently rerun the exact committed source.
- Production cloud WTL runtime: **not deployed**. No live model provider inference or agent spawning is claimed.
- Next owner: Codex/Astra language engineering integration, scoped to exact-head source review, original v0.8 archive recovery, canonical Kelyran mapping, then typed compiler/IR and dual-backend test matrix.
- Security owner: review host-verification binding, bridge capability granularity, revocation and persistent audit before authorizing external effects.
- Integration owner: preserve existing First Contact, native router, Constellation, audio and return behavior. No merge or production deployment in this PR.
