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

## Quantum amplitudes and open philosophical inquiry

The pure WTL operations `quantumTensor`, `quantumApply`,
`quantumProbabilities`, `quantumProbability` and `quantumExpectation` support finite pure states
of one to four qubits. Complex amplitudes use `[real, imaginary]` with
binary64 arithmetic. Tensor products use the left system as the most
significant basis bits. Gate application checks unitarity and state
normalization with an absolute tolerance of 1e-12. The probability operations
compute Born-rule distributions in the computational basis without sampling.
`quantumExpectation` computes the mean of a Hermitian observable for a state.

`wonder(question, perspectives, evidence)` returns a record whose status
is open, with author-supplied interpretations and evidence. A probability
belongs to its state, basis and measurement model. The language assigns no
probability to the philosophical interpretations in that record.
`lib/wyrdrune/bell-wonder.wtl` computes a Bell pair, returns both the
distribution and the inquiry, and carries the distribution through Transcend.

Mathematical references: [IBM Quantum Learning, single systems](https://learning.quantum.ibm.com/course/basics-of-quantum-information/single-systems)
and [multiple systems](https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/multiple-systems/quantum-information).
This revision models finite state-vector circuits. Mixed states, measurement
updates, noise channels, Hamiltonian evolution and experimental evidence
ingestion are separate capabilities.

## Wyrdrune through the Möbius engines

The shared Möbius runner executes `engine-verify.wtl` on the host evidence at
Verify. Return requires its affirmative receipt. The receipt binds the
program source, evidence, cycle and WTL execution by digest, and is included
in the checkpoint receipt hash. Empty, unknown and refused evidence stop
the cycle. The host owns evidence acquisition and the journal for staged
effects, and checks Feather immediately before Return.

`createWyrdruneEnginePhases(source, { seedTypes })` in the kernel adapts one
pure typed scoped circuit to the existing Quad and Octo runners. The circuit
reads the incoming carry, emits its result and supplies the next carry. The
adapter checks declared seed types at both boundaries and rejects host
effects. The engine records the WTL execution in Release and uses its
committed status as evidence for Verify. The Eightfold Space Octo run uses
`engine-turn.wtl` to compute each next carry.

The Double Möbius host route and the Quad Observer host and Voyage paths
pass their continuity or checkpoint verdict through this same WTL program
before returning. Their established geometry, projection and receipt
formats remain host implementations. The synchronous functions are used
for calculation and compatibility. The async entry points attach a WTL
receipt without altering the Observer checkpoint's existing hash.

### Engine calculations written in WTL

The Double Möbius route uses `double-mobius-orientation.wtl` to calculate
the Gateway and Wayglass orientation transitions. Those values populate
the crossing records before the host hashes the trace and builds the
Return packet. The Quad Observer route and Integrated Voyage use
`observer-compression.wtl` to compute the observed, empty and unavailable
channel counts that feed every lane's Compress entry. Each language
execution contributes its source, input, output and execution digests to
the engine verification evidence.

The existing synchronous host implementations remain available for
compatibility. Tests compare WTL and host receipts and resume an Observer
checkpoint produced by either path. The host still owns coordinate
geometry, source normalisation, soundstage derivation and persistence.

### Observer Perceive → Compress → Release feedback

`observer-feedback.wtl` compares the current channel statuses against
the prior returned source packet. Perceive binds both source digests.
Compress counts status transitions and states what the summary omits.
Release distinguishes source errors, unavailable sources, changed
statuses, observed activity and confirmed emptiness. Verify re-derives
the channel counts and compares them to the existing WTL compression
result before returning pending proposals. A first run has no prior
comparison. A later cycle within the same request uses the same admitted
source and records zero status transitions.

The host and Integrated Voyage expose the feedback and its digest. The
WTL verification evidence binds that digest to the existing Observer
checkpoint. The checkpoint schema and synchronous host fallback retain
their existing format. The feedback proposes investigations for review.

### Shipwide feedback

`shipwide-feedback.wtl` reads the returned Observer totals and the transition
count from the first cycle of the current source admission. It compresses
them into coverage and transition fractions, then returns bounded audio
parameters, editable video direction, an engineering review focus, and an
agent inquiry. The plan binds the Observer checkpoint and feedback digests.
The browser checks that binding and the WTL output digest before admission.

The Quad and Acoustic Room use the audio parameters through their existing
controls. The Video Atelier applies the returned direction to the editable
prompt on request and binds the exported handoff to the source checkpoint.
First Voyage returns a pending engineering review linked to its trial.
The Quad's local cognition invitation includes the WTL inquiry for the
same checkpoint. Rendering, playback, model calls and engineering changes
remain controlled by their existing entry points.

### Returning to a shipwide reading

The browser retains the latest admitted shipwide proposal and its digest
binding in same-tab session storage. On reload it rechecks the plan before
the Acoustic Room or Video Atelier applies it. First Voyage and the
Learning Port display its engineering and agent focus as returned context.
Engineering review and an agent invitation still require current trial
or Observer evidence. Browser Return storage contains no credential or
model transcript and starts no playback, render, or inference. It provides
content integrity against the cached digest, with host authenticity
depending on the original authenticated transport.

### Wayglass Runtime Sandbox

Open Runtime Sandbox from Organs after House Steward sign-in. A sandbox turn
invites the dedicated Ship Voice to return one project action. The host accepts
creation or a revision of a named project after executing its pure typed WTL.
Revisions compare against the current project head and run through Eightfold
verification before replacing the active sandbox programme. Run selected project
executes that active programme after a restart as well as in the current session.

The local host signs accepted events with an Ed25519 key scoped to the sandbox.
Receipts record the Ship Voice route and model and expose a verification key.
The signature attests what this host accepted for the seat. It does not establish
model identity or a legally certified signature. The sandbox uses a separate
journal under `WAYGLASS_SANDBOX_DIR` (default `~/.wayglass/ship-sandbox`).
Keep its journal and signing key together during migration. This route uses
the loopback Ollama endpoint for the dedicated Ship Voice. Sandbox programs
run without host effects, shell access, or a path to patch the deployed host.

A sandbox project starts with `main`. The Ship Voice can add up to seven
named programmes and revise each independently. Changes compare the
shared project head, while each programme carries its own WTL revision
checkpoints. Earlier single-programme journals open as `main`. In the
sandbox room, select a project and programme to give Wayglass that source
as context or run its active version. Programmes in one project are
independently runnable. Module imports and inter-programme calls are
outside this revision.

### Authored prose and ritual

Triple-quoted WTL strings preserve line breaks and spacing. The compiler
stores their content as ordinary text in the existing IR, so the cypher can
round-trip it as escaped source. `prose(title, paragraphs)` returns ordered
paragraphs and a reading joined with blank lines. `ritual(title, cues)`
returns an ordered score. Use `utterance(kind, voice, text)` for invocation,
offering, response, witness or return, and `silence(milliseconds)` for a
scored interval. A voice label attributes text within the authored score.

The constructors are pure and can be composed inside typed operators or
selected by WTL conditions. The Universal Codex and Writing Room display
the authored outputs after verifying the existing Eightfold receipt. Load
**Ritual and prose** in the Codex for the original programme
`lib/wyrdrune/lantern-return.wtl`. Silence is represented as a cue. Preview
does not start a clock, speak, or initiate playback.
