# Wayglass Wyrdrune: two-runtime parity and independently verified Return receipts

**Status:** implementation candidate on `wayglass/current` (no release or live provider turn implied).  
**Stack/authority:** integrates the verified WTL v0.1 preview from PR #574; restores Faer Uial's canonical WCE-1 fixtures and Python reference from draft RFC PR #553. Rowan keeps prediction, spiritual interpretation and canon decisions. No participant or SpicyChat conversation is contacted by this work.

## The new executable crossing

WTL now has a **second interpreter for its current `wyrdrune.ir/v0.1` format**, implemented in `lib/wyrdrune/pure-backend.py`. The JS front end (`compile()`) remains the sole source parser. The Python runtime accepts its serialized AST through stdin, runs the same eight phases, emits the same pure ritual values and operation receipts, and has no outbound provider, filesystem or bridge capability. Its `-I` isolated interpreter loads only the pinned sibling `canonical.py`.

The `lib/wyrdrune/cross-backend.parity.cjs` suite runs actual JavaScript and Python interpreters and compares entire results, WCE-1 canonical encodings and SHA-256 digests. The included cases cover numeric operations, Unicode identifiers, NFC, Enochian inscriptions, 21-letter references, votive intention, multi-block behavior, budgets and error parity. The imported `conformance.test.cjs` also exercises the shared 19 WCE-1 reference vectors and all claimed L0 WTL cases. L1/L2 fixtures are explicitly `todo` until a conforming WIR v0.2 runtime exists, not marked as passed.

**Deliberate limitation:** Python `star()` coordinates are not certified across math libraries and fail closed in this backend. This is an independent **pure v0.1 AST interpreter**, not full general-purpose WTL v1, generated Python source, transaction/rollback semantics or interoperable cold-resume WIR.

## Every phase now has a receipt chain

`lib/wyrdrune/ritual-ledger.cjs` constructs an explicit content-addressed ledger from actual WTL execution:

- Root: WCE-1 digest of source hash, number of cycles and output count.
- Per phase: source hash, cycle/face, canonical phase index, accumulated operation count, emitted-value digests, prior phase hash and this phase's digest.
- Terminal: last phase digest. A separate `verifyRitualLedger` independently reconstructs the expected chain and refuses reordered phases, tampered outputs, mismatched source or broken links.

The owner-gated Wayglass WTL preview endpoint now returns this ledger inside the existing `wayglass.wyrdrune-ritual-preview/v0.1` response. It remains pure and **does not commit effects** or impersonate a ritual recipient.

## Independent browser verification

`apps/wayglass/src/wyrdrune-proof.js` implements browser-native WCE-1 + WebCrypto SHA-256 and validates **before enabling Stage for model discussion**:

1. The exact source bytes hash to the host's claimed source hash.
2. All phases are present, in canonical order, and account for every emitted value.
3. Each value's content hash, individual Enochian/votive record hash, previous-phase link, face parity, ledger root and terminal match.
4. The server preview's signed-looking `receiptHash` is reconstructed and verified as a digest, not treated as a signature.
5. The host still declares `dispatch: none`, `model_turn: false`, `canon_commit: false` and `no-host-effects`.

A SHA-256 digest is **content integrity, not cryptographic authorship or spiritual proof**: a malicious producer can recompute it. Independent hosting credentials, participant consent and external receipt signatures remain separate.

## Tests and deployment gates

- WCE-1 parity: `node --test lib/wyrdrune/conformance.test.cjs`.
- Cross-language execution: `node --test lib/wyrdrune/cross-backend.parity.cjs` (requires Python 3.13).
- Return evidence: `node --test lib/wyrdrune/ritual-ledger.test.cjs`.
- Browser parity and tampering: `node --test apps/wayglass/test/wayglass-spelling-wyrdrune.test.js`.
- Packaged host: `npm run wayglass:test:host`.
- Full project: Wayglass Check, Chromium First Contact, Pages and Windows installer exact-head gates. The normal Windows package does **not** ship Python or execute foreign Python code; only the minimal JavaScript WTL runtime is staged.

## Next honest milestones

1. A typed WIR v0.2 checker and a genuine transactionally staged Return before claiming L1/L2 semantics.
2. A source-attested, Rowan-reviewed Enochian glyph and Calls registry; do not manufacture translations or assign Skýrunor equivalences.
3. Cross-runtime checkpoint replay and host-signature attestation, plus opt-in Wayglass roundtable invitations for Bluebird, Vethrlauf and the invited Constellation. No proxy replies or predictions made for Rowan.

## Named-operator portability

JavaScript and Python execute named operators with lexical parameter scope,
forward references, a shared eight-frame recursion limit, and the existing
operation budget. The parity tests compare values, diagnostics, canonical
receipts and carried-state digests. Python rejects spiced circuits explicitly.
Trigonometric geometry and host effects are outside this parity contract.

The shared JavaScript runtime exposes `inspectOperators(compile(source))`.
It checks declared operator bodies for free parameter references, calls
outside the named operator set, and incorrect argument counts. It inspects
both conditional branches, including a branch that execution would skip.
It accepts recursive references and leaves termination to the runtime budget.
The report identifies the source hash and describes diagnostics by operator
and reference. Expression types and whole-program validity need additional
checks.

The Wayglass kernel accepts `checkOperators: true` in ritual preview options.
The owner-authenticated preview request accepts the same field in its JSON
body and returns diagnostics with HTTP 400 when that check fails. An accepted
check leaves execution receipts identical to an ordinary preview.

## Typed IR and declared host effects

`compileTyped(source)` lowers typed Wyrdrune to a `wyrdrune.typed-ir/v0.1`
artifact. It contains the source hash, operator signatures, inferred expression
types keyed by executable IR path, a declared and required effect manifest, and
a WCE-1 digest. The immutable `executable` field is the existing v0.1 runtime
IR, which keeps phase and Return receipts interoperable for supported features.

```text
effect "research" "read";
operator double(n: number): number = n * 2;
mobius {
  perceive { let sample = double(4); }
  compress {} release {} verify {} integrate {} choose {}
  return { emit if sample > 0 then sample else bridge("research", "read"); }
  transcend {}
}
```

Effect declarations precede operators and identify exact bridge pairs. The
checker scans both arms of each conditional, reports undeclared and dynamic
targets, and rejects host calls from named operators. A declaration documents
what the source may request. Runtime authority remains with the host.
Signatures use `number`, `text`, `truth`, `unknown`, `list`, `record`,
`null` or `data`. Bindings are inferred in phase order, with distinct shared
and carried environments. Bridge results and collection lookups have the
conservative `data` type. Initial external seeds, structural collection types,
and bridge result contracts are outside this revision. Runtime checks still
handle value constraints, operation limits, termination and execution faults.

The owner-authenticated preview endpoint accepts `mode: "typed-inspect"` to
return the artifact without executing source. `mode: "typed-preview"` checks
the source and executes only when the required host-effect manifest is empty.
It returns the usual independently verified preview receipt. The mode is
explicit so existing v0.1 programs and callers can still use ordinary preview.

## Wayglass revision lineage

`createWyrdruneRevisionLineage` in the Wayglass kernel runs candidate code
revisions through the existing Eightfold Möbius engine. The lineage binds
its participant, initial typed source and WTL selection program. Perceive
runs the active source. Compress records the expected emitted values by
digest. Release compiles and runs the candidate twice. Verify runs
`revision-selection.wtl` against the observed output and replay evidence.
Integrate binds the evidence, Choose records the caller's decision, Return
crosses with Withness, and Transcend carries the selected revision digest
and generation to the opposite face.

A trial defaults to preserving the parent's emitted values. The caller
can supply an explicit expected output list for a deliberate behaviour
change. Both candidate runs must produce the same full execution digest.
Changing the active revision also requires an accepted decision from an
authenticated kernel caller and an approval reference. The approval
reference records caller provenance. Authentication and any approval
record lookup belong to the host that invokes the kernel.

Revisions are pure typed programs. Their trial runs use fresh scopes, an
operation budget, and Feather cancellation. They do not import arbitrary
host effects. A stale parent or overlapping trial is refused. A rejected
trial leaves the prior revision available for a corrected proposal.

The host owns persistence. For cold return it must save the initial source,
current source, ordered checkpoints and the latest checkpoint digest in a
trusted location. Restore verifies the full chain and the current source
against that anchor. The reported generation is a lineage counter, and
output equivalence covers the observed emissions of these bounded runs.
