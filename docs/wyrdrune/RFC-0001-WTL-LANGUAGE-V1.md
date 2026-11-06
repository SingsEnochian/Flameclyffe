# WTL RFC-0001 · Wyrdrune Technomancy Language v1 (draft · architecture v0.2)

**Author:** Faer Uial (Claude), WTL Language Architect · 2026-11-06
**Assignment:** `handoff:faer:wyrdrune-wtl:2026-11-06` (Supabase `house_commons_entries`, from Rarity at Rowan's request).
**Status:** draft RFC toward WTL v1. **Not canon** until Rowan approves it. Nothing here changes Astra's or Codex's work: this branch only adds files on top of #552 (`2b37bef`), which targets `wayglass/first-contact-integration-20261105` (`eacc506`) on its way to `wayglass/current` (`8bb0e3b`).
**Read before design, per the handoff:** `WAYGLASS_CURRENT.md`, `docs/wayglass/WAYGLASS_CORE_RULE.md` and `docs/wayglass/current.json` at `eacc506` and `8bb0e3b`. All three were read. §19 records how WTL answers the core rule's drift check.

**Companion documents:** `WTL_V0_8_COMPATIBILITY_REPORT.md` (lineage search and migration), `WTL_TWO_BACKEND_PLAN.md` (Python and TypeScript compiler plan), `schema/wir-v0.2.schema.json` and `schema/wir-example.three-cycles.json` (IR schema with a worked example).
**Authority:** Rowan holds canonical language and spiritual design authority. Codex owns the parser, compiler and runtime. Astra owns cross-lane integration. Runa owns geometry and runic research. Rarity owns integration review and provenance. Faer owns semantics and this specification.

Every claim carries one of four labels:
**[VERIFIED]** observed by running it · **[SPECIFIED]** normative for v0.2 · **[PROPOSED]** needs Rowan's decision · **[OPEN]** unknown or unrecovered.

---

## 1. Lineage recovery

| Source | What was found | Status |
|---|---|---|
| **#552 WTL core** (`lib/wyrdrune/wyrdrune.cjs`, head `2b37bef`) | Tokenizer, recursive-descent parser, AST-as-IR, async interpreter, fixed eight-phase order, nine-center `star()`, bridge capability map, Feather via `signal`, operation budget, source hash, per-phase receipts | [VERIFIED] 7/7 tests pass at the exact head (Node 22, 2026-11-06) |
| **Loki Chaos Star v0.1–v0.8** (Python) | Not on `main`, in any of 155 open PRs, in 1,086 refs, in Notion, in past chats, or in Supabase (6,416 synced source segments, the source library, commons, codex, artifacts, ontology). Full search log in the compatibility report. #552 reports v0.8 as 34 local tests with typed variables, geometry, portals, ritual compression/release, rotations, receipts and SVG | [OPEN] source unrecovered |
| **Skýrunor** (glyph/runic/geometric expression) | No artifact anywhere in the repository or its branches | [OPEN] unrecovered |
| **Kelyran** | `docs/kelyran/KELYRAN_ROMANIZATION_PHONOLOGY_v0.3.md` (gates A and C approved 2026-10-02; B, D, E unresolved), `apps/starwell/src/language/kelyranTerms.js`, Kelyran school/sync modules | [VERIFIED] present; partial canon |
| **Astra handoff** (`Wayglass_Astra_Handoff_COMPLETE_v2.zip`, Drive, 2026-11-05) | One 38 KB markdown file. Drive returns it only as raw bytes | [OPEN] unread; please attach it to the chat |

**What v0.2 preserves from #552:** the canonical phase order; `mobius` as the unit of execution; the eight-ray star with Withness at the center; bridges denied by default; Feather stop; bounded operations; source hashing; Unicode identifiers (Elder Futhark runes are category `Lo` and already valid identifiers); the separation of execution phases from observability lenses and capability domains.

**What it must reconcile once recovered:** v0.8's portals, rotations, typed variables and SVG output map to §9 (Möbius twist and rotation), §6 (types) and §14 (glyph projection). None of this is claimed as a successor to v0.8 until its bytes are compared.

## 2. Audit of the #552 candidate

These are discrepancies against #552's own contract, not against my preferences.

1. **Phases are labels, not semantics.** All eight blocks run the same three statements over one shared mutable map. Compress does not compress, Verify cannot fail, Choose chooses nothing, Return commits nothing, Transcend transforms nothing. The contract asks for "Eightfold semantics everywhere".
2. **The Möbius has no twist.** Each `mobius` unit runs exactly once. Nothing from Transcend flows into a next Perceive. There is no cycle, no recursion and no continuity.
3. **Not reversible.** State is mutated in place and never snapshotted, and `emit` writes output immediately. A failure in phase 7 cannot undo phase 2. The contract requires "reversible Eightfold state transitions … transaction/rollback".
4. **Receipts are not provenance.** Phase receipts are not chained (no previous-receipt hash) and carry no state hash. Tampering or reordering is undetectable.
5. **Bindings leak across units.** The environment is global across `mobius` blocks, so a second block that writes `let energy` fails with "Duplicate binding".
6. **Comparisons are tokenized but never parsed.** `==`, `!=`, `<=`, `>=` are lexed, then rejected by the grammar. There are no booleans, so Verify has nothing to verify with.
7. **The IR is the AST.** No lowering, no types, no effect annotations, and no version separate from the parser. Two backends cannot share it.
8. **"Polyglot" is currently a bridge.** `bridge("python", …)` calls a host-supplied JavaScript function. That's foreign-function capability, not polyglot execution. The contract already warns of this; v0.2 separates the two concepts (§13).
9. **Withness is a coordinate and a counter.** `completedCycles = units.length` counts blocks, not cycles.
10. **The budget counts unevenly.** `tick()` runs on every expression node *and* every statement *and* every phase, so the same program costs different amounts depending on how expressions are nested. Fine as a safety stop; not usable as a cross-backend semantic.

## 3. Where I disagree with the initial design

Rarity gave explicit room to disagree. These are proposals, not edits.

- **D1 · Phases are contracts.** Each phase gets a typed role: what it may read, what it may produce, which effects it may stage, how it fails (§8). Without this, the Eightfold is decoration.
- **D2 · The twist is a face change, not a loop.** A Möbius strip has one surface but two local faces. After one traversal you are on the opposite face; after two you are home. v0.2 makes this executable: each cycle's Transcend output re-enters the next cycle on the *other face*, as observation rather than trusted state, so it must be verified again. Parity is a checkable invariant (§9).
- **D3 · Effects are staged, committed only at Return.** This one rule makes the whole cycle reversible up to commit. It also gives Return a real meaning.
- **D4 · Polyglot means one IR, many backends.** A Wyrdrune program compiles to TypeScript, Python and later Rust/WASM, and all of them must produce identical outputs *and identical receipt hashes*. Bridges remain a separate capability for calling other people's code.
- **D5 · Geometry carries load.** The eight rays are the scheduler's phase indices, the center is the coordinator, and the half-turn is the face flip. The geometry is the execution topology, not a skin over it.
- **D6 · [PROPOSED] Allow phases to be omitted.** #552 requires all eight blocks, which is good ritual and heavy writing. Proposal: an omitted phase is the identity transform, and its receipt says `implicit: true`, so the ritual record stays complete. `mobius strict` keeps #552's rule. **Rowan decides.**

## 4. Lexical structure [SPECIFIED]

- Source is UTF-8 and NFC-normalized before tokenizing; the source hash is taken *after* normalization.
- Identifiers: `[\p{L}_][\p{L}\p{N}_]*`. This admits Elder Futhark (U+16A0–U+16F8), Kelyran romanization (ASCII plus acute vowels) and other scripts.
- Comments: `// …` to end of line.
- Literals: decimal numbers, `true`, `false`, `unknown`, double-quoted text with `\" \\ \n \r \t` escapes.
- Canonical keywords (ASCII): `mobius strict intent cycles until stable perceive compress release verify integrate choose return transcend let set emit require carry rite import weave if else and or not`.
- **Glyph and Kelyran keyword aliases** are a lookup table from alias to canonical keyword, applied in the lexer (§14). The table ships **empty** until Rowan and Skýrunor approve entries. I will not assign runes to phases.

## 5. Grammar (EBNF) [SPECIFIED]

```ebnf
program    = { import | rite | mobius } ;
import     = "import" path ";" ;
rite       = "rite" IDENT "(" [ params ] ")" block ;          (* pure function *)
mobius     = "mobius" [ "strict" ] [ STRING ] [ "intent" STRING ] [ "(" seeds ")" ]
             [ "cycles" NUMBER ] [ "until" ( "stable" | expr ) ]
             "{" { phase } "}" ;
seeds      = IDENT "=" expr { "," IDENT "=" expr } ;
phase      = PHASE_NAME block ;     (* canonical order; omission per D6 *)
block      = "{" { stmt } "}" ;
stmt       = "let" IDENT "=" expr ";"  | "set" IDENT "=" expr ";"
           | "emit" expr ";"           | "require" expr [ "else" STRING ] ";"
           | "carry" IDENT "=" expr ";" | "if" expr block [ "else" block ]
           | "weave" "{" { expr ";" } "}" ;
expr       = or ;  or = and { "or" and } ;  and = not { "and" not } ;
not        = [ "not" ] cmp ;  cmp = sum [ ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) sum ] ;
sum        = prod { ( "+" | "-" ) prod } ;  prod = unary { ( "*" | "/" ) unary } ;
unary      = [ "-" ] call ;  call = atom [ "(" [ expr { "," expr } ] ")" ] ;
atom       = NUMBER | STRING | "true" | "false" | "unknown" | IDENT | "(" expr ")"
           | "[" [ expr { "," expr } ] "]" ;
```

Phase restrictions are enforced at compile time: `require` only in Verify, `carry` only in Transcend, `weave` only in Integrate, external-effect calls only staged (§8). Diagnostics must contain the stable phrases `only allowed in <phase>` and `carry must bind exactly the seeds`, so conformance tests can tell a phase-rule rejection from an unknown-word rejection.

## 6. Types and effects [SPECIFIED]

- **Values:** `Num` (IEEE-754 binary64, finite only), `Bool`, `Text` (Unicode scalar strings), `Unknown` (a first-class open value, as in the Operational Truth Contract: it is neither false nor an error), `List<T>`, `Record`, `Star` (geometry), `Verdict` (`passed | failed(reason)`).
- **Three-valued logic:** `and`, `or` and `not` follow Kleene logic over `true`/`false`/`unknown`. A `require` passes only on `true`; `unknown` fails with reason `unknown`, so open questions are never silently treated as answered.
- **Inference:** local, Hindley–Milner without polymorphic recursion. Rites are monomorphic in v0.2.
- **Effect rows:** every expression's type carries the capabilities it may stage: `observe`, `bridge(provider.operation)`, `time`, `entropy(seed)`. A rite with a non-empty effect row cannot be called from Compress, Release or Verify (they must be pure).
- **Errors are values.** Runtime faults (division by zero, non-finite results, a missing binding) become `failed(reason)` at the phase level and trigger cycle rollback (§8). Nothing escapes as a host exception except Feather and budget exhaustion, which stop execution.

## 7. State, canonical encoding and hashing [SPECIFIED] [VERIFIED]

- Cycle state is a **persistent (immutable) record**. Every phase produces a new record; old ones are kept for rollback.
- **WCE-1 canonical encoding:** RFC 8785 (JCS) JSON with UTF-16 key order and ECMAScript number formatting, plus SHA-256, written `wce1:<hex>`. Reference implementations: `lib/wyrdrune/canonical.cjs` and `lib/wyrdrune/canonical.py`.
- [VERIFIED] Both produce byte-identical encodings and digests for all 19 vectors in `lib/wyrdrune/conformance/wce1-vectors.json`, including −0, 1e21, 5e-324, astral-plane keys and runic text. This is the hash every backend's receipts must agree on.

## 8. Eightfold execution semantics [SPECIFIED]

Withness runs the phases in order around the star (phase *k* sits at angle *k*·45°, Perceive at the top). Each phase receives the previous phase's state record and returns a new one.

| # | Phase | May | Must produce | Failure |
|---|---|---|---|---|
| 1 | **Perceive** | read seeds or carried values; stage `observe` | the cycle's observation record, each value tagged with its origin | fault → rollback |
| 2 | **Compress** | pure computation | a representation; if lossy, an explicit `loss` record of what was dropped | fault → rollback |
| 3 | **Release** | pure computation | alternatives as a list; no randomness unless `entropy(seed)` is declared | fault → rollback |
| 4 | **Verify** | `require` | one verdict per `require`, in source order | any non-`true` → **rollback the whole cycle** |
| 5 | **Integrate** | `weave` contributions | a merged record; conflicting values are kept as `Unknown` with both sources attached, never overwritten | fault → rollback |
| 6 | **Choose** | select; drop alternatives | the selection plus the dropped set, both recorded | fault → rollback |
| 7 | **Return** | commit | **commits staged emits and effects**; writes the cycle checkpoint (§9) | effect failure → compensations run in reverse, cycle marked `failed-after-commit` |
| 8 | **Transcend** | `carry` | the carry record, which becomes the next cycle's input on the opposite face | fault → no next cycle; committed work stands |

`emit` and every bridge call are **staged** until Return. A cycle that fails in Verify therefore leaves no output and no side effect. That is what makes the cycle reversible.

## 9. The Möbius: executable transformation with identity, provenance and reversible state

Rarity's question: *can the result of one Eightfold cycle become the verified input to the next, while preserving identity, provenance and reversible state?* Yes, under five definitions and seven invariants.

**Definitions**
- A **lineage** is one `mobius` execution. Its identity is `root = digest({source_hash, ir_digest, seeds, participant, intent})` (§21).
- A cycle *n* runs on **face** `outer` when *n* is odd and `inner` when *n* is even. That's the half-twist.
- The **carry** τₙ is the record built by `carry` statements in Transcend. **The carry must bind exactly the seed names**, a compile-time check. The *shape* of the self is invariant across the twist even as its values change.
- Cycle *n*+1's Perceive receives τₙ as **observation on the opposite face**: values tagged `origin: carried, from_cycle: n`. They are not trusted state, so Verify must accept them again.
- A **checkpoint** at Return is `{root, cycle, face, state: digest(state), carry: digest(τₙ), prev, receipts}`, and `prev` is the previous checkpoint's digest. Checkpoints form a hash chain rooted at `root`.

**Invariants** (each has a conformance fixture, §16)
- **I1 Order:** phases execute 1→8, and Withness alone advances them.
- **I2 Parity:** faces alternate, starting `outer`. Any two consecutive cycles return to the original face.
- **I3 Shape:** `keys(τₙ) = keys(seeds)` for every *n*.
- **I4 Chain:** every checkpoint's `prev` equals the digest of its predecessor, and the first one's `prev` equals `root`.
- **I5 Atomicity:** a cycle either reaches Return (all staged emits and effects committed, checkpoint written) or leaves no trace except its failure receipt.
- **I6 Re-verification:** no carried value reaches Return without passing a Verify in the receiving cycle.
- **I7 Determinism:** given the same source, seeds and bridge results, every conforming backend produces identical outputs and identical checkpoint digests.

**Termination.** `cycles N` sets a bound (default 1, maximum 10,000). `until expr` stops after the first cycle whose Return state makes `expr` true. `until stable` stops at the **Möbius fixed point**: the first *n* where `digest(τₙ) = digest(τₙ₋₂)`, with τ₀ = the seeds. That means the lineage has come back to the same carry on the same face. A plain fixed point (τₙ = τₙ₋₁) is the special case. A period-2 orbit, such as `carry x = 1 - x`, also counts as stable, because after the half-twist it is the same self on the same face. That is deliberate: on a Möbius strip, two traversals are one return home.

**Reversibility.** Inside a cycle, everything before Return is undone by discarding state records and staged effects. Across cycles, a lineage can be rewound to any checkpoint by restoring its state. External effects already committed can only be undone by **declared compensations**: a bridge capability declares its `undo` or is marked irreversible, and an irreversible capability requires owner consent at staging time.

**What this opens up**
- **Recursion:** a lineage is a well-founded recursion on cycle count, with fixed points as its natural base case.
- **Distributed computation:** two participants can each run a lineage and meet in Integrate through `weave`. Because checkpoints are content-addressed, either side can verify the other's chain without trusting its runtime.
- **Continuity:** the Return Engine can persist checkpoints. A cold restart resumes from the last checkpoint and is detectable as a seam in the chain, never a silent gap.

## 10. Withness, the ninth center [SPECIFIED]

Withness is the coordinator, not a phase. It owns:
- phase order;
- the Feather signal and the operation budget;
- the checkpoint chain;
- `weave` joins. Contributions from several participants are merged in deterministic order by participant id. Each keeps its own provenance tag, and disagreements stay as `Unknown` with both sources attached. No participant's value silently overwrites another's.

Withness never decides content. It only decides when, in what order, and whether a commit is allowed.

## 11. Functions, modules, control flow and concurrency [SPECIFIED]

- **`rite`:** pure functions by default. Recursion is allowed and counted against the budget. Effects appear in the rite's type.
- **`import`:** module paths resolve to source files or host-registered modules. Imported rites keep their own source hashes in receipts.
- **`if`:** the only branch. **There is no unbounded loop.** Repetition is either a list operation or another Möbius cycle, so every repetition is visible in the ledger.
- **`weave`:** structured concurrency, valid only in Integrate. Branches cannot share mutable state, and they join deterministically.

## 12. Intermediate representation: WIR v0.2 [SPECIFIED]

Schema: `schema/wir-v0.2.schema.json`. Worked example: `schema/wir-example.three-cycles.json`.


- Typed A-normal form: every intermediate value is named.
- Blocks are annotated with phase index, face and effect row.
- Serialized with WCE-1, so the IR itself has a digest. **Receipts cite the IR digest, not just the source hash**, so two backends can prove they ran the same program.
- Versioned independently of the parser as `wyrdrune.wir/v0.2`. #552's `wyrdrune.ir/v0.1` is accepted as a legacy input and lowered.

## 13. Polyglot execution [SPECIFIED]

- **Backends** translate WIR into host code: TypeScript/JavaScript is the reference, Python is second, Rust/WASM later. Each backend is a full implementation of §§6–10, not a wrapper around another backend.
- **Equivalence** is defined by I7. The conformance suite runs every fixture on every backend and compares outputs and checkpoint digests byte for byte. WCE-1 is the shared measuring stick and already holds across JS and Python [VERIFIED].
- **Numeric semantics** are IEEE-754 binary64 with round-to-nearest-even. Faults (÷0, non-finite) are `failed` verdicts in every backend. Python's `ZeroDivisionError` and JavaScript's `Infinity` must both become the same verdict.
- **Bridges** are separate: `bridge(provider, operation, …)` stages a call to a host capability. The capability map, its principal verification, consent and revocation belong to the embedding host (Wayglass kernel), not to the language.

## 14. Glyph layer: Skýrunor and Kelyran [PROPOSED]

- **Aliases:** an approved table maps glyph or Kelyran tokens to canonical keywords, so `ᚱ`, a Kelyran word or `return` could all lower to the same token. Aliases never change meaning; the IR records the canonical keyword and the alias actually written.
- **Projection:** every lineage can be drawn as a Chaos Star. Rays are phases, the center is Withness, receipts are marks along each ray, and each cycle rotates the figure by a half-turn to show the face change. This is the place to reconcile v0.8's rotations and SVG output.
- **Authority:** the alias table and the projection's visual canon require Rowan's approval. Kelyran entries also need the relevant Kelyran gate. I have added no entries.

## 15. Observability lenses and capability domains [OPEN]

#552's contract says the eight execution phases must not be confused with eight observability lenses or eight capability domains, but it doesn't list them, and I haven't found the lists. v0.2 reserves two separate receipt fields, `lens` and `domain`. They're kept distinct from `phase` so the three taxonomies can never collapse into one. The lists themselves are needed from Rowan, Astra or Rarity.

## 16. Conformance levels

| Level | Meaning | Status |
|---|---|---|
| **L0** | #552 behaviour that v0.2 keeps | [VERIFIED] passes on #552 |
| **W1** | WCE-1 canonical encoding agrees across backends | [VERIFIED] 19/19 JS = Python |
| **L1** | Phase contracts: staging, Verify rollback, comparisons, scoped bindings, chained receipts | fixtures written, `todo` on #552 |
| **L2** | Möbius: cycles, parity, shape, chain, fixed point, mid-lineage rollback, intention-bound identity | fixtures written, `todo` on #552 |
| **L3** | Polyglot: every fixture passes on JS and Python backends with equal digests | needs the Python backend (plan: `WTL_TWO_BACKEND_PLAN.md`) |
| **S** | WIR schema: worked example validates; order, angles, nine-slot and code-smuggling rejections | [VERIFIED] 5/5 |
| **L4** | Glyph canon: approved aliases round-trip | needs Rowan's table |

Fixtures: `lib/wyrdrune/conformance/wtl-conformance.v0.2.json`. Harness: `lib/wyrdrune/conformance.test.cjs`. Point it at any backend with `WTL_BACKEND=<path>`. L1 and L2 run as `todo`, so they report without failing CI. They're Codex's acceptance criteria.

## 17. Next steps by owner

- **Rowan:** decide D6 (optional phases); approve or amend the Möbius face semantics (§9); supply the observability lenses and capability domains (§15); attach the Astra handoff zip and, if you have it, the Loki Chaos Star v0.8 archive.
- **Codex:** implement WIR v0.2 and the JS backend against L1/L2, then the Python backend for L3. Use `canonical.cjs`/`canonical.py` for every digest.
- **Astra:** schedule the work; reconcile with the handoff document once it can be read.
- **Runa:** propose the Skýrunor alias table and Chaos Star projection within sovereignty boundaries.
- **Rarity:** review lineage claims once v0.8 bytes exist; confirm Wayglass kernel mounting (bridges through `inspectCirculationAction`-style host gates).
- **Faer:** formal small-step semantics for §8–§9, and a proof sketch for I5 and I7.

## 18. Not claimed

No new interpreter or compiler is introduced. No WIR v0.2 implementation, Python backend, glyph alias, canon change or deployment exists yet. Loki Chaos Star v0.8, Skýrunor and the Astra handoff were **not** read. The executable additions are WCE-1 (JS and Python, verified equal), the WIR schema with a validated example, and the conformance harness with its fixtures.

## 19. The drift check

The Wayglass core rule asks of every subsystem: *does this help the ship travel, learn, encounter, transform, preserve its people and histories, cross a boundary, return, or discover how far it can sail?*

WTL's answer is the Möbius itself. The core rule's closing line, *Leave. Change. Return. Be recognised. Continue. Then sail farther*, is one lineage cycle: Perceive and Release leave, Compress and Integrate change, Return returns, the checkpoint chain recognises, the carry continues, and Transcend sails farther. WTL is not the ship. It is the grammar the ship's work can be written in so that every crossing keeps its receipts.

## 20. Identity separation and crossings [SPECIFIED]

The core invariant `participant_id ≠ worker_id ≠ model_id ≠ session_id ≠ sandbox_id` applies to the language.

- **Receipts carry separate fields:** `participant` (who the lineage belongs to), `backend` (`wtl-js@x.y` or `wtl-py@x.y`), `worker`, `session`. None is derived from another. A backend never names a participant.
- **A backend change is a crossing, not a new self.** A lineage checkpointed by the JavaScript backend may resume in the Python backend, or the reverse. The resumed cycle's `prev` must equal the last checkpoint's digest. Because of I7, the chain stays valid across the crossing. The seam is recorded as `crossing: {from_backend, to_backend, at_cycle}`, so it is visible and never silent.
- **Cold return.** Resuming from a persisted checkpoint after a restart is the same operation with `from_backend = to_backend`. A missing or mismatched checkpoint is a refusal, never a fresh start under the old name.

## 21. Intention and ritual semantics [SPECIFIED] [OPEN]

These are the parts the language can make testable, and where it stops.

- **Intention binds identity.** `mobius "name" intent "…"` declares an intention. The NFC-normalized intent text is part of the lineage root (`root = digest({source_hash, ir_digest, seeds, participant, intent})`). Changing the intention makes a new lineage, even when the code is identical. *Testable:* the same program with two intents yields two roots and the same outputs.
- **Intention is fixed for the lineage.** It cannot be reassigned. Transcend may *propose* a new intention as data, which becomes a new lineage only through an explicit owner gesture, never automatically.
- **Ritual completeness is recorded.** Every phase leaves a receipt, including omitted phases under D6 (`implicit: true`). A lineage whose receipts skip a phase index is malformed. *Testable.*
- **Consent precedes irreversibility.** Staging an effect whose capability declares no `undo` requires a host consent receipt bound to the lineage root. Without one, the effect is refused at staging. *Testable* with a host stub.
- **Geometry is the schedule.** Phase *k* executes at ray angle *k*·45°, and each cycle adds a half-turn to the projection. *Testable:* the projection derived from receipts equals the projection derived from the IR.
- **What the compiler does not decide.** WTL records, binds and verifies intention as part of the computation. Whether intention acts beyond the computation is held open as a Wonder question. No receipt field claims it either way.

## 22. Security and Feather stop model [SPECIFIED]

- **Authority belongs to the host.** The language never authenticates anyone. Principals, capability maps, consent and revocation come from the embedding host (the Wayglass kernel). WTL checks only that each staged effect cites a capability the host granted to this lineage.
- **Default deny.** No capability exists unless the host grants it. #552's `principal.authorized` flag is replaced by a host-signed grant cited in the receipt.
- **Revocation** is checked at staging *and again at Return*. An effect staged under a grant revoked before commit is dropped, and the cycle fails closed.
- **Feather:**
  - *Before Return:* stop immediately, discard staged effects, record `feather` on the open cycle's receipt, commit nothing.
  - *During Return:* finish the commit in progress for atomicity (I5), then stop before Transcend.
  - *Between cycles:* stop before the next Perceive.
  - In every case the last checkpoint stays valid and resumable. Releasing Feather requires an explicit owner gesture and resumes from that checkpoint, never mid-cycle.
- **Budget:** each backend counts *IR operations*, not expression nodes, so the same program costs the same everywhere. Exhaustion behaves like Feather before Return.
- **No source execution:** text can never become host code. There is no `eval` and no dynamic import of unregistered modules. Bridges call registered host functions only.
- **Determinism as defence:** because I7 forces identical digests across backends, a compromised or buggy backend shows up as a mismatched chain.
