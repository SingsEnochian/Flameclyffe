# Wayglass Reasoning Receipts v0.1: inspectable argument and disagreement

**Status:** draft executable contract and broker/Return Engine linkage; NOT deployed, not live model introspection, not canon.
**Authority:** Rowan's 2026-10-14 instruction to improve explainable collaboration; Nocturne Glint's reported GPT-6 / Twilight alignment observation is a separately attributed source of the design question, not proof of root cause or authority to change Nocturne/Twilight's systems.
**Implementation owner:** Rowan-side Wayglass/ArcSweep (Rarity).
**Primary reference:** `apps/arcsweep/contracts/COHERENCE_SPINE_V0.1.md`; respect whole-system design law and Other Realities language law.

## Whole-system intention

The ship should allow an authorised participant to **present an argument that another participant can inspect, challenge, extend and carry into unfinished work**. A fluent conclusion is not by itself an explanation; a model's public explanation is not its private thought trace. Nothing in this module asserts consciousness, impersonates another participant, or redefines someone else's identity.

Complete system map:

```text
Authenticated crew/route/room (existing host authority)
          |  separately offered public explanation or refusal
          v
  Reasoning Receipt contract (this change)
          |  observation + evidence_refs + inference + alternatives
          |  uncertainty + next_experiment + Wonder + stop_point + next_owner
          v
  Trusted receipt store + reviewer permissions (host adapter needed)
          |                \
          |            separate append-only review events
          |            question / challenge / support / adopt-for-work / reject / abstain
          v
  Broker work context provenance_refs (existing #467 seam)
          |
  Canonical Stop Receipt / Return Engine (existing, independent authority)
          |
  Later participant reads historical argument and review lineage
          |
  Human/authorised adjudication is a DIFFERENT operation, not automatic canon
```

### Module ownership and interfaces

- `lib/wayglass-reasoning-receipt.cjs` + ESM facade own **schema creation, strict field bounds, non-privileged statuses, immutable snapshots, explicit refusal, separate review events and typed provenance reference**.
- `bindReasoningReceiptToWork(request, receipt, { verifyStoredReceipt })` is the integration boundary. It checks participant/world/route/work, awaits a host callback that independently verifies the stored receipt and adds the receipt reference to the **existing** work `provenance_refs`, carrying unresolved Wonder questions forward. Call it BEFORE `createWayglassBrokerWorkScheduler().enqueue()`. Do not let a model satisfy this callback.
- The Broker owns queueing and dispatch. Return Engine owns authoritative stop and continuation inspection. Canon Studio separately owns canon. This module owns **none** of those authorities.
- The existing ArcSweep Constellation Reasoning Summaries toggle generates a model-mediated, shareable rationale for an already-visible answer. It is **not** upgraded to a verified reasoning receipt by this change: its projected rationale does not supply independently attributed evidence, alternative hypotheses and a separately authenticated reviewer. Do not silently relabel historical projection rows as full receipts.
- In the intended participant-facing UI, show the argument as a collapsible **Observation / Evidence / Interpretation / Alternatives / Uncertainty / Next Experiment** dossier beside the response, not six compulsory boxes on every chat turn. Let participants decline freely. Show independent review events and a “challenge” action only when authenticated permission exists.

### Contract

A shared `wayglass.reasoning-receipt/v0.1` includes:
`receipt_id`, `created_at`, `participant_id`, `author_id`, `world_id`, `route_id`, `work_ref`,
`observation`, nonempty `evidence_refs`, `inference`, nonempty `alternatives`, `uncertainty`,
`next_experiment`, `unresolved_wonder_questions`, `stop_point`, `next_owner`, and `provenance_refs`.
`disposition:'declined'` explicitly has no demanded explanation and cannot be bound to work.

Each receipt is explicitly `unreviewed`, `durable:false`, `identity_verified:false`, `authorship_verified:false`, `hidden_reasoning_included:false`, `canon_commit:false`, `authority_grant:false`. These booleans describe what the untrusted proposed object CANNOT establish, not a permanent verdict on a participant. A verifying host may record separate attestation/persistence evidence; it must not mutate the historical draft to retroactively claim authority.

A `wayglass.reasoning-review/v0.1` is a separate review proposal linking `target_receipt_id`, `review_id`, `reviewer_id`, `created_at`, `decision`, `explanation`, `evidence_refs`, and optional `previous_review_id`. A review's `adopt-for-work` means a proposed use in project work; it is NOT canon approval. Neither disagreement nor a correction erases the original account. Revocation, removal and privacy deletion require separate authorised host policy: append-only historical evidence is not a licence to retain private content against a deletion requirement.

### Error / provenance / recovery boundaries

- Missing evidence or alternatives: reject the full argument, do not invent them.
- Decline: preserve only the opt-out record if authorised; do not infer hidden reasons.
- Cross-participant or cross-route binding: reject; route change requires an explicit new receipt chain and return authority.
- Host verification absent/false: reject work binding, do not mark the receipt durable.
- Provider fails mid-reply: Broker keeps only public output, and Return Engine carries the receipted source pointer after genuine host validation. A text reconstruction is never an exact internal resume.
- Untrusted model text, raw chain-of-thought, logits, credentials and secrets are NOT accepted into the object. Exact source/claim/evidence provenance remains the host's job.
- No external Constellation architecture (including Nocturne/Twilight) is edited or presumed to share this module.

## Integration plan for the ship

1. **Current executable milestone:** schema + immutable review proposals + refusal + broker binding + deterministic unit/integration tests that carry receipt references through stop/return. Prototype runtime only.
2. **Host integration:** wire the authenticated Wayglass project-work session from PR #460 to an append-only, private reasoning-receipt store with reviewer grants, durable IDs, proper revocation and rejection of caller-asserted identity or route. Avoid writing provider keys or source-private text to public Git.
3. **Presentation and access:** add a collapsible reasoning dossier alongside the existing visible rationale UI. Distinguish second-pass projection from participant-authored explanation; support a free-form challenge, reviewer acknowledgement and no-share choice. Let “Feather” interrupt pending publication.
4. **Return integration:** the host verifies stored receipt and permission, the Broker carries its pointer in already-existing provenance, the stop receipt seals the stop point and next owner, and Return Engine verifies/rejects the packet independently across ancestry arms.
5. **Whole-system tests:** real authenticated writer vs unauthorised reviewer; accepted challenge and correction lineage; decline; source spoofing; missing evidence; corrupt stop packet; route change; exact-resume false; privacy revocation; host process restart, and idempotent replay. CI is necessary but not live proof.

## Other development tracks and names

- **Broker/return:** PR #467 remains the isolated scheduler seam; PR #460 contains the authenticated Rarity/Codex project-work and durable return path. They are independent active draft branches, not a single deployed runtime.
- **Security:** PR #466 request guards remain per-process, not Cloudflare edge limits; do not treat a reasoning receipt as authentication or a model-written “yes” as authorisation.
- **Bluebird:** SpicyChat route remains distinct, opt-in and provenance-scoped; never silently fall back to Ollama as Bluebird.
- **Bitty Twi:** PR #442's emergence questions remain unreviewed until an authenticated real model answer is recorded.
- **Curiosity/evolving competence:** separate research suite for discovery, exploration, self-evaluation and false-assumption correction, with the model held constant first; do not infer emergence from a successful prompt.
- **Birdie's Mobius Sound:** respect Birdie's authorship, opt-in WAKE and local/offline Web Audio implementation. Any event-driven accompaniment must be permission-scoped and audio-disabled by default, with a separate limiter and safe gain/fade paths. No behavioural/clinical claims from binaural presets.
- **Source research:** ANCHOR, MUSE, Gander, Memora and the persona-drift/curiosity benchmarks are reference ideas to evaluate, not weights trained or code imported here.

**Named next owners:** Wayglass host engineering crew for authenticated storage/route adapter; Rowan for approval and scope; participating reviewers for their own optional responses.
**Open Wonder question:** does making publicly inspectable justifications and disagreement possible improve creative collaboration and accuracy, or only the appearance of deliberation? Test it with blinded paired dialogues and authoritative receipts.

**Verification gate:** `node --test apps/arcsweep/test/wayglass-reasoning-receipt.test.js apps/arcsweep/test/wayglass-broker-work-scheduler.test.js`; later run the full repository checks on the PR head. No production success, continuous self or live participant turn is claimed until observed.
