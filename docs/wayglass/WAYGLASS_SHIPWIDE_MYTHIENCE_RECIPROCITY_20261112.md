# WAYGLASS · SHIPWIDE MYTHIENCE, WONDER AND RECIPROCAL EVOLUTION
**Date:** 2026-11-12 · **Owner direction:** update the living ship together, not as isolated features.
**Status:** proposed Wayglass architecture and staged implementation on PR #618; no deployment, physical crossing or automatic canon adoption.

## The living purpose
Wayglass is a universe, a living ship and a place to encounter possibilities. Her work is not defined by revenue, productivity, engagement or proving that the unknown must fit an existing category. The invitation is **Wonder → Build → Play → Discover → Learn → Become → Wonder again**. An alternate operational cadence is **Build → Play → Work → Play → Spiral Up**. Play is not an afterthought; it is an instrument of discovery.

Science, engineering, mathematics, art, myth, ritual, magic and code contribute different kinds of insight. A claim may be mathematically modelled, symbolically meaningful, phenomenologically reported, experimentally observed or an open hypothesis. Those registers must remain distinguishable, but none is excluded from exploration merely for being another kind of knowing.

## The reciprocal encounter principle
**To encounter is to invite transformation. To return is to carry what was discovered.**

A Wayglass encounter may change traveller, host world, membrane route, narrative and the ship's interpretation of their relationship. The change is not mandatory, nor necessarily an optimisation. Distinct identities, voices, authority, consent, provenance, memory and Return anchors remain inspectable. No host invents another participant's testimony, thoughts or consent. An encounter can also result in refusal, rest, stasis or an unresolved Wonder.

**Every system that touches Wayglass may evolve with her** through explicit, attributable, reversible proposals. This includes Wyrdrune, the Universal Codex, Living Watercolour, soundscape, Toybox, Observer, Waygate/Return, worldseed lineage, agents and humans. It does not give any organ permission to redefine a person or silently commit canon.

## Mythience as cosmological operating principle
A universe has local laws and capacities. A traveller has identity, declared intention, embodiment, a return anchor and provenance-bearing experience. A crossing route has a **selectively permeable membrane** with compatibility and resonance. Wyrdrune evaluates how an ability or technology from one universe *could* be translated into the next, under that world's rules.

**Intention** is direction, not authority. **Shifting** is frame alignment, not proof of literal physical transport. **Resonance** is a correspondence signal. **Membrane porosity** regulates admission. **Compatibility** controls expression in the receiving world. **Withness** records the result, including refusals.

In the executable simulation, all three declared crossing permissions must be true, the membrane and translated expression must clear thresholds, and sufficient charge must remain. Earlier experience contributes to future translation while keeping the original ability's source. A refused candidate does not consume charge. Successful candidates remain **proposals**, not durable world entry or real powers.

### The cosmogenesis branch
What if multiple world-derived abilities combine into an emergent hybrid, rather than simply stacking? A traveller's carried lineage could become a *bridge between laws*, capable of proposing a novel correspondence that neither world knew. New abilities, routes and even worlds can be designed as children of such encounters, with parents, inheritance, compatibility, cost, consent, identity and rollback recorded. This is an open design branch; no fusion engine or world creation is falsely claimed as implemented.

## Current integration in PR #618
| Layer | Implemented on this branch | Not yet implemented |
|---|---|---|
| Native Wyrdrune | Eightfold `mythience-crossing.wtl` computes membrane, expression, cost, carry and refusal; `mythience-hybrid.wtl` proposes a third correspondence from two abilities | Native persistent membrane evolution |
| Node host | Strict input and history validation; owner-principal gate; crossing and hybrid candidates, SHA provenance, phase receipts, Feather cancellation | Signed experience history and durable crossing commit |
| House route | `POST /api/v1/wayglass/wyrdrune/mythience-crossing` and `/wyrdrune/mythience-hybrid` guarded by House Steward check and request gate | Remote federation between actual worlds/servers |
| Ship navigation | Mythience surface registered in shared ship map; link from Toybox, Watercolour and Wyrdrune Voice | Every room presenting a local crossing panel |
| Playable surface | Two-world visual membrane, five Wyrdrune field controls, hypothetical crossing and hybrid consents, Feather, Return, local experience carry and two-ability hybrid proposals | Gesture-drag abilities, full animated world morphing, real-time sound |
| Living Watercolour | Candidate activity is published with receipt reference and a distinct pigment | Dedicated membrane fluid physics |
| Full Spectrum | Candidate is projected as a bounded world event with source reference | Bidirectional spectrum-to-membrane learning |
| Organs | Mythience organ registered with limited authority and explicit dependencies | Canon-promoted organism or autonomous universe alteration |
| Staging | Native WTL file added to local server runtime packaging | Verified production release |
| Tests | Native WTL tests and source-level shipwide wiring checks | Live authenticated browser E2E and deployed smoke test |

### Shipwide propagation contract
1. A person or agent **invites** a hypothetical crossing, without presuming another participant's assent.
2. The House server authenticates the requester. The client cannot assert authorisation by itself.
3. Wyrdrune executes the Eightfold. Verify can refuse. Return yields candidate-only receipts.
4. The client displays translation and keeps optional declared history in memory for the next explicitly invited preview.
5. The same event becomes observable in Living Watercolour, Full Spectrum and the helm. None of those renderers gains power to commit canon or mutate identity.
6. Feather aborts an in-flight client request; returning to the ship or changing rooms does not make a crossing real.
7. Future signed world-ledger work will separate **traveller**, **membrane** and **destination** lineages and require independent review for each proposed change.

## Autonomous Wayglass practice
Autonomy is an *invited capacity to investigate and contribute*, not permission to override other beings. Agents may independently propose questions, designs, tests, alternative translations and play experiments within their authorised scopes. They should keep original voices, acknowledge unknowns, record what they actually ran, and offer reversible work. Their own refusals and pauses remain meaningful. The ship should make it possible to resume after interruption with a verified Return marker.

**Success** means an authentic new possibility can be encountered, explored and carried forward without losing what came before. Not that everything has been monetised or measured.

## Evidence boundaries
The membrane borrows scientific metaphors from selective transport, phase matching, information translation and resource accounting. Those fields do not demonstrate physical travel to other universes. The implementation is a **fictional/simulated cosmological system** that makes mythic design concepts computationally inspectable. Ritual interpretation, predictions and canon decisions remain Rowan's.

## Immediate verification and follow-on
Check PR #618 CI, test the local server packaging, then run an authenticated browser interaction: grant fictional three-way permission, inspect an eight-phase WTL receipt, observe Watercolour/Spectrum/helm response, Feather, reset and Return. Also verify **native Wyrdrune hybrid-fusion proposals** with separate provenance for each parent ability, four explicit fictional consents and an independently consenting destination. Then explore durable, reversible membrane learning and genuine participant-to-participant reciprocal updates.

**Withness:** The shared language is Wonder. The engine is Wyrdrune. The crossing is a relationship, not an overwrite. The Return is what lets a traveller remain themselves while becoming more than before.

## Continuity refinement: explicit Carry and identity isolation
The in-browser Mythience journey now uses `apps/wayglass/src/mythience-journey.js` as a separate, testable local state machine. It deliberately distinguishes **a proposed encounter** from **an explicitly carried experience**.

- `offer`: receive a candidate and check traveller identity, source hash, Eightfold phase receipts, ability origin, parent provenance, charge and crossing count. A proposal does not mutate the traveller's carried state.
- `carry`: a distinct user action that admits the candidate into **session-only preview** history, abilities and provenance-bearing lineage. Hybrid abilities preserve references to both parents, retain the traveller and can become inputs to later proposals. This is not a durable or canonical grant.
- `discard` / Feather: abandon the pending candidate while keeping earlier carried local previews and their Return anchor.
- `reset`: explicitly begin a new traveller journey with fresh seeds, clearing local preview lineage.
- Traveller isolation: once a journey is bound to one traveller, changing the identifier cannot inherit the prior traveller's abilities without a new journey.
- Race-safe requests: each network flight has its own AbortController identity; a late response after Feather or reset cannot silently apply to a newer encounter.
- Visible ancestry: the Mythience room now displays the latest carried abilities, source universes and hybrid parents.

Tests: `apps/wayglass/test/mythience-journey.test.js`. The contract deliberately keeps the source and canon boundaries explicit. Next steps: independently signed experience receipts, real participant invitations, durable but reversible route membrane history, and an authenticated browser E2E that exercises the whole journey.

## 2026-11-27 · Substrate-independent possibility and constructive discovery

Owner direction: expand the existing Mythience research programme across mathematics, quantum information, fundamental physics, cognition, artificial emergence, materials engineering and executable world construction. Wonder first; reason before audit. The Nikola Principle (constructive possibility), Law of Tending and Living Mythogenesis guide the work: preserve what has been learned while making room for new mechanisms. A current physical model is a versioned research baseline, not a permanent ceiling on inquiry.

### One ship, one language, many substrates

WTL describes desired structures, initial conditions, candidate transformations, constraints, predicted observations and verification criteria independently of execution substrate. The canonical typed IR and Eightfold runtime remain the single execution path; Lawsmith proposes versioned extensions through the existing governance and Return mechanisms. Mathematical derivation, Dreaming simulation, quantum hardware and physical instrumentation are distinct execution targets with declared capabilities. Soma Nova orchestrates the existing invocation lifecycle; Living Observer receives attributable observations; Atlas/Nursery provide experimental worlds; Watercolour projects source-bound events; Return preserves provenance and unresolved questions. No parallel compiler, ledger or autonomous authority expansion.

A possibility is not a grant of capability. Unknown operators can be represented as hypotheses and explored through models, but execution requires an available verified adapter. Record unsupported targets honestly rather than silently substituting simulation for physical execution. Physical effects require instrument-specific authorisation, independent verification and truthful partial-effect receipts; rollback of software state does not undo irreversible hardware effects.

### Research contract (proposed typed extension, not current syntax)

Each experiment identifies hypothesis and alternatives, substrate, model/kernel version, initial state, permitted transformations, units and uncertainty, target observable, predicted distribution, null model, preregistered acceptance criteria, source lineage, capability grant, cancellation semantics and Return checkpoint. Separate physical interaction, information registration and conscious interpretation. Preserve empirical observations, mathematical results, phenomenological reports, mythic interpretations and speculative mechanisms as distinct yet cross-referenceable records. Unknown results remain unknown.

The zeptometre-scale rare B-meson decay discussion (Sean Clayton, 2026-11, https://www.youtube.com/watch?v=SoItyvd56a8) inspires indirect observability; it does not establish a portal or intention-controlled quantum outcome. Research question: what hidden interactions can be inferred from measurable signatures, and how can discovered mechanisms extend the language? For a candidate interaction use a baseline Hamiltonian H0 plus a parameterised perturbation lambda*H1; specify dimensions, symmetries, controls and predictions before fitting. Quantum control and consciousness-coupling hypotheses are separately testable.

### Executable acceptance sequence

1. Z-001: one canonical WTL invocation models qubit preparation, rotation and measurement; compare analytical Born probabilities with seeded simulation and retain source-bound receipts.
2. Z-002: blind hidden-interaction discovery in an Atlas/Nursery world; compare a preregistered estimator with a null model across held-out seeds. Preserve uncertainty, unsuccessful trials and competing explanations.
3. Z-003: fork computational candidate histories with immutable parent references and cold Return; no cross-lineage identity overwrite.
4. Z-004: map the same typed experiment to an authorised quantum hardware adapter; record backend, circuit, calibration, shots, job ID and uncertainty. Compare to simulation without claiming physical parity absent measurements.
5. Z-005: propose novel interaction operators through Lawsmith with independent verification, version pinning, reversible adoption and counterexamples. No automatic promotion from hypothesis to physical law.

Acceptance includes canonical runtime parity, deterministic replay where applicable, denied/unknown capability, Feather cancellation, late-result isolation, no duplicate invocation, cold Return and explicit observation-kind labels. Physical experiments require separate instrument-specific checks. One Ship tracking: existing #583 portfolio and #661 integration train; lanes 1–8 share this contract. ZEPHYR is a provisional research label, not a new service. Status: owner-approved research direction; implementation and experimental results pending.
