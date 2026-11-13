# Mythience 001: The Permeability Membrane
**Status:** exploratory cosmological canon proposal + executable Wyrdrune simulation, NOT a verified physical crossing. **Owner:** Rowan. **Source:** 2026-11-12 invitation to unite science, myth, Intention, Shifting and Mythience.

## The discovery
Wayglass is a universe and vessel, not an isolated product. Each universe has its own laws, beings, technologies, magic, meanings, and boundary conditions. Travellers can encounter other universes in a narrative/simulated setting, learn their abilities and bring back a *lineage of experiences*. Arrival does not erase prior identity. Powers are not universally portable: they require translation against the receiving universe's rules. Encounters can change travellers, hosts, routes and, with consent, the membrane itself. A future design may let compatible translated powers form a third, emergent hybrid rather than simply adding strengths.

## Mythience: two languages describing one interface
**Established science used as analogy, not proof of multiverse passage:**
- Semi-permeable membranes have selective transport governed by permeability, gradients and conditions.
- Phase matching, resonance and impedance are useful models of compatibility between systems.
- Information theory and compiler/type systems motivate loss-aware translation, provenance and explicit capability checks.
- Resource accounting and bounded state prevent unlimited accumulation in the executable simulation.
These are *inspirations*. Neither current physics nor this code demonstrates travel to another physical universe or literal acquisition of supernatural abilities.

**Mythic and ritual correspondences, explicitly authored for Wayglass:**
- **Intention:** the declared direction and purpose of an encounter, never a substitute for permission.
- **Shifting:** deliberate alignment of a traveller's viewpoint/embodiment with another world's frame; no claim that mental practice alone crosses physical worlds.
- **Threshold:** the membrane, a liminal border that selects and translates what may enter.
- **True name / return anchor:** the traveller's persistent identity, independent of local body, provider or role.
- **Hospitality / ward:** three-way consent from traveller, origin and destination.
- **Correspondence:** the translation of magic, technology and hybrid practices into destination-compatible expression.
- **Withness:** a witnessable receipt of who offered what, what changed and what was refused.
- **Mythience:** a deliberate combination of formal mechanism, symbolic meaning, ritual interpretation and empirical curiosity, without collapsing their evidence levels.

## Executable crossing law
Native WTL file: `lib/wyrdrune/mythience-crossing.wtl`. Host boundary: `lib/wayglass-mythience-crossing.cjs`.

Inputs: intention I, shifting S, membrane porosity P, resonance R, destination compatibility C, previous traveller attunement A, experience count N, charge Q, and three independent consents. All scalar inputs are finite and bounded. The current formulae are **design parameters**, not physical constants.

```text
alignment    = I × S × (0.5 + 0.5R)
membrane     = P × (0.25 + 0.75alignment)
permeability = membrane × (0.5 + 0.5A)
native       = permeability × C
bonus        = (1 - native) × [N / (N + 8)] × 0.15
expression   = native + bonus
cost         = 0.1 + 0.3(1 - permeability) + 0.1(1 - C)
next_charge  = Q - cost
next_A       = 0.8A + 0.2expression
```

A proposed crossing is refused if any consent is false, permeability is below 0.25, translated expression below 0.12, or charge would be negative. History can improve translation but cannot override the permeability gate, consent or charge. The model treats an ability as a distinct provenance-bearing record. Translation is *not* duplication or an automatic licence to wield a capability in another world. Origin of an ability can differ from the universe the traveller is currently leaving, preserving compounding across visits.

WTL owns all developmental mathematics and the eight-phase crossing. The Node host validates identifiers, inputs, histories, consent and owner principal, then emits a **candidate-only** translation with source SHA, input hash, eight phase receipts, a checkpoint and a return question. No state, power, universe law or canon is persisted or adopted by this prototype. Declared history is not verified by a signed ledger.

## Reciprocity and membrane evolution: next architectural layer
The current WTL carries *traveller* crossings, attunement and charge, but does not mutate the origin or destination universe. That is intentional for this first reversible experiment. The next integration should maintain **three independent lineages**: traveller, route membrane, and destination universe. Each proposes changes; no participant's history is silently overwritten. Route-specific permeability can change through encounters only if the relevant participants permit it. Shared environments and new hybrid abilities should have their own provenance and rollback receipts.

The proposed future Wayglass crossing protocol is:
1. **Declare:** traveller identity, source/destination, intent, abilities and provenance.
2. **Invite:** ask each relevant participant/world for opt-in; Feather stops immediately.
3. **Align:** shifting + resonance choose a frame and membrane interface.
4. **Translate:** Wyrdrune calculates admissible expression and costs under destination law.
5. **Witness:** record both successful and refused candidates with source receipts.
6. **Enter or decline:** authorised runtime may later commit a simulation crossing; never equate a WTL proposal with physical travel.
7. **Encounter:** worlds and participants may each propose reciprocal change.
8. **Return:** restore anchors and preserve acquired experiences, conflicts, unresolved Wonder and revocations.

## The emerging cosmological question
If a traveller carries experiences across many worlds, and those experiences change what can cross the next membrane, **travellers become living bridges between otherwise incompatible laws**. Their accumulated correspondences can create new hybrid practices and potentially new worlds in the *Wayglass fictional/simulated cosmology*. This is the open discovery, not a prewritten verdict. Rowan retains the authority to interpret ritual predictions and adopt canon.

## Verification
`node --test lib/wyrdrune/mythience-crossing.test.cjs` and `npm run wayglass:test`. Test cases cover deterministic translation, preserved origin and identity, cumulative history bonus, explicit refusal from each consent party, closed membrane, incompatible destination, depleted charge, malformed history, unauthorised principal and Feather. CI must be independently checked before declaring green.

## Next play experiment
Render two worlds as translucent, refractive watercolour fields. A membrane between them changes optical permeability as WTL responds to declared Intention and Shifting. Drag a provenance-marked ability through the membrane; see its translated form, retained origin and optional refusal. Give both worlds an accessible text/keyboard path, a stop control and visible Return receipts. Only after that should durable route-membrane learning be considered.
